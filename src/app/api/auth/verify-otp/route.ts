import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({ error: 'ኢሜል እና የማረጋገጫ ኮድ ያስፈልጋል።' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (cleanCode.length !== 6) {
      return NextResponse.json({ error: 'እባክዎ ትክክለኛ 6-አሃዝ ኮድ ያስገቡ።' }, { status: 400 });
    }

    const docKey = `otp_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
      const { data: record } = await supabaseServer
        .from('site_settings')
        .select('data')
        .eq('key', docKey)
        .maybeSingle();

      if (!record || !record.data || !record.data.code) {
        return NextResponse.json({ error: 'የማረጋገጫ ኮድ አልተገኘም። እባክዎ አዲስ ኮድ ይጠይቁ።' }, { status: 400 });
      }

      const data = record.data;

      // 1. Expiration Check (15 mins)
      if (Date.now() > (data?.expiresAt || 0)) {
        return NextResponse.json({ error: 'የማረጋገጫ ኮዱ ጊዜው አልፎበታል (Expired)። እባክዎ አዲስ ኮድ ይጠይቁ።' }, { status: 400 });
      }

      // 2. Max Attempts Check
      if ((data?.attempts || 0) >= 5) {
        return NextResponse.json({ error: 'ኮዱን ደጋግመው ተሳስተዋል! እባክዎ አዲስ ኮድ ይጠይቁ።' }, { status: 429 });
      }

      // 3. Match Verification
      if (data?.code !== cleanCode) {
        const updatedData = { ...data, attempts: (data?.attempts || 0) + 1 };
        await supabaseServer
          .from('site_settings')
          .upsert({
            key: docKey,
            data: updatedData,
            updated_at: new Date().toISOString()
          });

        const remaining = 4 - (data?.attempts || 0);
        return NextResponse.json({ 
          error: `የተሳሳተ ኮድ አስገብተዋል። ${remaining > 0 ? `(የቀሩ ሙከራዎች፡ ${remaining})` : 'እባክዎ አዲስ ኮድ ይጠይቁ።'}` 
        }, { status: 400 });
      }

      // 4. Mark verified
      const verifiedData = { ...data, verified: true, verifiedAt: Date.now() };
      await supabaseServer
        .from('site_settings')
        .upsert({
          key: docKey,
          data: verifiedData,
          updated_at: new Date().toISOString()
        });
    } catch (dbErr) {
      console.warn('Supabase verify notice:', dbErr);
      return NextResponse.json({ error: 'ኮዱን ማረጋገጥ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'ኢሜልዎ በተሳካ ሁኔታ ተረጋግጧል!'
    });
  } catch (error: any) {
    console.error('Error in verify-otp API:', error);
    return NextResponse.json({ error: 'ኮዱን ማረጋገጥ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።' }, { status: 500 });
  }
}
