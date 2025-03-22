<?php
require_once __DIR__ . '/vendor/autoload.php';
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
    $password = 'root';
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
$ws_worker->onMessage = function($connection, $data) {
    global $conn;

    // Декодируем полученные данные
    $message = json_decode($data, true);
    
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
    } else {
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