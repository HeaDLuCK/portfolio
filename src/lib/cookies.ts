import type { NextRequest } from 'next/server';

export function getTokenAndLang(request: NextRequest | Request): { token?: string; lang?: string } {
  if ('cookies' in request) {
    const token = request.cookies.get('token')?.value;
    const lang = request.cookies.get('lang')?.value;
    return { token, lang };
  }

  // Otherwise parse cookies from headers
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(cookie => cookie.split('='))
  );
  return {
    token: cookies['token'],
    lang: cookies['lang'],
  };
}
