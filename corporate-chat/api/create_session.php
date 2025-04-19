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
