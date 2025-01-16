<?php
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
} elseif ($action === 'getUsers') {
    // Получение списка пользователей
    $result = $conn->query("SELECT * FROM users");

    if ($result) {
        $users = $result->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'data' => $users]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error fetching users: ' . $conn->error]);
    }
} 
elseif ($action === 'loginUser') {
    // Получаем данные из POST-запроса
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    if ($email && $password) {
        // Проверяем, есть ли пользователь с таким email
        $stmt = $conn->prepare("SELECT id, email, full_name, department, role, password FROM users WHERE email = ?");
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();

            // Проверяем пароль
            if (password_verify($password, $user['password'])) {
                // Удаляем пароль перед возвратом данных
                unset($user['password']);

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
} elseif ($action === 'loginMaintenanceStaff') {
    // Получаем данные из POST-запроса
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if ($username && $password) {
        
        // Проверяем, есть ли пользователь с таким email
        $stmt = $conn->prepare("SELECT id, username, password_hash, name, role FROM maintenance_staff WHERE username = ?");
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();

            // Проверяем пароль
            if (password_verify($password, $user['password_hash'])) {
                // Удаляем пароль перед возвратом данных
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
}
else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

// Закрытие соединения
$conn->close();
?>