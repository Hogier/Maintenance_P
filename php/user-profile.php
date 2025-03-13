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

// В начале файла добавляем:
require_once __DIR__ . '/../vendor/autoload.php';
use Workerman\Connection\AsyncTcpConnection;
use Workerman\Worker;

if ($action === 'addUserPhoto') {
    $email = $_POST['email'] ?? '';

    if (isset($_FILES['userPhoto'])) {
        $file = $_FILES['userPhoto'];
        
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
        $targetDir = $rootPath . '/users/img/';
        $miniDir = $rootPath . '/users/mini/';
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
            $stmt = $conn->prepare("UPDATE users SET photo = ? WHERE email = ?");
            $stmt->bind_param('ss', $fileName, $email);
            if (!$stmt->execute()) {
                throw new Exception('Ошибка обновления базы данных: ' . $stmt->error);
            }
            $stmt->close();

            echo json_encode(['success' => true, 'message' => 'Фото успешно добавлено']);

        } catch (Exception $e) {
            // Удаляем файлы в случае ошибки
            if (file_exists($targetFile)) unlink($targetFile);
            if (file_exists($miniFile)) unlink($miniFile);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
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
} elseif ($action === 'sendNotification') {
    try {
        // Создаем асинхронное подключение к WebSocket-серверу
        $client = new AsyncTcpConnection('ws://127.0.0.1:2346');
        
        // При успешном подключении
        $client->onConnect = function($connection) {
            // Отправляем сообщение
            $connection->send('Hello World!');
        };
        
        // При получении сообщения от сервера
        $client->onMessage = function($connection, $data) {
            echo "Получено: $data\n";
        };
        
        // При ошибке
        $client->onError = function($connection, $code, $msg) {
            echo "Ошибка: $msg\n";
        };
        
        // При закрытии соединения
        $client->onClose = function($connection) {
            echo "Соединение закрыто\n";
        };
        
        // Устанавливаем соединение
        $client->connect();
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

// Закрытие соединения
$conn->close();
?>