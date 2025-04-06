<?php
// Подключаем файл с базой данных
require_once 'db_connection.php';

// Функция для выполнения SQL-запросов из файла
function executeSqlFile($pdo, $file) {
    if (!file_exists($file)) {
        die("SQL-файл не найден: $file");
    }
    
    $sql = file_get_contents($file);
    
    try {
        // Разделяем SQL-файл на отдельные запросы
        $queries = explode(';', $sql);
        
        foreach ($queries as $query) {
            $query = trim($query);
            if (!empty($query)) {
                $stmt = $pdo->prepare($query);
                $result = $stmt->execute();
                
                if (!$result) {
                    echo "Ошибка при выполнении запроса: " . $stmt->errorInfo()[2] . "<br>";
                }
            }
        }
        
        echo "SQL-файл успешно выполнен: $file<br>";
        return true;
    } catch (PDOException $e) {
        echo "Ошибка базы данных: " . $e->getMessage() . "<br>";
        return false;
    }
}

// Путь к SQL-файлу с определениями таблиц
$sqlFile = __DIR__ . '/sql/construction_tables.sql';

// Выполняем SQL-запросы
$result = executeSqlFile($pdo, $sqlFile);

if ($result) {
    // Проверяем, созданы ли таблицы
    $tables = ['construction_contractors', 'construction_employees', 'construction_projects', 'construction_project_files'];
    $allTablesCreated = true;
    
    foreach ($tables as $table) {
        $stmt = $pdo->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        
        if ($stmt->rowCount() == 0) {
            $allTablesCreated = false;
            echo "Таблица '$table' не создана<br>";
        } else {
            echo "Таблица '$table' успешно создана/существует<br>";
        }
    }
    
    if ($allTablesCreated) {
        echo "<h3>Все таблицы успешно созданы/существуют. База данных готова к использованию.</h3>";
    } else {
        echo "<h3>Не все таблицы были созданы. Проверьте ошибки выше.</h3>";
    }
} else {
    echo "<h3>Ошибка при инициализации базы данных.</h3>";
}
?> 