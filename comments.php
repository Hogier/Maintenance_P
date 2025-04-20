<?php
// Устанавливаем временную зону для правильной работы с датами
date_default_timezone_set('America/Chicago');

// Для отладки можно включить отображение ошибок
// error_reporting(E_ALL);
// ini_set('display_errors', 1);

// Отключаем отображение ошибок в браузере в продакшене
error_reporting(0);
ini_set('display_errors', 0);

// Устанавливаем заголовки для JSON-ответа
header('Content-Type: application/json');

// Параметры подключения к базе данных
$host = 'macan.cityhost.com.ua';
$user = 'chff6ee508';
$password = '73b6bd56cf';
$database = 'chff6ee508';

// Подключение к базе данных
$conn = new mysqli($host, $user, $password, $database);

// Проверка подключения
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]));
}

// Получение данных из POST-запроса
$action = $_POST['action'] ?? '';

// Обработка различных действий
if ($action === 'addComment') {
    // Получаем данные из запроса
    $taskId = $_POST['taskId'] ?? '';
    $staffName = $_POST['staffName'] ?? '';
    $commentText = $_POST['commentText'] ?? '';
    $timestamp = $_POST['timestamp'] ?? date('Y-m-d H:i:s');
    $photoUrl = $_POST['photoUrl'] ?? '';

    // Проверяем наличие обязательных данных
    if (empty($taskId) || empty($staffName) || empty($commentText)) {
        echo json_encode([
            'success' => false,
            'message' => 'Missing required fields'
        ]);
        exit;
    }

    // Преобразуем timestamp в формат MySQL DATETIME если он в формате ISO
    if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $timestamp)) {
        try {
            $date = new DateTime($timestamp);
            $timestamp = $date->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            // В случае ошибки используем текущую дату
            $timestamp = date('Y-m-d H:i:s');
        }
    }

    // Добавляем комментарий в новую таблицу
    $stmt = $conn->prepare("INSERT INTO task_comments (task_id, staff_name, text, timestamp, photo_url) VALUES (?, ?, ?, ?, ?)");
    if (!$stmt) {
        echo json_encode([
            'success' => false,
            'message' => 'SQL prepare error: ' . $conn->error
        ]);
        exit;
    }

    $stmt->bind_param("sssss", $taskId, $staffName, $commentText, $timestamp, $photoUrl);

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Comment added successfully',
            'commentId' => $stmt->insert_id
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error adding comment: ' . $stmt->error
        ]);
    }
    $stmt->close();
} 
elseif ($action === 'getComments') {
    $taskId = $_POST['taskId'] ?? '';

    if (empty($taskId)) {
        echo json_encode([
            'success' => false,
            'message' => 'Task ID is required'
        ]);
        exit;
    }

    $stmt = $conn->prepare("SELECT id, task_id, staff_name as staffName, text, timestamp, photo_url FROM task_comments WHERE task_id = ? ORDER BY timestamp ASC");
    if (!$stmt) {
        echo json_encode([
            'success' => false,
            'message' => 'SQL prepare error: ' . $conn->error
        ]);
        exit;
    }

    $stmt->bind_param("s", $taskId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $comments = [];
    while ($row = $result->fetch_assoc()) {
        $comments[] = $row;
    }

    echo json_encode([
        'success' => true,
        'comments' => $comments
    ]);

    $stmt->close();
} 
elseif ($action === 'deleteComment') {
    $commentId = $_POST['commentId'] ?? '';
    $taskId = $_POST['taskId'] ?? '';

    if (empty($commentId) || empty($taskId)) {
        echo json_encode([
            'success' => false,
            'message' => 'Comment ID and Task ID are required'
        ]);
        exit;
    }

    $stmt = $conn->prepare("DELETE FROM task_comments WHERE id = ? AND task_id = ?");
    if (!$stmt) {
        echo json_encode([
            'success' => false,
            'message' => 'SQL prepare error: ' . $conn->error
        ]);
        exit;
    }

    $stmt->bind_param("is", $commentId, $taskId);

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Comment deleted successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error deleting comment: ' . $stmt->error
        ]);
    }
    $stmt->close();
}
else {
    echo json_encode([
        'success' => false,
        'message' => 'Unknown action'
    ]);
}

// Закрываем соединение с базой данных
$conn->close();
?> 