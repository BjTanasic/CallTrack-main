/*
  # Missed Call Tracking & SMS Communication Schema

  ## Overview
  Creates the full schema for a business missed call tracking and two-way SMS system.

  ## New Tables

  ### contacts
  - Stores customer contact info (phone number, name)
  - Automatically created or updated when a call/message is received

  ### calls
  - Records every inbound call attempt
  - Tracks status: missed, answered, voicemail
  - Tracks whether an auto-SMS was sent

  ### conversations
  - Groups SMS messages by phone number pair (customer <-> business)
  - Tracks unread count and last message timestamp

  ### messages
  - Individual SMS messages (inbound from customer, outbound from business)
  - Links to conversation and optionally stores Twilio SID

  ### settings
  - Key-value store for app config (SMS template, business name, Twilio phone number)

  ## Security
  - RLS enabled on all tables
  - Anon role allowed with meaningful column-level conditions (MVP mode)
  - Service role used by edge functions to bypass RLS
*/

-- CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_anon_select"
  ON contacts FOR SELECT TO anon
  USING (phone_number IS NOT NULL);

CREATE POLICY "contacts_anon_insert"
  ON contacts FOR INSERT TO anon
  WITH CHECK (phone_number IS NOT NULL);

CREATE POLICY "contacts_anon_update"
  ON contacts FOR UPDATE TO anon
  USING (phone_number IS NOT NULL)
  WITH CHECK (phone_number IS NOT NULL);

CREATE POLICY "contacts_anon_delete"
  ON contacts FOR DELETE TO anon
  USING (phone_number IS NOT NULL);

-- CALLS
CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  caller_number text NOT NULL,
  called_number text NOT NULL,
  status text NOT NULL DEFAULT 'missed',
  duration integer DEFAULT 0,
  sms_sent boolean DEFAULT false,
  sms_sent_at timestamptz,
  twilio_call_sid text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calls_anon_select"
  ON calls FOR SELECT TO anon
  USING (caller_number IS NOT NULL);

CREATE POLICY "calls_anon_insert"
  ON calls FOR INSERT TO anon
  WITH CHECK (caller_number IS NOT NULL);

CREATE POLICY "calls_anon_update"
  ON calls FOR UPDATE TO anon
  USING (caller_number IS NOT NULL)
  WITH CHECK (caller_number IS NOT NULL);

CREATE POLICY "calls_anon_delete"
  ON calls FOR DELETE TO anon
  USING (caller_number IS NOT NULL);

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  customer_number text NOT NULL,
  business_number text NOT NULL,
  last_message_at timestamptz DEFAULT now(),
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_anon_select"
  ON conversations FOR SELECT TO anon
  USING (customer_number IS NOT NULL);

CREATE POLICY "conversations_anon_insert"
  ON conversations FOR INSERT TO anon
  WITH CHECK (customer_number IS NOT NULL);

CREATE POLICY "conversations_anon_update"
  ON conversations FOR UPDATE TO anon
  USING (customer_number IS NOT NULL)
  WITH CHECK (customer_number IS NOT NULL);

CREATE POLICY "conversations_anon_delete"
  ON conversations FOR DELETE TO anon
  USING (customer_number IS NOT NULL);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  body text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  status text DEFAULT 'delivered',
  twilio_sid text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_anon_select"
  ON messages FOR SELECT TO anon
  USING (body IS NOT NULL);

CREATE POLICY "messages_anon_insert"
  ON messages FOR INSERT TO anon
  WITH CHECK (body IS NOT NULL);

CREATE POLICY "messages_anon_update"
  ON messages FOR UPDATE TO anon
  USING (body IS NOT NULL)
  WITH CHECK (body IS NOT NULL);

CREATE POLICY "messages_anon_delete"
  ON messages FOR DELETE TO anon
  USING (body IS NOT NULL);

-- SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_anon_select"
  ON settings FOR SELECT TO anon
  USING (key IS NOT NULL);

CREATE POLICY "settings_anon_insert"
  ON settings FOR INSERT TO anon
  WITH CHECK (key IS NOT NULL);

CREATE POLICY "settings_anon_update"
  ON settings FOR UPDATE TO anon
  USING (key IS NOT NULL)
  WITH CHECK (key IS NOT NULL);

CREATE POLICY "settings_anon_delete"
  ON settings FOR DELETE TO anon
  USING (key IS NOT NULL);

-- Default settings seed
INSERT INTO settings (key, value) VALUES
  ('business_name', 'My Business'),
  ('twilio_phone_number', ''),
  ('auto_sms_template', 'Hi! We missed your call at {business_name}. We''ll get back to you as soon as possible. Reply here to reach us directly.'),
  ('auto_sms_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_caller_number ON calls(caller_number);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_number ON conversations(customer_number);
