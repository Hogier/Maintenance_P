<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Параметры подключения
    $host = 'localhost';
    $user = 'root';
    $password = 'root';
    $database = 'maintenancedb';

    // Подключение
    $conn = new mysqli($host, $user, $password);
    echo "Connected to MySQL successfully\n";

    // Создание базы данных если её нет
    if (!$conn->select_db($database)) {
        $sql = "CREATE DATABASE IF NOT EXISTS $database";
        if ($conn->query($sql)) {
            echo "Database $database created successfully\n";
        } else {
            throw new Exception("Error creating database: " . $conn->error);
        }
        $conn->select_db($database);
    }

    // Проверка существования таблицы events
    $result = $conn->query("SHOW TABLES LIKE 'events'");
    if ($result->num_rows == 0) {
        echo "Table 'events' does not exist, creating...\n";
        // Здесь вставьте SQL для создания таблицы events
    } else {
        echo "Table 'events' exists\n";
    }

    echo "All checks completed successfully";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?> 