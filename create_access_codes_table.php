<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // Сначала удалим старую таблицу, если она существует
    $conn->query("DROP TABLE IF EXISTS `access_codes`");
    
    $sql = "CREATE TABLE IF NOT EXISTS `access_codes` (
        `id` INT PRIMARY KEY AUTO_INCREMENT,
        `code` VARCHAR(14) NOT NULL,
        `status` ENUM('active', 'used', 'expired') DEFAULT 'active',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `used_at` TIMESTAMP NULL,
        `expires_at` TIMESTAMP NULL,
        UNIQUE KEY `unique_code` (`code`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
    
    if ($conn->query($sql)) {
        echo "Table 'access_codes' created successfully with updated code length.";
    } else {
        throw new Exception("Error creating table: " . $conn->error);
    }
    
} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}
?> 