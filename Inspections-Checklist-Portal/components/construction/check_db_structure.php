<?php
// Скрипт для проверки структуры базы данных

// Подключаем файл с базой данных
require_once 'db_connection.php';

// Функция для получения структуры таблицы
function getTableStructure($pdo, $tableName) {
    $stmt = $pdo->prepare("DESCRIBE $tableName");
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Функция для вывода структуры таблицы в HTML
function displayTableStructure($structure, $tableName) {
    echo "<h3>Структура таблицы: $tableName</h3>";
    echo "<table border='1' cellpadding='5' cellspacing='0'>";
    echo "<tr><th>Поле</th><th>Тип</th><th>Null</th><th>Ключ</th><th>По умолчанию</th><th>Дополнительно</th></tr>";
    
    foreach ($structure as $column) {
        echo "<tr>";
        echo "<td>{$column['Field']}</td>";
        echo "<td>{$column['Type']}</td>";
        echo "<td>{$column['Null']}</td>";
        echo "<td>{$column['Key']}</td>";
        echo "<td>" . (isset($column['Default']) ? $column['Default'] : 'NULL') . "</td>";
        echo "<td>{$column['Extra']}</td>";
        echo "</tr>";
    }
    
    echo "</table>";
}

// Функция для проверки соответствия полей в PHP-файлах и таблицах БД
function checkFieldsInPhpFiles($pdo, $tableName, $phpFiles) {
    $fields = [];
    
    // Получаем список полей из таблицы
    $stmt = $pdo->prepare("DESCRIBE $tableName");
    $stmt->execute();
    $tableFields = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Ищем использование полей в PHP-файлах
    foreach ($phpFiles as $phpFile) {
        if (!file_exists($phpFile)) {
            continue;
        }
        
        $content = file_get_contents($phpFile);
        
        // Ищем возможные SQL-запросы с упоминанием полей
        // Например: INSERT INTO table (field1, field2) VALUES
        if (preg_match_all('/INSERT\s+INTO\s+' . $tableName . '\s*\(([^)]+)\)/i', $content, $matches)) {
            foreach ($matches[1] as $fieldsString) {
                $fieldsArray = array_map('trim', explode(',', $fieldsString));
                foreach ($fieldsArray as $field) {
                    $field = trim($field, '`');
                    if (!in_array($field, $fields)) {
                        $fields[] = $field;
                    }
                }
            }
        }
        
        // Ищем поля в UPDATE-запросах
        // Например: UPDATE table SET field1 = ?, field2 = ?
        if (preg_match_all('/UPDATE\s+' . $tableName . '\s+SET\s+([^WHERE]+)/i', $content, $matches)) {
            foreach ($matches[1] as $fieldsString) {
                $fieldsArray = array_map('trim', explode(',', $fieldsString));
                foreach ($fieldsArray as $fieldPair) {
                    if (preg_match('/([^\s=]+)\s*=/', $fieldPair, $fieldMatch)) {
                        $field = trim($fieldMatch[1], '`');
                        if (!in_array($field, $fields)) {
                            $fields[] = $field;
                        }
                    }
                }
            }
        }
        
        // Ищем поля в SELECT-запросах
        // Например: SELECT field1, field2 FROM table
        if (preg_match_all('/SELECT\s+([^FROM]+)\s+FROM\s+' . $tableName . '/i', $content, $matches)) {
            foreach ($matches[1] as $fieldsString) {
                if ($fieldsString == '*') continue; // Пропускаем SELECT *
                
                $fieldsArray = array_map('trim', explode(',', $fieldsString));
                foreach ($fieldsArray as $field) {
                    // Обрабатываем случаи с алиасами: field AS alias
                    if (preg_match('/([^\s]+)\s+AS\s+/i', $field, $fieldMatch)) {
                        $field = trim($fieldMatch[1], '`');
                    } else {
                        $field = trim($field, '`');
                    }
                    
                    if (!in_array($field, $fields) && $field != '*') {
                        $fields[] = $field;
                    }
                }
            }
        }
    }
    
    // Сравниваем поля из таблицы и поля из PHP-файлов
    $missingInTable = array_diff($fields, $tableFields);
    $missingInPhp = array_diff($tableFields, $fields);
    
    echo "<h3>Проверка соответствия полей для таблицы: $tableName</h3>";
    
    if (!empty($missingInTable)) {
        echo "<p style='color: red;'>Поля, используемые в PHP, но отсутствующие в таблице:</p>";
        echo "<ul>";
        foreach ($missingInTable as $field) {
            echo "<li>$field</li>";
        }
        echo "</ul>";
    } else {
        echo "<p style='color: green;'>Все поля, используемые в PHP, существуют в таблице.</p>";
    }
    
    if (!empty($missingInPhp)) {
        echo "<p style='color: orange;'>Поля, существующие в таблице, но не найденные в PHP-файлах:</p>";
        echo "<ul>";
        foreach ($missingInPhp as $field) {
            echo "<li>$field</li>";
        }
        echo "</ul>";
    } else {
        echo "<p style='color: green;'>Все поля таблицы используются в PHP-файлах.</p>";
    }
}

// Список таблиц для проверки
$tables = [
    'construction_projects',
    'construction_project_files',
    'construction_contractors',
    'construction_employees'
];

// Список PHP-файлов для проверки
$phpFiles = [
    'api/projects.php',
    'api/files.php',
    'api/contractors.php',
    'upload_handler.php'
];

// HTML-заголовок
echo "<!DOCTYPE html>
<html>
<head>
    <title>Проверка структуры базы данных</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
        }
        h1, h2, h3 {
            color: #333;
        }
        table {
            border-collapse: collapse;
            margin-bottom: 20px;
            width: 100%;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        .warning {
            color: orange;
        }
        .error {
            color: red;
        }
        .success {
            color: green;
        }
    </style>
</head>
<body>
    <h1>Проверка структуры базы данных для модуля управления строительством</h1>";

// Проверяем каждую таблицу
foreach ($tables as $table) {
    try {
        $structure = getTableStructure($pdo, $table);
        displayTableStructure($structure, $table);
        checkFieldsInPhpFiles($pdo, $table, $phpFiles);
    } catch (PDOException $e) {
        echo "<div class='error'><p>Ошибка при получении структуры таблицы $table: " . $e->getMessage() . "</p></div>";
    }
}

// Завершаем HTML
echo "</body></html>";
?> 