<?php
/**
 * Скрипт для инициализации базы данных из командной строки
 * Запуск: php database_init.php
 */

// Определяем корневой путь
$rootPath = dirname(dirname(__FILE__));

// Подключаем файл с подключением к базе данных
require_once $rootPath . '/db_connection.php';

// Функция для выполнения SQL-запросов из файла
function executeSqlFile($pdo, $filePath) {
    if (!file_exists($filePath)) {
        echo "Ошибка: Файл $filePath не найден\n";
        return false;
    }

    $content = file_get_contents($filePath);
    
    // Разделяем SQL-файл на отдельные запросы
    $queries = explode(';', $content);
    
    echo "Выполнение SQL-запросов из $filePath\n";
    
    $successCount = 0;
    $errorCount = 0;
    
    foreach ($queries as $query) {
        $query = trim($query);
        
        if (empty($query)) {
            continue;
        }
        
        try {
            $pdo->exec($query);
            $successCount++;
        } catch (PDOException $e) {
            echo "Ошибка выполнения запроса: " . $e->getMessage() . "\n";
            echo "Запрос: " . $query . "\n\n";
            $errorCount++;
        }
    }
    
    echo "Запросы выполнены. Успешно: $successCount, с ошибками: $errorCount\n";
    
    return $errorCount === 0;
}

// Функция для проверки существования таблицы
function tableExists($pdo, $tableName) {
    try {
        $result = $pdo->query("SHOW TABLES LIKE '$tableName'");
        return $result->rowCount() > 0;
    } catch (Exception $e) {
        return false;
    }
}

// Проверяем существование основных таблиц
$tables = [
    'construction_contractors',
    'construction_employees',
    'construction_projects',
    'construction_project_files'
];

$allTablesExist = true;
$missingTables = [];

foreach ($tables as $table) {
    if (!tableExists($pdo, $table)) {
        $allTablesExist = false;
        $missingTables[] = $table;
    }
}

if ($allTablesExist) {
    echo "Все необходимые таблицы уже существуют в базе данных.\n";
    echo "Для повторного создания таблиц укажите параметр --force\n";
    
    if (in_array('--force', $argv)) {
        echo "Принудительное создание таблиц...\n";
    } else {
        exit(0);
    }
} else {
    echo "Следующие таблицы отсутствуют и будут созданы: " . implode(', ', $missingTables) . "\n";
}

// Выполняем SQL-файл с созданием таблиц
$sqlFile = $rootPath . '/db_setup.sql';
if (executeSqlFile($pdo, $sqlFile)) {
    echo "База данных успешно инициализирована.\n";
} else {
    echo "Произошла ошибка при инициализации базы данных.\n";
    exit(1);
}

// Проверяем директории для загрузки файлов
$uploadDirs = [
    $rootPath . '/project_upload',
    $rootPath . '/project_upload/project_files',
    $rootPath . '/project_upload/project_mini'
];

foreach ($uploadDirs as $dir) {
    if (!file_exists($dir)) {
        if (mkdir($dir, 0777, true)) {
            echo "Создана директория: $dir\n";
        } else {
            echo "Ошибка при создании директории: $dir\n";
        }
    } else {
        echo "Директория уже существует: $dir\n";
        
        // Проверяем права доступа
        if (!is_writable($dir)) {
            chmod($dir, 0777);
            echo "Обновлены права доступа для директории: $dir\n";
        }
    }
}

echo "Инициализация завершена.\n";
exit(0); 