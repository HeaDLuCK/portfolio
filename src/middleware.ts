import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const listPathName = pathname.split('/');
  const lang = listPathName[1] || 'en'; // Default to 'en' if no language is specified
  const token =listPathName[2] || 'missou'; // Default token if not specified
  
  if(lang.length == 2 && token.length > 0) {
    const url = request.nextUrl.clone();
    url.pathname = `/${lang}/${token}/${pathname.slice(listPathName[0].length + lang.length + token.length)}`;
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

    if(pathname === '/') {
      url.pathname = `/${lang}/${token}`;
      return NextResponse.redirect(url);
    }
    return res
  }
  
  return res;
}

export const config = {
  matcher: '/:path*', // match all routes
};
