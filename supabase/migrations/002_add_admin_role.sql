-- ============================================================
-- FitGO — Add Admin Role
-- Migration 002: Add role column and admin policies
-- ============================================================

-- 1. Add role column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('user', 'admin', 'super_admin')) DEFAULT 'user';

-- 2. Add an index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- 3. Update RLS policies to allow admins to see all users
-- Note: We use a subquery to check the role of the requesting user
CREATE POLICY "admins_read_all_users" ON public.users
  FOR SELECT
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- 4. Allow admins to update any user (optional, be careful)
-- For now, let's just stick to reading. 
