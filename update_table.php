<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Подключаемся к базе данных
    $pdo = new PDO(
        "mysql:host=localhost;dbname=maintenance_p",
        "root",
        "",
        array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
    );

    // Читаем SQL-скрипт
    $sql = file_get_contents(__DIR__ . '/sql/update_access_codes_table.sql');

    // Выполняем SQL-скрипт
    $pdo->exec($sql);

    echo "<h2>Результат:</h2>";
    echo "<p style='color: green;'>Структура таблицы успешно обновлена!</p>";
    
} catch (PDOException $e) {
    echo "<h2>Ошибка:</h2>";
    echo "<p style='color: red;'>" . htmlspecialchars($e->getMessage()) . "</p>";
} 