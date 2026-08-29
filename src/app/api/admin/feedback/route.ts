import { NextRequest, NextResponse } from 'next/server';
import { GET as getFeedback, PATCH as patchFeedback, DELETE as deleteFeedback } from '@/app/api/feedback/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return getFeedback(req);
}

export async function PATCH(req: NextRequest) {
  return patchFeedback(req);
}

export async function PUT(req: NextRequest) {
  return patchFeedback(req);
}

export async function DELETE(req: NextRequest) {
  return deleteFeedback(req);
}
