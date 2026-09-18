import { NextResponse } from 'next/server';

export function GET() {
  return new NextResponse('google-site-verification: google3f5849f90e981ec9.html\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
