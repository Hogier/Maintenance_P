<?php
// Set timezone and enable error reporting for debugging
date_default_timezone_set('America/Chicago');
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Выводим информацию о PHP версии и конфигурации
echo "<h1>Debug Information</h1>";
echo "<h2>PHP Info</h2>";
echo "<p>PHP Version: " . phpversion() . "</p>";

// Проверяем наличие и доступность database.php
$databasePath = dirname(dirname(__DIR__)) . '/database.php';
echo "<h2>Database File</h2>";
echo "<p>Path: $databasePath</p>";
echo "<p>Exists: " . (file_exists($databasePath) ? 'Yes' : 'No') . "</p>";
echo "<p>Readable: " . (is_readable($databasePath) ? 'Yes' : 'No') . "</p>";

// Пытаемся подключить database.php
echo "<h2>Database Connection</h2>";
try {
    require_once $databasePath;
    echo "<p>Database file included successfully</p>";
    
    $db = new Database();
    $conn = $db->getConnection();
    echo "<p>Database connection established</p>";
    
    // Проверяем наличие таблиц
    echo "<h2>Database Tables</h2>";
    $tables = [
        'supply_orders',
        'supply_order_items',
        'material_orders',
        'material_order_items',
        'materials',
        'users'
    ];
    
    foreach ($tables as $table) {
        $result = $conn->query("SHOW TABLES LIKE '$table'");
        echo "<p>Table '$table': " . ($result->num_rows > 0 ? 'Exists' : 'Not found') . "</p>";
    }
    
    // Проверяем содержимое таблиц
    $checkTables = [
        'supply_orders' => "SELECT COUNT(*) as count FROM supply_orders",
        'supply_order_items' => "SELECT COUNT(*) as count FROM supply_order_items",
        'material_orders' => "SELECT COUNT(*) as count FROM material_orders",
    ];
    
    echo "<h2>Table Records</h2>";
    foreach ($checkTables as $table => $query) {
        try {
            $result = $conn->query($query);
            if ($result) {
                $row = $result->fetch_assoc();
                echo "<p>$table: " . $row['count'] . " records</p>";
            } else {
                echo "<p>$table: Error executing query - " . $conn->error . "</p>";
            }
        } catch (Exception $e) {
            echo "<p>$table: Exception - " . $e->getMessage() . "</p>";
        }
    }
    
    // Проверяем последние 5 заказов в material_orders
    echo "<h2>Recent Material Orders</h2>";
    try {
        $result = $conn->query("SELECT * FROM material_orders ORDER BY id DESC LIMIT 5");
        
        if ($result && $result->num_rows > 0) {
            echo "<table border='1'>";
            echo "<tr><th>ID</th><th>User ID</th><th>Status</th><th>Notes</th><th>Created At</th></tr>";
            
            while ($row = $result->fetch_assoc()) {
                echo "<tr>";
                echo "<td>" . $row['id'] . "</td>";
                echo "<td>" . $row['user_id'] . "</td>";
                echo "<td>" . $row['status'] . "</td>";
                echo "<td>" . htmlspecialchars($row['notes']) . "</td>";
                echo "<td>" . $row['created_at'] . "</td>";
                echo "</tr>";
            }
            
            echo "</table>";
        } else {
            echo "<p>No recent material orders found</p>";
        }
    } catch (Exception $e) {
        echo "<p>Error fetching material orders: " . $e->getMessage() . "</p>";
    }
    
    // Проверяем последние 5 заказов в supply_orders
    echo "<h2>Recent Supply Orders</h2>";
    try {
        $result = $conn->query("SELECT * FROM supply_orders ORDER BY id DESC LIMIT 5");
        
        if ($result && $result->num_rows > 0) {
            echo "<table border='1'>";
            echo "<tr><th>ID</th><th>Original Order ID</th><th>User ID</th><th>Status</th><th>Notes</th><th>Created At</th></tr>";
            
            while ($row = $result->fetch_assoc()) {
                echo "<tr>";
                echo "<td>" . $row['id'] . "</td>";
                echo "<td>" . $row['original_order_id'] . "</td>";
                echo "<td>" . $row['user_id'] . "</td>";
                echo "<td>" . $row['status'] . "</td>";
                echo "<td>" . htmlspecialchars($row['notes']) . "</td>";
                echo "<td>" . $row['created_at'] . "</td>";
                echo "</tr>";
            }
            
            echo "</table>";
        } else {
            echo "<p>No recent supply orders found</p>";
        }
    } catch (Exception $e) {
        echo "<p>Error fetching supply orders: " . $e->getMessage() . "</p>";
    }
    
} catch (Exception $e) {
    echo "<p>Error: " . $e->getMessage() . "</p>";
}

// Проверяем файл API
$apiPath = __DIR__ . '/supplies-api.php';
echo "<h2>API File</h2>";
echo "<p>Path: $apiPath</p>";
echo "<p>Exists: " . (file_exists($apiPath) ? 'Yes' : 'No') . "</p>";
echo "<p>Readable: " . (is_readable($apiPath) ? 'Yes' : 'No') . "</p>";

// Проверяем текущий хост и пути к API
echo "<h2>URL Information</h2>";
echo "<p>Host: " . $_SERVER['HTTP_HOST'] . "</p>";
echo "<p>Script: " . $_SERVER['SCRIPT_NAME'] . "</p>";
echo "<p>API Path (absolute): " . realpath($apiPath) . "</p>";
echo "<p>API URL (recommended): " . "http://" . $_SERVER['HTTP_HOST'] . "/Inspections-Checklist-Portal/api/supplies-api.php" . "</p>";

// Информация о текущих настройках PHP
echo "<h2>PHP Settings</h2>";
echo "<p>display_errors: " . ini_get('display_errors') . "</p>";
echo "<p>error_reporting: " . ini_get('error_reporting') . "</p>";
echo "<p>error_log: " . ini_get('error_log') . "</p>";
echo "<p>memory_limit: " . ini_get('memory_limit') . "</p>";
echo "<p>post_max_size: " . ini_get('post_max_size') . "</p>";
echo "<p>allow_url_fopen: " . ini_get('allow_url_fopen') . "</p>";

// Вывод логов
echo "<h2>Recent Error Log Entries</h2>";
$logFile = ini_get('error_log');
if (file_exists($logFile) && is_readable($logFile)) {
    $logLines = [];
    $file = new SplFileObject($logFile);
    $file->seek(PHP_INT_MAX); // Переходим в конец файла
    $totalLines = $file->key(); // Получаем общее количество строк
    
    // Получаем последние 20 строк или меньше, если файл короче
    $startLine = max(0, $totalLines - 20);
    $file->seek($startLine);
    
    while (!$file->eof()) {
        $line = $file->current();
        if (strpos($line, 'API Request') !== false || 
            strpos($line, 'addSupplyOrder') !== false || 
            strpos($line, 'processApiRequest') !== false) {
            $logLines[] = htmlspecialchars($line);
        }
        $file->next();
    }
    
    if (!empty($logLines)) {
        echo "<pre>" . implode("", $logLines) . "</pre>";
    } else {
        echo "<p>No relevant log entries found</p>";
    }
} else {
    echo "<p>Error log file not found or not readable: $logFile</p>";
}
?> 