-- SQL для создания таблиц, связанных с проектами строительства

-- Таблица для подрядчиков
CREATE TABLE IF NOT EXISTS `construction_contractors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) NOT NULL,
  `business_type` varchar(100) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `rating` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Таблица для сотрудников подрядчиков (контактные лица)
CREATE TABLE IF NOT EXISTS `construction_employees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `contractor_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `position` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `is_primary_contact` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_employee_contractor` (`contractor_id`),
  CONSTRAINT `fk_employee_contractor` FOREIGN KEY (`contractor_id`) REFERENCES `construction_contractors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Таблица для строительных проектов
CREATE TABLE IF NOT EXISTS `construction_projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `contractor_id` int(11) DEFAULT NULL,
  `contact_person_id` int(11) DEFAULT NULL,
  `business_type` varchar(100) DEFAULT NULL,
  `project_type` enum('current','future') NOT NULL,
  `status` varchar(50) DEFAULT 'planned',
  `progress` int(11) DEFAULT 0,
  `actual_cost` decimal(15,2) DEFAULT 0.00,
  `last_update` date DEFAULT NULL,
  `budget` decimal(15,2) DEFAULT 0.00,
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `description` text DEFAULT NULL,
  `objectives` text DEFAULT NULL,
  `risks` text DEFAULT NULL,
  `migrated_from_future` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_project_contractor` (`contractor_id`),
  KEY `fk_project_contact` (`contact_person_id`),
  CONSTRAINT `fk_project_contractor` FOREIGN KEY (`contractor_id`) REFERENCES `construction_contractors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_project_contact` FOREIGN KEY (`contact_person_id`) REFERENCES `construction_employees` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Таблица для файлов проектов
CREATE TABLE IF NOT EXISTS `construction_project_files` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `file_type` varchar(100) NOT NULL,
  `file_category` enum('photo', 'document', 'report', 'specification') DEFAULT 'document',
  `mime_type` varchar(100) DEFAULT NULL,
  `file_path` varchar(512) NOT NULL,
  `mini_path` varchar(512) DEFAULT NULL,
  `migrated_from_future` tinyint(1) DEFAULT 0,
  `upload_date` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  KEY `file_category` (`file_category`),
  CONSTRAINT `fk_file_project` FOREIGN KEY (`project_id`) REFERENCES `construction_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4; 