-- Add sender_photo_url column to chat_messages table
ALTER TABLE `chat_messages` 
ADD COLUMN `sender_photo_url` VARCHAR(255) DEFAULT NULL 
COMMENT 'URL фотографии отправителя (кэшированное значение)' 
AFTER `sender_id`;

-- Create a procedure to update existing messages with sender photo URLs
DELIMITER //
CREATE PROCEDURE update_message_photos()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE msg_id INT;
    DECLARE sender INT;
    DECLARE user_photo VARCHAR(255);
    
    -- Cursor for all messages
    DECLARE cur CURSOR FOR 
        SELECT cm.id, cm.sender_id, u.photo 
        FROM chat_messages cm
        JOIN users u ON cm.sender_id = u.id
        WHERE cm.sender_photo_url IS NULL AND u.photo IS NOT NULL;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO msg_id, sender, user_photo;
        
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Construct photo URL
        UPDATE chat_messages 
        SET sender_photo_url = CONCAT('/Maintenance_P/users/img/', user_photo)
        WHERE id = msg_id;
    END LOOP;
    
    CLOSE cur;
END //
DELIMITER ;

-- Run the procedure
CALL update_message_photos();

-- Drop the procedure
DROP PROCEDURE IF EXISTS update_message_photos;

-- Add triggers to automatically update sender_photo_url for new messages
DELIMITER //
CREATE TRIGGER chat_messages_before_insert_photo 
BEFORE INSERT ON `chat_messages`
FOR EACH ROW
BEGIN
    DECLARE user_photo VARCHAR(255);
    
    -- Get user photo
    SELECT photo INTO user_photo FROM users WHERE id = NEW.sender_id;
    
    -- Set photo URL if available
    IF user_photo IS NOT NULL THEN
        SET NEW.sender_photo_url = CONCAT('/Maintenance_P/users/img/', user_photo);
    END IF;
END //
DELIMITER ; 