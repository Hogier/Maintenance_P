-- Создание базы данных
CREATE DATABASE IF NOT EXISTS maintenance_p
CHARACTER SET utf8 
COLLATE utf8_general_ci;

-- Использование базы данных
USE maintenance_p;

-- Создание таблицы
CREATE TABLE IF NOT EXISTS access_codes (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(14) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    admin_email VARCHAR(255) NOT NULL,
    INDEX (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8; 