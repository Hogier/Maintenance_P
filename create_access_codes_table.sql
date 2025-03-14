-- Таблица для кодов доступа
CREATE TABLE IF NOT EXISTS `access_codes` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `code` VARCHAR(12) NOT NULL,
    `status` ENUM('active', 'used', 'expired') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `used_at` TIMESTAMP NULL,
    `expires_at` TIMESTAMP NULL,
    UNIQUE KEY `unique_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Таблица для задач обслуживания
CREATE TABLE IF NOT EXISTS `maintenance_tasks` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `location` VARCHAR(100) NOT NULL,
    `type` ENUM('repair', 'inspection', 'cleaning', 'replacement', 'other') NOT NULL,
    `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    `status` ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    `assigned_to` INT,
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `scheduled_for` DATETIME,
    `completed_at` TIMESTAMP NULL,
    FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8; 