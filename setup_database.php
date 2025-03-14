<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Подключаемся к MySQL без указания базы данных
    $pdo = new PDO(
        "mysql:host=localhost",
        "root",
        "root",
        array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
    );

    // Создаем базу данных
    $pdo->exec("CREATE DATABASE IF NOT EXISTS maintenancedb CHARACTER SET utf8 COLLATE utf8_general_ci");
    echo "<p style='color: green;'>База данных создана успешно!</p>";

    // Подключаемся к созданной базе данных
    $pdo->exec("USE maintenancedb");
    
    // Создаем таблицу
    $sql = "
    CREATE TABLE IF NOT EXISTS access_codes (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(14) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        admin_email VARCHAR(255) NOT NULL,
        INDEX (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8";
    
    $pdo->exec($sql);
    echo "<p style='color: green;'>Таблица access_codes создана успешно!</p>";

    echo "<p>Теперь вы можете перейти к <a href='generate_access_code.php'>генерации кода доступа</a></p>";
    
} catch (PDOException $e) {
    echo "<h2>Ошибка:</h2>";
    echo "<p style='color: red;'>" . htmlspecialchars($e->getMessage()) . "</p>";
} 