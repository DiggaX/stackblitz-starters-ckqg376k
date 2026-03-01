/*
  # Update Transactions RLS Policies

  Allow reading all transactions for authenticated users and update permissions.
*/

-- Drop old policies
DROP POLICY IF EXISTS "Users can read all transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

-- New policies
CREATE POLICY "Users can read all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can delete transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);
