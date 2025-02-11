<?php
// Устанавливаем заголовки для кэширования на 1 неделю
header("Cache-Control: max-age=604800, public");
header("Expires: " . gmdate("D, d M Y H:i:s", time() + 604800) . " GMT");

// Папка для сохранения загруженных файлов
$uploadDir = "uploads/";

// Проверяем существование директории и создаем её при необходимости
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Проверяем права доступа
if (!is_writable($uploadDir)) {
    echo json_encode([
        'success' => false,
        'message' => 'Upload directory is not writable'
    ]);
    exit;
}

// Разрешенные типы файлов
$allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg', 'audio/mp3'];

// Подключение к базе данных
$host = 'localhost';
$user = 'root';
$password = 'root';
$database = 'maintenancedb';

$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]);
    exit;
}

$action = $_POST['action'] ?? '';

header('Content-Type: application/json');

if ($action === 'addTask') {
    // Проверка и обработка загруженных файлов
    $mediaFiles = [];
    if (isset($_FILES['media']) && !empty($_FILES['media']['name'][0])) {
        foreach ($_FILES['media']['tmp_name'] as $key => $tmpName) {
            if (!empty($tmpName)) {
                $fileType = $_FILES['media']['type'][$key];
                $fileSize = $_FILES['media']['size'][$key];

                // Проверка типа файла
                if (!in_array($fileType, $allowedTypes)) {
                    echo json_encode(['success' => false, 'message' => 'Invalid file type']);
                    exit;
                }

                // Проверка размера файла
                if (($fileType === 'image/jpeg' || $fileType === 'image/png') && $fileSize > 30 * 1024 * 1024 ||
                    ($fileType === 'video/mp4') && $fileSize > 200 * 1024 * 1024 ||
                    ($fileType === 'audio/mpeg' || $fileType === 'audio/mp3') && $fileSize > 100 * 1024 * 1024) {
                    echo json_encode(['success' => false, 'message' => 'File size exceeds limit']);
                    exit;
                }

                $originalFileName = basename($_FILES['media']['name'][$key]);
                $fileName = uniqid() . '_' . $originalFileName;
                $filePath = $uploadDir . $fileName;

                // Сохранение изображения с качеством 70%
                if (move_uploaded_file($tmpName, $filePath)) {
                    $mediaFiles[] = $fileName;
                    if (strpos($fileType, 'image') !== false) {
                        // Сжатие изображения без потерь
                        compressImage($filePath, $filePath, 70);

                        // Создание уменьшенной версии
                        $miniDir = $uploadDir . 'mini/';
                        if (!file_exists($miniDir)) {
                            mkdir($miniDir, 0777, true);
                        }
                        $miniFileName = 'mini_' . $fileName;
                        $miniFilePath = $miniDir . $miniFileName;

                        createMiniImage($filePath, $miniFilePath, 135, 50);
                    }
                }
            }
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'No files uploaded']);
        exit;
    }

    // Преобразование timestamp в нужный формат
    $timestamp = date('Y-m-d H:i:s', strtotime($_POST['timestamp']));

    // Инициализация commentCount
    $commentCount = 0;

    // Сохранение данных в базу данных
    $stmt = $conn->prepare("INSERT INTO tasks (request_id, building, room, staff, priority, details, timestamp, status, media, submittedBy, date, commentCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    if ($stmt === false) {
        echo json_encode(['success' => false, 'message' => 'Prepare failed: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param(
        "sssssssssssi", 
        $_POST['requestId'],
        $_POST['building'],
        $_POST['room'],
        $_POST['staff'],
        $_POST['priority'],
        $_POST['details'],
        $timestamp,
        $_POST['status'],
        //json_encode($_POST['comments']),
        json_encode($mediaFiles),
        $_POST['submittedBy'],
        $_POST['date'],
        $commentCount
    );

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Task added successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error adding task: ' . $stmt->error]);
    }

    $stmt->close();
} elseif ($action === 'getAllTask') {
    $result = $conn->query("SELECT * FROM tasks");
    $tasks = $result->fetch_all(MYSQLI_ASSOC);

    // Преобразование JSON-строк в массивы
    foreach ($tasks as &$task) {
        if (isset($task['comments'])) {
            $task['comments'] = json_decode($task['comments'],true);
        }
        if (isset($task['media'])) {
            $task['media'] = json_decode($task['media'], true);
        }
    }

    echo json_encode(['success' => true, 'data' => $tasks]);
} elseif ($action === 'getMediaFile') {
    $fileName = $_POST['fileName'];
    $uploadDir = 'uploads/';
    $filePath = $uploadDir . $fileName;


    // Проверка существования файла и прав доступа
    if (file_exists($filePath)) {

        // Определяем MIME-тип файла
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $filePath);
        finfo_close($finfo);

        $type = 'unknown';
        if (strpos($mimeType, 'image/') === 0) {
            $type = 'image';
        } elseif (strpos($mimeType, 'video/') === 0) {
            $type = 'video';
        }

        echo json_encode([
            'success' => true,
            'type' => $type,
            'url' => $filePath,
            'name' => $fileName,
            'mimeType' => $mimeType
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'fullFile not found'
        ]);
    }
} elseif ($action === 'getMINIMediaFile') {
    error_log("Начало выполнения действия 'getMINIMediaFile'");
    $fileName = $_POST['fileName'];
    $uploadDir = 'uploads/mini/';
    $filePath = $uploadDir . 'mini_' . $fileName;
    error_log("Имя файла: " . $fileName);
    error_log("Путь к файлу: " . $filePath);
    // Проверка существования файла и прав доступа
    if (file_exists($filePath)) {

        // Определяем MIME-тип файла
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $filePath);
        finfo_close($finfo);

        $type = 'unknown';
        if (strpos($mimeType, 'image/') === 0) {
            $type = 'image';
        } elseif (strpos($mimeType, 'video/') === 0) {
            $type = 'video';
        }
        error_log("Тип файла: " . $type);
        echo json_encode([
            'success' => true,
            'type' => $type,
            'url' => $filePath,
            'name' => $fileName,
            'mimeType' => $mimeType
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'miniFile not found'
        ]);
    }
} elseif ($action === 'assignTask') {
    $requestId = $_POST['requestId'] ?? '';
    $assignedTo = $_POST['assignedTo'] ?? '';
    $assignedAt = $_POST['assignedAt'] ?? '';

    // Проверяем, не назначен ли уже кто-то на это задание
    $stmt = $conn->prepare("SELECT assigned_to FROM tasks WHERE request_id = ?");
    $stmt->bind_param("s", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    $task = $result->fetch_assoc();

    if ($task && $task['assigned_to']) {
        echo json_encode([
            'success' => false,
            'message' => 'Task is already assigned to someone'
        ]);
        exit;
    }

    // Если задание еще не назначено, назначаем его
    $stmt = $conn->prepare("UPDATE tasks SET assigned_to = ?, assigned_at = ? WHERE request_id = ?");
    $stmt->bind_param("sss", $assignedTo, $assignedAt, $requestId);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Task assigned successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error assigning task: ' . $stmt->error
        ]);
    }
    $stmt->close();
} elseif ($action === 'updateTaskStatus') {
    $requestId = $_POST['requestId'] ?? '';
    $newStatus = $_POST['newStatus'] ?? '';

    $stmt = $conn->prepare("UPDATE tasks SET status = ? WHERE request_id = ?");
    $stmt->bind_param("ss", $newStatus, $requestId);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Task status updated successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error updating task status: ' . $stmt->error
        ]);
    }
    $stmt->close();
} elseif ($action === 'getTasksByStatus') {
    $status = $_POST['status'] ?? '';
    $result = $conn->query("SELECT * FROM tasks WHERE status = '$status'");
    $tasks = $result->fetch_all(MYSQLI_ASSOC);

    echo json_encode(['success' => true, 'data' => $tasks]);

} elseif ($action === 'addComment') {
    $requestId = $_POST['requestId'] ?? '';
    $commentText = $_POST['comment'] ?? '';
    $staffName = $_POST['staffName'] ?? '';
    $timestamp = $_POST['timestamp'] ?? '';

    if (!$requestId || !$commentText || !$staffName || !$timestamp) {
        echo json_encode([
            'success' => false,
            'message' => 'Missing required parameters'
        ]);
        exit;
    }

    // Получаем текущие комментарии
    $stmt = $conn->prepare("SELECT comments FROM tasks WHERE request_id = ?");
    if (!$stmt) {
        echo json_encode([
            'success' => false,
            'message' => 'SQL prepare error: ' . $conn->error
        ]);
        exit;
    }

    $stmt->bind_param("s", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    $task = $result->fetch_assoc();

    if ($task) {
        $comments = json_decode($task['comments'], true);
        if (!is_array($comments)) {
            $comments = [];
        }
        
        $newComment = [
            'text' => $commentText,
            'staffName' => $staffName,
            'timestamp' => $timestamp
        ];
        $comments[] = $newComment;

        $stmt = $conn->prepare("UPDATE tasks SET comments = ?, commentCount = commentCount + 1 WHERE request_id = ?");
        if (!$stmt) {
            echo json_encode([
                'success' => false,
                'message' => 'SQL prepare error: ' . $conn->error
            ]);
            exit;
        }

        $stmt->bind_param("ss", json_encode($comments), $requestId);

        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Comment added successfully'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Error adding comment: ' . $stmt->error
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Task not found'
        ]);
    }
    $stmt->close();
} elseif ($action === 'getComments') {
    $requestId = $_POST['requestId'] ?? '';

    $stmt = $conn->prepare("SELECT comments FROM tasks WHERE request_id = ?");
    $stmt->bind_param("s", $requestId);
    $stmt->execute();
    $result = $stmt->get_result();
    $task = $result->fetch_assoc();

    if ($task) {
        $comments = json_decode($task['comments'], true) ?? [];
        echo json_encode([
            'success' => true,
            'comments' => $comments
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Task not found'
        ]);
    }
    $stmt->close();
} elseif ($action === 'getTasksByDate') {
    $date = $_POST['date'];

    // Логирование полученной даты
    error_log("Received date for filtering tasks: " . $date);

    $stmt = $conn->prepare("SELECT * FROM tasks WHERE DATE(date) = ?");
    if (!$stmt) {
        error_log("SQL prepare error: " . $conn->error);
        echo json_encode(['success' => false, 'message' => 'Database error']);
        exit;
    }

    $stmt->bind_param("s", $date);
    if (!$stmt->execute()) {
        error_log("SQL execute error: " . $stmt->error);
        echo json_encode(['success' => false, 'message' => 'Database error']);
        exit;
    }

    $result = $stmt->get_result();
    if (!$result) {
        error_log("SQL get_result error: " . $stmt->error);
        echo json_encode(['success' => false, 'message' => 'Database error']);
        exit;
    }

    $tasks = $result->fetch_all(MYSQLI_ASSOC);

    // Логирование количества найденных заданий
    error_log("Number of tasks found: " . count($tasks));

    // Преобразование JSON-строк в массивы
    foreach ($tasks as &$task) {
        if (isset($task['comments'])) {
            $task['comments'] = json_decode($task['comments'], true);
        }
        if (isset($task['media'])) {
            $task['media'] = json_decode($task['media'], true);
        }
    }

    echo json_encode(['success' => true, 'data' => $tasks]);
    exit;
} elseif ($action === 'refuseTask') {
    $requestId = $_POST['requestId'] ?? '';

    $stmt = $conn->prepare("UPDATE tasks SET assigned_to = NULL, assigned_at = NULL WHERE request_id = ?");
    $stmt->bind_param("s", $requestId);

    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Task assignment refused successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error refusing task assignment: ' . $stmt->error
        ]);
    }
    $stmt->close();
}

$conn->close();

function compressImage($sourcePath, $destinationPath, $quality) {
    $info = getimagesize($sourcePath);
    $image = null;

    switch ($info['mime']) {
        case 'image/jpeg':
            $image = imagecreatefromjpeg($sourcePath);
            imagejpeg($image, $destinationPath, $quality);
            break;
        case 'image/png':
            $image = imagecreatefrompng($sourcePath);
            imagepng($image, $destinationPath, $quality / 10); // PNG quality is 0-9
            break;
        default:
            return false;
    }

    imagedestroy($image);
    return true;
}

function createMiniImage($sourcePath, $destinationPath, $newSize, $quality) {
    list($width, $height, $type) = getimagesize($sourcePath);
    $scale = $newSize / min($width, $height);
    $newWidth = $width * $scale;
    $newHeight = $height * $scale;

    $image = null;
    switch ($type) {
        case IMAGETYPE_JPEG:
            $image = imagecreatefromjpeg($sourcePath);
            break;
        case IMAGETYPE_PNG:
            $image = imagecreatefrompng($sourcePath);
            break;
        default:
            return false;
    }

    $miniImage = imagecreatetruecolor($newWidth, $newHeight);
    imagecopyresampled($miniImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

    switch ($type) {
        case IMAGETYPE_JPEG:
            imagejpeg($miniImage, $destinationPath, $quality);
            break;
        case IMAGETYPE_PNG:
            imagepng($miniImage, $destinationPath, $quality / 10); // PNG quality is 0-9
            break;
    }

    imagedestroy($image);
    imagedestroy($miniImage);
    return true;
}
?>
