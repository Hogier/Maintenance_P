-- Chat Module Database Schema

-- Table for direct chats between users
CREATE TABLE IF NOT EXISTS `chat_direct` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user1_id` INT(11) NOT NULL,
  `user2_id` INT(11) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_participants` (`user1_id`, `user2_id`),
  KEY `fk_chat_direct_user1` (`user1_id`),
  KEY `fk_chat_direct_user2` (`user2_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for group chats
CREATE TABLE IF NOT EXISTS `chat_groups` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `created_by` INT(11) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_chat_groups_creator` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for group members
CREATE TABLE IF NOT EXISTS `chat_group_members` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `group_id` INT(11) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `is_admin` TINYINT(1) NOT NULL DEFAULT '0',
  `joined_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_member` (`group_id`, `user_id`),
  KEY `fk_chat_group_members_group` (`group_id`),
  KEY `fk_chat_group_members_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for all messages (both direct and group)
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `direct_chat_id` INT(11) DEFAULT NULL,
  `group_id` INT(11) DEFAULT NULL,
  `sender_id` INT(11) NOT NULL,
  `message` TEXT NOT NULL,
  `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_chat_messages_direct_chat` (`direct_chat_id`),
  KEY `fk_chat_messages_group` (`group_id`),
  KEY `fk_chat_messages_sender` (`sender_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for message read status
CREATE TABLE IF NOT EXISTS `chat_message_read` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `message_id` INT(11) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `read_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_message_user_read` (`message_id`, `user_id`),
  KEY `fk_chat_message_read_message` (`message_id`),
  KEY `fk_chat_message_read_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraints
ALTER TABLE `chat_direct`
  ADD CONSTRAINT `fk_chat_direct_user1` FOREIGN KEY (`user1_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_chat_direct_user2` FOREIGN KEY (`user2_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `chat_groups`
  ADD CONSTRAINT `fk_chat_groups_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `chat_group_members`
  ADD CONSTRAINT `fk_chat_group_members_group` FOREIGN KEY (`group_id`) REFERENCES `chat_groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_chat_group_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `chat_messages`
  ADD CONSTRAINT `fk_chat_messages_direct_chat` FOREIGN KEY (`direct_chat_id`) REFERENCES `chat_direct` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_chat_messages_group` FOREIGN KEY (`group_id`) REFERENCES `chat_groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_chat_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `chat_message_read`
  ADD CONSTRAINT `fk_chat_message_read_message` FOREIGN KEY (`message_id`) REFERENCES `chat_messages` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_chat_message_read_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

-- Enforce that a message can only belong to either a direct chat or a group chat, but not both
DELIMITER //
CREATE TRIGGER IF NOT EXISTS `chat_messages_before_insert` BEFORE INSERT ON `chat_messages`
FOR EACH ROW
BEGIN
  IF (NEW.direct_chat_id IS NOT NULL AND NEW.group_id IS NOT NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A message cannot belong to both a direct chat and a group chat';
  ELSEIF (NEW.direct_chat_id IS NULL AND NEW.group_id IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A message must belong to either a direct chat or a group chat';
  END IF;
END //
DELIMITER ;

-- Enforce that a direct chat is between two different users
DELIMITER //
CREATE TRIGGER IF NOT EXISTS `chat_direct_before_insert` BEFORE INSERT ON `chat_direct`
FOR EACH ROW
BEGIN
  IF (NEW.user1_id = NEW.user2_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A direct chat cannot be between the same user';
  END IF;
END //
DELIMITER ; 