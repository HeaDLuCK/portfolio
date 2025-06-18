import { notFound } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const url = request.url;
  const host = request.headers.get('host') || 'localhost';
  const hostname = host.split(':')[0]; // Get the hostname without port
  const pathname = request.nextUrl.pathname;
  const listPathName = pathname.split('/');
  const lang = listPathName[1] || 'en'; // Default to 'en' if no language is specified
  const token =listPathName[2] || 'missou'; // Default token if not specified
  if(lang.length == 2 && token.length > 0) {
    // If the language is valid (2 characters) and token is present, continue
    request.nextUrl.pathname = `/${lang}/${token}${pathname.slice(listPathName[0].length + listPathName[1].length + listPathName[2].length)}`;
    res.cookies.set('lang', lang, {
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    res.cookies.set('token', token, {
      path: '/',
      maxAge: 60 * 60 * 24,
      httpOnly: true, // prevent JS access if token is sensitive
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*', // match all routes
};
