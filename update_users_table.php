<?php
// Имитируем веб-запрос для совместимости с database.php
if (!isset($_SERVER['REQUEST_METHOD'])) {
    $_SERVER['REQUEST_METHOD'] = 'GET';
}

// Include database connection
require_once 'database.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    echo "Starting database update process...\n";
    
    // Create database connection
    $db = new Database();
    $conn = $db->getConnection();
    
    // Check if staffType column exists
    $result = $conn->query("SHOW COLUMNS FROM users LIKE 'staffType'");
    
    if ($result->num_rows > 0) {
        // Column exists, so remove it
        echo "staffType column exists. Removing it...\n";
        $alterQuery = "ALTER TABLE users DROP COLUMN staffType";
        
        if ($conn->query($alterQuery)) {
            echo "<p style='color: green;'>Successfully removed staffType column from users table!</p>";
        } else {
            echo "<p style='color: red;'>Error removing staffType column: " . $conn->error . "</p>";
        }
    } else {
        echo "<p style='color: blue;'>staffType column does not exist in users table. No action needed.</p>";
    }
    
    echo "<p>Database update process completed.</p>";
    echo "<p><a href='main.html'>Return to main page</a></p>";
    
} catch (Exception $e) {
    echo "<h2>Error:</h2>";
    echo "<p style='color: red;'>" . htmlspecialchars($e->getMessage()) . "</p>";
} 
?> 