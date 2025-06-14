import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of public paths that don't require authentication
const publicPaths = [
  '/',
  '/auth/login',
  '/auth/register',
  '/products',
  '/products/[id]',
  '/api/auth/[...nextauth]',
];

// List of admin paths that require admin role
const adminPaths = [
  '/admin',
  '/admin/*',
  '/api/admin/*',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public paths
  if (publicPaths.some(path => pathname === path || pathname.startsWith(path.replace(/\[\w+\]/, '')))) {
    return NextResponse.next();
  }

  // Check for token in Authorization header
  const token = request.headers.get('authorization')?.split(' ')[1];

  if (!token) {
    // If no token and trying to access protected route, redirect to login
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    return NextResponse.json(
      { error: 'Требуется авторизация' },
      { status: 401 }
    );
  }

  try {
    // Call the new API route to verify the token
    const verifyResponse = await fetch(new URL('/api/auth/verify-token', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!verifyResponse.ok) {
      // If API returns an error (invalid token), redirect or return error
      if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        loginUrl.searchParams.set('error', 'SessionExpired');
        return NextResponse.redirect(loginUrl);
      }
    
      const errorBody = await verifyResponse.json();
      return NextResponse.json(errorBody, { status: verifyResponse.status });
    }

    // Token is valid, get user info from API response
    const { user: decoded } = await verifyResponse.json();

    // Check if user is trying to access admin routes without admin role
    if (adminPaths.some(path =>
      pathname === path ||
      (path.endsWith('/*') && pathname.startsWith(path.replace('/*', '')))
    )) {
      if (decoded.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Доступ запрещен. Требуются права администратора.' },
          { status: 403 }
        );
      }
    }

    // Add user info to request headers (optional, depending on how you access user info later)
    // You might prefer fetching user info in server components/API routes directly
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-role', decoded.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    // If token is invalid and trying to access protected route, redirect to login
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      loginUrl.searchParams.set('error', 'SessionExpired');
      return NextResponse.redirect(loginUrl);
    }
    
    return NextResponse.json(
      { error: 'Недействительный токен' },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};