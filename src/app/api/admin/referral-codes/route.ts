import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';

export const dynamic = 'force-dynamic';

export interface PromoCodeItem {
  id: string;
  code?: string;
  discountPercent?: number;
  targetCourseId?: string;
  description?: string;
  isActive?: boolean;
  usageCount?: number;
  maxUsageLimit?: number; // 0 or undefined for Unlimited
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export async function GET() {
  try {
    const { data: row } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'referral_codes')
      .maybeSingle();

    if (row?.data) {
      const list: PromoCodeItem[] = Array.isArray(row.data) ? row.data : Object.values(row.data);
      return NextResponse.json({ success: true, codes: list });
    }

    return NextResponse.json({ success: true, codes: [] });
  } catch (error: any) {
    console.error('Error fetching referral codes in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error', codes: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin privileges required.' }, { status: 401 });
    }

    const body = await req.json();
    const { code, discountPercent, targetCourseId, description, isActive, maxUsageLimit } = body;

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const codeData: PromoCodeItem = {
      id: cleanCode,
      code: cleanCode,
      discountPercent: Number(discountPercent) || 0,
      targetCourseId: targetCourseId || 'all',
      description: description?.trim() || '',
      isActive: isActive !== false,
      usageCount: Number(body.usageCount) || 0,
      maxUsageLimit: Number(maxUsageLimit) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { data: existingRow } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'referral_codes')
      .maybeSingle();

    let list: PromoCodeItem[] = existingRow?.data && Array.isArray(existingRow.data) ? existingRow.data : [];
    const idx = list.findIndex(c => c.id === cleanCode || c.code === cleanCode);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...codeData };
    } else {
      list.push(codeData);
    }

    await supabaseServer.from('site_settings').upsert({
      key: 'referral_codes',
      data: list,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, message: `Code ${cleanCode} saved successfully`, data: codeData });
  } catch (error: any) {
    console.error('Error creating referral code in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin privileges required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const codeId = searchParams.get('codeId');

    if (!codeId) {
      return NextResponse.json({ error: 'Missing codeId' }, { status: 400 });
    }

    const cleanCode = codeId.trim().toUpperCase();

    const { data: existingRow } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'referral_codes')
      .maybeSingle();

    if (existingRow?.data && Array.isArray(existingRow.data)) {
      const list = existingRow.data.filter((c: PromoCodeItem) => c.id !== cleanCode && c.code !== cleanCode);
      await supabaseServer.from('site_settings').upsert({
        key: 'referral_codes',
        data: list,
        updated_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true, message: `Code ${cleanCode} deleted successfully` });
  } catch (error: any) {
    console.error('Error deleting referral code in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin privileges required.' }, { status: 401 });
    }

    const body = await req.json();
    const { codeId, isActive, maxUsageLimit } = body;

    if (!codeId) {
      return NextResponse.json({ error: 'Missing codeId' }, { status: 400 });
    }

    const cleanCode = codeId.trim().toUpperCase();

    const { data: existingRow } = await supabaseServer
      .from('site_settings')
      .select('data')
      .eq('key', 'referral_codes')
      .maybeSingle();

    if (existingRow?.data && Array.isArray(existingRow.data)) {
      const list = existingRow.data.map((c: PromoCodeItem) => {
        if (c.id === cleanCode || c.code === cleanCode) {
          return {
            ...c,
            isActive: isActive !== undefined ? Boolean(isActive) : c.isActive,
            maxUsageLimit: maxUsageLimit !== undefined ? Number(maxUsageLimit) : c.maxUsageLimit,
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      });

      await supabaseServer.from('site_settings').upsert({
        key: 'referral_codes',
        data: list,
        updated_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating referral code in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
