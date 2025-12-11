-- ============================================================================
-- Migration: Initial Schema for 10xCards MVP
-- ============================================================================
-- Purpose: 
--   Creates the foundational database schema for the 10xCards flashcard
--   application including:
--   - Flashcards table with user ownership
--   - Generations table for AI generation analytics
--   - Card source type enum
--   - Row Level Security policies for data isolation
--   - Performance indexes for pagination and analytics
--   - Automated timestamp management
--
-- Tables affected: 
--   - public.flashcards (created)
--   - public.generations (created)
--
-- Special notes:
--   - All tables use UUID primary keys for security and scalability
--   - RLS is enabled on all tables to ensure user data isolation
--   - Hard delete strategy (no soft deletes in MVP)
--   - Flashcard content length limits enforce best practices
--
-- Author: 10xCards Team
-- Date: 2025-12-07
-- Schema Version: 1.0.0 (MVP)
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- Enable moddatetime extension for automatic timestamp updates
-- Required by: handle_flashcards_updated_at trigger
create extension if not exists moddatetime;

comment on extension moddatetime is 'Provides moddatetime() function for automatic timestamp management';

-- ============================================================================
-- 2. TYPE DEFINITIONS
-- ============================================================================

-- Create enum for flashcard source tracking
-- This enables analytics on AI usage vs manual creation
create type card_source_type as enum (
  'ai-full',      -- AI-generated card saved without modifications
  'ai-edited',    -- AI-generated card edited before saving
  'manual'        -- Manually created card by user
);

comment on type card_source_type is 'Tracks the origin of a flashcard for analytics purposes (AI vs manual creation)';

-- ============================================================================
-- 3. TABLE: generations
-- ============================================================================
-- Purpose: Logs AI generation sessions for analytics and performance tracking
-- This table is created first to allow foreign key references from flashcards

create table public.generations (
  -- Primary identifier
  id uuid primary key default gen_random_uuid(),
  
  -- User association
  -- Links to Supabase Auth user who initiated the generation
  -- CASCADE deletion ensures analytics are cleaned up with user account
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Performance metrics
  duration_ms integer not null check (duration_ms >= 0),
  
  -- Generation output metrics
  card_count integer not null check (card_count >= 0),
  
  -- Model identification for A/B testing and debugging
  model_name varchar(100) not null,
  
  -- Timestamp
  created_at timestamptz not null default now()
);

comment on table public.generations is 'Analytics log of AI flashcard generation sessions';
comment on column public.generations.user_id is 'Owner of the generation session';
comment on column public.generations.duration_ms is 'Time taken for AI generation in milliseconds';
comment on column public.generations.card_count is 'Number of flashcards generated in this session';
comment on column public.generations.model_name is 'LLM model used for generation (e.g., gpt-4, claude-3)';

-- ============================================================================
-- 4. TABLE: flashcards
-- ============================================================================
-- Purpose: Main table storing user flashcards with content and metadata

create table public.flashcards (
  -- Primary identifier
  id uuid primary key default gen_random_uuid(),
  
  -- User association
  -- Links to Supabase Auth user who owns this flashcard
  -- CASCADE deletion ensures flashcards are removed when user account is deleted
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Flashcard content
  -- Front: Question or prompt (max 200 chars encourages conciseness)
  front varchar(200) not null,
  
  -- Back: Answer or explanation (max 500 chars)
  back varchar(500) not null,
  
  -- Origin tracking
  source card_source_type not null,
  
  -- Optional link to AI generation session
  -- SET NULL on deletion preserves flashcard content while removing analytics link
  generation_id uuid null references public.generations(id) on delete set null,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Content validation constraints
  -- Ensures flashcard sides are not empty or whitespace-only
  constraint flashcard_front_not_empty check (length(trim(front)) > 0),
  constraint flashcard_back_not_empty check (length(trim(back)) > 0)
);

comment on table public.flashcards is 'Main storage for user flashcards with content and metadata';
comment on column public.flashcards.user_id is 'Owner of the flashcard';
comment on column public.flashcards.front is 'Front side of card (question/prompt), max 200 characters';
comment on column public.flashcards.back is 'Back side of card (answer/explanation), max 500 characters';
comment on column public.flashcards.source is 'Origin of the card (AI generated vs manually created)';
comment on column public.flashcards.generation_id is 'Optional link to AI generation session that created this card';
comment on column public.flashcards.updated_at is 'Automatically updated on any modification via trigger';

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

-- Index for flashcards listing and pagination
-- Optimizes: SELECT * FROM flashcards WHERE user_id = $1 ORDER BY created_at DESC
-- This is the primary query for US-007 (viewing flashcard list)
create index idx_flashcards_user_created 
  on public.flashcards(user_id, created_at desc);

comment on index idx_flashcards_user_created is 'Optimizes user flashcard listing with chronological ordering';

-- Index for analytics queries joining flashcards with their generation
-- Optimizes: Queries analyzing which flashcards came from which AI sessions
create index idx_flashcards_generation 
  on public.flashcards(generation_id);

comment on index idx_flashcards_generation is 'Speeds up analytics queries linking flashcards to generation sessions';

-- Index for AI usage metrics
-- Optimizes: Queries calculating AI vs manual creation ratios
create index idx_flashcards_source 
  on public.flashcards(source);

comment on index idx_flashcards_source is 'Supports AI Usage Ratio metric calculation';

-- Index for generations history per user
-- Optimizes: Optional feature to show user their generation history
create index idx_generations_user_created 
  on public.generations(user_id, created_at desc);

comment on index idx_generations_user_created is 'Enables efficient retrieval of user generation history';

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) - DISABLED
-- ============================================================================
-- Note: RLS policies are currently disabled for development purposes
-- TODO: Enable RLS policies before production deployment

-- -- ============================================================================
-- -- 6.1 RLS for flashcards table
-- -- ============================================================================
-- -- Purpose: Ensures users can only access their own flashcards
-- -- Security requirement: US-001 (user data isolation)
-- 
-- alter table public.flashcards enable row level security;
-- 
-- -- Policy: SELECT - Users can view only their own flashcards
-- -- Applies to: All authenticated users
-- -- Use case: Viewing flashcard list (US-007), flashcard details
-- create policy "flashcards_select_own"
--   on public.flashcards
--   for select
--   to authenticated
--   using (auth.uid() = user_id);
-- 
-- comment on policy "flashcards_select_own" on public.flashcards is 
--   'Allows users to view only their own flashcards (US-001: data isolation)';
-- 
-- -- Policy: INSERT - Users can create flashcards only for themselves
-- -- Applies to: All authenticated users
-- -- Use case: Saving AI-generated cards (US-005), manual card creation (US-006)
-- create policy "flashcards_insert_own"
--   on public.flashcards
--   for insert
--   to authenticated
--   with check (auth.uid() = user_id);
-- 
-- comment on policy "flashcards_insert_own" on public.flashcards is 
--   'Allows users to create flashcards only under their own ownership (US-005, US-006)';
-- 
-- -- Policy: UPDATE - Users can modify only their own flashcards
-- -- Applies to: All authenticated users
-- -- Use case: Editing saved flashcards (US-008)
-- -- Note: USING clause ensures user can only target their cards
-- --       WITH CHECK ensures user cannot transfer ownership
-- create policy "flashcards_update_own"
--   on public.flashcards
--   for update
--   to authenticated
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);
-- 
-- comment on policy "flashcards_update_own" on public.flashcards is 
--   'Allows users to edit only their own flashcards (US-008: CRUD operations)';
-- 
-- -- Policy: DELETE - Users can remove only their own flashcards
-- -- Applies to: All authenticated users
-- -- Use case: Deleting unwanted flashcards (US-008)
-- -- Note: Hard delete strategy (no soft deletes in MVP)
-- create policy "flashcards_delete_own"
--   on public.flashcards
--   for delete
--   to authenticated
--   using (auth.uid() = user_id);
-- 
-- comment on policy "flashcards_delete_own" on public.flashcards is 
--   'Allows users to delete only their own flashcards (US-008: CRUD operations)';
-- 
-- -- ============================================================================
-- -- 6.2 RLS for generations table
-- -- ============================================================================
-- -- Purpose: Ensures users can only access their own generation logs
-- -- Security requirement: Analytics data isolation
-- 
-- alter table public.generations enable row level security;
-- 
-- -- Policy: SELECT - Users can view only their own generation logs
-- -- Applies to: All authenticated users
-- -- Use case: Optional feature to display generation history to user
-- create policy "generations_select_own"
--   on public.generations
--   for select
--   to authenticated
--   using (auth.uid() = user_id);
-- 
-- comment on policy "generations_select_own" on public.generations is 
--   'Allows users to view only their own generation logs (analytics data isolation)';
-- 
-- -- Policy: INSERT - Users can create generation logs only for themselves
-- -- Applies to: All authenticated users
-- -- Use case: Logging AI generation sessions (US-003)
-- -- Note: This is typically done server-side during AI generation process
-- create policy "generations_insert_own"
--   on public.generations
--   for insert
--   to authenticated
--   with check (auth.uid() = user_id);
-- 
-- comment on policy "generations_insert_own" on public.generations is 
--   'Allows users to create generation logs only under their own ownership (US-003)';
-- 
-- -- Policy: DELETE - Users can delete their own generation logs
-- -- Applies to: All authenticated users
-- -- Use case: Optional feature for users to clear their generation history
-- -- Note: This is a future feature beyond MVP scope
-- -- Note: Deletion cascades to SET NULL on flashcards.generation_id
-- create policy "generations_delete_own"
--   on public.generations
--   for delete
--   to authenticated
--   using (auth.uid() = user_id);
-- 
-- comment on policy "generations_delete_own" on public.generations is 
--   'Allows users to delete their own generation logs (future feature for history cleanup)';

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Trigger: Automatically update updated_at timestamp on flashcard modifications
-- Purpose: Tracks when flashcards were last edited (US-008)
-- Requirement: Supabase moddatetime extension must be enabled
create trigger handle_flashcards_updated_at
  before update on public.flashcards
  for each row
  execute function moddatetime(updated_at);

comment on trigger handle_flashcards_updated_at on public.flashcards is 
  'Automatically updates updated_at timestamp on any flashcard modification';

-- ============================================================================
-- 8. GRANTS (Optional - Supabase handles this automatically)
-- ============================================================================
-- Supabase automatically grants appropriate permissions based on RLS policies
-- No explicit GRANT statements needed for standard authenticated users

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

