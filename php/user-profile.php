<?php
// В начале файла добавим настройку временной зоны
date_default_timezone_set('America/Chicago');

// Отключаем отображение ошибок в браузере
error_reporting(0);
ini_set('display_errors', 0);

// Устанавливаем заголовки для JSON-ответа
header('Content-Type: application/json');
header("Cache-Control: max-age=604800, public");
header("Expires: " . gmdate("D, d M Y H:i:s", time() + 604800) . " GMT");

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
    $role = $_POST['role'] ?? '';
    if ($role === 'user' || $role === 'admin' || $role === 'support') {
        $email = $_POST['email'] ?? '';
    } else if ($role === 'maintenance') {
        $username = $_POST['username'] ?? '';
    }

    // Логирование входных данных
    error_log("Action: $action, Role: $role, Email: $email, Username: $username");

    if (isset($_FILES['userPhoto'])) {
        $file = $_FILES['userPhoto'];
        
        // Логирование информации о файле
        error_log("File Name: " . $file['name']);
        error_log("File Type: " . $file['type']);
        error_log("File Size: " . $file['size']);
        error_log("File Error: " . $file['error']);

        // Проверка ошибок загрузки
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $uploadErrors = array(
                UPLOAD_ERR_INI_SIZE => 'Файл превышает максимально допустимый размер',
                UPLOAD_ERR_FORM_SIZE => 'Файл превышает максимально допустимый размер',
                UPLOAD_ERR_PARTIAL => 'Файл был загружен частично',
                UPLOAD_ERR_NO_FILE => 'Файл не был загружен',
                UPLOAD_ERR_NO_TMP_DIR => 'Отсутствует временная папка',
                UPLOAD_ERR_CANT_WRITE => 'Не удалось записать файл на диск',
                UPLOAD_ERR_EXTENSION => 'PHP-расширение остановило загрузку файла'
            );
            echo json_encode(['success' => false, 'message' => $uploadErrors[$file['error']]]);
            exit;
        }

        // Проверка типа файла
        $allowed = array('jpg', 'jpeg', 'png', 'gif');
        $fileName = basename($file['name']);
        $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        
        if (!in_array($fileExt, $allowed)) {
            echo json_encode(['success' => false, 'message' => 'Допустимы только изображения форматов: ' . implode(', ', $allowed)]);
            exit;
        }

        // Получаем путь к корневой директории сайта
        $rootPath = $_SERVER['DOCUMENT_ROOT'] . '/Maintenance_P';
        
        // Формируем абсолютные пути
        if ($role === 'user' || $role === 'admin' || $role === 'support') {
            $targetDir = $rootPath . '/users/img/';
            $miniDir = $rootPath . '/users/mini/';
        } else if ($role === 'maintenance') {
            $targetDir = $rootPath . '/maintenance_staff/img/';
            $miniDir = $rootPath . '/maintenance_staff/mini/';
        }
        $targetFile = $targetDir . $fileName;
        $miniFile = $miniDir . 'mini_' . $fileName;

        // Проверка и создание директорий
        if (!is_dir($targetDir)) {
            if (!@mkdir($targetDir, 0755, true)) {
                echo json_encode(['success' => false, 'message' => 'Не удалось создать директорию для загрузки']);
                exit;
            }
        }
        if (!is_dir($miniDir)) {
            if (!@mkdir($miniDir, 0755, true)) {
                echo json_encode(['success' => false, 'message' => 'Не удалось создать директорию для миниатюр']);
                exit;
            }
        }

        // Проверка прав на запись
        if (!is_writable($targetDir)) {
            echo json_encode(['success' => false, 'message' => 'Нет прав на запись в директорию загрузки']);
            exit;
        }

        // Сохранение оригинального изображения
        if (!move_uploaded_file($file['tmp_name'], $targetFile)) {
            echo json_encode(['success' => false, 'message' => 'Ошибка при перемещении загруженного файла']);
            exit;
        }

        // Создание изображения на основе загруженного файла
        switch($fileExt) {
            case 'jpg':
            case 'jpeg':
                $image = @imagecreatefromjpeg($targetFile);
                break;
            case 'png':
                $image = @imagecreatefrompng($targetFile);
                break;
            case 'gif':
                $image = @imagecreatefromgif($targetFile);
                break;
            default:
                $image = false;
        }

        if (!$image) {
            unlink($targetFile); // Удаляем файл, если не удалось создать изображение
            echo json_encode(['success' => false, 'message' => 'Не удалось обработать загруженное изображение']);
            exit;
        }

        // Изменение размера и сохранение
        try {
            $width = imagesx($image);
            $height = imagesy($image);
            $newWidth = 300;
            $newHeight = ($height / $width) * $newWidth;
            
            $resizedImage = imagescale($image, $newWidth, $newHeight);
            if (!$resizedImage) {
                throw new Exception('Ошибка при изменении размера изображения');
            }
            
            if (!imagejpeg($resizedImage, $targetFile, 70)) {
                throw new Exception('Ошибка при сохранении обработанного изображения');
            }

            // Создание миниатюры
            $miniWidth = 40;
            $miniHeight = ($height / $width) * $miniWidth;
            $miniImage = imagescale($image, $miniWidth, $miniHeight);
            if (!$miniImage) {
                throw new Exception('Ошибка при создании миниатюры');
            }
            
            if (!imagejpeg($miniImage, $miniFile, 60)) {
                throw new Exception('Ошибка при сохранении миниатюры');
            }

            // Освобождение памяти
            imagedestroy($image);
            imagedestroy($resizedImage);
            imagedestroy($miniImage);

            // Обновление информации в базе данных
            if ($role === 'user' || $role === 'admin' || $role === 'support') {
                $stmt = $conn->prepare("UPDATE users SET photo = ? WHERE email = ?");
                $stmt->bind_param('ss', $fileName, $email);
            } else if ($role === 'maintenance') {
                $stmt = $conn->prepare("UPDATE maintenance_staff SET photo = ? WHERE username = ?");
                $stmt->bind_param('ss', $fileName, $username);
            }
            if (!$stmt->execute()) {
                throw new Exception('Ошибка обновления базы данных: ' . $stmt->error);
            }
            $stmt->close();

            // Пример логирования JSON-ответа перед отправкой
            $response = ['success' => true, 'message' => 'Фото успешно добавлено'];
            error_log("Response JSON: " . json_encode($response));
            echo json_encode($response);

        } catch (Exception $e) {
            // Удаляем файлы в случае ошибки
            if (file_exists($targetFile)) unlink($targetFile);
            if (file_exists($miniFile)) unlink($miniFile);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } else {
        $response = ['success' => false, 'message' => 'Файл не получен'];
        error_log("Response JSON: " . json_encode($response));
        echo json_encode($response);
    }
} 
elseif ($action === 'getUserPhoto') {
    $role = $_POST['role'] ?? '';
    
    // Получаем email или имя пользователя
    $email = $_POST['email'] ?? '';
    $username = $_POST['username'] ?? '';

    if ($email || $username) {
        if ($role === 'user' || $role === 'admin' || $role === 'support') {
            if ($email) {
                // Если предоставлен email, ищем по нему
                $stmt = $conn->prepare("SELECT photo FROM users WHERE email = ?");
                $stmt->bind_param('s', $email);
            } else if ($username) {
                // Если предоставлено имя пользователя, ищем по полному имени или username
                $stmt = $conn->prepare("SELECT photo FROM users WHERE fullName = ? OR username = ?");
                $stmt->bind_param('ss', $username, $username);
            }
        } else if ($role === 'maintenance') {
            // Для maintenance staff ищем по username
            $stmt = $conn->prepare("SELECT photo FROM maintenance_staff WHERE username = ?");
            $stmt->bind_param('s', $username);
        }
        
        if (isset($stmt)) {
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
            echo json_encode(['success' => false, 'message' => 'Invalid parameters']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Missing email or username']);
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
} 

/////// ФУНКЦИИ получения заданий для роли "USER" //////

elseif ($action === 'getUserTasksForLastWeek') {
    $staff = $_POST['staff'] ?? '';
    $role = $_POST['role'] ?? '';
    $currentDate = $_POST['currentDate'] ?? '';

    if ($staff && $currentDate && $role) {
        try {
            if ($role === 'user') {
                $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE staff = ? AND timestamp >= DATE_SUB(?, INTERVAL 1 WEEK)");
            } else if ($role === 'maintenance') {
                $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE assigned_to = ? AND timestamp >= DATE_SUB(?, INTERVAL 1 WEEK)");
            }
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }
            
            $stmt->bind_param('ss', $staff, $currentDate);
            if (!$stmt->execute()) {
                throw new Exception("Execute failed: " . $stmt->error);
            }
            
            $result = $stmt->get_result();
            $tasks = $result->fetch_all(MYSQLI_ASSOC);

            echo json_encode(['success' => true, 'tasks' => $tasks]);
        } catch (Exception $e) {
            error_log("Error in getUserTasksForLastWeek: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        } finally {
            if (isset($stmt)) {
                $stmt->close();
            }
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid staff name or date']);
    }
} elseif ($action === 'getUserTasksForLastMonth') {
    $staff = $_POST['staff'] ?? '';
    $role = $_POST['role'] ?? '';
    $currentDate = $_POST['currentDate'] ?? '';

    if ($staff && $currentDate && $role) {
        if ($role === 'user') {
            $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE staff = ? AND date >= DATE_SUB(?, INTERVAL 1 MONTH)");
        } else if ($role === 'maintenance') {
            $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE assigned_to = ? AND date >= DATE_SUB(?, INTERVAL 1 MONTH)");
        }
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
    $role = $_POST['role'] ?? '';
    $currentDate = $_POST['currentDate'] ?? '';

    if ($staff && $currentDate && $role) {
        if ($role === 'user') {
            $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE staff = ? AND date >= DATE_SUB(?, INTERVAL 3 MONTH)");
        } else if ($role === 'maintenance') {
            $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE assigned_to = ? AND date >= DATE_SUB(?, INTERVAL 3 MONTH)");
        }
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
    $role = $_POST['role'] ?? '';
    $currentDate = $_POST['currentDate'] ?? '';

    if ($staff && $currentDate && $role) {
        if ($role === 'user') {
            $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE staff = ? AND date >= DATE_SUB(?, INTERVAL 1 YEAR)");
        } else if ($role === 'maintenance') {
            $stmt = $conn->prepare("SELECT request_id, priority, details, timestamp, status, assigned_to, assigned_at FROM tasks WHERE assigned_to = ? AND date >= DATE_SUB(?, INTERVAL 1 YEAR)");
        }
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
    
    $query = "SELECT email, full_name, department, building, room FROM users WHERE email = ?";
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
}
elseif ($action === 'getMaintenanceSettingsInfo') {
    $username = $_POST['username'];
    
    $query = "SELECT id, username, name FROM users WHERE username = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $maintenanceInfo = $result->fetch_assoc();
        echo json_encode([
            'success' => true,
            'maintenanceInfo' => $maintenanceInfo
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Maintenance not found'
        ]);
    }
} elseif ($action === 'sendNotification') {
    echo json_encode(['success' => false, 'message' => 'WebSocket notifications are not supported in this context']);
} else {
    //echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

// Закрытие соединения
$conn->close();
?>