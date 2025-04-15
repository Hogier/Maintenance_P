<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/html; charset=utf-8');
echo "<h1>Debug Comment Functionality</h1>";

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

// Get a valid task ID from the database
$taskQuery = "SELECT request_id FROM tasks LIMIT 1";
$taskResult = $conn->query($taskQuery);

if (!$taskResult || $taskResult->num_rows === 0) {
    die("<p style='color:red'>No tasks found in the database!</p>");
}

$task = $taskResult->fetch_assoc();
$taskId = $task['request_id'];

echo "<p>Using task ID: $taskId for testing</p>";

// Test comment data
$staffName = "Debug User";
$commentText = "Debug comment - " . date('Y-m-d H:i:s');
$timestamp = date('Y-m-d H:i:s');
$photoUrl = '/Maintenance_P/users/img/user.png';

echo "<h2>Testing Direct Insert:</h2>";

// Test direct insert into the database
try {
    $directInsert = $conn->prepare("INSERT INTO task_comments (task_id, staff_name, text, timestamp, photo_url) VALUES (?, ?, ?, ?, ?)");
    if (!$directInsert) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $directInsert->bind_param("sssss", $taskId, $staffName, $commentText, $timestamp, $photoUrl);
    
    if ($directInsert->execute()) {
        $newId = $directInsert->insert_id;
        echo "<p style='color:green'>Direct insert successful. New comment ID: $newId</p>";
        
        // Update comment counter
        $updateCounter = $conn->prepare("UPDATE tasks SET commentCount = commentCount + 1 WHERE request_id = ?");
        $updateCounter->bind_param("s", $taskId);
        $updateCounter->execute();
        $updateCounter->close();
        
        // Delete the test comment
        $conn->query("DELETE FROM task_comments WHERE id = $newId");
        echo "<p>Test comment deleted from database.</p>";
    } else {
        echo "<p style='color:red'>Direct insert failed: " . $directInsert->error . "</p>";
    }
    
    $directInsert->close();
} catch (Exception $e) {
    echo "<p style='color:red'>Error during direct insert: " . $e->getMessage() . "</p>";
}

echo "<h2>Testing API Insert (comments.php):</h2>";

// Test using the comments.php API
try {
    $curlHandle = curl_init();
    
    $postData = [
        'action' => 'addComment',
        'taskId' => $taskId,
        'staffName' => $staffName,
        'commentText' => $commentText . ' (via API)',
        'timestamp' => $timestamp,
        'photoUrl' => $photoUrl
    ];
    
    echo "<p>Posting data to comments.php:</p>";
    echo "<pre>" . print_r($postData, true) . "</pre>";
    
    curl_setopt_array($curlHandle, [
        CURLOPT_URL => 'http://localhost/Maintenance_P/comments.php',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => http_build_query($postData),
        CURLOPT_POST => true
    ]);
    
    $response = curl_exec($curlHandle);
    $curlError = curl_error($curlHandle);
    $httpCode = curl_getinfo($curlHandle, CURLINFO_HTTP_CODE);
    
    curl_close($curlHandle);
    
    echo "<p>HTTP Status Code: $httpCode</p>";
    
    if ($curlError) {
        echo "<p style='color:red'>cURL Error: $curlError</p>";
    }
    
    echo "<p>API Response:</p>";
    echo "<pre>" . htmlspecialchars($response) . "</pre>";
    
    // Try to parse the response
    $responseData = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "<p style='color:red'>JSON Parse Error: " . json_last_error_msg() . "</p>";
    } else {
        echo "<p>Parsed Response:</p>";
        echo "<pre>" . print_r($responseData, true) . "</pre>";
        
        if ($responseData['success']) {
            $newId = $responseData['commentId'];
            echo "<p style='color:green'>API insert successful. New comment ID: $newId</p>";
            
            // Delete the test comment
            $conn->query("DELETE FROM task_comments WHERE id = $newId");
            $updateCounter = $conn->prepare("UPDATE tasks SET commentCount = commentCount - 1 WHERE request_id = ?");
            $updateCounter->bind_param("s", $taskId);
            $updateCounter->execute();
            $updateCounter->close();
            echo "<p>Test comment deleted from database.</p>";
        } else {
            echo "<p style='color:red'>API insert failed: " . ($responseData['message'] ?? 'Unknown error') . "</p>";
        }
    }
} catch (Exception $e) {
    echo "<p style='color:red'>Error during API test: " . $e->getMessage() . "</p>";
}

// Check for any PHP errors in comments.php
echo "<h2>Checking for PHP Errors in comments.php:</h2>";

try {
    $logsDir = '/Applications/XAMPP/xamppfiles/logs';
    $phpErrorLog = $logsDir . '/php_error_log';
    
    if (file_exists($phpErrorLog)) {
        $lastErrors = shell_exec("tail -n 20 $phpErrorLog");
        echo "<p>Last 20 lines of PHP error log:</p>";
        echo "<pre>" . htmlspecialchars($lastErrors) . "</pre>";
    } else {
        echo "<p>PHP error log not found at: $phpErrorLog</p>";
        
        // Try to find the error log
        $errorLogPath = ini_get('error_log');
        echo "<p>PHP error_log setting points to: $errorLogPath</p>";
        
        if (file_exists($errorLogPath)) {
            $lastErrors = shell_exec("tail -n 20 $errorLogPath");
            echo "<p>Last 20 lines of that error log:</p>";
            echo "<pre>" . htmlspecialchars($lastErrors) . "</pre>";
        }
    }
} catch (Exception $e) {
    echo "<p style='color:red'>Error checking log files: " . $e->getMessage() . "</p>";
}

// Check for database field/column constraints
echo "<h2>Checking Database Constraints:</h2>";

try {
    $createTableInfo = $conn->query("SHOW CREATE TABLE task_comments");
    $tableInfo = $createTableInfo->fetch_assoc();
    echo "<p>CREATE TABLE statement:</p>";
    echo "<pre>" . htmlspecialchars($tableInfo['Create Table']) . "</pre>";
} catch (Exception $e) {
    echo "<p style='color:red'>Error checking table constraints: " . $e->getMessage() . "</p>";
}

$conn->close();
echo "<h2>Debug Complete</h2>";
?> 