/*
  # Initialize Budget Management Database

  1. New Tables
    - `profiles` - User profiles with roles
    - `event_accounts` - Budget accounts for events
    - `transactions` - Transaction records

  2. Security
    - Enable RLS on all tables
    - Create policies for user access control
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'employee',
  created_at timestamptz DEFAULT now()
);

-- Create event_accounts table
CREATE TABLE IF NOT EXISTS event_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  budget_limit numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES event_accounts(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL,
  vendor text DEFAULT 'Sonstiges',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Create profile on signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Event accounts policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can read event accounts"
  ON event_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can create event accounts"
  ON event_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update event accounts"
  ON event_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete event accounts"
  ON event_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Transactions policies
CREATE POLICY "Users can read all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
