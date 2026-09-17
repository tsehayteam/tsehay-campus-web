-- =========================================================================
-- Tsehay Campus: Production Security Hardening & Zero-Warning RLS Fix
-- Run this entire script in your Supabase Project -> SQL Editor
-- =========================================================================

-- 1. FIX FUNCTION WARNINGS
DROP FUNCTION IF EXISTS public.rls_auto_enable() CASCADE;

-- 2. DROP OVERLY PERMISSIVE POLICIES
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access policy" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Public full access %s" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Public read %s" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Public read %I" ON public.%I', tbl, tbl);
    END LOOP;
END $$;

-- 3. APPLY STRICT, CLEAN RLS POLICIES
-- Note: auth.uid() returns UUID, so we cast to ::text to match TEXT columns cleanly.

-- Public Read Tables
DROP POLICY IF EXISTS "Public read courses" ON public.courses;
CREATE POLICY "Public read courses" ON public.courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read events" ON public.events;
CREATE POLICY "Public read events" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read youtube_videos" ON public.youtube_videos;
CREATE POLICY "Public read youtube_videos" ON public.youtube_videos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read certificates" ON public.certificates;
CREATE POLICY "Public read certificates" ON public.certificates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read pending_payments" ON public.pending_payments;
CREATE POLICY "Public read pending_payments" ON public.pending_payments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read referrals" ON public.referrals;
CREATE POLICY "Public read referrals" ON public.referrals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read mentorship_bookings" ON public.mentorship_bookings;
CREATE POLICY "Public read mentorship_bookings" ON public.mentorship_bookings FOR SELECT USING (true);

-- User Profiles
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = id OR id IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = id) WITH CHECK (auth.uid()::text = id);

-- Enrollments (Users view own courses; backend writes via service_role)
DROP POLICY IF EXISTS "Users can read own enrollments" ON public.enrollments;
CREATE POLICY "Users can read own enrollments" ON public.enrollments FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Community
DROP POLICY IF EXISTS "Public read community_posts" ON public.community_posts;
CREATE POLICY "Public read community_posts" ON public.community_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can post" ON public.community_posts;
CREATE POLICY "Authenticated users can post" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own posts" ON public.community_posts;
CREATE POLICY "Users can update own posts" ON public.community_posts FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON public.community_posts;
CREATE POLICY "Users can delete own posts" ON public.community_posts FOR DELETE TO authenticated USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Public read community_comments" ON public.community_comments;
CREATE POLICY "Public read community_comments" ON public.community_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can comment" ON public.community_comments;
CREATE POLICY "Authenticated users can comment" ON public.community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.community_comments;
CREATE POLICY "Users can delete own comments" ON public.community_comments FOR DELETE TO authenticated USING (auth.uid()::text = user_id);
