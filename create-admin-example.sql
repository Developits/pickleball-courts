-- IMPORTANT: SQL alone CANNOT create bcrypt hashes!
-- 
-- bcrypt hashes must be generated using JavaScript/Node.js
-- Use the create-admin.js script instead:
--   node create-admin.js <student_id> <password> <name>
--
-- Example: node create-admin.js admin002 MyPassword123! "John Doe"
--

-- This file is just for reference to show what the INSERT statement looks like
-- DO NOT run this file directly - the password hashes won't work!

-- Example of what the SQL would look like (but with REAL bcrypt hash):
-- 
-- INSERT INTO users (student_id, password, name, department, degree, year, gender, role, is_approved)
-- VALUES ('admin002', '$2a$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'John Doe', 'Administration', 'Master', 2024, 'male', 'admin', TRUE);

-- bcrypt hash explanation:
-- $2a$ = algorithm identifier
-- 10$ = cost factor (number of rounds)
-- XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX = salt + hash (88 characters total)
--
-- Each bcrypt hash is unique even for the same password, so you CANNOT:
-- ✗ Copy a hash from one user to another
-- ✗ Create a hash manually in SQL
-- ✗ Use the same hash for multiple users
--
-- You MUST use the Node.js script to generate valid bcrypt hashes!