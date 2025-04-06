<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Include database connection - исправленный путь к файлу
require_once dirname(dirname(__DIR__)) . '/database.php';

// Create database connection
$db = new Database();
$conn = $db->getConnection();

// Function to execute SQL script
function executeSqlScript($conn, $sqlFile) {
    try {
        // Read SQL file
        $sql = file_get_contents($sqlFile);
        
        if ($sql === false) {
            throw new Exception("Failed to read SQL file: $sqlFile");
        }
        
        // Execute multi-query SQL
        $result = $conn->multi_query($sql);
        
        if ($result === false) {
            throw new Exception("Failed to execute SQL script: " . $conn->error);
        }
        
        // Process results
        do {
            // Store first result set
            if ($res = $conn->store_result()) {
                $res->free();
            }
            
            // Check if there are more results
            if (!$conn->more_results()) {
                break;
            }
            
            // Move to next result
            $conn->next_result();
        } while (true);
        
        return true;
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "<br>";
        return false;
    }
}

// Execute SQL script
$sqlFile = __DIR__ . '/create_supplies_tables.sql';
if (executeSqlScript($conn, $sqlFile)) {
    echo "Supplies tables created successfully!<br>";
} else {
    echo "Failed to create supplies tables.<br>";
}

// Close connection
$conn->close();
?> 