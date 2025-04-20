<?php
/**
 * API для обработки и отправки realtime событий через Pusher
 * Заменяет прежнюю реализацию через WebSocket (websocket_server.php)
 */

// Подключаем автозагрузчик Composer
require_once __DIR__ . '/../vendor/autoload.php';

// Устанавливаем заголовок ответа
header('Content-Type: application/json');

error_reporting(E_ALL);
ini_set('display_errors', 1);



// Функция для отправки JSON-ответа
function jsonResponse($success, $message, $data = null) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

// Получаем входные данные
$inputData = file_get_contents('php://input');
$postData = json_decode($inputData, true);

// Если JSON не валидный, пробуем обычные POST-параметры
if ($postData === null && json_last_error() !== JSON_ERROR_NONE) {
    $postData = $_POST;
}

// Проверяем наличие обязательного параметра 'action'
if (empty($postData['action'])) {
    jsonResponse(false, 'Отсутствует обязательный параметр "action"');
}

try {
    // Подключаемся к базе данных
    $host = 'macan.cityhost.com.ua';
    $user = 'chff6ee508';
    $password = '73b6bd56cf';
    $database = 'chff6ee508';
    
    $conn = new mysqli($host, $user, $password, $database);
    if ($conn->connect_error) {
        throw new Exception("Ошибка подключения к базе данных: " . $conn->connect_error);
    }
    
    // Создаем экземпляр PusherChat
    require_once __DIR__ . '/../classes/PusherChat.php';
    $pusher = new PusherChat();
    
    // Получаем действие из запроса
    $action = $postData['action'];
    
    // Обрабатываем различные действия
    switch ($action) {
        case 'getUserTasks':
            // Получение задач пользователя
            $staff = $postData['staff'] ?? '';
            
            if (empty($staff)) {
                jsonResponse(false, 'Необходимо указать параметр "staff"');
            }
            
            $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE staff = ?");
            $stmt->bind_param('s', $staff);
            
            if (!$stmt->execute()) {
                throw new Exception("Ошибка выполнения запроса: " . $conn->error);
            }
            
            $result = $stmt->get_result();
            $tasks = $result->fetch_all(MYSQLI_ASSOC);
            
            jsonResponse(true, 'Задачи успешно получены', $tasks);
            break;
            
        case 'addTask':
            // Добавление новой задачи
            $requestId = $postData['requestId'] ?? '';
            $building = $postData['building'] ?? '';
            $priority = $postData['priority'] ?? '';
            $details = $postData['details'] ?? '';
            $timestamp = $postData['timestamp'] ?? '';
            $staff = $postData['staff'] ?? '';
            $room = $postData['room'] ?? '';
            $status = $postData['status'] ?? '';
            $assignedTo = $postData['assignedTo'] ?? '';
            $comments = $postData['comments'] ?? '';
            $media = $postData['media'] ?? '';
            $submittedBy = $postData['submittedBy'] ?? '';
            
            // Проверка обязательных полей
            if (empty($requestId) || empty($staff) || empty($details)) {
                jsonResponse(false, 'Отсутствуют обязательные параметры');
            }
            
            // Отправляем событие через Pusher
            $taskData = [
                'request_id' => $requestId,
                'priority' => $priority,
                'details' => $details,
                'timestamp' => $timestamp,
                'staff' => $staff,
                'room' => $room,
                'status' => $status,
                'assignedTo' => $assignedTo,
                'comments' => $comments,
                'media' => $media,
                'submittedBy' => $submittedBy
            ];
            
            // Используем метод sendMessage для отправки события добавления задачи
            $result = $pusher->sendMessage('system', 'taskAdded', $taskData);
            
            jsonResponse(true, 'Задача успешно добавлена и отправлена', $taskData);
            break;
            
        case 'updateComments':
            // Обновление комментариев к задаче
            $taskId = $postData['taskId'] ?? '';
            $comment = $postData['comment'] ?? '';
            $staffName = $postData['staffName'] ?? '';
            $timestamp = $postData['timestamp'] ?? '';
            $photoUrl = $postData['photoUrl'] ?? '';
            
            // Проверка обязательных полей
            if (empty($taskId) || empty($comment) || empty($staffName)) {
                jsonResponse(false, 'Отсутствуют обязательные параметры');
            }
            
            // Добавляем комментарий в базу данных
            $stmt = $conn->prepare("INSERT INTO task_comments (task_id, staff_name, text, timestamp, photo_url) VALUES (?, ?, ?, ?, ?)");
            if ($stmt) {
                $stmt->bind_param("sssss", $taskId, $staffName, $comment, $timestamp, $photoUrl);
                if (!$stmt->execute()) {
                    throw new Exception("Ошибка при сохранении комментария: " . $stmt->error);
                }
                $stmt->close();
            }
            
            // Отправляем событие через Pusher
            $commentData = [
                'request_id' => $taskId,
                'comment' => $comment,
                'photoUrl' => $photoUrl,
                'staffName' => $staffName,
                'timestamp' => $timestamp
            ];
            
            // Используем sendMessage для отправки события обновления комментариев
            $result = $pusher->sendMessage('system', 'sendComments', $commentData);
            
            jsonResponse(true, 'Комментарий успешно добавлен и отправлен', $commentData);
            break;
            
        case 'addEventComment':
            // Добавление комментария к событию
            $eventId = $postData['eventId'] ?? '';
            $text = $postData['text'] ?? '';
            $author = $postData['author'] ?? '';
            $date = $postData['date'] ?? '';
            $eventDate = $postData['eventDate'] ?? '';
            $userPhotoUrl = $postData['userPhotoUrl'] ?? '';
            
            // Проверка обязательных полей
            if (empty($eventId) || empty($text) || empty($author)) {
                jsonResponse(false, 'Отсутствуют обязательные параметры');
            }
            
            // Отправляем событие через Pusher
            $eventCommentData = [
                'eventId' => $eventId,
                'text' => $text,
                'author' => $author,
                'date' => $date,
                'eventDate' => $eventDate,
                'userPhotoUrl' => $userPhotoUrl
            ];
            
            // Используем sendMessage для отправки события комментария к событию
            $result = $pusher->sendMessage('system', 'eventCommentAdded', $eventCommentData);
            
            jsonResponse(true, 'Комментарий к событию успешно добавлен и отправлен', $eventCommentData);
            break;
            
        default:
            jsonResponse(false, 'Неизвестное действие: ' . $action);
    }
    
} catch (Exception $e) {
    jsonResponse(false, 'Ошибка: ' . $e->getMessage());
} 