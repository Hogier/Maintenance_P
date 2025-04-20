<?php
// Отключаем любой вывод ошибок в ответ
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Устанавливаем заголовок JSON
header('Content-Type: application/json');

// Логируем все действия
error_log("TEST-API: Running test API script");

// Проверяем параметры запроса
$action = isset($_GET['action']) ? $_GET['action'] : 'default';
error_log("TEST-API: Action = " . $action);

// Возвращаем тестовый JSON-ответ
$response = [
    'success' => true,
    'action' => $action,
    'message' => 'Test API response',
    'timestamp' => date('Y-m-d H:i:s')
];

echo json_encode($response);
error_log("TEST-API: Response sent: " . json_encode($response)); 