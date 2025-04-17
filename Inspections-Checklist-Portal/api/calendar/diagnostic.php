<?php
// Set maximum error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Function to output HTML results in a readable format
function outputResult($title, $success, $message, $details = '') {
    $color = $success ? '#4CAF50' : '#F44336';
    echo "<div style='margin: 10px 0; padding: 10px; border: 1px solid {$color}; border-radius: 5px;'>";
    echo "<h3 style='color: {$color}'>{$title}: " . ($success ? 'SUCCESS' : 'FAILED') . "</h3>";
    echo "<p>{$message}</p>";
    if (!empty($details)) {
        echo "<pre style='background: #f5f5f5; padding: 10px; overflow: auto; max-height: 300px;'>{$details}</pre>";
    }
    echo "</div>";
}

// Output formatted header
echo "<!DOCTYPE html>
<html>
<head>
    <title>Calendar API Diagnostics</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        pre { background: #f5f5f5; padding: 10px; overflow: auto; }
    </style>
</head>
<body>
    <h1>Calendar API Diagnostics</h1>
    <p>Testing all components to determine why events aren't being saved</p>
";

// Database connection parameters
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "maintenance_portal";

// Test 1: Database Connection
try {
    $conn = new mysqli($servername, $username, $password);
    
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    outputResult("Database Connection", true, "Successfully connected to MySQL server.");
} catch (Exception $e) {
    outputResult("Database Connection", false, "Failed to connect to MySQL server.", $e->getMessage());
    die("Cannot continue tests without database connection");
}

// Test 2: Database Existence
try {
    $result = $conn->query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '$dbname'");
    
    if ($result->num_rows > 0) {
        outputResult("Database Existence", true, "Database '$dbname' exists.");
    } else {
        outputResult("Database Existence", false, "Database '$dbname' does not exist.");
        
        // Try to create the database
        if ($conn->query("CREATE DATABASE IF NOT EXISTS $dbname")) {
            outputResult("Database Creation", true, "Created database '$dbname'.");
        } else {
            outputResult("Database Creation", false, "Failed to create database.", $conn->error);
            die("Cannot continue without database");
        }
    }
    
    // Select the database
    if (!$conn->select_db($dbname)) {
        outputResult("Database Selection", false, "Failed to select database '$dbname'.", $conn->error);
        die("Cannot continue without database selection");
    } else {
        outputResult("Database Selection", true, "Successfully selected database '$dbname'.");
    }
} catch (Exception $e) {
    outputResult("Database Existence Check", false, "Error checking database existence.", $e->getMessage());
    die("Cannot continue tests");
}

// Test 3: Table Existence
try {
    $result = $conn->query("SHOW TABLES LIKE 'calendar_events'");
    
    if ($result->num_rows > 0) {
        outputResult("Table Existence", true, "Table 'calendar_events' exists.");
    } else {
        outputResult("Table Existence", false, "Table 'calendar_events' does not exist.");
        
        // Create the table with default structure
        $createTableSQL = "CREATE TABLE IF NOT EXISTS calendar_events (
            id INT(11) AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            event_date DATETIME NOT NULL,
            event_type VARCHAR(50) DEFAULT 'reminder',
            color VARCHAR(50),
            is_completed TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )";
        
        if ($conn->query($createTableSQL)) {
            outputResult("Table Creation", true, "Created table 'calendar_events'.");
        } else {
            outputResult("Table Creation", false, "Failed to create table.", $conn->error);
            die("Cannot continue without table");
        }
    }
} catch (Exception $e) {
    outputResult("Table Existence Check", false, "Error checking table existence.", $e->getMessage());
    die("Cannot continue tests");
}

// Test 4: Table Structure
try {
    $result = $conn->query("SHOW COLUMNS FROM calendar_events");
    
    if ($result->num_rows > 0) {
        $columns = [];
        while ($row = $result->fetch_assoc()) {
            $columns[] = $row;
        }
        
        outputResult(
            "Table Structure", 
            true, 
            "Table 'calendar_events' has " . count($columns) . " columns.", 
            print_r($columns, true)
        );
    } else {
        outputResult("Table Structure", false, "Failed to retrieve table structure.");
    }
} catch (Exception $e) {
    outputResult("Table Structure Check", false, "Error checking table structure.", $e->getMessage());
}

// Test 5: Insert Permissions & Test Insert
try {
    // Generate a unique title to avoid duplicates
    $testTitle = "Test Event " . date('Y-m-d H:i:s');
    
    $sql = "INSERT INTO calendar_events (title, event_date, event_type) 
            VALUES ('$testTitle', NOW(), 'test')";
    
    if ($conn->query($sql)) {
        $id = $conn->insert_id;
        outputResult(
            "Test Insert", 
            true, 
            "Successfully inserted a test record with ID: $id.",
            "SQL: $sql"
        );
        
        // Test retrieving the inserted record
        $result = $conn->query("SELECT * FROM calendar_events WHERE id = $id");
        if ($result && $result->num_rows > 0) {
            $record = $result->fetch_assoc();
            outputResult(
                "Test Retrieval", 
                true, 
                "Successfully retrieved the test record.", 
                print_r($record, true)
            );
        } else {
            outputResult("Test Retrieval", false, "Failed to retrieve the test record.", $conn->error);
        }
        
        // Clean up the test record
        if ($conn->query("DELETE FROM calendar_events WHERE id = $id")) {
            outputResult("Test Cleanup", true, "Successfully removed the test record.");
        } else {
            outputResult("Test Cleanup", false, "Failed to remove the test record.", $conn->error);
        }
    } else {
        outputResult("Test Insert", false, "Failed to insert a test record.", $conn->error);
    }
} catch (Exception $e) {
    outputResult("Insert Test", false, "Error during insert test.", $e->getMessage());
}

// Test 6: Direct API Test
try {
    // Test data
    $testData = [
        'title' => 'API Test Event ' . date('Y-m-d H:i:s'),
        'event_date' => date('Y-m-d H:i:s'),
        'event_type' => 'test',
        'color' => 'blue'
    ];
    
    // JSON encode data
    $jsonData = json_encode($testData);
    
    // Path to the API file
    $apiFilePath = __DIR__ . '/events.php';
    
    outputResult(
        "API File Check", 
        file_exists($apiFilePath), 
        file_exists($apiFilePath) ? "API file exists at $apiFilePath" : "API file does not exist at $apiFilePath"
    );
    
    // Set up the curl request
    $ch = curl_init();
    $apiUrl = 'http://localhost/Maintenance_P/Inspections-Checklist-Portal/api/calendar/events.php';
    
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    
    curl_close($ch);
    
    if ($error) {
        outputResult("Direct API Test", false, "cURL error during API test.", $error);
    } else {
        $success = $httpCode >= 200 && $httpCode < 300;
        outputResult(
            "Direct API Test", 
            $success, 
            $success ? "API responded with success" : "API responded with error $httpCode", 
            "Request: " . print_r($testData, true) . "\n\nResponse: $response"
        );
        
        // If successful, try to retrieve the record and then delete it
        try {
            $result = json_decode($response, true);
            if (isset($result['success']) && $result['success'] && isset($result['id'])) {
                $id = $result['id'];
                
                // Test retrieving the inserted record
                $result = $conn->query("SELECT * FROM calendar_events WHERE id = $id");
                if ($result && $result->num_rows > 0) {
                    $record = $result->fetch_assoc();
                    outputResult(
                        "API Insert Verification", 
                        true, 
                        "Successfully verified the API inserted record.", 
                        print_r($record, true)
                    );
                } else {
                    outputResult("API Insert Verification", false, "Could not find the API inserted record.", $conn->error);
                }
                
                // Clean up the test record
                if ($conn->query("DELETE FROM calendar_events WHERE id = $id")) {
                    outputResult("API Test Cleanup", true, "Successfully removed the API test record.");
                } else {
                    outputResult("API Test Cleanup", false, "Failed to remove the API test record.", $conn->error);
                }
            }
        } catch (Exception $e) {
            outputResult("API Response Processing", false, "Error processing API response.", $e->getMessage());
        }
    }
} catch (Exception $e) {
    outputResult("Direct API Test", false, "Exception during API test.", $e->getMessage());
}

// Test 7: JavaScript Events
echo "<div style='margin: 10px 0; padding: 10px; border: 1px solid #2196F3; border-radius: 5px;'>";
echo "<h3 style='color: #2196F3'>JavaScript Test Tool</h3>";
echo "<p>Use this form to test event creation directly from this diagnostic page:</p>";
echo "<form id='testForm' style='margin-top: 15px;'>
    <div style='margin-bottom: 10px;'>
        <label for='title'>Title:</label>
        <input type='text' id='title' value='Test Event' style='padding: 5px; width: 300px;'>
    </div>
    <div style='margin-bottom: 10px;'>
        <label for='event_date'>Date:</label>
        <input type='datetime-local' id='event_date' value='" . date('Y-m-d\TH:i') . "' style='padding: 5px;'>
    </div>
    <div style='margin-bottom: 10px;'>
        <label for='event_type'>Type:</label>
        <select id='event_type' style='padding: 5px; width: 200px;'>
            <option value='reminder'>Reminder</option>
            <option value='inspection'>Inspection</option>
            <option value='checklist'>Checklist</option>
            <option value='test'>Test</option>
        </select>
    </div>
    <div style='margin-bottom: 10px;'>
        <label for='color'>Color:</label>
        <select id='color' style='padding: 5px; width: 200px;'>
            <option value='blue'>Blue</option>
            <option value='green'>Green</option>
            <option value='red'>Red</option>
            <option value='orange'>Orange</option>
            <option value='purple'>Purple</option>
        </select>
    </div>
    <button type='button' id='testButton' style='padding: 8px 15px; background: #2196F3; color: white; border: none; cursor: pointer;'>Test API</button>
</form>
<div id='testResult' style='margin-top: 15px; padding: 10px; background: #f5f5f5; display: none;'></div>
";

// Add JavaScript to test the API directly
echo "<script>
document.getElementById('testButton').addEventListener('click', async function() {
    const resultDiv = document.getElementById('testResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = 'Testing API...';
    
    try {
        // Get form values
        const title = document.getElementById('title').value;
        const eventDate = document.getElementById('event_date').value.replace('T', ' ') + ':00';
        const eventType = document.getElementById('event_type').value;
        const color = document.getElementById('color').value;
        
        // Create event data
        const eventData = {
            title: title,
            event_date: eventDate,
            event_type: eventType,
            color: color,
            is_completed: false
        };
        
        // Send API request
        const response = await fetch('../calendar/events.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });
        
        const responseText = await response.text();
        let result;
        
        try {
            result = JSON.parse(responseText);
            resultDiv.innerHTML = '<h4>API Response:</h4>' + 
                                  '<pre>' + JSON.stringify(result, null, 2) + '</pre>' +
                                  '<h4>Request Data:</h4>' +
                                  '<pre>' + JSON.stringify(eventData, null, 2) + '</pre>';
        } catch (e) {
            resultDiv.innerHTML = '<h4>Error parsing response:</h4>' +
                                  '<p>' + e.message + '</p>' +
                                  '<h4>Raw Response:</h4>' +
                                  '<pre>' + responseText + '</pre>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<h4>Error:</h4><p>' + error.message + '</p>';
    }
});
</script>";
echo "</div>";

// Close connection
if (isset($conn)) {
    $conn->close();
    outputResult("Database Connection", true, "Successfully closed database connection.");
}

// Final output
echo "<h2>Diagnostic Summary</h2>";
echo "<p>If all tests passed but events are still not saving, check the following:</p>";
echo "<ul>
    <li>JavaScript console errors in the browser</li>
    <li>Network tab in developer tools for the actual API requests</li>
    <li>PHP error logs at /Applications/XAMPP/xamppfiles/logs/php_error_log</li>
    <li>Apache error logs at /Applications/XAMPP/xamppfiles/logs/error_log</li>
    <li>Make sure XAMPP services (Apache and MySQL) are running</li>
</ul>";

echo "</body></html>";
?> 