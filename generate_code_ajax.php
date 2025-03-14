<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

header('Content-Type: application/json');

// Функция для логирования
function logMessage($message) {
    error_log(date('Y-m-d H:i:s') . ' - ' . $message);
}

try {
    if (!file_exists(dirname(__FILE__) . '/database.php')) {
        throw new Exception('database.php not found');
    }
    
    if (!file_exists(dirname(__FILE__) . '/verify_code.php')) {
        throw new Exception('verify_code.php not found');
    }
    
    require_once dirname(__FILE__) . '/database.php';
    require_once dirname(__FILE__) . '/verify_code.php';

    // Создаем подключение к базе данных
    $database = new Database();
    if (!$database) {
        throw new Exception('Failed to create Database instance');
    }
    
    $conn = $database->getConnection();
    if (!$conn) {
        throw new Exception('Failed to get database connection');
    }
    
    // Генерируем новый код
    $newCode = generateAccessCode();
    if (!$newCode) {
        throw new Exception('Failed to generate access code');
    }
    
    // Сохраняем код в базу данных
    $currentDate = date('Y-m-d H:i:s');
    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
    
    $stmt = $conn->prepare("INSERT INTO access_codes (code, status, created_at, expires_at) VALUES (?, 'active', ?, ?)");
    if (!$stmt) {
        throw new Exception('Failed to prepare statement: ' . $conn->error);
    }
    
    $stmt->bind_param('sss', $newCode, $currentDate, $expiresAt);
    
    if (!$stmt->execute()) {
        throw new Exception('Failed to execute statement: ' . $stmt->error);
    }
    
    // Отправляем email
    if (sendEmailWithCode('dmitriy.palchikov@gmail.com', $newCode)) {
        echo json_encode([
            'success' => true,
            'code' => $newCode,
            'message' => 'Code generated and email sent successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Code generated but email could not be sent'
        ]);
    }
    
} catch (Exception $e) {
    $error = [
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ];
    
    error_log('Error in generate_code_ajax.php: ' . print_r($error, true));
    echo json_encode($error);
}

// Закрываем соединение с базой данных
if (isset($conn)) {
    $conn->close();
}
?> 