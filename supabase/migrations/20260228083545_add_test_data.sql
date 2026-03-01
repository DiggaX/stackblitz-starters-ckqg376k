/*
  # Add Test Data

  Insert sample event accounts and transactions for demonstration purposes.
*/

-- Insert test event accounts
INSERT INTO event_accounts (name, budget_limit) VALUES
  ('ANIMATION', 5000),
  ('KINDERATTRAKTIONEN', 8000)
ON CONFLICT DO NOTHING;

-- Get a test user ID (we'll use a fixed UUID for testing)
-- Note: In production, transactions should be linked to real auth users
-- For now, we'll create transactions without user_id constraint by using a dummy approach
