<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../classes/AccessCode.php';

try {
    // Get code from POST request
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['code']) || !preg_match('/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/', $data['code'])) {
        throw new Exception('Invalid code format');
    }
    
    $accessCode = new AccessCode();
    $result = $accessCode->verifyCode($data['code']);
    
    if ($result['valid']) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Code verified successfully'
        ]);
    } else {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => $result['message']
        ]);
    }
} catch (Exception $e) {
    error_log("Verify code error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} 