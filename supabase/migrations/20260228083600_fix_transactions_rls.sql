/*
  # Fix Transactions RLS and Allow Public Reading

  Modify policies to allow reading transactions without strict user_id foreign key.
*/

-- Drop the foreign key constraint on transactions
ALTER TABLE transactions DROP CONSTRAINT transactions_user_id_fkey;

-- Recreate with ON DELETE SET NULL to allow orphaned transactions
ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update transactions column to allow NULL
ALTER TABLE transactions ALTER COLUMN user_id DROP NOT NULL;
