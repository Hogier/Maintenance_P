<?php
try {
    // Параметры подключения к базе данных
    $host = 'localhost';
    $dbname = 'maintenancedb';
    $username = 'root';
    $password = 'root';
    $charset = 'utf8';

    // Создание DSN (Data Source Name)
    $dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";
    
    // Опции PDO для улучшения работы
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    
    // Создание объекта PDO
    $pdo = new PDO($dsn, $username, $password, $options);
    
    // Устанавливаем временную зону
    date_default_timezone_set('America/Chicago');
} catch (PDOException $e) {
    // Записываем ошибку подключения в лог
    error_log("Database connection failed: " . $e->getMessage());
    
    // Возвращаем HTTP-ответ с кодом ошибки
    http_response_code(500);
    
    // Выводим сообщение об ошибке в формате JSON
    echo json_encode([
        "error" => "Database connection error",
        "message" => "Could not connect to the database. Please try again later."
    ]);
    
    // Прекращаем выполнение скрипта
    exit;
}
?> 