-- Migration: Add role and auth_user_id columns if they don't exist
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'news_only' CHECK (role IN ('full', 'news_only'));

ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop existing policies (safe, will skip if they don't exist)
DROP POLICY IF EXISTS "read_admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "admin_manage_users" ON public.admin_users;
DROP POLICY IF EXISTS "read_news" ON public.news;
DROP POLICY IF EXISTS "admin_insert_news" ON public.news;
DROP POLICY IF EXISTS "admin_update_news" ON public.news;
DROP POLICY IF EXISTS "admin_delete_news" ON public.news;

-- Recreate policies
CREATE POLICY "read_admin_users" ON public.admin_users
  FOR SELECT USING (TRUE);

CREATE POLICY "admin_manage_users" ON public.admin_users
  FOR ALL USING (
    auth.uid() IN (
      SELECT auth.users.id FROM auth.users
      WHERE email IN (SELECT email FROM public.admin_users)
    )
  );

-- News table policies
CREATE POLICY "read_news" ON public.news
  FOR SELECT USING (TRUE);

CREATE POLICY "admin_insert_news" ON public.news
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT auth.users.id FROM auth.users
      WHERE email IN (SELECT email FROM public.admin_users)
    )
  );

CREATE POLICY "admin_update_news" ON public.news
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT auth.users.id FROM auth.users
      WHERE email IN (SELECT email FROM public.admin_users)
    )
  );

CREATE POLICY "admin_delete_news" ON public.news
  FOR DELETE USING (
    auth.uid() IN (
      SELECT auth.users.id FROM auth.users
      WHERE email IN (SELECT email FROM public.admin_users)
    )
  );
