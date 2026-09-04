import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export interface PromoCodeItem {
  id: string;
  code?: string;
  discountPercent?: number;
  targetCourseId?: string;
  description?: string;
  isActive?: boolean;
  usageCount?: number;
  maxUsageLimit?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export async function GET() {
  try {
    const { data: sbCodes, error: sbErr } = await supabase
      .from('referral_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (sbErr) {
      console.warn('Supabase fetch referral codes warning:', sbErr);
      return NextResponse.json({ success: true, codes: [] });
    }

    const list: PromoCodeItem[] = (sbCodes || []).map(c => ({
      id: c.id,
      code: c.code,
      discountPercent: Number(c.discount_percent) || 0,
      targetCourseId: c.target_course_id || 'all',
      description: c.description || '',
      isActive: c.is_active ?? true,
      usageCount: Number(c.usage_count) || 0,
      maxUsageLimit: Number(c.max_usage_limit) || 0,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return NextResponse.json({ success: true, codes: list });
  } catch (error: any) {
    console.warn('Notice fetching referral codes in API route:', error);
    return NextResponse.json({ success: true, codes: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, discountPercent, targetCourseId, description, isActive, maxUsageLimit } = body;

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const codeData = {
      id: cleanCode,
      code: cleanCode,
      discount_percent: Number(discountPercent) || 0,
      target_course_id: targetCourseId || 'all',
      description: description?.trim() || '',
      is_active: isActive !== false,
      usage_count: Number(body.usageCount) || 0,
      max_usage_limit: Number(maxUsageLimit) || 0,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('referral_codes').upsert(codeData);
    if (error) {
      console.error('Supabase upsert referral_code error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Code ${cleanCode} saved successfully`, 
      data: {
        id: cleanCode,
        code: cleanCode,
        discountPercent: codeData.discount_percent,
        targetCourseId: codeData.target_course_id,
        description: codeData.description,
        isActive: codeData.is_active,
        usageCount: codeData.usage_count,
        maxUsageLimit: codeData.max_usage_limit
      }
    });
  } catch (error: any) {
    console.error('Error creating referral code in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const codeId = searchParams.get('codeId');

    if (!codeId) {
      return NextResponse.json({ error: 'Missing codeId' }, { status: 400 });
    }

    const cleanCode = codeId.trim().toUpperCase();

    const { error } = await supabase.from('referral_codes').delete().eq('id', cleanCode);
    if (error) {
      console.error('Supabase delete referral_code error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Code ${cleanCode} deleted successfully` });
  } catch (error: any) {
    console.error('Error deleting referral code in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { codeId, isActive, maxUsageLimit } = body;

    if (!codeId) {
      return NextResponse.json({ error: 'Missing codeId' }, { status: 400 });
    }

    const cleanCode = codeId.trim().toUpperCase();
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    if (isActive !== undefined) updateData.is_active = Boolean(isActive);
    if (maxUsageLimit !== undefined) updateData.max_usage_limit = Number(maxUsageLimit) || 0;

    const { error } = await supabase.from('referral_codes').update(updateData).eq('id', cleanCode);
    if (error) {
      console.error('Supabase update referral_code error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating referral code in API route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
