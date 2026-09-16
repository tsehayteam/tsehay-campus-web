import { NextRequest, NextResponse } from 'next/server';
import { POST as registerHandler } from '@/app/api/events/register/route';
import { GET as getTicketsHandler } from '@/app/api/events/tickets/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Forward GET requests to /api/events/tickets
export async function GET(req: NextRequest) {
  return getTicketsHandler(req);
}

// Forward POST requests to /api/events/register
export async function POST(req: NextRequest) {
  return registerHandler(req);
}
