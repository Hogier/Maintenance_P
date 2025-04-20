<?php
/**
 * Test script for the chat files API
 */

// Start session for user authentication
session_start();

// Set a test user ID for testing purposes
$_SESSION['user_id'] = 1; // Replace with an actual user ID from your database

// Include the files API
require_once __DIR__ . "/db_config.php";

// Create connection
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "Connected to database successfully!\n";

// Test queries
echo "\nChat files database information:\n";

// Check if the chat_files table exists
$result = $conn->query("SHOW TABLES LIKE 'chat_files'");
if ($result && $result->num_rows > 0) {
    echo "- Table 'chat_files' exists.\n";
    
    // Get count of files
    $result = $conn->query("SELECT COUNT(*) as count FROM chat_files");
    $row = $result->fetch_assoc();
    echo "- Number of files in the database: " . $row['count'] . "\n";
    
    // Check columns in the table
    $result = $conn->query("DESCRIBE chat_files");
    echo "- Columns in chat_files table:\n";
    while ($row = $result->fetch_assoc()) {
        echo "  * {$row['Field']} ({$row['Type']})\n";
    }
    
    // Show a sample of files if any exist
    $result = $conn->query("SELECT * FROM chat_files LIMIT 5");
    if ($result->num_rows > 0) {
        echo "\nSample files:\n";
        while ($row = $result->fetch_assoc()) {
            echo "- ID: {$row['id']}, Name: {$row['original_name']}, Type: {$row['file_type']}\n";
        }
    } else {
        echo "\nNo files found in the database.\n";
    }
} else {
    echo "Table 'chat_files' does NOT exist!\n";
}

// Check chat_messages table for messages with files
$result = $conn->query("SELECT COUNT(*) as count FROM chat_messages WHERE has_file = 1");
if ($result) {
    $row = $result->fetch_assoc();
    echo "\n- Number of messages with file attachments: " . $row['count'] . "\n";
}

// Check directory structure
$directories = [
    __DIR__ . '/../chat-files',
    __DIR__ . '/../chat-files/docs',
    __DIR__ . '/../chat-files/mini'
];

echo "\nDirectory structure:\n";
foreach ($directories as $dir) {
    if (file_exists($dir)) {
        echo "- Directory exists: $dir\n";
        
        // Count files in this directory
        $files = glob($dir . "/*");
        $fileCount = count($files);
        echo "  * Contains $fileCount files\n";
        
        // List a few files if they exist
        if ($fileCount > 0) {
            echo "  * Sample files:\n";
            $sampleFiles = array_slice($files, 0, 3); // Show up to 3 files
            foreach ($sampleFiles as $file) {
                echo "    - " . basename($file) . "\n";
            }
        }
    } else {
        echo "- Directory does NOT exist: $dir\n";
    }
}

echo "\nTest completed!\n";

$conn->close();
?> 