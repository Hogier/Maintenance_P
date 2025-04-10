<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Database Structure Check</h1>";

// Database connection
$host = 'localhost';
$user = 'root';
$password = 'root';
$database = 'maintenancedb';

try {
    $conn = new mysqli($host, $user, $password, $database);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    echo "<p>Connected to database successfully.</p>";
    
    // Check if task_comments table exists
    $result = $conn->query("SHOW TABLES LIKE 'task_comments'");
    if ($result->num_rows > 0) {
        echo "<p style='color:green'>Table 'task_comments' exists.</p>";
        
        // Check table structure
        echo "<h2>Table Structure:</h2>";
        $structure = $conn->query("DESCRIBE task_comments");
        echo "<table border='1'><tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
        while ($row = $structure->fetch_assoc()) {
            echo "<tr>";
            echo "<td>{$row['Field']}</td>";
            echo "<td>{$row['Type']}</td>";
            echo "<td>{$row['Null']}</td>";
            echo "<td>{$row['Key']}</td>";
            echo "<td>{$row['Default']}</td>";
            echo "<td>{$row['Extra']}</td>";
            echo "</tr>";
        }
        echo "</table>";
        
        // Check number of records
        $count = $conn->query("SELECT COUNT(*) as total FROM task_comments");
        $countRow = $count->fetch_assoc();
        echo "<p>Total records in table: {$countRow['total']}</p>";
        
        // Test insert operation
        echo "<h2>Testing Insert Operation:</h2>";
        
        $testTaskId = "TEST-" . uniqid();
        $testStaffName = "Test Staff";
        $testText = "Test comment";
        $testTimestamp = date('Y-m-d H:i:s');
        $testPhotoUrl = null;
        
        $insertStmt = $conn->prepare("INSERT INTO task_comments (task_id, staff_name, text, timestamp, photo_url) VALUES (?, ?, ?, ?, ?)");
        
        if (!$insertStmt) {
            echo "<p style='color:red'>Prepare failed: " . $conn->error . "</p>";
        } else {
            $insertStmt->bind_param("sssss", $testTaskId, $testStaffName, $testText, $testTimestamp, $testPhotoUrl);
            
            if ($insertStmt->execute()) {
                $newId = $insertStmt->insert_id;
                echo "<p style='color:green'>Test insert successful. New ID: $newId</p>";
                
                // Clean up test data
                $conn->query("DELETE FROM task_comments WHERE id = $newId");
                echo "<p>Test record deleted.</p>";
            } else {
                echo "<p style='color:red'>Test insert failed: " . $insertStmt->error . "</p>";
            }
            
            $insertStmt->close();
        }
    } else {
        echo "<p style='color:red'>Table 'task_comments' does not exist!</p>";
    }
    
    $conn->close();
} catch (Exception $e) {
    echo "<p style='color:red'>Error: " . $e->getMessage() . "</p>";
}
?> 