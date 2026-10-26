import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';

const API_DIR = resolve(__dirname, '..');
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://immo:immo_dev_only@127.0.0.1:5434/immo_test?schema=public';
const TEST_PORT = 4200;
const TEST_API_URL = `http://127.0.0.1:${TEST_PORT}`;

let server: ChildProcess | null = null;

/**
 * Prépare l'environnement d'intégration :
 *  1. compile l'API (tsc, indispensable pour les métadonnées de décorateurs Nest),
 *  2. applique les migrations sur la base de test,
 *  3. vide les tables,
 *  4. démarre une vraie instance HTTP.
 */
export async function setup(): Promise<void> {
  process.env.TEST_API_URL = TEST_API_URL;

  execSync('pnpm exec tsc -p tsconfig.build.json', { cwd: API_DIR, stdio: 'inherit' });

  execSync('pnpm exec prisma migrate deploy', {
    cwd: API_DIR,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  await resetDatabase(TEST_DATABASE_URL);

  server = spawn('node', ['dist/main.js'], {
    cwd: API_DIR,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      API_PORT: String(TEST_PORT),
      API_HOST: '127.0.0.1',
      APP_SECRET: 'integration-tests-secret-0123456789abcdef',
      REQUIRE_EMAIL_VERIFICATION: 'false',
      MAIL_TRANSPORT: 'mailpit',
      LOG_LEVEL: 'warn',
      TRUST_PROXY: 'false',
      SESSION_COOKIE_NAME: 'immo_session',
      WEB_ORIGIN: 'http://localhost:3100',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout?.on('data', (chunk: Buffer) => {
    if (process.env.DEBUG_API) process.stdout.write(chunk);
  });
  server.stderr?.on('data', (chunk: Buffer) => process.stderr.write(chunk));

  await waitForHealth(TEST_API_URL, 30_000);
}

export async function teardown(): Promise<void> {
  if (server && !server.killed) {
    server.kill('SIGTERM');
    await delay(500);
    if (!server.killed) server.kill('SIGKILL');
  }
}

async function waitForHealth(baseUrl: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // serveur pas encore prêt
    }
    await delay(250);
  }
  throw new Error("L'API de test n'a pas démarré dans le délai imparti");
}

async function resetDatabase(connectionString: string): Promise<void> {
  // node-postgres n'accepte pas le paramètre ?schema=public propre à Prisma.
  const url = new URL(connectionString);
  url.search = '';
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await client.query(`
      TRUNCATE TABLE audit_logs, media_assets, properties, buildings, owner_entities,
        email_tokens, sessions, users CASCADE
    `);
  } finally {
    await client.end();
  }
}
