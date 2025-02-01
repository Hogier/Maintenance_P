<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

$host = 'localhost';
$user = 'root';
$password = '';
$database = 'maintenancedb';

try {
    $conn = new mysqli($host, $user, $password, $database);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    // Проверяем структуру таблицы
    $result = $conn->query("DESCRIBE events");
    if (!$result) {
        throw new Exception("Error describing table: " . $conn->error);
    }
    
    $columns = [];
    while ($row = $result->fetch_assoc()) {
        $columns[] = [
            'Field' => $row['Field'],
            'Type' => $row['Type'],
            'Null' => $row['Null'],
            'Key' => $row['Key'],
            'Default' => $row['Default'],
            'Extra' => $row['Extra']
        ];
    }
    
    // Тестовый запрос
    $testQuery = "SELECT * FROM events LIMIT 1";
    $testResult = $conn->query($testQuery);
    
    echo json_encode([
        'success' => true,
        'message' => 'Database connection successful',
        'table_structure' => $columns,
        'can_select' => $testResult !== false,
        'charset' => $conn->character_set_name(),
        'collation' => $conn->query("SHOW TABLE STATUS LIKE 'events'")->fetch_assoc()['Collation']
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

if (isset($conn)) {
    $conn->close();
}
?> 