<?php
// В начале файла добавим настройку временной зоны
date_default_timezone_set('America/Chicago');
header("Cache-Control: max-age=604800, public");
header("Expires: " . gmdate("D, d M Y H:i:s", time() + 604800) . " GMT");
// Включаем отображение ошибок для отладки
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Параметры подключения к базе данных
$host = 'localhost';
$user = 'root';
$password = 'root';
$database = 'maintenancedb';

// Подключение к базе данных
$conn = new mysqli($host, $user, $password, $database);

// Проверка подключения
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]));
}

// Получение данных из POST-запроса
$action = $_POST['action'] ?? '';

if ($action === 'addUser') {
    // Получение данных
    $email = $_POST['email'] ?? '';
    $fullName = $_POST['fullName'] ?? '';
    $department = $_POST['department'] ?? '';
    $role = $_POST['role'] ?? '';
    $password = $_POST['password'] ?? '';

    // Проверка, что все данные получены
    if ($email && $fullName && $department && $role && $password) {
        // Хэширование пароля
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        // Подготовка и выполнение запроса
        $stmt = $conn->prepare("INSERT INTO users (email, full_name, department, role, password) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param('sssss', $email, $fullName, $department, $role, $passwordHash);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'User added successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error adding user: ' . $stmt->error]);
        }

        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid input data']);
    }


} elseif ($action === 'getAllUsers') {
    // Получение списка пользователей
    $result = $conn->query("SELECT * FROM users");

    if ($result) {
        $users = $result->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'data' => $users]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error fetching users: ' . $conn->error]);
    }


} elseif ($action === 'getUserByName') {
    // Получение списка пользователей
    $fullName = $_POST['fullName'] ?? '';
    $result = $conn->query("SELECT id, email, full_name, department, role FROM users WHERE full_name = '$fullName'");

    if ($result) {
        $users = $result->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'data' => $users]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error fetching users: ' . $conn->error]);
    }


} elseif ($action === 'loginUser') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    if ($email && $password) {
        $stmt = $conn->prepare("SELECT id, email, full_name, department, role, password FROM users WHERE email = ?");
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            if (password_verify($password, $user['password'])) {
                unset($user['password']);
                echo json_encode([
                    'success' => true,
                    'user' => [
                        'id' => $user['id'],
                        'email' => $user['email'],
                        'fullName' => $user['full_name'],
                        'department' => $user['department'],
                        'role' => $user['role']
                    ]
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Invalid password']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'User not found']);
        }
        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid input data']);
    }
} elseif ($action === 'loginMaintenanceStaff') {
    // Получаем данные из POST-запроса
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if ($username && $password) {
        // Проверяем, есть ли пользователь с таким username
        $stmt = $conn->prepare("SELECT id, username, password_hash, name, role FROM maintenance_staff WHERE username = ?");
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();

            // Проверяем пароль
            if (password_verify($password, $user['password_hash'])) {
                // Удаляем хеш пароля перед отправкой
                unset($user['password_hash']);

                echo json_encode(['success' => true, 'user' => $user]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Invalid password']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'User not found']);
        }

        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid input data']);
    }
} elseif ($action === 'addRequest') {
    // Получение данных
    $email = $_POST['email'] ?? '';
    $fullName = $_POST['fullName'] ?? '';
    $department = $_POST['department'] ?? '';
    $role = $_POST['role'] ?? '';
    $password = $_POST['password'] ?? '';
    $timestamp = date('Y-m-d H:i:s'); // Текущее время в формате Далласа

    // Проверка, что все данные получены
    if ($email && $fullName && $department && $role && $password) {
        // Хэширование пароля
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        // Подготовка и выполнение запроса
        $stmt = $conn->prepare("INSERT INTO users (email, full_name, department, role, password) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param('sssss', $email, $fullName, $department, $role, $passwordHash);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'User added successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error adding user: ' . $stmt->error]);
        }

        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid input data']);
    }
} elseif ($action === 'deleteComment') {
    $requestId = $_POST['requestId'] ?? '';
    $timestamp = $_POST['timestamp'] ?? '';

    error_log("Attempting to delete comment. Request ID: $requestId, Timestamp: $timestamp");

    if ($requestId && $timestamp) {
        // Получаем текущие комментарии
        $stmt = $conn->prepare("SELECT comments FROM tasks WHERE request_id = ?");
        $stmt->bind_param('s', $requestId);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $row = $result->fetch_assoc();
            $comments = json_decode($row['comments'], true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $jsonError = json_last_error_msg();
                error_log("JSON decode error: $jsonError");
                echo json_encode(['success' => false, 'message' => "JSON decode error: $jsonError"]);
                exit;
            }

            error_log("Comments before deletion: " . print_r($comments, true));

            // Фильтруем комментарии, удаляя тот, который соответствует timestamp
            $updatedComments = array_filter($comments, function($comment) use ($timestamp) {
                return $comment['timestamp'] !== $timestamp;
            });

            error_log("Comments after deletion: " . print_r($updatedComments, true));

            // Обновляем поле comments
            $updatedCommentsJson = json_encode(array_values($updatedComments));
            if (json_last_error() !== JSON_ERROR_NONE) {
                $jsonError = json_last_error_msg();
                error_log("JSON encode error: $jsonError");
                echo json_encode(['success' => false, 'message' => "JSON encode error: $jsonError"]);
                exit;
            }

            $updateStmt = $conn->prepare("UPDATE tasks SET comments = ?, commentCount = commentCount - 1 WHERE request_id = ?");
            $updateStmt->bind_param('ss', $updatedCommentsJson, $requestId);

            if ($updateStmt->execute()) {
                error_log("Comment deleted successfully for request ID: $requestId");
                echo json_encode(['success' => true, 'message' => 'Comment deleted successfully']);
            } else {
                $updateError = $updateStmt->error;
                error_log("Error updating comments: $updateError");
                echo json_encode(['success' => false, 'message' => "Error updating comments: $updateError"]);
            }

            $updateStmt->close();
        } else {
            error_log("Task not found for request ID: $requestId");
            echo json_encode(['success' => false, 'message' => 'Task not found']);
        }

        $stmt->close();
    } else {
        error_log("Invalid request ID or timestamp");
        echo json_encode(['success' => false, 'message' => 'Invalid request ID or timestamp']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

// Закрытие соединения
$conn->close();
?>