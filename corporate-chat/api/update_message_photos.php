<?php
// Отключаем вывод ошибок в браузер
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Функция для логирования
function debug_log($message) {
    error_log("UPDATE_DB: " . $message);
}

debug_log("Starting database update for message photos");

// Подключение к базе данных
try {
    $host = 'localhost';
    $dbname = 'maintenancedb';
    $username = 'root';
    $password = '';
    $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    debug_log("Database connection established");
} catch(PDOException $e) {
    debug_log("Database connection failed: " . $e->getMessage());
    die("Database connection failed: " . $e->getMessage());
}

// Проверяем, существует ли колонка sender_photo_url
try {
    $checkColumnSql = "SHOW COLUMNS FROM `chat_messages` LIKE 'sender_photo_url'";
    $stmt = $conn->prepare($checkColumnSql);
    $stmt->execute();
    
    if ($stmt->rowCount() > 0) {
        debug_log("Column sender_photo_url already exists");
        echo "Column sender_photo_url already exists. No changes made.<br>";
    } else {
        // Добавляем колонку
        $alterTableSql = "ALTER TABLE `chat_messages` 
                         ADD COLUMN `sender_photo_url` VARCHAR(255) DEFAULT NULL 
                         COMMENT 'URL фотографии отправителя (кэшированное значение)' 
                         AFTER `sender_id`";
        
        $conn->exec($alterTableSql);
        debug_log("Added sender_photo_url column to chat_messages table");
        echo "Added sender_photo_url column to chat_messages table<br>";
        
        // Обновляем существующие сообщения
        $updateSql = "UPDATE chat_messages cm
                     JOIN users u ON cm.sender_id = u.id
                     SET cm.sender_photo_url = CONCAT('/Maintenance_P/users/img/', u.photo)
                     WHERE u.photo IS NOT NULL";
        
        $updateCount = $conn->exec($updateSql);
        debug_log("Updated $updateCount existing messages with photo URLs");
        echo "Updated $updateCount existing messages with photo URLs<br>";
        
        // Создаем триггер для автоматического заполнения URL фото
        $checkTriggerSql = "SHOW TRIGGERS LIKE 'chat_messages_before_insert_photo'";
        $stmt = $conn->prepare($checkTriggerSql);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            debug_log("Trigger already exists, dropping it first");
            $dropTriggerSql = "DROP TRIGGER IF EXISTS chat_messages_before_insert_photo";
            $conn->exec($dropTriggerSql);
        }
        
        $createTriggerSql = "
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
        END";
        
        $conn->exec($createTriggerSql);
        debug_log("Created trigger for automatically setting photo URL");
        echo "Created trigger for automatically setting photo URL<br>";
    }
    
    echo "Database update completed successfully";
    debug_log("Database update completed successfully");
    
} catch(PDOException $e) {
    debug_log("Error updating database: " . $e->getMessage());
    die("Error updating database: " . $e->getMessage());
}
?> 