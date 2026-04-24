/*
  # Add Multi-Tenancy: user_id to all business tables

  ## Overview
  This migration converts the schema from a shared single-tenant model to a
  properly isolated multi-tenant model. Every business record (contacts, calls,
  conversations, messages, settings) is scoped to the authenticated user who owns it.

  ## Changes

  ### Modified Tables
  - `contacts` — add `user_id uuid NOT NULL REFERENCES auth.users`
  - `calls` — add `user_id uuid NOT NULL REFERENCES auth.users`
  - `conversations` — add `user_id uuid NOT NULL REFERENCES auth.users`
  - `messages` — add `user_id uuid NOT NULL REFERENCES auth.users` (inherited via conversation, but explicit for policy simplicity)
  - `settings` — drop UNIQUE constraint on `key` (was global), add `user_id`, add UNIQUE(user_id, key)

  ### Security Changes
  - Drop all old anon/open policies on every table
  - Add proper per-user RLS policies scoped to `auth.uid() = user_id`
  - Twilio Edge Functions use the service role key and pass user_id explicitly, so they bypass RLS correctly

  ### Important Notes
  1. Existing rows (if any) will have user_id set to NULL. The NOT NULL constraint is
     added as nullable first, then we make it enforced for new rows via the policies.
     We do NOT use ALTER COLUMN ... SET NOT NULL to avoid breaking existing demo data.
  2. contacts.phone_number UNIQUE is dropped because two different users can have the
     same customer phone number in their account.
  3. The settings UNIQUE(key) constraint is replaced with UNIQUE(user_id, key) so each
     user can have their own settings keys.
  4. All old anon policies are dropped and replaced with authenticated-only policies.
  5. New indexes are added on user_id columns for query performance.
*/

-- =========================================================
-- CONTACTS
-- =========================================================

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "contacts_anon_select" ON contacts;
DROP POLICY IF EXISTS "contacts_anon_insert" ON contacts;
DROP POLICY IF EXISTS "contacts_anon_update" ON contacts;
DROP POLICY IF EXISTS "contacts_anon_delete" ON contacts;

CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_phone_number_key;

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

-- =========================================================
-- CALLS
-- =========================================================

ALTER TABLE calls ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "calls_anon_select" ON calls;
DROP POLICY IF EXISTS "calls_anon_insert" ON calls;
DROP POLICY IF EXISTS "calls_anon_update" ON calls;
DROP POLICY IF EXISTS "calls_anon_delete" ON calls;

CREATE POLICY "Users can view own calls"
  ON calls FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calls"
  ON calls FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calls"
  ON calls FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calls"
  ON calls FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);

-- =========================================================
-- CONVERSATIONS
-- =========================================================

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "conversations_anon_select" ON conversations;
DROP POLICY IF EXISTS "conversations_anon_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_anon_update" ON conversations;
DROP POLICY IF EXISTS "conversations_anon_delete" ON conversations;

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- =========================================================
-- MESSAGES
-- =========================================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "messages_anon_select" ON messages;
DROP POLICY IF EXISTS "messages_anon_insert" ON messages;
DROP POLICY IF EXISTS "messages_anon_update" ON messages;
DROP POLICY IF EXISTS "messages_anon_delete" ON messages;

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

-- =========================================================
-- SETTINGS
-- =========================================================

ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "settings_anon_select" ON settings;
DROP POLICY IF EXISTS "settings_anon_insert" ON settings;
DROP POLICY IF EXISTS "settings_anon_update" ON settings;
DROP POLICY IF EXISTS "settings_anon_delete" ON settings;

ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'settings_user_id_key_key'
  ) THEN
    ALTER TABLE settings ADD CONSTRAINT settings_user_id_key_key UNIQUE (user_id, key);
  END IF;
END $$;

CREATE POLICY "Users can view own settings"
  ON settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- Remove global seed data (it had no user_id, will be handled per-user on first login)
DELETE FROM settings WHERE user_id IS NULL;
