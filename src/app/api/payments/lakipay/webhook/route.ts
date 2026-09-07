import { NextRequest } from 'next/server';
import { handleLakiPayWebhook } from '@/lib/paymentWebhookHandler';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return handleLakiPayWebhook(request);
}

export async function GET() {
  return new Response('LakiPay Webhook Listener Active', { status: 200 });
}
