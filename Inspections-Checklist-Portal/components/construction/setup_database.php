<?php
// Подключаем файл с базой данных
require_once 'db_connection.php';

// Функция для выполнения SQL-скрипта из файла
function executeSqlFile($pdo, $file) {
    try {
        // Читаем содержимое файла
        $sql = file_get_contents($file);
        
        // Разделяем запросы по ";", чтобы выполнить каждый отдельно
        $sqlQueries = explode(';', $sql);
        
        // Выполняем каждый запрос
        foreach ($sqlQueries as $query) {
            // Пропускаем пустые запросы
            $query = trim($query);
            if (!empty($query)) {
                $pdo->exec($query);
            }
        }
        
        return true;
    } catch (PDOException $e) {
        // В случае ошибки выводим сообщение и возвращаем false
        echo "Ошибка выполнения SQL: " . $e->getMessage() . "<br>";
        return false;
    }
}

// Путь к файлу со SQL скриптом
$sqlFilePath = __DIR__ . '/db_setup.sql';

// Проверяем существование файла
if (!file_exists($sqlFilePath)) {
    die("SQL файл не найден: $sqlFilePath");
}

// Выполняем SQL скрипт
if (executeSqlFile($pdo, $sqlFilePath)) {
    echo "База данных успешно настроена!";
} else {
    echo "Произошла ошибка при настройке базы данных. Проверьте логи.";
}
?> 