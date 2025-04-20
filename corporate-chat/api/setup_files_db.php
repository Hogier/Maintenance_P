<?php
/**
 * Setup script for chat files database table
 */

// Include database config
require_once __DIR__ . "/db_config.php";

// Create connection
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "Connected to database successfully!\n";

// Check if tables already exist
$tableExists = false;
$result = $conn->query("SHOW TABLES LIKE 'chat_files'");
if ($result) {
    $tableExists = ($result->num_rows > 0);
}

if ($tableExists) {
    echo "Table 'chat_files' already exists in the database.\n";
} else {
    // Load the SQL file
    $sql = file_get_contents(__DIR__ . '/chat-files-database.sql');
    
    // Split SQL commands
    $commands = explode(';', $sql);
    
    // Execute each command separately
    foreach($commands as $command) {
        $command = trim($command);
        if (empty($command)) continue;
        
        try {
            if (!$conn->query($command)) {
                echo "Error executing SQL: " . $conn->error . "\nCommand: " . $command . "\n";
            } else {
                echo "SQL command executed successfully.\n";
            }
        } catch (Exception $e) {
            echo "Exception: " . $e->getMessage() . "\nCommand: " . $command . "\n";
        }
    }
    
    echo "Database setup completed.\n";
}

// Create directory structure if it doesn't exist
$directories = [
    __DIR__ . '/../chat-files',
    __DIR__ . '/../chat-files/docs',
    __DIR__ . '/../chat-files/mini'
];

foreach ($directories as $dir) {
    if (!file_exists($dir)) {
        if (mkdir($dir, 0777, true)) {
            echo "Directory created: $dir\n";
        } else {
            echo "Error creating directory: $dir\n";
        }
    } else {
        echo "Directory already exists: $dir\n";
    }
}

// Set proper permissions
foreach ($directories as $dir) {
    if (file_exists($dir)) {
        if (chmod($dir, 0777)) {
            echo "Permissions set for: $dir\n";
        } else {
            echo "Error setting permissions for: $dir\n";
        }
    }
}

// Check table structure
echo "\nChecking database structure:\n";

// Check if the chat_files table exists
$result = $conn->query("SHOW TABLES LIKE 'chat_files'");
if ($result && $result->num_rows > 0) {
    echo "Table 'chat_files' exists.\n";
    
    // Check columns in the table
    $result = $conn->query("DESCRIBE chat_files");
    echo "Columns in chat_files table:\n";
    while ($row = $result->fetch_assoc()) {
        echo "- {$row['Field']} ({$row['Type']})\n";
    }
} else {
    echo "Table 'chat_files' does NOT exist!\n";
}

// Check if has_file column exists in chat_messages
$result = $conn->query("SHOW COLUMNS FROM chat_messages LIKE 'has_file'");
if ($result && $result->num_rows > 0) {
    echo "\nColumn 'has_file' exists in chat_messages table.\n";
} else {
    echo "\nColumn 'has_file' does NOT exist in chat_messages table!\n";
    
    // Try to add the column if it doesn't exist
    $addColumnSql = "ALTER TABLE `chat_messages` ADD COLUMN `has_file` TINYINT(1) NOT NULL DEFAULT '0' AFTER `message`";
    if ($conn->query($addColumnSql)) {
        echo "Added 'has_file' column to chat_messages table.\n";
    } else {
        echo "Error adding 'has_file' column: " . $conn->error . "\n";
    }
}

echo "\nSetup complete!\n";

$conn->close();
?> 