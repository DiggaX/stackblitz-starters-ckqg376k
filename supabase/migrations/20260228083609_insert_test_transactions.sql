/*
  # Insert Test Transactions

  Add sample transactions without requiring a real user.
*/

INSERT INTO transactions (user_id, account_id, description, amount, vendor) VALUES
  (
    NULL,
    (SELECT id FROM event_accounts WHERE name = 'KINDERATTRAKTIONEN' LIMIT 1),
    'Technik Nilsen',
    678,
    'Sonstiges'
  ),
  (
    NULL,
    (SELECT id FROM event_accounts WHERE name = 'KINDERATTRAKTIONEN' LIMIT 1),
    'INV259566036',
    14.99,
    'Sonstiges'
  ),
  (
    NULL,
    (SELECT id FROM event_accounts WHERE name = 'KINDERATTRAKTIONEN' LIMIT 1),
    'Technik',
    1400,
    'Sonstiges'
  ),
  (
    NULL,
    (SELECT id FROM event_accounts WHERE name = 'KINDERATTRAKTIONEN' LIMIT 1),
    'Kinderkozert',
    5780,
    'Sonstiges'
  )
ON CONFLICT DO NOTHING;
