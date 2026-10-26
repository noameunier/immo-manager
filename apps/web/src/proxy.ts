import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'immo_session';

const PROTECTED_PREFIXES = [
  '/tableau-de-bord',
  '/entites',
  '/immeubles',
  '/biens',
  '/profil',
];

const AUTH_PAGES = ['/connexion', '/inscription'];

/**
 * Aiguillage basé sur la présence du cookie de session.
 * La validité réelle de la session est toujours vérifiée par l'API :
 * ce middleware ne fait qu'éviter un aller-retour inutile.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!hasSession && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const loginUrl = new URL('/connexion', request.url);
    loginUrl.searchParams.set('suivant', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/tableau-de-bord', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
