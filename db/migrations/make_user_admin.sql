-- This updates the user's role to 'admin' in the users table

UPDATE users 
SET role = 'admin'
WHERE email = 'betabaddies@gmail.com';

-- Verify the update
SELECT u_id, email, role, created_at 
FROM users 
WHERE email = 'betabaddies@gmail.com';

