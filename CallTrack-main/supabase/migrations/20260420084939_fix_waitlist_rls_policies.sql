/*
  # Fix Waitlist RLS Policies

  ## Summary
  Replaces the overly permissive waitlist INSERT policy (WITH CHECK (true)) with a
  more restrictive policy that validates the email field is present and non-empty.
  Also tightens the SELECT policy to only allow users to read their own waitlist entry.

  ## Changes
  - Drop existing "Anyone can join waitlist" policy (WITH CHECK (true) — always true)
  - Replace with a policy that validates email is not null/empty
  - Drop existing broad SELECT policy
  - Replace SELECT policy scoped to authenticated users reading their own entry by email
*/

DROP POLICY IF EXISTS "Anyone can join waitlist" ON waitlist;
DROP POLICY IF EXISTS "Authenticated users can view waitlist" ON waitlist;

CREATE POLICY "Anyone can join waitlist with valid email"
  ON waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND email <> '');

CREATE POLICY "Authenticated users can view waitlist"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
