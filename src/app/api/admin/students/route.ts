import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminRequest } from '@/lib/adminAuthHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin privileges required.', profiles: [], enrollments: [] },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const userMap = new Map<string, any>();

    // 1. Fetch live registered Auth Users from Supabase (Source of truth for Google/Email signups)
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (!authError && Array.isArray(authData?.users)) {
        authData.users.forEach((u: any) => {
          const meta = u.user_metadata || {};
          const name = meta.full_name || meta.name || (u.email ? u.email.split('@')[0] : 'Student');
          const photo = meta.avatar_url || meta.picture || '';
          userMap.set(u.id, {
            id: u.id,
            uid: u.id,
            name,
            fullName: name,
            displayName: name,
            email: u.email || '',
            phone: u.phone || meta.phone || '',
            photoURL: photo,
            avatarUrl: photo,
            role: u.app_metadata?.role || 'student',
            isAdmin: u.app_metadata?.role === 'admin' || (u.email && u.email.toLowerCase().includes('admin')),
            createdAt: u.created_at,
            updatedAt: u.updated_at || u.created_at
          });
        });
      }
    } catch (authErr) {
      console.warn('Supabase auth.admin.listUsers notice in admin/students:', authErr);
    }

    // 2. Fetch all student profiles from Supabase and overlay rich profile data
    try {
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!profileError && Array.isArray(profiles)) {
        profiles.forEach((p: any) => {
          const existing = userMap.get(p.id) || {};
          const name = p.full_name || existing.fullName || existing.name || p.email?.split('@')[0] || 'Student';
          const photo = p.avatar_url || existing.photoURL || '';
          userMap.set(p.id, {
            ...existing,
            ...p,
            id: p.id,
            uid: p.id,
            name,
            fullName: name,
            displayName: name,
            email: p.email || existing.email || '',
            phone: p.phone || existing.phone || '',
            photoURL: photo,
            avatarUrl: photo,
            role: p.role || existing.role || 'student',
            isAdmin: !!p.is_admin || existing.isAdmin || false,
            createdAt: p.created_at || existing.createdAt || new Date().toISOString(),
            updatedAt: p.updated_at || existing.updatedAt || new Date().toISOString()
          });
        });
      }
    } catch (profileErr) {
      console.warn('Supabase profiles fetch notice in admin/students:', profileErr);
    }

    // 3. Fetch all enrollments / course purchases from Supabase using supabaseAdmin
    let safeEnrollments: any[] = [];
    try {
      const { data: enrollments, error: enrollmentError } = await supabaseAdmin
        .from('enrollments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!enrollmentError && Array.isArray(enrollments)) {
        safeEnrollments = enrollments.map((e: any) => ({
          id: e.id,
          userId: e.user_id,
          studentEmail: e.user_email,
          email: e.user_email,
          courseId: e.course_id,
          courseTitle: e.course_title,
          amount: Number(e.amount || 0),
          currency: e.currency || 'ETB',
          paymentMethod: e.payment_method || 'free',
          transactionRef: e.transaction_ref,
          status: e.status || 'completed',
          purchasedAt: e.created_at,
          createdAt: e.created_at
        }));
      }
    } catch (enrollErr) {
      console.warn('Supabase enrollments fetch notice in admin/students:', enrollErr);
    }

    const safeProfiles = Array.from(userMap.values());

    return NextResponse.json({
      success: true,
      count: safeProfiles.length,
      profiles: safeProfiles,
      enrollments: safeEnrollments
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Admin students API error:', err);
    return NextResponse.json(
      { success: false, error: err.message, profiles: [], enrollments: [] },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin privileges required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'profile';

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });
    }

    if (type === 'enrollment') {
      await supabaseAdmin.from('enrollments').delete().eq('id', id);
    } else {
      await supabaseAdmin.from('profiles').delete().eq('id', id);
      try {
        await supabaseAdmin.auth.admin.deleteUser(id);
      } catch (authDelErr) {}
    }

    return NextResponse.json({ success: true, message: `Deleted ${type} ${id}` }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Delete student/enrollment error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
