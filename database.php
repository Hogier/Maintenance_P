<?php
// В начале файла добавим настройку временной зоны
date_default_timezone_set('America/Chicago');

// Параметры подключения к базе данных
$host = 'localhost';
$user = 'root';
$password = '';
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
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

// Закрытие соединения
$conn->close();
?>