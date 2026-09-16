-- ============================================================
-- TSEHAY CAMPUS - COMPLETE SUPABASE DATABASE SETUP SCHEMA
-- Paste and run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jzxgmikliwilyfpixskm/sql/new
-- ============================================================

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
    instructor TEXT DEFAULT 'Eyob Sahle',
    instructor_name TEXT DEFAULT 'Eyob Sahle',
    instructor_image TEXT,
    instructor_photo TEXT,
    image TEXT,
    banner TEXT,
    video TEXT,
    duration TEXT,
    level TEXT,
    category TEXT DEFAULT 'Digital Marketing',
    rating NUMERIC DEFAULT 5.0,
    students_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active',
    is_published BOOLEAN DEFAULT true,
    "isDeleted" BOOLEAN DEFAULT false,
    lessons JSONB DEFAULT '[]'::jsonb,
    modules JSONB DEFAULT '[]'::jsonb,
    requirements JSONB DEFAULT '[]'::jsonb,
    includes JSONB DEFAULT '[]'::jsonb,
    what_you_will_learn JSONB DEFAULT '[]'::jsonb,
    ai_prompt TEXT,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SITE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY,
    slug TEXT,
    title TEXT NOT NULL,
    title_en TEXT,
    description TEXT,
    category TEXT,
    date TEXT,
    time TEXT,
    location TEXT,
    is_online BOOLEAN DEFAULT false,
    meeting_link TEXT,
    maps_url TEXT,
    image TEXT,
    banner TEXT,
    video_url TEXT,
    capacity INTEGER DEFAULT 100,
    registered_count INTEGER DEFAULT 0,
    remaining_seats INTEGER DEFAULT 100,
    price NUMERIC DEFAULT 0,
    is_free BOOLEAN DEFAULT true,
    speaker TEXT,
    speaker_role TEXT,
    status TEXT DEFAULT 'Upcoming',
    tags JSONB DEFAULT '[]'::jsonb,
    speakers JSONB DEFAULT '[]'::jsonb,
    agenda JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. YOUTUBE VIDEOS TABLE
CREATE TABLE IF NOT EXISTS public.youtube_videos (
    id TEXT PRIMARY KEY,
    title TEXT,
    youtube_url TEXT,
    youtube_id TEXT,
    thumbnail TEXT,
    video_src TEXT,
    order_num INTEGER DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS public.enrollments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    user_email TEXT,
    user_name TEXT,
    status TEXT DEFAULT 'active',
    payment_method TEXT,
    amount_paid NUMERIC DEFAULT 0,
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PENDING PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.pending_payments (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    user_id TEXT,
    user_email TEXT,
    course_id TEXT,
    amount NUMERIC,
    currency TEXT DEFAULT 'ETB',
    gateway TEXT,
    status TEXT DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. CERTIFICATES TABLE
CREATE TABLE IF NOT EXISTS public.certificates (
    id TEXT PRIMARY KEY,
    certificate_code TEXT,
    student_name TEXT,
    student_id TEXT,
    course_id TEXT,
    course_title TEXT,
    issued_at TIMESTAMPTZ DEFAULT now()
);

-- 9. MENTORSHIP & REFERRALS TABLES
CREATE TABLE IF NOT EXISTS public.mentorship_bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    mentor_id TEXT,
    date TEXT,
    time TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
    id TEXT PRIMARY KEY,
    referrer_id TEXT,
    referred_id TEXT,
    code TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. COMMUNITY TABLES
CREATE TABLE IF NOT EXISTS public.community_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    author_name TEXT,
    author_avatar TEXT,
    content TEXT,
    media_url TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id TEXT,
    author_name TEXT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PERMISSIONS / ROW LEVEL SECURITY (RLS)
-- Allow application access to the tables
-- ============================================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for all application tables
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access policy" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Public access policy" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

-- Enable Realtime for courses and community (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'courses'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'site_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'community_posts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'community_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
    END IF;
END $$;

-- Safe migration columns for existing tables
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS maps_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS speaker TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS speaker_role TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS remaining_seats INTEGER DEFAULT 100;
ALTER TABLE public.youtube_videos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

