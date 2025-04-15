<?php
require_once __DIR__ . '/../../vendor/autoload.php';
use Workerman\Worker;

// Создаём WebSocket сервер
$ws_worker = new Worker("websocket://0.0.0.0:2346");
$ws_worker->count = 4;

// Глобальное соединение с БД
$conn = null;

// Инициализация соединения с БД при запуске воркера
$ws_worker->onWorkerStart = function($worker) {
    global $conn;
    $host = 'localhost';
    $user = 'root';
    $password = '';
    $database = 'maintenancedb';
    
    $conn = new mysqli($host, $user, $password, $database);
    if ($conn->connect_error) {
        echo "Database connection failed: " . $conn->connect_error;
    }
};

// Когда клиент подключается
$ws_worker->onConnect = function($connection) {
    echo "Новое подключение\n";
};

// Когда клиент присылает данные
$ws_worker->onMessage = function($connection, $data) use ($ws_worker) {
    global $conn;

    // Декодируем полученные данные
    $message = json_decode($data, true);
    
    error_log("WS - Получено сообщение: " . json_encode($message));
    
    if ($message && isset($message['action']) && $message['action'] === 'getUserTasks') {
        $staff = $message['staff'] ?? '';
        
        if ($staff) {

            
            $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE staff = ?");
            $stmt->bind_param('s', $staff);
            
            if ($stmt->execute()) {
                $result = $stmt->get_result();
                $tasks = $result->fetch_all(MYSQLI_ASSOC);
                $response = json_encode([
                    'type' => 'tasks',
                    'data' => $tasks
                ]);
                
                echo $response;
                $connection->send($response);
            } else {
                $connection->send(json_encode([
                    'type' => 'error',
                    'message' => 'Database query failed: ' . $conn->error
                ]));
            }
            
            $stmt->close();
        }
    } 
    else if ($message && isset($message['action']) && $message['action'] === 'addTask') {
        $requestId = $message['requestId'] ?? '';
        $building = $message['building'] ?? '';
        $priority = $message['priority'] ?? '';
        $details = $message['details'] ?? '';
        $timestamp = $message['timestamp'] ?? '';
        $staff = $message['staff'] ?? '';
        $room = $message['room'] ?? '';
        $status = $message['status'] ?? '';
        $assignedTo = $message['assignedTo'] ?? '';
        $comments = $message['comments'] ?? '';
        $media = $message['media'] ?? '';
        $submittedBy = $message['submittedBy'] ?? '';     


        error_log("WS - addTask: " . $requestId . " " . $priority . " " . $details . " " . $timestamp);
        foreach($ws_worker->connections as $clientConnection) {
            $clientConnection->send(json_encode([
            'action' => 'taskAdded',
            'message' => [
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
            ]
        ]));
        }
    } 
    else if ($message && isset($message['action']) && $message['action'] === 'updateComments') {
        $taskId = $message['taskId'] ?? '';
        $comment = $message['comment'] ?? '';
        $staffName = $message['staffName'] ?? '';
        $timestamp = $message['timestamp'] ?? '';
        $photoUrl = $message['photoUrl'] ?? '';
        
        // Добавляем комментарий в базу данных task_comments
        if (!empty($taskId) && !empty($comment) && !empty($staffName)) {
            $stmt = $conn->prepare("INSERT INTO task_comments (task_id, staff_name, text, timestamp, photo_url) VALUES (?, ?, ?, ?, ?)");
            if ($stmt) {
                $stmt->bind_param("sssss", $taskId, $staffName, $comment, $timestamp, $photoUrl);
                $stmt->execute();
                $stmt->close();
            }
        }
        
        error_log("WS - updateComments: " . $taskId . " " . $comment . " " . $staffName . " " . $timestamp);
        foreach($ws_worker->connections as $clientConnection) {
            $clientConnection->send(json_encode([
                'action' => 'sendComments',
                'message' => [
                    'request_id' => $taskId,
                    'comment' => $comment,
                    'photoUrl' => $photoUrl,
                    'staffName' => $staffName,
                    'timestamp' => $timestamp
                ]
            ]));
        }
    }
    else if ($message && isset($message['action']) && $message['action'] === 'addEventComment') {
        $eventId = $message['eventId'] ?? '';
        $text = $message['text'] ?? '';
        $author = $message['author'] ?? '';
        $date = $message['date'] ?? '';
        $eventDate = $message['eventDate'] ?? '';
        $userPhotoUrl = $message['userPhotoUrl'] ?? '';

        error_log("WS - addEventComment: " . $eventId . " " . $text . " " . $author . " " . $date);
        foreach($ws_worker->connections as $clientConnection) {
            $clientConnection->send(json_encode([
                'action' => 'eventCommentAdded',
                'message' => [
                    'eventId' => $eventId,
                    'text' => $text,
                    'author' => $author,
                    'date' => $date,
                    'eventDate' => $eventDate,
                    'userPhotoUrl' => $userPhotoUrl
                ]
            ]));
        }
    }
    else {
        $connection->send(json_encode([
            'type' => 'error',
            'message' => 'Invalid message format or action'
        ]));
    }
};

// Когда клиент отключается
$ws_worker->onClose = function($connection) {
    echo "Соединение закрыто\n";
};

// Запускаем worker
Worker::runAll(); 