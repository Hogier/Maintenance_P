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

if ($action === 'addUserPhoto') {
    $email = $_POST['email'] ?? ''; // Получаем email из POST-запроса

    if (isset($_FILES['userPhoto'])) {
        $file = $_FILES['userPhoto'];
        $fileName = basename($file['name']);
        $targetDir = __DIR__ . '/users/img/';
        $miniDir = __DIR__ . '/users/mini/';
        $targetFile = $targetDir . $fileName;
        $miniFile = $miniDir . 'mini_' . $fileName;

        // Проверка и создание директорий, если они не существуют
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }
        if (!is_dir($miniDir)) {
            mkdir($miniDir, 0777, true);
        }

        // Сохранение оригинального изображения
        if (move_uploaded_file($file['tmp_name'], $targetFile)) {
            // Изменение размера и качества изображения
            $image = imagecreatefromstring(file_get_contents($targetFile));
            $width = imagesx($image);
            $height = imagesy($image);
            $newWidth = 300;
            $newHeight = ($height / $width) * $newWidth;
            $resizedImage = imagescale($image, $newWidth, $newHeight);
            imagejpeg($resizedImage, $targetFile, 70);

            // Создание миниатюры
            $miniWidth = 40;
            $miniHeight = ($height / $width) * $miniWidth;
            $miniImage = imagescale($image, $miniWidth, $miniHeight);
            imagejpeg($miniImage, $miniFile, 60);

            // Освобождение памяти
            imagedestroy($image);
            imagedestroy($resizedImage);
            imagedestroy($miniImage);

            // Обновление информации в базе данных
            $stmt = $conn->prepare("UPDATE users SET photo = ? WHERE email = ?");
            $stmt->bind_param('ss', $fileName, $email);
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Фото успешно добавлено']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Ошибка обновления базы данных: ' . $stmt->error]);
            }
            $stmt->close();
        } else {
            echo json_encode(['success' => false, 'message' => 'Ошибка загрузки файла']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Файл не получен']);
    }
} elseif ($action === 'getUserPhoto') {
    $email = $_POST['email'] ?? '';

    if ($email) {
        $stmt = $conn->prepare("SELECT photo FROM users WHERE email = ?");
        $stmt->bind_param('s', $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $row = $result->fetch_assoc();
            $photo = $row['photo'] ?? 'nophoto';
            echo json_encode(['success' => true, 'photo' => $photo]);
        } else {
            echo json_encode(['success' => false, 'message' => 'User not found']);
        }

        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid email']);
    }
} elseif ($action === 'getUserTasks') {
    $staff = $_POST['staff'] ?? '';

    if ($staff) {
        $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE staff = ?");
        $stmt->bind_param('s', $staff);
        $stmt->execute();
        $result = $stmt->get_result();

        $tasks = $result->fetch_all(MYSQLI_ASSOC);

        echo json_encode(['success' => true, 'tasks' => $tasks]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid staff name']);
    }
} elseif ($action === 'getEventsByProfile') {
    $date = $_POST['date'] ?? '';

    if ($date) {
        $stmt = $conn->prepare("SELECT name, startDate, startTime, setupDate, setupTime, endDate, endTime, location, contact, email, phone, alcuinContact, attendees, status, createdBy, createdAt FROM events WHERE endDate >= ?");
        $stmt->bind_param('s', $date);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result) {
            $events = $result->fetch_all(MYSQLI_ASSOC);
            echo json_encode(['success' => true, 'events' => $events]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error fetching events: ' . $conn->error]);
        }

        $stmt->close();
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid date']);
    }
} elseif ($action === 'getUserTasksForLastWeek') {
    $staff = $_POST['staff'] ?? '';
    $currentDate = $_POST['currentDate'] ?? '';

    if ($staff && $currentDate) {
        $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE staff = ? AND date >= DATE_SUB(?, INTERVAL 1 WEEK)");
        $stmt->bind_param('ss', $staff, $currentDate);
        $stmt->execute();
        $result = $stmt->get_result();

        $tasks = $result->fetch_all(MYSQLI_ASSOC);

        echo json_encode(['success' => true, 'tasks' => $tasks]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid staff name or date']);
    }
} elseif ($action === 'getUserTasksForLastMonth') {
    $staff = $_POST['staff'] ?? '';
    $currentDate = $_POST['currentDate'] ?? '';

    if ($staff && $currentDate) {
        $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE staff = ? AND date >= DATE_SUB(?, INTERVAL 1 MONTH)");
        $stmt->bind_param('ss', $staff, $currentDate);
        $stmt->execute();
        $result = $stmt->get_result();

        $tasks = $result->fetch_all(MYSQLI_ASSOC);

        echo json_encode(['success' => true, 'tasks' => $tasks]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid staff name or date']);
    }
} elseif ($action === 'getUserTasksForLast3Months') {
    $staff = $_POST['staff'] ?? '';
    $currentDate = $_POST['currentDate'] ?? '';

    if ($staff && $currentDate) {
        $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE staff = ? AND date >= DATE_SUB(?, INTERVAL 3 MONTH)");
        $stmt->bind_param('ss', $staff, $currentDate);
        $stmt->execute();
        $result = $stmt->get_result();

        $tasks = $result->fetch_all(MYSQLI_ASSOC);

        echo json_encode(['success' => true, 'tasks' => $tasks]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid staff name or date']);
    }
} elseif ($action === 'getUserTasksForLastYear') {
    $staff = $_POST['staff'] ?? '';
    $currentDate = $_POST['currentDate'] ?? '';

    if ($staff && $currentDate) {
        $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE staff = ? AND date >= DATE_SUB(?, INTERVAL 1 YEAR)");
        $stmt->bind_param('ss', $staff, $currentDate);
        $stmt->execute();
        $result = $stmt->get_result();

        $tasks = $result->fetch_all(MYSQLI_ASSOC);

        echo json_encode(['success' => true, 'tasks' => $tasks]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid staff name or date']);
    }
} elseif ($action === 'getUserSettingsInfo') {
    $email = $_POST['email'];
    
    $query = "SELECT email, full_name, department, building, room, staffType FROM users WHERE email = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $userInfo = $result->fetch_assoc();
        echo json_encode([
            'success' => true,
            'userInfo' => $userInfo
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'User not found'
        ]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

// Закрытие соединения
$conn->close();
?>