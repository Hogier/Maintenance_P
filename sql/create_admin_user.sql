-- Script to add an administrator user with the ability to change event status
-- Create directory if it doesn't exist (run separately in terminal)
-- mkdir -p sql

-- Insert user Jana Haigood with admin role
INSERT INTO users (email, full_name, department, role, password)
VALUES (
    'Jana.Haigood@AlcuinSchool.org',
    'Jana Haigood',
    'admin',
    'admin',
    '$2y$10$IUNUTKpxRFoqp/GFXOLb1u0HkDRRfkQkljMvz1c1LYG2U2qYkC3XG'  -- Hashed password for 'roooot'
)
ON DUPLICATE KEY UPDATE
    department = 'admin',
    role = 'admin',
    password = '$2y$10$IUNUTKpxRFoqp/GFXOLb1u0HkDRRfkQkljMvz1c1LYG2U2qYkC3XG';

-- Note: The password hash above is for 'roooot'
-- If the user already exists, we just update the role, department and password 