-- ============================================================================
-- Migration: Enable Row Level Security (RLS)
-- ============================================================================
-- Purpose: 
--   Enables Row Level Security on all user-facing tables to ensure
--   proper data isolation between users. This migration activates the
--   security policies that were prepared but disabled in the initial schema.
--
-- Tables affected: 
--   - public.flashcards (RLS enabled + policies)
--   - public.generations (RLS enabled + policies)
--
-- Security impact:
--   - After this migration, users can only access their own data
--   - Prevents unauthorized access to other users' flashcards and analytics
--   - Enforces ownership validation on all CRUD operations
--
-- Author: 10xCards Team
-- Date: 2025-12-10
-- Schema Version: 1.1.0
-- ============================================================================

-- ============================================================================
-- 1. RLS for flashcards table
-- ============================================================================
-- Purpose: Ensures users can only access their own flashcards
-- Security requirement: US-001 (user data isolation)

alter table public.flashcards enable row level security;

-- Policy: SELECT - Users can view only their own flashcards
-- Applies to: All authenticated users
-- Use case: Viewing flashcard list (US-007), flashcard details
create policy "flashcards_select_own"
  on public.flashcards
  for select
  to authenticated
  using (auth.uid() = user_id);

comment on policy "flashcards_select_own" on public.flashcards is 
  'Allows users to view only their own flashcards (US-001: data isolation)';

-- Policy: INSERT - Users can create flashcards only for themselves
-- Applies to: All authenticated users
-- Use case: Saving AI-generated cards (US-005), manual card creation (US-006)
create policy "flashcards_insert_own"
  on public.flashcards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

comment on policy "flashcards_insert_own" on public.flashcards is 
  'Allows users to create flashcards only under their own ownership (US-005, US-006)';

-- Policy: UPDATE - Users can modify only their own flashcards
-- Applies to: All authenticated users
-- Use case: Editing saved flashcards (US-008)
-- Note: USING clause ensures user can only target their cards
--       WITH CHECK ensures user cannot transfer ownership
create policy "flashcards_update_own"
  on public.flashcards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on policy "flashcards_update_own" on public.flashcards is 
  'Allows users to edit only their own flashcards (US-008: CRUD operations)';

-- Policy: DELETE - Users can remove only their own flashcards
-- Applies to: All authenticated users
-- Use case: Deleting unwanted flashcards (US-008)
-- Note: Hard delete strategy (no soft deletes in MVP)
create policy "flashcards_delete_own"
  on public.flashcards
  for delete
  to authenticated
  using (auth.uid() = user_id);

comment on policy "flashcards_delete_own" on public.flashcards is 
  'Allows users to delete only their own flashcards (US-008: CRUD operations)';

-- ============================================================================
-- 2. RLS for generations table
-- ============================================================================
-- Purpose: Ensures users can only access their own generation logs
-- Security requirement: Analytics data isolation

alter table public.generations enable row level security;

-- Policy: SELECT - Users can view only their own generation logs
-- Applies to: All authenticated users
-- Use case: Optional feature to display generation history to user
create policy "generations_select_own"
  on public.generations
  for select
  to authenticated
  using (auth.uid() = user_id);

comment on policy "generations_select_own" on public.generations is 
  'Allows users to view only their own generation logs (analytics data isolation)';

-- Policy: INSERT - Users can create generation logs only for themselves
-- Applies to: All authenticated users
-- Use case: Logging AI generation sessions (US-003)
-- Note: This is typically done server-side during AI generation process
create policy "generations_insert_own"
  on public.generations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

comment on policy "generations_insert_own" on public.generations is 
  'Allows users to create generation logs only under their own ownership (US-003)';

-- Policy: DELETE - Users can delete their own generation logs
-- Applies to: All authenticated users
-- Use case: Optional feature for users to clear their generation history
-- Note: This is a future feature beyond MVP scope
-- Note: Deletion cascades to SET NULL on flashcards.generation_id
create policy "generations_delete_own"
  on public.generations
  for delete
  to authenticated
  using (auth.uid() = user_id);

comment on policy "generations_delete_own" on public.generations is 
  'Allows users to delete their own generation logs (future feature for history cleanup)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================


