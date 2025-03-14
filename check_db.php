<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once dirname(__FILE__) . '/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // Check all codes in the database
    $query = "SELECT * FROM access_codes ORDER BY created_at DESC";
    $result = $conn->query($query);
    
    echo "<h2>All Access Codes in Database</h2>";
    echo "<pre>";
    while ($row = $result->fetch_assoc()) {
        echo "ID: " . $row['id'] . "\n";
        echo "Code: " . $row['code'] . "\n";
        echo "Status: " . $row['status'] . "\n";
        echo "Created at: " . $row['created_at'] . "\n";
        echo "Expires at: " . $row['expires_at'] . "\n";
        echo "Used at: " . ($row['used_at'] ? $row['used_at'] : 'Not used') . "\n";
        echo "----------------------------------------\n";
    }
    echo "</pre>";
    
    // Try to reset the code again with a different query
    $code = '9H67-QXRK-F1Y4';
    $resetQuery = "UPDATE access_codes SET status = 'active', used_at = NULL WHERE code = ? AND expires_at > NOW()";
    $stmt = $conn->prepare($resetQuery);
    $stmt->bind_param('s', $code);
    
    if ($stmt->execute()) {
        echo "<h3>Reset Attempt Result:</h3>";
        echo "Rows affected: " . $stmt->affected_rows . "<br>";
        
        // Check the code status after reset
        $checkStmt = $conn->prepare("SELECT * FROM access_codes WHERE code = ?");
        $checkStmt->bind_param('s', $code);
        $checkStmt->execute();
        $codeData = $checkStmt->get_result()->fetch_assoc();
        
        echo "<pre>";
        echo "Current status after reset:\n";
        echo "Code: " . $codeData['code'] . "\n";
        echo "Status: " . $codeData['status'] . "\n";
        echo "Created at: " . $codeData['created_at'] . "\n";
        echo "Expires at: " . $codeData['expires_at'] . "\n";
        echo "Used at: " . ($codeData['used_at'] ? $codeData['used_at'] : 'Not used') . "\n";
        echo "</pre>";
    } else {
        echo "Error resetting code: " . $stmt->error;
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?> 