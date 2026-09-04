-- =========================================================================
-- Tsehay Campus: Complete PostgreSQL Database Schema for Supabase
-- Run this entire script in your Supabase Project -> SQL Editor
-- =========================================================================

-- 1. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY,
    slug TEXT,
    title TEXT NOT NULL,
    title_en TEXT,
    description TEXT,
    "desc" TEXT,
    price NUMERIC DEFAULT 0,
    old_price NUMERIC,
    instructor TEXT,
    instructor_name TEXT,
    instructor_image TEXT,
    instructor_photo TEXT,
    instructor_bio TEXT,
    instructor_telegram TEXT,
    image TEXT,
    banner TEXT,
    video TEXT,
    status TEXT DEFAULT 'Active',
    is_published BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    category TEXT DEFAULT 'Digital Marketing',
    tag TEXT,
    badge TEXT,
    lessons JSONB DEFAULT '[]'::jsonb,
    modules JSONB DEFAULT '[]'::jsonb,
    requirements JSONB DEFAULT '[]'::jsonb,
    includes JSONB DEFAULT '[]'::jsonb,
    what_you_will_learn JSONB DEFAULT '[]'::jsonb,
    ai_prompt TEXT,
    raw_data JSONB DEFAULT '{}'::jsonb,
    timestamp BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SITE SETTINGS TABLE (Landing Video, About Video, AI Settings, etc.)
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. YOUTUBE VIDEOS TABLE (Slider on Home Page)
CREATE TABLE IF NOT EXISTS public.youtube_videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    youtube_url TEXT NOT NULL,
    youtube_id TEXT,
    thumbnail TEXT,
    video_src TEXT,
    order_num INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'Active',
    timestamp BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY,
    slug TEXT,
    title TEXT NOT NULL,
    title_en TEXT,
    description TEXT,
    date TEXT,
    time TEXT,
    location TEXT,
    is_online BOOLEAN DEFAULT FALSE,
    meeting_link TEXT,
    maps_url TEXT,
    capacity INTEGER DEFAULT 100,
    registered_count INTEGER DEFAULT 0,
    price NUMERIC DEFAULT 0,
    is_free BOOLEAN DEFAULT FALSE,
    speaker TEXT,
    speaker_role TEXT,
    image TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'upcoming',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EVENT REGISTRATIONS & QR TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id TEXT PRIMARY KEY,
    ticket_id TEXT,
    event_id TEXT,
    event_slug TEXT,
    event_title TEXT,
    user_id TEXT,
    attendee_name TEXT NOT NULL,
    attendee_email TEXT NOT NULL,
    attendee_phone TEXT,
    ticket_type TEXT DEFAULT 'in_person',
    status TEXT DEFAULT 'registered',
    attended BOOLEAN DEFAULT FALSE,
    qr_code_data TEXT,
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. REFERRAL & PROMO CODES TABLE
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_percent NUMERIC DEFAULT 0,
    target_course_id TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    max_usage_limit INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'student',
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ENROLLMENTS & PURCHASES TABLE
CREATE TABLE IF NOT EXISTS public.enrollments (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT,
    course_id TEXT NOT NULL,
    course_title TEXT,
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'ETB',
    payment_method TEXT DEFAULT 'telebirr',
    transaction_ref TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. WAITLISTS TABLE
CREATE TABLE IF NOT EXISTS public.waitlists (
    id TEXT PRIMARY KEY,
    course_id TEXT,
    course_title TEXT,
    student_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. MENTORSHIP BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.mentorship_bookings (
    id TEXT PRIMARY KEY,
    tier_id TEXT,
    tier_name TEXT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    meeting_mode TEXT DEFAULT 'online',
    selected_time TEXT,
    topic TEXT,
    price NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) WITH SEAMLESS PERMISSIVE POLICIES
-- =========================================================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_bookings ENABLE ROW LEVEL SECURITY;

-- Allow Public/Anon Read & Write on public content tables to guarantee zero permission errors
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public full access courses" ON public.courses;
    CREATE POLICY "Public full access courses" ON public.courses FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access site_settings" ON public.site_settings;
    CREATE POLICY "Public full access site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access youtube_videos" ON public.youtube_videos;
    CREATE POLICY "Public full access youtube_videos" ON public.youtube_videos FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access events" ON public.events;
    CREATE POLICY "Public full access events" ON public.events FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access event_registrations" ON public.event_registrations;
    CREATE POLICY "Public full access event_registrations" ON public.event_registrations FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access referral_codes" ON public.referral_codes;
    CREATE POLICY "Public full access referral_codes" ON public.referral_codes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access profiles" ON public.profiles;
    CREATE POLICY "Public full access profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access enrollments" ON public.enrollments;
    CREATE POLICY "Public full access enrollments" ON public.enrollments FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access waitlists" ON public.waitlists;
    CREATE POLICY "Public full access waitlists" ON public.waitlists FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access mentorship_bookings" ON public.mentorship_bookings;
    CREATE POLICY "Public full access mentorship_bookings" ON public.mentorship_bookings FOR ALL USING (true) WITH CHECK (true);
END $$;

-- =========================================================================
-- ENABLE POSTGRES REALTIME ON ALL RELEVANT TABLES
-- =========================================================================
ALTER TABLE public.courses REPLICA IDENTITY FULL;
ALTER TABLE public.site_settings REPLICA IDENTITY FULL;
ALTER TABLE public.youtube_videos REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.event_registrations REPLICA IDENTITY FULL;
ALTER TABLE public.referral_codes REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.youtube_videos;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.event_registrations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_codes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- =========================================================================
-- GRANT PERMISSIONS TO ANON & AUTHENTICATED ROLES
-- =========================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
