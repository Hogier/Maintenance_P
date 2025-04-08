<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set header for HTML output
header('Content-Type: text/html; charset=utf-8');

echo "<h1>MySQL Timestamp Format Testing</h1>";

// Database connection
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'maintenancedb';

$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    die("<p style='color:red'>Connection failed: " . $conn->connect_error . "</p>");
}

echo "<p>Connected to database successfully.</p>";

// Test different timestamp formats
$formats = [
    'ISO8601' => date('c'), // 2004-02-12T15:19:21+00:00
    'ISO8601_NO_TZ' => date('Y-m-d\TH:i:s'), // 2004-02-12T15:19:21
    'MYSQL_DATETIME' => date('Y-m-d H:i:s'), // 2004-02-12 15:19:21
    'RFC2822' => date('r'), // Thu, 12 Feb 2004 15:19:21 +0000
    'UNIX_TIMESTAMP' => time(), // 1076599161
];

echo "<h2>Testing Different Date Formats</h2>";
echo "<table border='1'>";
echo "<tr><th>Format</th><th>Value</th><th>MySQL Interpretation</th><th>Insert Result</th></tr>";

// Get a sample task_id
$taskQuery = "SELECT request_id FROM tasks LIMIT 1";
$taskResult = $conn->query($taskQuery);

if (!$taskResult || $taskResult->num_rows === 0) {
    die("<p style='color:red'>No tasks found in the database!</p>");
}

$task = $taskResult->fetch_assoc();
$taskId = $task['request_id'];

// Test each format
foreach ($formats as $formatName => $timestamp) {
    echo "<tr>";
    echo "<td>{$formatName}</td>";
    echo "<td>" . htmlspecialchars($timestamp) . "</td>";
    
    // Test how MySQL interprets this format in a query
    $interpretQuery = "SELECT STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s') AS interpreted_date";
    $interpretStmt = $conn->prepare($interpretQuery);
    $interpretStmt->bind_param("s", $timestamp);
    $interpretStmt->execute();
    $result = $interpretStmt->get_result()->fetch_assoc();
    
    echo "<td>" . ($result['interpreted_date'] ?: 'NULL') . "</td>";
    
    // Test insert with this format
    $insertSuccess = false;
    $errorMessage = '';
    
    try {
        $insertQuery = "INSERT INTO task_comments (task_id, staff_name, text, timestamp) VALUES (?, ?, ?, ?)";
        $insertStmt = $conn->prepare($insertQuery);
        if (!$insertStmt) {
            throw new Exception($conn->error);
        }
        
        $text = "Test comment with {$formatName} format";
        $staffName = "Test Staff";
        
        $insertStmt->bind_param("ssss", $taskId, $staffName, $text, $timestamp);
        
        if ($insertStmt->execute()) {
            $newId = $insertStmt->insert_id;
            $insertSuccess = true;
            
            // Delete test comment
            $conn->query("DELETE FROM task_comments WHERE id = {$newId}");
        } else {
            $errorMessage = $insertStmt->error;
        }
    } catch (Exception $e) {
        $errorMessage = $e->getMessage();
    }
    
    if ($insertSuccess) {
        echo "<td style='color:green'>Success</td>";
    } else {
        echo "<td style='color:red'>Failed: {$errorMessage}</td>";
    }
    
    echo "</tr>";
}

echo "</table>";

// Test handling of JavaScript's ISO date format specifically
echo "<h2>Testing JavaScript ISO Date Format Handling</h2>";

$jsDate = "2025-04-05T19:47:51.123Z"; // Sample JavaScript ISO date

echo "<p>JavaScript ISO date: {$jsDate}</p>";

// Test direct insertion
try {
    $insertQuery = "INSERT INTO task_comments (task_id, staff_name, text, timestamp) VALUES (?, ?, ?, ?)";
    $insertStmt = $conn->prepare($insertQuery);
    
    $text = "Test comment with JavaScript ISO date";
    $staffName = "Test Staff";
    
    $insertStmt->bind_param("ssss", $taskId, $staffName, $text, $jsDate);
    
    if ($insertStmt->execute()) {
        $newId = $insertStmt->insert_id;
        echo "<p style='color:green'>Direct insert successful.</p>";
        
        // Retrieve the stored value
        $retrieveQuery = "SELECT timestamp FROM task_comments WHERE id = ?";
        $retrieveStmt = $conn->prepare($retrieveQuery);
        $retrieveStmt->bind_param("i", $newId);
        $retrieveStmt->execute();
        $result = $retrieveStmt->get_result()->fetch_assoc();
        
        echo "<p>Value stored in database: " . $result['timestamp'] . "</p>";
        
        // Delete test comment
        $conn->query("DELETE FROM task_comments WHERE id = {$newId}");
    } else {
        echo "<p style='color:red'>Direct insert failed: " . $insertStmt->error . "</p>";
    }
} catch (Exception $e) {
    echo "<p style='color:red'>Error: " . $e->getMessage() . "</p>";
}

// Test with STR_TO_DATE function
try {
    $insertQuery = "INSERT INTO task_comments (task_id, staff_name, text, timestamp) 
                   VALUES (?, ?, ?, STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'))";
    $insertStmt = $conn->prepare($insertQuery);
    
    $text = "Test comment with JavaScript ISO date converted with STR_TO_DATE";
    $staffName = "Test Staff";
    
    $insertStmt->bind_param("ssss", $taskId, $staffName, $text, $jsDate);
    
    if ($insertStmt->execute()) {
        $newId = $insertStmt->insert_id;
        echo "<p style='color:green'>Insert with STR_TO_DATE successful.</p>";
        
        // Retrieve the stored value
        $retrieveQuery = "SELECT timestamp FROM task_comments WHERE id = ?";
        $retrieveStmt = $conn->prepare($retrieveQuery);
        $retrieveStmt->bind_param("i", $newId);
        $retrieveStmt->execute();
        $result = $retrieveStmt->get_result()->fetch_assoc();
        
        echo "<p>Value stored in database: " . $result['timestamp'] . "</p>";
        
        // Delete test comment
        $conn->query("DELETE FROM task_comments WHERE id = {$newId}");
    } else {
        echo "<p style='color:red'>Insert with STR_TO_DATE failed: " . $insertStmt->error . "</p>";
    }
} catch (Exception $e) {
    echo "<p style='color:red'>Error: " . $e->getMessage() . "</p>";
}

$conn->close();
echo "<h2>Test Complete</h2>";
?> 