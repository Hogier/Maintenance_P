CREATE TABLE IF NOT EXISTS access_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(14) NOT NULL,
    created_at DATETIME NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    UNIQUE KEY unique_code (code)
); 