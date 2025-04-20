-- Chat Files Database Schema

-- Table for chat file attachments
CREATE TABLE IF NOT EXISTS `chat_files` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `message_id` INT(11) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(100) NOT NULL,
  `file_size` INT(11) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `thumbnail_path` VARCHAR(500) DEFAULT NULL,
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_chat_files_message` (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraints
ALTER TABLE `chat_files`
  ADD CONSTRAINT `fk_chat_files_message` FOREIGN KEY (`message_id`) REFERENCES `chat_messages` (`id`) ON DELETE CASCADE;

-- Add file_type column to chat_messages table to indicate if a message contains file
ALTER TABLE `chat_messages` 
  ADD COLUMN `has_file` TINYINT(1) NOT NULL DEFAULT '0' AFTER `message`; 