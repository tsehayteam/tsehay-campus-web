import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isMaintenanceMode = false; // Toggle to false when done
  if (
    isMaintenanceMode && 
    !request.nextUrl.pathname.startsWith('/maintenance') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    !request.nextUrl.pathname.startsWith('/_next') &&
    !request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // Protect sensitive admin subroutes like /admin/seed from unauthenticated direct access
  if (request.nextUrl.pathname.startsWith('/admin/seed')) {
    const adminSessionCookie = request.cookies.get('tc_admin_session')?.value;
    if (!adminSessionCookie) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  const response = NextResponse.next();

  // Defense-in-depth security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|tc-logo.jpg|maintenance).*)'],
};
