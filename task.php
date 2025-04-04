<?php
date_default_timezone_set('America/Chicago');
header("Cache-Control: max-age=604800, public");
header("Expires: " . gmdate("D, d M Y H:i:s", time() + 604800) . " GMT");

// Отключаем прямой вывод ошибок, чтобы они не попадали в JSON-ответ
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_error.log');

// Перехватываем фатальные ошибки
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE])) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Fatal PHP Error: ' . $error['message'] . ' in ' . $error['file'] . ' on line ' . $error['line']
        ]);
        exit;
    }
});

// Папка для сохранения загруженных файлов
$uploadDir = "uploads/";
$miniDir = "uploads/mini/";

error_log("task.php: ");

// Проверяем существование директорий и создаем их при необходимости
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}
if (!file_exists($miniDir)) {
    mkdir($miniDir, 0777, true);
}

// Проверяем права доступа
if (!is_writable($uploadDir)) {
    error_log("Upload directory is not writable: " . $uploadDir);
    // Продолжаем выполнение, хотя загрузка файлов может не работать
} else {
    error_log("Upload directory is writable: " . $uploadDir);
}

if (!is_writable($miniDir)) {
    error_log("Mini directory is not writable: " . $miniDir);
    // Продолжаем выполнение, хотя миниатюры могут не создаваться
} else {
    error_log("Mini directory is writable: " . $miniDir);
}

// Проверка прав доступа только при загрузке файлов
if ($action === 'addTask' || $action === 'uploadFile') {
    if (!is_writable($uploadDir)) {
        echo json_encode([
            'success' => false,
            'message' => 'Upload directory is not writable'
        ]);
        exit;
    }
    if (!is_writable($miniDir)) {
        echo json_encode([
            'success' => false,
            'message' => 'Mini directory is not writable'
        ]);
        exit;
    }
}

// Разрешенные типы файлов
$allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg', 'audio/mp3'];

// Подключение к базе данных
$host = 'localhost';
$user = 'root';
$password = 'root';  // Пустой пароль для XAMPP
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
                        $miniFileName = 'mini_' . $fileName;
                        $miniFilePath = $miniDir . $miniFileName;

                        createMiniImage($filePath, $miniFilePath, 135, 50);
                    }
                }
            }
        }
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
} elseif ($action === 'getUrlOfMediaFilesByTaskId') {
    $taskId = $_POST['taskId'];
    $stmt = $conn->prepare("SELECT media FROM tasks WHERE request_id = ?");
    $stmt->bind_param("s", $taskId);
    $stmt->execute();
    $result = $stmt->get_result();
    $task = $result->fetch_assoc();
    
    if (isset($task['media'])) {
        $media = json_decode($task['media'], true);
        echo json_encode(['success' => true, 'data' => $media]);
    } else {
        // Возвращаем пустой массив с success => true
        echo json_encode(['success' => true, 'data' => []]);
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
} elseif ($action === 'checkNewTasksI') {
    $lastTaskDate = $_POST['lastTaskDate'];

    // Используем уже существующее подключение к базе данных
    global $conn;

    // Проверяем наличие новых заданий
    $query = "SELECT * FROM tasks WHERE timestamp > ?";
    $stmt = $conn->prepare($query);

    if (!$stmt) {
        // Логируем ошибку, если подготовка запроса не удалась
        error_log("Ошибка подготовки запроса: " . $conn->error);
        echo json_encode(['error' => 'Ошибка подготовки запроса']);
        exit;
    }

    $stmt->bind_param('s', $lastTaskDate); // Используем 's' для строки
    $stmt->execute();

    $newTasks = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    if (empty($newTasks)) {
        echo json_encode(false); // Нет новых заданий
    } else {
        // Декодируем JSON поля comments и media
        foreach ($newTasks as &$task) {
            $task['comments'] = json_decode($task['comments'], true);
            $task['media'] = json_decode($task['media'], true);
        }
        echo json_encode($newTasks); // Возвращаем новые задания
    }
} elseif ($action === 'getNotCompletedTasksForLastWeek') {
    // Обязательно устанавливаем заголовок
    header('Content-Type: application/json; charset=utf-8');
    
    $currentDate = $_POST['currentDate'];
    $date = new DateTime($currentDate);
    $date->modify('-7 days');
    $previousDate = $date->format('Y-m-d');

    global $conn;

    try {
        $uploadDir = __DIR__ . '/uploads';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        if (!is_writable($uploadDir)) {
            // Continue execution even if directory is not writable
        } else {
        }

        // Проверяем подключение к базе данных
        if ($conn->connect_error) {
            throw new Exception("Database connection error: " . $conn->connect_error);
        }

        // Изменяем запрос, чтобы исключить задания за сегодняшний день
        $query = "SELECT * FROM tasks WHERE status != 'Completed' AND date >= ? AND date < ?";
        
        $stmt = $conn->prepare($query);

        if (!$stmt) {
            throw new Exception("Ошибка подготовки запроса: " . $conn->error);
        }

        $stmt->bind_param('ss', $previousDate, $currentDate);
        
        if (!$stmt->execute()) {
            throw new Exception("Ошибка выполнения запроса: " . $stmt->error);
        }

        $result = $stmt->get_result();
        if (!$result) {
            throw new Exception("Ошибка получения результатов: " . $stmt->error);
        }
        
        $tasks = $result->fetch_all(MYSQLI_ASSOC);

        echo json_encode(['success' => true, 'data' => $tasks]);
    } catch (Exception $e) {
        error_log("Error in getNotCompletedTasksForLastWeek: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
} elseif ($action === 'getTasksByPeriod') {
    $fromDate = $_POST['fromDate'];
    $toDate = $_POST['toDate'];

    $stmt = $conn->prepare("SELECT * FROM tasks WHERE date >= ? AND date <= ?");
    $stmt->bind_param("ss", $fromDate, $toDate);
    $stmt->execute();
    $result = $stmt->get_result();
    $tasks = $result->fetch_all(MYSQLI_ASSOC);
    echo json_encode(['success' => true, 'data' => $tasks]);
    $stmt->close();
} elseif ($action === 'getTasksWithFiltering') {
    // Извлекаем параметры запроса
    $filtersJson = $_POST['filters'] ?? '{}';
    $page = isset($_POST['page']) ? (int)$_POST['page'] : 1;
    $limit = isset($_POST['limit']) ? (int)$_POST['limit'] : 10;

    // Вычисляем смещение для LIMIT в SQL
    $offset = ($page - 1) * $limit;
    
    // Декодируем фильтры
    $filters = json_decode($filtersJson, true);
    
    // Базовый запрос
    $baseQuery = "SELECT * FROM tasks";
    $countQuery = "SELECT COUNT(*) as total FROM tasks";
    $whereConditions = [];
    $params = [];
    $types = "";
    
    // Применяем фильтры
    // 1. Фильтр по дате
    if (!empty($filters['byDate']['date']) && $filters['byDate']['period']['last'] === 'Custom') {
        $whereConditions[] = "DATE(date) = ?";
        $params[] = $filters['byDate']['date'];
        $types .= "s";
    } elseif (!empty($filters['byDate']['period']['custom']['from']) && !empty($filters['byDate']['period']['custom']['to']) && $filters['byDate']['period']['last'] === 'Custom') {
        $whereConditions[] = "date >= ? AND date <= ?";
        $params[] = $filters['byDate']['period']['custom']['from'];
        $params[] = $filters['byDate']['period']['custom']['to'];
        $types .= "ss";
    } elseif (!empty($filters['byDate']['period']['last']) && $filters['byDate']['period']['last'] !== 'Custom') {
        // Добавляем обработку предопределенных периодов
        $currentDate = date('Y-m-d');
        $fromDate = "";
        
        switch ($filters['byDate']['period']['last']) {
            case 'lastWeek':
                $fromDate = date('Y-m-d', strtotime('-7 days'));
                break;
            case 'lastMonth':
                $fromDate = date('Y-m-d', strtotime('-1 month'));
                break;
            case 'last3Months':
                $fromDate = date('Y-m-d', strtotime('-3 months'));
                break;
            case 'lastYear':
                $fromDate = date('Y-m-d', strtotime('-1 year'));
                break;
        }
        
        if (!empty($fromDate)) {
            $whereConditions[] = "date >= ? AND date <= ?";
            $params[] = $fromDate;
            $params[] = $currentDate;
            $types .= "ss";
        }
    }
    
    // 2. Фильтр по статусу
    if (!empty($filters['byStatus']['status']) && is_array($filters['byStatus']['status'])) {
        $statusPlaceholders = implode(',', array_fill(0, count($filters['byStatus']['status']), '?'));
        $whereConditions[] = "status IN (" . $statusPlaceholders . ")";
        
        foreach ($filters['byStatus']['status'] as $status) {
            $params[] = $status;
            $types .= "s";
        }
    }
    
    // 3. Фильтр по приоритету
    if (!empty($filters['byPriority']['priority']) && is_array($filters['byPriority']['priority'])) {
        $priorityPlaceholders = implode(',', array_fill(0, count($filters['byPriority']['priority']), '?'));
        $whereConditions[] = "priority IN (" . $priorityPlaceholders . ")";
        
        foreach ($filters['byPriority']['priority'] as $priority) {
            $params[] = $priority;
            $types .= "s";
        }
    }
    
    // 4. Фильтр по назначениям
    if (!empty($filters['byAssignment']['assignment']) && $filters['byAssignment']['assignment'] !== 'All') {
        if ($filters['byAssignment']['assignment'] === 'Yes') {
            $whereConditions[] = "assigned_to IS NOT NULL AND assigned_to != ''";
        } elseif ($filters['byAssignment']['assignment'] === 'No') {
            $whereConditions[] = "(assigned_to IS NULL OR assigned_to = '')";
        }
    }
    
    // Объединяем условия WHERE
    if (!empty($whereConditions)) {
        $baseQuery .= " WHERE " . implode(" AND ", $whereConditions);
        $countQuery .= " WHERE " . implode(" AND ", $whereConditions);
    }
    
    // Добавляем сортировку (по умолчанию по дате создания)
    $baseQuery .= " ORDER BY timestamp DESC";
    
    // Добавляем пагинацию
    $baseQuery .= " LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";
    

    // Выполняем запрос для получения общего количества задач
    $countStmt = $conn->prepare($countQuery);

    error_log("getTasksWithFiltering: baseQuery: " . $baseQuery);
    error_log("getTasksWithFiltering: countQuery: " . $countQuery);
    error_log("getTasksWithFiltering: params: " . json_encode($params));
    error_log("getTasksWithFiltering: types: " . $types);
    error_log("getTasksWithFiltering: countStmt выполнен");

    if (!empty($params) && !empty($types)) {
        // Создаем копии параметров для запроса подсчета (без limit и offset)
        $countParams = array_slice($params, 0, count($params) - 2);
        $countTypes = substr($types, 0, strlen($types) - 2);
        
        $countStmt->bind_param($countTypes, ...$countParams);
    }
    
    $countStmt->execute();
    $totalResult = $countStmt->get_result()->fetch_assoc();
    $totalTasks = $totalResult['total'];
    $totalPages = ceil($totalTasks / $limit);
    
    // Выполняем основной запрос для получения данных с пагинацией
    $stmt = $conn->prepare($baseQuery);
    
    if (!empty($params) && !empty($types)) {
        // Привязываем параметры только если они есть
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $tasks = $result->fetch_all(MYSQLI_ASSOC);
    
    // Декодируем JSON-поля
    foreach ($tasks as &$task) {
        if (isset($task['comments'])) {
            $task['comments'] = json_decode($task['comments'], true);
        }
        if (isset($task['media'])) {
            $task['media'] = json_decode($task['media'], true);
        }
    }
    
    echo json_encode([
        'success' => true, 
        'data' => $tasks,
        'pagination' => [
            'totalTasks' => (int)$totalTasks,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => $totalPages
        ]
    ]);
    
    $stmt->close();
    $countStmt->close();
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
