<?php
// Скрипт для обновления структуры базы данных

// Подключаем файл с базой данных
require_once 'db_connection.php';

// Путь к файлу с SQL-запросами для обновления
$sqlFilePath = 'sql/update_tables.sql';

// Проверяем наличие файла с запросами
if (!file_exists($sqlFilePath)) {
    die("Ошибка: Файл с SQL-запросами не найден: " . $sqlFilePath);
}

// Считываем содержимое файла
$sqlContent = file_get_contents($sqlFilePath);

// Разделяем содержимое на отдельные запросы
$queries = explode(';', $sqlContent);

// Результаты выполнения запросов
$results = [];

// Флаг успешности выполнения всех запросов
$success = true;

// Начинаем транзакцию
try {
    $pdo->beginTransaction();

    // Выполняем каждый запрос
    foreach ($queries as $query) {
        $query = trim($query);
        
        // Пропускаем пустые запросы и комментарии
        if (empty($query) || strpos($query, '--') === 0) {
            continue;
        }
        
        try {
            $stmt = $pdo->prepare($query);
            $result = $stmt->execute();
            
            // Добавляем результат в массив
            $results[] = [
                'query' => $query,
                'success' => $result,
                'error' => null
            ];
        } catch (PDOException $e) {
            // Если запрос не выполнился, добавляем информацию об ошибке
            $results[] = [
                'query' => $query,
                'success' => false,
                'error' => $e->getMessage()
            ];
            
            // Отмечаем, что были ошибки
            $success = false;
        }
    }
    
    // Если все запросы выполнились успешно, фиксируем транзакцию
    if ($success) {
        $pdo->commit();
        echo "<h2>Обновление базы данных выполнено успешно!</h2>";
    } else {
        // Иначе откатываем изменения
        $pdo->rollBack();
        echo "<h2>При обновлении базы данных произошли ошибки.</h2>";
    }
} catch (PDOException $e) {
    // В случае ошибки в транзакции
    $pdo->rollBack();
    echo "<h2>Ошибка при выполнении обновления: " . $e->getMessage() . "</h2>";
}

// Выводим результаты выполнения запросов
echo "<h3>Результаты выполнения запросов:</h3>";
echo "<ul>";
foreach ($results as $result) {
    $statusClass = $result['success'] ? 'success' : 'error';
    $statusText = $result['success'] ? 'Успешно' : 'Ошибка: ' . $result['error'];
    
    echo "<li class='{$statusClass}'>";
    echo "<pre>" . htmlspecialchars($result['query']) . "</pre>";
    echo "<p>{$statusText}</p>";
    echo "</li>";
}
echo "</ul>";

// Добавляем стили для красивого вывода
echo "
<style>
    body {
        font-family: Arial, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }
    h2, h3 {
        color: #333;
    }
    ul {
        list-style-type: none;
        padding: 0;
    }
    li {
        margin-bottom: 20px;
        padding: 15px;
        border-radius: 5px;
    }
    li.success {
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
    }
    li.error {
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
    }
    pre {
        background-color: #f8f9fa;
        padding: 10px;
        border-radius: 3px;
        overflow-x: auto;
    }
</style>
";
?> 