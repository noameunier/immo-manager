import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { Client } from 'pg';

const API_DIR = resolve(__dirname, '..');
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://immo:immo_dev_only@127.0.0.1:5434/immo_test?schema=public';
const TEST_PORT = 4200;
const TEST_API_URL = `http://127.0.0.1:${TEST_PORT}`;

let server: ChildProcess | null = null;
let stderrTail = '';

/**
 * Vérifie que le port de l'API de test est libre.
 *
 * Sans ce garde-fou, un service déjà à l'écoute (par exemple l'API de
 * préproduction sur le même port) répond aux sondes de santé et les tests
 * s'exécutent silencieusement contre la mauvaise instance : les résultats
 * deviennent faux sans qu'aucune erreur ne le signale.
 */
async function assertPortFree(port: number): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const probe = createServer();
    probe.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        rejectPromise(
          new Error(
            `Le port ${port} est déjà utilisé : arrêtez le processus qui l'occupe ` +
              `(par exemple « systemctl --user stop immo-staging-api ») avant de lancer les tests.`,
          ),
        );
        return;
      }
      rejectPromise(error);
    });
    probe.once('listening', () => {
      probe.close(() => resolvePromise());
    });
    probe.listen(port, '127.0.0.1');
  });
}

/**
 * Prépare l'environnement d'intégration :
 *  1. compile l'API (tsc, indispensable pour les métadonnées de décorateurs Nest),
 *  2. applique les migrations sur la base de test,
 *  3. vide les tables,
 *  4. démarre une vraie instance HTTP.
 *
 * Les erreurs sont imprimées ici avant d'être relancées : le formateur
 * d'erreurs de Vitest masque parfois le message d'origine (bug de source map),
 * ce qui rendait les échecs de CI inexplicables.
 */
export async function setup(): Promise<void> {
  try {
    await prepareEnvironment();
  } catch (error) {
    console.error("\n[tests] Échec de la préparation de l'environnement d'intégration :");
    // Ne jamais lire `error.stack` ici : le formateur de piles de Vite plante
    // (`code.charCodeAt is not a function`) et masquerait le message d'origine.
    console.error(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function prepareEnvironment(): Promise<void> {
  process.env.TEST_API_URL = TEST_API_URL;
  await assertPortFree(TEST_PORT);

  process.stdout.write('[tests] compilation de l’API…\n');
  execSync('pnpm exec tsc -p tsconfig.build.json', { cwd: API_DIR, stdio: 'inherit' });

  process.stdout.write('[tests] application des migrations…\n');
  execSync('pnpm exec prisma migrate deploy', {
    cwd: API_DIR,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  await resetDatabase(TEST_DATABASE_URL);

  process.stdout.write(`[tests] démarrage de l'API sur ${TEST_API_URL}…\n`);
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
  server.stderr?.on('data', (chunk: Buffer) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-4000);
    process.stderr.write(chunk);
  });
  server.once('error', (error) => {
    stderrTail = `${stderrTail}\n${error.message}`.slice(-4000);
  });

  await waitForHealth(TEST_API_URL, 60_000);
  process.stdout.write('[tests] API prête.\n');
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
  let lastStatus: number | null = null;
  while (Date.now() < deadline) {
    if (server && (server.exitCode !== null || server.signalCode !== null)) {
      throw new Error(
        `L'API de test s'est arrêtée prématurément (code ${server.exitCode}, signal ${server.signalCode}).\n${stderrTail}`,
      );
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
      lastStatus = response.status;
    } catch {
      // serveur pas encore prêt
    }
    await delay(250);
  }
  throw new Error(
    `L'API de test n'a pas démarré dans le délai imparti (${timeoutMs} ms` +
      (lastStatus ? `, dernier statut /health : ${lastStatus}` : '') +
      `).` +
      (stderrTail ? `\n${stderrTail}` : ''),
  );
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
