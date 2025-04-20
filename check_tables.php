<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set header for HTML output
header('Content-Type: text/html; charset=utf-8');

echo "<h1>Tasks and Comments Tables Check</h1>";

// Database connection
$host = 'macan.cityhost.com.ua';
$user = 'chff6ee508';
$password = '73b6bd56cf';
$database = 'chff6ee508';

$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    die("<p style='color:red'>Connection failed: " . $conn->connect_error . "</p>");
}

echo "<p>Connected to database successfully.</p>";

// Check 'tasks' table structure
echo "<h2>Structure of 'tasks' table:</h2>";
$tasksStructure = $conn->query("DESCRIBE tasks");
echo "<table border='1'><tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
while ($row = $tasksStructure->fetch_assoc()) {
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

// Check if 'comments' column exists in tasks table
$commentsColumn = $conn->query("SHOW COLUMNS FROM tasks LIKE 'comments'");
if ($commentsColumn->num_rows > 0) {
    echo "<p style='color:orange'>The 'comments' column still exists in the 'tasks' table!</p>";
} else {
    echo "<p style='color:green'>The 'comments' column has been removed from the 'tasks' table.</p>";
}

// Check 'task_comments' table structure
echo "<h2>Structure of 'task_comments' table:</h2>";
$commentsStructure = $conn->query("DESCRIBE task_comments");
echo "<table border='1'><tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
while ($row = $commentsStructure->fetch_assoc()) {
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

// Check recent comments - last 5 added
echo "<h2>Last 5 comments in task_comments table:</h2>";
$recentComments = $conn->query("SELECT * FROM task_comments ORDER BY id DESC LIMIT 5");
echo "<table border='1'><tr><th>ID</th><th>Task ID</th><th>Staff Name</th><th>Text</th><th>Timestamp</th><th>Created At</th></tr>";
while ($comment = $recentComments->fetch_assoc()) {
    echo "<tr>";
    echo "<td>{$comment['id']}</td>";
    echo "<td>{$comment['task_id']}</td>";
    echo "<td>{$comment['staff_name']}</td>";
    echo "<td>" . htmlspecialchars($comment['text']) . "</td>";
    echo "<td>{$comment['timestamp']}</td>";
    echo "<td>{$comment['created_at']}</td>";
    echo "</tr>";
}
echo "</table>";

// Check if comments are still stored in tasks table in JSON format
echo "<h2>Checking for comments in 'tasks' table comments column:</h2>";
$tasksWithComments = $conn->query("SELECT request_id, comments FROM tasks WHERE comments IS NOT NULL AND comments != '[]' LIMIT 5");

if ($tasksWithComments) {
    if ($tasksWithComments->num_rows > 0) {
        echo "<p style='color:orange'>Found tasks with comments stored in the 'comments' column!</p>";
        echo "<table border='1'><tr><th>Task ID</th><th>Comments JSON</th><th>Parsed Structure</th></tr>";
        
        while ($task = $tasksWithComments->fetch_assoc()) {
            $commentsJson = $task['comments'];
            $parsedComments = json_decode($commentsJson, true);
            
            echo "<tr>";
            echo "<td>{$task['request_id']}</td>";
            echo "<td>" . htmlspecialchars(substr($commentsJson, 0, 100)) . (strlen($commentsJson) > 100 ? '...' : '') . "</td>";
            echo "<td><pre>" . htmlspecialchars(print_r($parsedComments, true)) . "</pre></td>";
            echo "</tr>";
        }
        
        echo "</table>";
    } else {
        echo "<p style='color:green'>No tasks found with comments in the JSON format.</p>";
    }
} else {
    echo "<p style='color:green'>The 'comments' column has been removed from the 'tasks' table.</p>";
}

// Test creating a comment through comments.php
echo "<h2>Test creating a comment through comments.php:</h2>";

// Get a test task ID
$taskQuery = $conn->query("SELECT request_id FROM tasks LIMIT 1");
$task = $taskQuery->fetch_assoc();
$taskId = $task['request_id'];

// Test data
$timestamp = date('Y-m-d H:i:s');
$staffName = "Test Staff";
$commentText = "Test comment through direct PHP - " . date('Y-m-d H:i:s');

echo "<p>Using task ID: {$taskId}</p>";
echo "<p>Comment timestamp: {$timestamp}</p>";

// Call comments.php directly using curl
$curl = curl_init('http://maintenance-portal.pp.ua/comments.php');
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
curl_setopt($curl, CURLOPT_POST, true);
curl_setopt($curl, CURLOPT_POSTFIELDS, [
    'action' => 'addComment',
    'taskId' => $taskId,
    'staffName' => $staffName,
    'commentText' => $commentText,
    'timestamp' => $timestamp
]);

$response = curl_exec($curl);
$curlError = curl_error($curl);
curl_close($curl);

echo "<p>Response from comments.php:</p>";
echo "<pre>" . htmlspecialchars($response) . "</pre>";

if ($curlError) {
    echo "<p style='color:red'>cURL Error: {$curlError}</p>";
}

try {
    $result = json_decode($response, true);
    if ($result['success']) {
        $commentId = $result['commentId'];
        echo "<p style='color:green'>Comment added successfully with ID: {$commentId}</p>";
        
        // Check where the comment was saved
        echo "<h3>Checking where the comment was saved:</h3>";
        
        // Check in task_comments table
        $newCommentQuery = $conn->prepare("SELECT * FROM task_comments WHERE id = ?");
        $newCommentQuery->bind_param("i", $commentId);
        $newCommentQuery->execute();
        $newCommentResult = $newCommentQuery->get_result();
        
        if ($newCommentResult->num_rows > 0) {
            echo "<p style='color:green'>Comment found in task_comments table!</p>";
            $newComment = $newCommentResult->fetch_assoc();
            echo "<pre>" . print_r($newComment, true) . "</pre>";
        } else {
            echo "<p style='color:red'>Comment NOT found in task_comments table!</p>";
        }
        
        // Check if comments field in tasks table was updated
        if ($commentsColumn->num_rows > 0) {
            $taskWithCommentQuery = $conn->prepare("SELECT comments FROM tasks WHERE request_id = ?");
            $taskWithCommentQuery->bind_param("s", $taskId);
            $taskWithCommentQuery->execute();
            $taskWithCommentResult = $taskWithCommentQuery->get_result();
            
            if ($taskWithCommentResult->num_rows > 0) {
                $taskWithComment = $taskWithCommentResult->fetch_assoc();
                $commentsJson = $taskWithComment['comments'];
                $parsedComments = json_decode($commentsJson, true);
                
                $foundInTasks = false;
                if (is_array($parsedComments)) {
                    foreach ($parsedComments as $comment) {
                        if (isset($comment['text']) && $comment['text'] === $commentText) {
                            $foundInTasks = true;
                            break;
                        }
                    }
                }
                
                if ($foundInTasks) {
                    echo "<p style='color:red'>Comment also found in the JSON format in tasks.comments!</p>";
                    echo "<pre>" . htmlspecialchars(json_encode($parsedComments, JSON_PRETTY_PRINT)) . "</pre>";
                } else {
                    echo "<p style='color:green'>Comment NOT added to the JSON format in tasks.comments.</p>";
                }
            }
        }
        
        // Cleanup - delete the test comment
        $deleteQuery = $conn->prepare("DELETE FROM task_comments WHERE id = ?");
        $deleteQuery->bind_param("i", $commentId);
        $deleteQuery->execute();
        echo "<p>Test comment deleted for cleanup.</p>";
    } else {
        echo "<p style='color:red'>Error adding comment: {$result['message']}</p>";
    }
} catch (Exception $e) {
    echo "<p style='color:red'>Error processing response: {$e->getMessage()}</p>";
}

// Check WebSocket implementation
echo "<h2>WebSocket Implementation (task.php vs comments.php):</h2>";

// Find websocket-related code that might be handling comments
$files = ['task.php', 'comments.php', 'tasks.js', 'database.js'];
foreach ($files as $file) {
    if (file_exists($file)) {
        $content = file_get_contents($file);
        
        if (strpos($content, 'WebSocket') !== false || strpos($content, 'ws.') !== false || 
            strpos($content, 'wss.') !== false || strpos($content, 'tasksWS') !== false) {
            echo "<p>WebSocket implementation found in {$file}</p>";
            
            // Find the specific code related to comments in WebSocket
            $matches = [];
            if (preg_match('/WebSocket.*comment/s', $content, $matches) || 
                preg_match('/ws\..*comment/s', $content, $matches) ||
                preg_match('/wss\..*comment/s', $content, $matches) ||
                preg_match('/tasksWS.*comment/s', $content, $matches)) {
                echo "<p>Comment-related WebSocket code found in {$file}:</p>";
                echo "<pre>" . htmlspecialchars(substr($matches[0], 0, 300)) . "...</pre>";
            }
        }
    }
}

$conn->close();
echo "<h2>Check Complete</h2>";
?> 