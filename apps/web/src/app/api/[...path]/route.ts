import { NextResponse, type NextRequest } from 'next/server';

/**
 * Relais same-origin vers l'API interne.
 *
 * Pourquoi un route handler et non un `rewrite` Next.js : les rewrites sont
 * figés à la compilation, alors que l'API cible diffère entre développement
 * (4100) et préproduction (4200) pour un même build. Ce relais lit
 * `API_INTERNAL_URL` à l'exécution.
 *
 * Avantages conservés :
 *  - une seule origine publique, donc cookies first-party et aucun CORS ;
 *  - le cookie `httpOnly` reste invisible pour le JavaScript client ;
 *  - l'API reste l'unique source de vérité pour l'authentification et le CSRF.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_URL = (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4100').replace(/\/+$/, '');

/** En-têtes propres à la connexion HTTP, à ne pas relayer. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'accept-encoding',
]);

async function forward(request: NextRequest, path: string[]): Promise<NextResponse> {
  const target = `${API_URL}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const method = request.method;
  const hasBody = method !== 'GET' && method !== 'HEAD';

  let response: Response;
  try {
    response = await fetch(target, {
      method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'API_UNAVAILABLE',
          message: 'Le service est momentanément indisponible. Merci de réessayer.',
        },
      },
      { status: 503 },
    );
  }

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== 'set-cookie') {
      responseHeaders.set(key, value);
    }
  });

  // Plusieurs cookies (session + éventuels drapeaux) doivent être conservés.
  for (const cookie of response.headers.getSetCookie()) {
    responseHeaders.append('set-cookie', cookie);
  }

  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return forward(request, path);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return forward(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return forward(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return forward(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return forward(request, path);
}
