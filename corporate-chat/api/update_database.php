<?php
// Отключаем вывод ошибок, но логируем их
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Функция для логирования
function debug_log($message) {
    error_log("UPDATE_DATABASE: " . $message);
}

debug_log("Starting database update process");

// Подключение к базе данных
try {
    $host = 'macan.cityhost.com.ua';
    $dbname = 'chff6ee508';
    $username = 'chff6ee508';
    $password = '73b6bd56cf';
    $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    debug_log("Database connection established successfully");
} catch(PDOException $e) {
    debug_log("Database connection failed: " . $e->getMessage());
    die("Database connection failed: " . $e->getMessage());
}

// Создание таблицы user_online_status
try {
    $sql = "CREATE TABLE IF NOT EXISTS `user_online_status` (
        `user_id` INT(11) NOT NULL,
        `last_activity` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `status` ENUM('online', 'offline') NOT NULL DEFAULT 'offline',
        PRIMARY KEY (`user_id`),
        CONSTRAINT `fk_user_online_status_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $conn->exec($sql);
    debug_log("Table user_online_status created successfully or already exists");
    
    // Добавление индекса для оптимизации выборки
    $sql = "SHOW INDEX FROM user_online_status WHERE Key_name = 'idx_status_last_activity'";
    $stmt = $conn->query($sql);
    
    if ($stmt->rowCount() == 0) {
        $sql = "CREATE INDEX idx_status_last_activity ON user_online_status (status, last_activity)";
        $conn->exec($sql);
        debug_log("Index idx_status_last_activity created successfully");
    } else {
        debug_log("Index idx_status_last_activity already exists");
    }
    
    echo "Database update completed successfully!";
} catch(PDOException $e) {
    debug_log("Error creating table or index: " . $e->getMessage());
    die("Error: " . $e->getMessage());
}

// Include the file tables SQL
$chatFilesSql = file_get_contents(__DIR__ . '/chat-files-database.sql');

// Execute the file tables SQL
if (!$conn->multi_query($chatFilesSql)) {
    die(json_encode([
        'success' => false,
        'error' => 'Failed to create chat files tables: ' . $conn->error
    ]));
}

// Process all results from multi_query
do {
    if ($result = $conn->store_result()) {
        $result->free();
    }
} while ($conn->more_results() && $conn->next_result());
?> 