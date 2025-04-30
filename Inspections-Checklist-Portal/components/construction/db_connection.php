<?php
// Параметры подключения к базе данных
$host = 'localhost';
$db = 'maintenancedb'; // Название вашей базы данных
$user = 'root';        // Пользователь MySQL (обычно root в XAMPP)
$pass = 'root';            // Пароль (обычно пустой в XAMPP)
$charset = 'utf8mb4';  // Кодировка

// Настройка DSN
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

// Опции для PDO
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // Выбрасывать исключения при ошибках
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // Вернуть ассоциативный массив
    PDO::ATTR_EMULATE_PREPARES   => false,                    // Использовать нативные подготовленные выражения
];

// Создание экземпляра PDO
try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    // В случае ошибки возвращаем сообщение
    throw new PDOException($e->getMessage(), (int)$e->getCode());
}

// Функция для выполнения SQL запросов
function executeQuery($sql, $params = []) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    } catch (PDOException $e) {
        error_log("Database error: " . $e->getMessage());
        return false;
    }
}

// Функция для получения данных из базы
function fetchData($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    return $stmt ? $stmt->fetchAll() : [];
}

// Функция для получения одной записи
function fetchOne($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    return $stmt ? $stmt->fetch() : null;
}

// Функция для вставки данных и получения ID вставленной записи
function insertData($sql, $params = []) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $pdo->lastInsertId();
    } catch (PDOException $e) {
        $errorMsg = "Insert error: " . $e->getMessage() . " [SQL: $sql]";
        file_put_contents(dirname(__FILE__) . '/logs/db_error.log', date('Y-m-d H:i:s') . " - $errorMsg\n", FILE_APPEND);
        error_log($errorMsg);
        return false;
    }
}

// Функция для обновления данных
function updateData($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    return $stmt ? $stmt->rowCount() : 0;
}

// Функция для удаления данных
function deleteData($sql, $params = []) {
    $stmt = executeQuery($sql, $params);
    return $stmt ? $stmt->rowCount() : 0;
} 