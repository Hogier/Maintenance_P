<?php
// Set headers for JSON response
header('Content-Type: application/json');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Get request body as JSON
$data = json_decode(file_get_contents('php://input'), true);

// Debug information
error_log("create_session.php: Received data: " . print_r($data, true));

if (isset($data['user_id'])) {
    // Set user ID in session
    $_SESSION['user_id'] = $data['user_id'];
    
    // Update user online status in the database
    try {
        // Database connection
        $host = 'macan.cityhost.com.ua';
        $dbname = 'chff6ee508';
        $username = 'chff6ee508';
        $password = '73b6bd56cf';
        $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Check if user exists in the online status table
        $checkStmt = $conn->prepare("SELECT user_id FROM user_online_status WHERE user_id = :user_id");
        $checkStmt->bindParam(':user_id', $data['user_id'], PDO::PARAM_INT);
        $checkStmt->execute();
        
        if ($checkStmt->rowCount() > 0) {
            // Update existing record
            $updateStmt = $conn->prepare("UPDATE user_online_status SET status = 'online', last_activity = NOW() WHERE user_id = :user_id");
            $updateStmt->bindParam(':user_id', $data['user_id'], PDO::PARAM_INT);
            $updateStmt->execute();
        } else {
            // Insert new record
            $insertStmt = $conn->prepare("INSERT INTO user_online_status (user_id, status) VALUES (:user_id, 'online')");
            $insertStmt->bindParam(':user_id', $data['user_id'], PDO::PARAM_INT);
            $insertStmt->execute();
        }
        
        error_log("create_session.php: Updated user online status for user_id: " . $data['user_id']);
    } catch (PDOException $e) {
        error_log("create_session.php: Database error: " . $e->getMessage());
    }
    
    // Debug information
    error_log("create_session.php: Set user_id in session: " . $_SESSION['user_id']);
    error_log("create_session.php: Session data: " . print_r($_SESSION, true));
    
    // Return success
    echo json_encode(['success' => true]);
} else {
    // Debug information
    error_log("create_session.php: No user_id provided in request data");
    
    // Return error
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'User ID is required']);
}
