<?php
// Включаем буферизацию вывода
ob_start();

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
date_default_timezone_set('America/Chicago');

// Настройка обработки ошибок
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Изменяем путь к лог-файлу на директорию с гарантированными правами
ini_set('error_log', '/Applications/XAMPP/xamppfiles/logs/php_error.log');

// В начале файла добавим константы для путей
define('UPLOAD_DIR', __DIR__ . '/uploads');
define('UPLOAD_MINI_DIR', UPLOAD_DIR . '/mini');
define('WEB_UPLOAD_PATH', '/maintenance_P/uploads');
define('WEB_UPLOAD_MINI_PATH', '/maintenance_P/uploads/mini');

// Улучшенная функция логирования
function debug_log($message, $data = null) {
    $logFile = '/Applications/XAMPP/xamppfiles/logs/php_error.log';
    $log = date('Y-m-d H:i:s') . " - " . $message;
    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            $log .= "\n" . print_r($data, true);
        } else {
            $log .= "\n" . $data;
        }
    }
    error_log($log . "\n\n", 3, $logFile);
}

// Обновим функцию createThumbnail
function createThumbnail($sourcePath, $targetPath, $width = 150) {
    try {
        if (!file_exists($sourcePath)) {
            error_log("Source file does not exist: " . $sourcePath);
            return false;
        }

        // Создаем директорию для миниатюры, если её нет
        $targetDir = dirname($targetPath);
        if (!file_exists($targetDir)) {
            if (!mkdir($targetDir, 0777, true)) {
                error_log("Failed to create directory: " . $targetDir);
                return false;
            }
            chmod($targetDir, 0777);
        }

        // Получаем информацию об изображении
        $imageInfo = getimagesize($sourcePath);
        if ($imageInfo === false) {
            error_log("Failed to get image info for: " . $sourcePath);
            return false;
        }

        $sourceWidth = $imageInfo[0];
        $sourceHeight = $imageInfo[1];
        $imageType = $imageInfo[2];

        // Вычисляем размеры миниатюры, сохраняя пропорции
        $ratio = $sourceHeight / $sourceWidth;
        $height = round($width * $ratio);

        // Создаем новое изображение
        $thumbnail = imagecreatetruecolor($width, $height);
        if (!$thumbnail) {
            error_log("Failed to create thumbnail canvas");
            return false;
        }

        // Создаем исходное изображение
        $source = null;
        switch ($imageType) {
            case IMAGETYPE_JPEG:
                $source = imagecreatefromjpeg($sourcePath);
                break;
            case IMAGETYPE_PNG:
                $source = imagecreatefrompng($sourcePath);
                // Настраиваем прозрачность для PNG
                imagealphablending($thumbnail, false);
                imagesavealpha($thumbnail, true);
                break;
            default:
                error_log("Unsupported image type: " . $imageType);
                return false;
        }

        if (!$source) {
            error_log("Failed to create source image");
            return false;
        }

        // Изменяем размер
        if (!imagecopyresampled($thumbnail, $source, 0, 0, 0, 0, $width, $height, $sourceWidth, $sourceHeight)) {
            error_log("Failed to resize image");
            return false;
        }

        // Сохраняем миниатюру
        $success = false;
        switch ($imageType) {
            case IMAGETYPE_JPEG:
                $success = imagejpeg($thumbnail, $targetPath, 90);
                break;
            case IMAGETYPE_PNG:
                $success = imagepng($thumbnail, $targetPath, 9);
                break;
        }

        // Очищаем память
        imagedestroy($thumbnail);
        imagedestroy($source);

        if (!$success) {
            error_log("Failed to save thumbnail to: " . $targetPath);
            return false;
        }

        return true;
    } catch (Exception $e) {
        error_log("Error in createThumbnail: " . $e->getMessage());
        return false;
    }
}

// Проверка директорий и прав доступа
$uploadsDir = __DIR__ . '/uploads';
$miniDir = $uploadsDir . '/mini';

// Создаем директории с правильными правами
if (!file_exists($uploadsDir)) {
    if (!mkdir($uploadsDir, 0777, true)) {
        error_log("Failed to create uploads directory");
    }
    chmod($uploadsDir, 0777);
}

if (!file_exists($miniDir)) {
    if (!mkdir($miniDir, 0777, true)) {
        error_log("Failed to create mini directory");
    }
    chmod($miniDir, 0777);
}

// Логируем права доступа
error_log("Uploads directory permissions: " . substr(sprintf('%o', fileperms($uploadsDir)), -4));
error_log("Mini directory permissions: " . substr(sprintf('%o', fileperms($miniDir)), -4));

try {
    // Логируем все входящие данные
    debug_log("Received request", [
        'POST' => $_POST,
        'FILES' => $_FILES ?? [],
        'RAW' => file_get_contents('php://input')
    ]);

    // Параметры подключения к базе данных
    $host = 'localhost';
    $user = 'root';     // Пользователь MySQL
    $password = '';     // Пароль для MySQL
    $database = 'maintenancedb';

    // Подключение к базе данных
    try {
        $conn = new mysqli($host, $user, $password, $database);
        
        if ($conn->connect_error) {
            throw new Exception('Database connection failed: ' . $conn->connect_error);
        }
        
        $conn->set_charset('utf8');
        debug_log("Database connected successfully");
        
    } catch (Exception $e) {
        debug_log("Connection error", [
            'message' => $e->getMessage(),
            'host' => $host,
            'user' => $user,
            'database' => $database
        ]);
        throw $e;
    }

    // Добавляем после подключения к базе данных, перед обработкой action

    // Обновляем SQL для создания таблицы событий (удаляем legacy поля)
    $createEventsTable = "CREATE TABLE IF NOT EXISTS events (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        startDate DATE NOT NULL,
        startTime TIME NOT NULL,
        setupDate DATE NULL,
        setupTime TIME NULL,
        endDate DATE NULL,
        endTime TIME NULL,
        location VARCHAR(255) NOT NULL,
        contact VARCHAR(255) NULL,
        email VARCHAR(255) NULL,
        phone VARCHAR(50) NULL,
        alcuinContact VARCHAR(255) NULL,
        attendees TEXT NULL,
        podium VARCHAR(50) NULL,
        monitors VARCHAR(50) NULL,
        laptop VARCHAR(50) NULL,
        ipad VARCHAR(50) NULL,
        microphones VARCHAR(50) NULL,
        speaker VARCHAR(50) NULL,
        avAssistance VARCHAR(50) NULL,
        security VARCHAR(50) NULL,
        buildingAccess TINYTEXT NULL,
        otherConsiderations TEXT NULL,
        status TINYTEXT NULL,
        approved ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        approvedBy VARCHAR(255) NULL,
        approvedAt DATETIME NULL,
        createdBy VARCHAR(255) NULL,
        createdAt DATETIME NULL,
        setupImages TEXT NULL,
        tables6ft TINYTEXT NULL,
        tables8ft TINYTEXT NULL,
        tablesRound TINYTEXT NULL,
        tables6ftCount INT(11) NULL DEFAULT 0,
        tables8ftCount INT(11) NULL DEFAULT 0,
        tablesRoundCount INT(11) NULL DEFAULT 0,
        tablecloth_color VARCHAR(50) NULL,
        chairs_count INT(11) NULL DEFAULT 0,
        chairs_needed TINYTEXT NULL,
        tables_needed TINYTEXT NULL,
        FULLTEXT KEY event_search (name, location, contact)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci";

    // SQL для создания таблицы комментариев
    $createCommentsTable = "CREATE TABLE IF NOT EXISTS event_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        author VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        userPhotoUrl VARCHAR(255) NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci";

    // SQL для создания таблицы пользователей
    $createUsersTable = "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fullName VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        department VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci";

    // Создаем таблицы
    try {
        if (!$conn->query($createEventsTable)) {
            throw new Exception('Failed to create events table: ' . $conn->error);
        }
        
        if (!$conn->query($createCommentsTable)) {
            throw new Exception('Failed to create comments table: ' . $conn->error);
        }
        
        if (!$conn->query($createUsersTable)) {
            throw new Exception('Failed to create users table: ' . $conn->error);
        }

        debug_log("Database tables created/verified successfully");
    } catch (Exception $e) {
        debug_log("Error creating tables", [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        throw $e;
    }

    // Проверяем наличие action
    if (!isset($_POST['action'])) {
        throw new Exception('No action specified');
    }

    $action = $_POST['action'];
    debug_log("Processing action", $action);

    switch ($action) {
        case 'getEvents':
            try {
                debug_log("Getting events");
                
                $stmt = $conn->prepare("SELECT 
                    id, name, startDate, startTime, setupDate, setupTime,
                    endDate, endTime, location, contact, email,
                    phone, alcuinContact, attendees,
                    podium, monitors, laptop, ipad, microphones,
                    speaker, avAssistance, security, buildingAccess, otherConsiderations,
                    status, approved, approvedBy, approvedAt, createdBy, createdAt, setupImages,
                    tables6ft, tables8ft, tablesRound,
                    tables6ftCount, tables8ftCount, tablesRoundCount,
                    tablecloth_color, chairs_count, chairs_needed, tables_needed
                FROM events ORDER BY startDate ASC");

                if (!$stmt->execute()) {
                    throw new Exception('Failed to get events: ' . $stmt->error);
                }

                $result = $stmt->get_result();
                $events = [];
                while ($row = $result->fetch_assoc()) {
                    // Получаем комментарии для каждого события
                    $current_event_id = $row['id']; // Store event ID for logging
                    debug_log("Fetching comments for event ID: " . $current_event_id);

                    $commentsQuery = "SELECT id, event_id, author, text, created_at, userPhotoUrl FROM event_comments WHERE event_id = ? ORDER BY created_at ASC";
                    $commentsStmt = $conn->prepare($commentsQuery);
                    
                    if (!$commentsStmt) {
                        throw new Exception('Failed to prepare comments statement: ' . $conn->error);
                    }

                    $commentsStmt->bind_param('i', $current_event_id);
                    $commentsStmt->execute();
                    $commentsResult = $commentsStmt->get_result();
                    
                    $comments = [];
                    while ($commentRow = $commentsResult->fetch_assoc()) {
                        $comments[] = [
                            'id' => $commentRow['id'],
                            'author' => $commentRow['author'],
                            'text' => $commentRow['text'],
                            'date' => $commentRow['created_at'],
                            'userPhotoUrl' => $commentRow['userPhotoUrl']
                        ];
                    }
                    // Log how many comments were found for this event
                    debug_log("Found " . count($comments) . " comments for event ID: " . $current_event_id);
                    $commentsStmt->close();

                    // Удаляем обработку устаревших полей
                    $eventData = $row;
                    $eventData['comments'] = $comments;
                    
                    // Добавляем событие в массив
                    $events[] = $eventData;
                }

                debug_log("Found events", count($events));

                echo json_encode([
                    'success' => true,
                    'events' => $events
                ]);

                $stmt->close();
            } catch (Exception $e) {
                debug_log("Error getting events", [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                throw $e;
            }
            break;

        case 'uploadFile':
            try {
                if (!isset($_FILES['file'])) {
                    throw new Exception('No file uploaded');
                }

                $file = $_FILES['file'];
                $fileName = uniqid() . '_' . basename($file['name']);
                
                // Абсолютные пути для сохранения
                $uploadsDir = __DIR__ . '/uploads';
                $miniDir = $uploadsDir . '/mini';
                
                // Проверяем и создаем директории
                foreach ([$uploadsDir, $miniDir] as $dir) {
                    if (!file_exists($dir)) {
                        if (!mkdir($dir, 0777, true)) {
                            throw new Exception("Failed to create directory: $dir");
                        }
                        chmod($dir, 0777);
                    }
                }

                $uploadPath = $uploadsDir . '/' . $fileName;
                $thumbnailPath = $miniDir . '/' . $fileName;

                // Загружаем оригинал
                if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
                    throw new Exception('Failed to move uploaded file');
                }

                // Проверяем тип файла
                $imageInfo = getimagesize($uploadPath);
                if ($imageInfo === false) {
                    unlink($uploadPath); // Удаляем файл если это не изображение
                    throw new Exception('Uploaded file is not an image');
                }

                // Создаем миниатюру
                if (!createThumbnail($uploadPath, $thumbnailPath)) {
                    error_log("Failed to create thumbnail for: " . $uploadPath);
                    // Даже если миниатюра не создалась, продолжаем работу
                }

                // Проверяем создание файлов
                if (!file_exists($uploadPath)) {
                    throw new Exception('Original file was not created');
                }

                // Возвращаем только имя файла для сохранения в БД
                echo json_encode([
                    'success' => true,
                    'fileUrl' => $fileName,
                    'debug' => [
                        'original_exists' => file_exists($uploadPath),
                        'thumbnail_exists' => file_exists($thumbnailPath),
                        'original_size' => filesize($uploadPath),
                        'thumbnail_size' => file_exists($thumbnailPath) ? filesize($thumbnailPath) : 0,
                        'image_type' => $imageInfo['mime']
                    ]
                ]);
                exit;

            } catch (Exception $e) {
                error_log("Upload error: " . $e->getMessage());
                echo json_encode([
                    'success' => false,
                    'message' => $e->getMessage()
                ]);
                exit;
            }
            break;

        case 'deleteEvent':
            if (!isset($_POST['eventId'])) {
                die(json_encode(['success' => false, 'message' => 'No event ID provided']));
            }

            $eventId = $_POST['eventId'];
            $stmt = $conn->prepare("DELETE FROM events WHERE id = ?");
            $stmt->bind_param('i', $eventId);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Event deleted successfully'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Error deleting event: ' . $stmt->error
                ]);
            }
            $stmt->close();
            break;

        case 'testConnection':
            // Тестовое подключение
            $conn = new mysqli($host, $user, $password, $database);
            
            if ($conn->connect_error) {
                throw new Exception("Connection failed: " . $conn->connect_error);
            }
            
            // Проверяем существование таблицы
            $result = $conn->query("SHOW TABLES LIKE 'events'");
            if ($result->num_rows === 0) {
                throw new Exception("Table 'events' does not exist");
            }
            
            // Проверяем структуру таблицы
            $result = $conn->query("DESCRIBE events");
            $columns = [];
            while ($row = $result->fetch_assoc()) {
                $columns[$row['Field']] = $row['Type'];
            }
            
            // Выводим информацию о структуре таблицы
            echo json_encode([
                'success' => true,
                'message' => 'Database connection successful',
                'table_structure' => $columns
            ]);
            break;

        case 'addComment':
            if (!isset($_POST['commentData'])) {
                throw new Exception('No comment data provided');
            }

            $commentData = json_decode($_POST['commentData'], true);
            if (!$commentData) {
                throw new Exception('Invalid comment data format');
            }

            // Проверяем наличие необходимых полей
            if (!isset($commentData['eventId']) || !isset($commentData['text']) || 
                !isset($commentData['author']) || !isset($commentData['date'])) {
                throw new Exception('Missing required comment fields');
            }

            // Получаем URL фото пользователя, если оно есть
            $userPhotoUrl = isset($commentData['userPhotoUrl']) ? $commentData['userPhotoUrl'] : null;

            // Подготавливаем и выполняем запрос для добавления комментария
            $stmt = $conn->prepare("INSERT INTO event_comments (event_id, author, text, created_at, userPhotoUrl) VALUES (?, ?, ?, ?, ?)");
            if (!$stmt) {
                throw new Exception('Failed to prepare comment statement: ' . $conn->error);
            }

            // Преобразуем дату в формат MySQL
            $date = date('Y-m-d H:i:s', strtotime($commentData['date']));
            debug_log("Preparing to insert comment", ['data' => $commentData, 'prepared_date' => $date]); // Log data before binding

            if (!$stmt->bind_param('issss', 
                $commentData['eventId'],
                $commentData['author'],
                $commentData['text'],
                $date,
                $userPhotoUrl
            )) {
                throw new Exception('Failed to bind comment parameters: ' . $stmt->error);
            }

            debug_log("Attempting to execute comment insert..."); // Log before execution
            if (!$stmt->execute()) {
                // Log the specific SQL error
                $sqlError = $stmt->error;
                debug_log("Failed to add comment - SQL Error", ['error' => $sqlError]);
                throw new Exception('Failed to add comment: ' . $sqlError);
            }
            // Log affected rows immediately after execute
            $affected_rows = $conn->affected_rows;
            debug_log("Comment insert executed. Affected rows: " . $affected_rows); 

            // Check if affected_rows is as expected
            if ($affected_rows < 1) {
                 // Even if execute returned true, no rows were inserted. Log this specific case.
                 debug_log("Execute returned true, but affected_rows is not 1. Insert likely failed silently.", ['affected_rows' => $affected_rows]);
                 // Optionally, throw an exception here too, as the insert didn't behave as expected.
                 // throw new Exception('Comment insertion failed silently (affected_rows: ' . $affected_rows . ')');
            }

            $commentId = $conn->insert_id;
            $stmt->close();

            // Возвращаем успешный результат
            echo json_encode([
                'success' => true,
                'message' => 'Comment added successfully',
                'commentId' => $commentId
            ]);
            break;

        case 'getComments':
            if (!isset($_POST['eventId'])) {
                throw new Exception('No event ID provided');
            }

            $eventId = $_POST['eventId'];
            
            // Получаем комментарии для конкретного события
            $stmt = $conn->prepare("SELECT * FROM event_comments WHERE event_id = ? ORDER BY created_at ASC");
            if (!$stmt) {
                throw new Exception('Failed to prepare get comments statement: ' . $conn->error);
            }

            if (!$stmt->bind_param('i', $eventId)) {
                throw new Exception('Failed to bind get comments parameters: ' . $stmt->error);
            }

            if (!$stmt->execute()) {
                throw new Exception('Failed to get comments: ' . $stmt->error);
            }

            $result = $stmt->get_result();
            $comments = [];
            while ($row = $result->fetch_assoc()) {
                $comments[] = [
                    'id' => $row['id'],
                    'author' => $row['author'],
                    'text' => $row['text'],
                    'date' => $row['created_at'],
                    'userPhotoUrl' => $row['userPhotoUrl']
                ];
            }

            $stmt->close();

            echo json_encode([
                'success' => true,
                'comments' => $comments
            ]);
            break;

        case 'updateComment':
            if (!isset($_POST['commentId']) || !isset($_POST['eventId']) || !isset($_POST['text'])) {
                throw new Exception('Missing required parameters for comment update');
            }

            $commentId = $_POST['commentId'];
            $eventId = $_POST['eventId'];
            $text = $_POST['text'];
            
            // Проверка существования комментария и его принадлежности к указанному событию
            $checkStmt = $conn->prepare("SELECT author FROM event_comments WHERE id = ? AND event_id = ?");
            if (!$checkStmt) {
                throw new Exception('Failed to prepare check comment statement: ' . $conn->error);
            }
            
            $checkStmt->bind_param('ii', $commentId, $eventId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows === 0) {
                throw new Exception('Comment not found or does not belong to the specified event');
            }
            
            $commentData = $checkResult->fetch_assoc();
            $checkStmt->close();
            
            // Обновляем текст комментария
            $updateStmt = $conn->prepare("UPDATE event_comments SET text = ? WHERE id = ?");
            if (!$updateStmt) {
                throw new Exception('Failed to prepare update comment statement: ' . $conn->error);
            }
            
            $updateStmt->bind_param('si', $text, $commentId);
            
            if (!$updateStmt->execute()) {
                throw new Exception('Failed to update comment: ' . $updateStmt->error);
            }
            
            $updateStmt->close();
            
            echo json_encode([
                'success' => true,
                'message' => 'Comment updated successfully'
            ]);
            break;
            
        case 'deleteComment':
            if (!isset($_POST['commentId']) || !isset($_POST['eventId'])) {
                throw new Exception('Missing required parameters for comment deletion');
            }
            
            $commentId = $_POST['commentId'];
            $eventId = $_POST['eventId'];
            
            // Проверка существования комментария и его принадлежности к указанному событию
            $checkStmt = $conn->prepare("SELECT author FROM event_comments WHERE id = ? AND event_id = ?");
            if (!$checkStmt) {
                throw new Exception('Failed to prepare check comment statement: ' . $conn->error);
            }
            
            $checkStmt->bind_param('ii', $commentId, $eventId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows === 0) {
                throw new Exception('Comment not found or does not belong to the specified event');
            }
            
            $commentData = $checkResult->fetch_assoc();
            $checkStmt->close();
            
            // Удаляем комментарий
            $deleteStmt = $conn->prepare("DELETE FROM event_comments WHERE id = ?");
            if (!$deleteStmt) {
                throw new Exception('Failed to prepare delete comment statement: ' . $conn->error);
            }
            
            $deleteStmt->bind_param('i', $commentId);
            
            if (!$deleteStmt->execute()) {
                throw new Exception('Failed to delete comment: ' . $deleteStmt->error);
            }
            
            $deleteStmt->close();
            
            echo json_encode([
                'success' => true,
                'message' => 'Comment deleted successfully'
            ]);
            break;

        case 'updateEventStatus':
            if (!isset($_POST['eventId']) || !isset($_POST['status'])) {
                throw new Exception('Missing required parameters');
            }

            $eventId = $_POST['eventId'];
            $status = $_POST['status'];
            
            $stmt = $conn->prepare("UPDATE events SET status = ? WHERE id = ?");
            $stmt->bind_param('si', $status, $eventId);
            
            if (!$stmt->execute()) {
                throw new Exception('Failed to update event status: ' . $stmt->error);
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Event status updated successfully'
            ]);
            exit;

        case 'updateEventApproval':
            if (!isset($_POST['eventId']) || !isset($_POST['approved'])) {
                throw new Exception('Missing required parameters');
            }

            $eventId = $_POST['eventId'];
            $approved = $_POST['approved'];
            $currentUser = isset($_POST['approvedBy']) ? $_POST['approvedBy'] : 'Admin';
            
            // Check if the user has admin privileges
            $isAdmin = isset($_POST['isAdmin']) ? (bool)$_POST['isAdmin'] : false;
            
            if (!$isAdmin) {
                echo json_encode([
                    'success' => false,
                    'message' => 'You do not have permission to approve events'
                ]);
                exit;
            }
            
            $stmt = $conn->prepare("UPDATE events SET approved = ?, approvedBy = ?, approvedAt = NOW() WHERE id = ?");
            $stmt->bind_param('ssi', $approved, $currentUser, $eventId);
            
            if (!$stmt->execute()) {
                throw new Exception('Failed to update event approval status: ' . $stmt->error);
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Event approval status updated successfully'
            ]);
            exit;

        case 'createEvent':
            try {
                // Detailed debug logging for all received parameters
                $allPostData = $_POST;
                $allFilesData = $_FILES;
                debug_log("Create Event - All POST data:", $allPostData);
                debug_log("Create Event - All FILES data:", $allFilesData);
                
                // Добавим отладочное логирование входящих данных
                debug_log("Received tables and chairs data:", [
                    'tablesNeeded' => $_POST['tablesNeeded'] ?? 'not set',
                    'chairsNeeded' => $_POST['chairsNeeded'] ?? 'not set'
                ]);

                // Сначала обрабатываем загрузку изображений
                $uploadedImages = [];
                if (isset($_FILES['setupImages'])) {
                    // Проверяем/создаем директории
                    foreach ([UPLOAD_DIR, UPLOAD_MINI_DIR] as $dir) {
                        if (!file_exists($dir)) {
                            if (!mkdir($dir, 0777, true)) {
                                throw new Exception("Failed to create directory: $dir");
                            }
                            chmod($dir, 0777);
                        }
                    }

                    foreach ($_FILES['setupImages']['tmp_name'] as $key => $tmpName) {
                        if ($_FILES['setupImages']['error'][$key] === UPLOAD_ERR_OK) {
                            $fileName = uniqid() . '_' . $_FILES['setupImages']['name'][$key];
                            $uploadPath = UPLOAD_DIR . '/' . $fileName;
                            $miniPath = UPLOAD_MINI_DIR . '/' . $fileName;

                            if (move_uploaded_file($tmpName, $uploadPath)) {
                                $uploadedImages[] = $fileName;
                                
                                if (!createThumbnail($uploadPath, $miniPath, 150)) {
                                    error_log("Failed to create thumbnail for: " . $uploadPath);
                                }

                                chmod($uploadPath, 0644);
                                if (file_exists($miniPath)) {
                                    chmod($miniPath, 0644);
                                }
                            }
                        }
                    }
                }

                // Явно обрабатываем значения yes/no
                $tablesNeeded = strtolower(trim($_POST['tablesNeeded'])) === 'yes' ? 'yes' : 'no';
                $chairsNeeded = strtolower(trim($_POST['chairsNeeded'])) === 'yes' ? 'yes' : 'no';
                $tables6ft = strtolower(trim($_POST['tables6ft'])) === 'yes' ? 'yes' : 'no';
                $tables8ft = strtolower(trim($_POST['tables8ft'])) === 'yes' ? 'yes' : 'no';
                $tablesRound = strtolower(trim($_POST['tablesRound'])) === 'yes' ? 'yes' : 'no';

                // Validate required fields
                $requiredFields = [
                    'eventName', 'eventStartDate', 'eventStartTime', 'setupDate', 
                    'setupTime', 'endDate', 'endTime', 'eventLocation', 
                    'eventContact', 'createdBy'
                ];
                
                $missingFields = [];
                foreach ($requiredFields as $field) {
                    if (!isset($_POST[$field]) || trim($_POST[$field]) === '') {
                        $missingFields[] = $field;
                    }
                }
                
                if (!empty($missingFields)) {
                    throw new Exception('Missing required fields: ' . implode(', ', $missingFields));
                }

                // Process createdAt in the Chicago timezone
                $createdAtISO = $_POST['createdAt'] ?? null;
                debug_log("Original createdAt value:", $createdAtISO);
                
                if ($createdAtISO) {
                    try {
                        // Ensure date is in the correct timezone
                        $dateObj = new DateTime($createdAtISO);
                        $dateObj->setTimezone(new DateTimeZone('America/Chicago'));
                        $createdAt = $dateObj->format('Y-m-d H:i:s');
                        debug_log("Converted createdAt in createEvent", [
                            'original' => $createdAtISO,
                            'converted' => $createdAt
                        ]);
                    } catch (Exception $e) {
                        debug_log("Error parsing createdAt:", [
                            'value' => $createdAtISO,
                            'error' => $e->getMessage()
                        ]);
                        // Fallback to current time if parsing fails
                        $createdAt = date('Y-m-d H:i:s');
                        debug_log("Using fallback current time:", $createdAt);
                    }
                } else {
                    // Fallback to current time if no createdAt provided
                    $createdAt = date('Y-m-d H:i:s');
                    debug_log("Using current time for createdAt in createEvent", $createdAt);
                }

                // Обрабатываем числовые значения
                $tables6ftCount = $tables6ft === 'yes' ? max(0, intval($_POST['tables6ftCount'])) : 0;
                $tables8ftCount = $tables8ft === 'yes' ? max(0, intval($_POST['tables8ftCount'])) : 0;
                $tablesRoundCount = $tablesRound === 'yes' ? max(0, intval($_POST['tablesRoundCount'])) : 0;
                $chairsCount = $chairsNeeded === 'yes' ? max(0, intval($_POST['chairs_count'])) : 0;

                // Логируем обработанные значения
                debug_log("Processed values:", [
                    'tablesNeeded' => $tablesNeeded,
                    'chairsNeeded' => $chairsNeeded,
                    'tables' => [
                        '6ft' => ['needed' => $tables6ft, 'count' => $tables6ftCount],
                        '8ft' => ['needed' => $tables8ft, 'count' => $tables8ftCount],
                        'round' => ['needed' => $tablesRound, 'count' => $tablesRoundCount]
                    ],
                    'chairs' => ['needed' => $chairsNeeded, 'count' => $chairsCount]
                ]);

                // Логируем структуру SQL и параметров для отладки
                debug_log("SQL query and parameters:", [
                    'action' => 'createEvent',
                    'params_keys' => array_keys($_POST),
                    'files_keys' => isset($_FILES) ? array_keys($_FILES) : []
                ]);

                // В case 'createEvent' обновляем SQL-запрос, убеждаемся что запрос корректный
                $sql = "INSERT INTO events (
                    name, startDate, startTime, setupDate, setupTime, 
                    endDate, endTime, location, contact, email, 
                    phone, alcuinContact, attendees,
                    podium, monitors, laptop, ipad, microphones,
                    speaker, avAssistance, security, buildingAccess, otherConsiderations,
                    status, createdBy, createdAt, setupImages,
                    tables6ft, tables8ft, tablesRound,
                    tables6ftCount, tables8ftCount, tablesRoundCount,
                    tablecloth_color, chairs_count, chairs_needed, tables_needed
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

                // Обновляем массив параметров (убираем legacy поля)
                $params = [
                    $_POST['eventName'],
                    $_POST['eventStartDate'],
                    $_POST['eventStartTime'],
                    $_POST['setupDate'],
                    $_POST['setupTime'],
                    $_POST['endDate'],
                    $_POST['endTime'],
                    $_POST['eventLocation'],
                    $_POST['eventContact'],
                    $_POST['eventEmail'],
                    $_POST['eventPhone'],
                    $_POST['alcuinContact'],
                    $_POST['attendees'],
                    $_POST['podiumNeeded'],
                    $_POST['monitorsNeeded'],
                    $_POST['laptopNeeded'],
                    $_POST['ipadNeeded'],
                    $_POST['microphonesNeeded'],
                    $_POST['speakerNeeded'],
                    $_POST['avAssistance'],
                    $_POST['securityNeeded'],
                    $_POST['buildingAccess'],
                    $_POST['otherConsiderations'],
                    'pending',
                    $_POST['createdBy'],
                    $createdAt,
                    !empty($uploadedImages) ? json_encode($uploadedImages) : null,
                    $tables6ft,
                    $tables8ft,
                    $tablesRound,
                    $tables6ftCount,
                    $tables8ftCount,
                    $tablesRoundCount,
                    $_POST['tableclothColor'],
                    $chairsCount,
                    $chairsNeeded,
                    $tablesNeeded
                ];

                // Количество VALUES параметров должно совпадать с количеством передаваемых параметров
                debug_log("SQL parameters check:", [
                    'sql_placeholders' => substr_count($sql, '?'),
                    'expected_params' => 37,
                    'actual_params' => count($params)
                ]);

                // Обновляем типы параметров
                $types = str_repeat('s', 27) . 'sssiiisiss'; // Total: 37 characters
                // 27 строковых параметров до setupImages включительно (включая status='pending')
                // sss - tables6ft, tables8ft, tablesRound (строковые yes/no)
                // iii - tables6ftCount, tables8ftCount, tablesRoundCount (числа)
                // s - tablecloth_color (строка)
                // i - chairs_count (число)
                // s - chairs_needed (строка)
                // s - tables_needed (строка)

                $stmt = $conn->prepare($sql);
                if (!$stmt) {
                    throw new Exception('Failed to prepare statement: ' . $conn->error);
                }

                // Добавляем явную проверку соответствия количества параметров
                $placeholdersCount = substr_count($sql, '?');
                $paramsCount = count($params);
                if ($placeholdersCount !== $paramsCount) {
                    throw new Exception(
                        "Parameter count mismatch: SQL expects {$placeholdersCount} parameters, but {$paramsCount} were provided"
                    );
                }

                if (!$stmt->bind_param($types, ...$params)) {
                    debug_log("Binding parameters failed", [
                        'params_count' => count($params),
                        'types_length' => strlen($types),
                        'sql_placeholders' => substr_count($sql, '?'),
                        'params' => array_keys($_POST),
                        'error' => $stmt->error
                    ]);
                    throw new Exception('Failed to bind parameters: ' . $stmt->error . ' (Types: ' . $types . ', Params: ' . count($params) . ', SQL placeholders: ' . substr_count($sql, '?') . ')');
                }

                if (!$stmt->execute()) {
                    throw new Exception('Failed to create event: ' . $stmt->error);
                }

                $eventId = $conn->insert_id;

                echo json_encode([
                    'success' => true,
                    'eventId' => $eventId,
                    'uploadedFiles' => $uploadedImages,
                    'paths' => [
                        'upload_dir' => WEB_UPLOAD_PATH,
                        'upload_mini_dir' => WEB_UPLOAD_MINI_PATH
                    ]
                ]);
                
            } catch (Exception $e) {
                error_log("Error in createEvent: " . $e->getMessage());
                if (!empty($uploadedImages)) {
                    foreach ($uploadedImages as $fileName) {
                        @unlink(UPLOAD_DIR . '/' . $fileName);
                        @unlink(UPLOAD_MINI_DIR . '/' . $fileName);
                    }
                }
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
            break;

        case 'updateEvent':
            try {
                // Get event ID
                if (!isset($_POST['eventId'])) {
                    throw new Exception('Event ID is required for update');
                }
                $eventId = intval($_POST['eventId']);
                
                // First, fetch the existing event to get the current images
                $existingEvent = [];
                $existingStmt = $conn->prepare("SELECT setupImages FROM events WHERE id = ?");
                $existingStmt->bind_param('i', $eventId);
                
                if (!$existingStmt->execute()) {
                    throw new Exception('Failed to fetch existing event: ' . $existingStmt->error);
                }
                
                $existingResult = $existingStmt->get_result();
                if ($existingRow = $existingResult->fetch_assoc()) {
                    $existingEvent = $existingRow;
                } else {
                    throw new Exception('Event not found with ID: ' . $eventId);
                }
                
                // Parse existing images
                $existingImages = [];
                if (!empty($existingEvent['setupImages'])) {
                    try {
                        $existingImages = json_decode($existingEvent['setupImages'], true);
                        if (!is_array($existingImages)) {
                            $existingImages = [];
                        }
                    } catch (Exception $e) {
                        debug_log("Error parsing existing images", $e->getMessage());
                        $existingImages = [];
                    }
                }
                
                // Handle retained existing images
                $retainedImages = [];
                if (isset($_POST['existingImages'])) {
                    try {
                        $retainedImages = json_decode($_POST['existingImages'], true);
                        if (!is_array($retainedImages)) {
                            $retainedImages = [];
                        }
                    } catch (Exception $e) {
                        debug_log("Error parsing retained images", $e->getMessage());
                        $retainedImages = [];
                    }
                }
                
                // Добавим отладочное логирование входящих данных
                debug_log("Updating event data:", [
                    'eventId' => $eventId,
                    'existingImages' => $existingImages,
                    'retainedImages' => $retainedImages,
                    'tablesNeeded' => $_POST['tablesNeeded'],
                    'chairsNeeded' => $_POST['chairsNeeded']
                ]);

                // Process newly uploaded images
                $uploadedImages = [];
                if (isset($_FILES['setupImages'])) {
                    // Проверяем/создаем директории
                    foreach ([UPLOAD_DIR, UPLOAD_MINI_DIR] as $dir) {
                        if (!file_exists($dir)) {
                            if (!mkdir($dir, 0777, true)) {
                                throw new Exception("Failed to create directory: $dir");
                            }
                            chmod($dir, 0777);
                        }
                    }

                    foreach ($_FILES['setupImages']['tmp_name'] as $key => $tmpName) {
                        if ($_FILES['setupImages']['error'][$key] === UPLOAD_ERR_OK) {
                            $fileName = uniqid() . '_' . $_FILES['setupImages']['name'][$key];
                            $uploadPath = UPLOAD_DIR . '/' . $fileName;
                            $miniPath = UPLOAD_MINI_DIR . '/' . $fileName;

                            if (move_uploaded_file($tmpName, $uploadPath)) {
                                $uploadedImages[] = $fileName;
                                
                                if (!createThumbnail($uploadPath, $miniPath, 150)) {
                                    error_log("Failed to create thumbnail for: " . $uploadPath);
                                }

                                chmod($uploadPath, 0644);
                                if (file_exists($miniPath)) {
                                    chmod($miniPath, 0644);
                                }
                            }
                        }
                    }
                }
                
                // Combine retained and new images
                $finalImages = array_merge($retainedImages, $uploadedImages);

                // Явно обрабатываем значения yes/no
                $tablesNeeded = strtolower(trim($_POST['tablesNeeded'])) === 'yes' ? 'yes' : 'no';
                $chairsNeeded = strtolower(trim($_POST['chairsNeeded'])) === 'yes' ? 'yes' : 'no';
                $tables6ft = strtolower(trim($_POST['tables6ft'])) === 'yes' ? 'yes' : 'no';
                $tables8ft = strtolower(trim($_POST['tables8ft'])) === 'yes' ? 'yes' : 'no';
                $tablesRound = strtolower(trim($_POST['tablesRound'])) === 'yes' ? 'yes' : 'no';

                // Обрабатываем числовые значения
                $tables6ftCount = $tables6ft === 'yes' ? max(0, intval($_POST['tables6ftCount'])) : 0;
                $tables8ftCount = $tables8ft === 'yes' ? max(0, intval($_POST['tables8ftCount'])) : 0;
                $tablesRoundCount = $tablesRound === 'yes' ? max(0, intval($_POST['tablesRoundCount'])) : 0;
                $chairsCount = $chairsNeeded === 'yes' ? max(0, intval($_POST['chairs_count'])) : 0;

                // Update the event
                $sql = "UPDATE events SET 
                    name = ?, 
                    startDate = ?, 
                    startTime = ?, 
                    setupDate = ?, 
                    setupTime = ?, 
                    endDate = ?, 
                    endTime = ?, 
                    location = ?, 
                    contact = ?, 
                    email = ?, 
                    phone = ?, 
                    alcuinContact = ?, 
                    attendees = ?,
                    podium = ?, 
                    monitors = ?, 
                    laptop = ?, 
                    ipad = ?, 
                    microphones = ?,
                    speaker = ?, 
                    avAssistance = ?, 
                    security = ?, 
                    buildingAccess = ?, 
                    otherConsiderations = ?,
                    setupImages = ?,
                    tables6ft = ?, 
                    tables8ft = ?, 
                    tablesRound = ?,
                    tables6ftCount = ?, 
                    tables8ftCount = ?, 
                    tablesRoundCount = ?,
                    tablecloth_color = ?, 
                    chairs_count = ?, 
                    chairs_needed = ?, 
                    tables_needed = ?
                WHERE id = ?";

                $params = [
                    $_POST['eventName'],
                    $_POST['eventStartDate'],
                    $_POST['eventStartTime'],
                    $_POST['setupDate'],
                    $_POST['setupTime'],
                    $_POST['endDate'],
                    $_POST['endTime'],
                    $_POST['eventLocation'],
                    $_POST['eventContact'],
                    $_POST['eventEmail'],
                    $_POST['eventPhone'],
                    $_POST['alcuinContact'],
                    $_POST['attendees'],
                    $_POST['podiumNeeded'],
                    $_POST['monitorsNeeded'],
                    $_POST['laptopNeeded'],
                    $_POST['ipadNeeded'],
                    $_POST['microphonesNeeded'],
                    $_POST['speakerNeeded'],
                    $_POST['avAssistance'],
                    $_POST['securityNeeded'],
                    $_POST['buildingAccess'],
                    $_POST['otherConsiderations'],
                    !empty($finalImages) ? json_encode($finalImages) : null,
                    $tables6ft,
                    $tables8ft,
                    $tablesRound,
                    $tables6ftCount,
                    $tables8ftCount,
                    $tablesRoundCount,
                    $_POST['tableclothColor'],
                    $chairsCount,
                    $chairsNeeded,
                    $tablesNeeded,
                    $eventId // WHERE clause parameter
                ];

                $types = str_repeat('s', 24) . 'sssiiisissi'; // 35 parameters

                $stmt = $conn->prepare($sql);
                if (!$stmt) {
                    throw new Exception('Failed to prepare statement: ' . $conn->error);
                }

                if (!$stmt->bind_param($types, ...$params)) {
                    throw new Exception('Failed to bind parameters: ' . $stmt->error . ' (Types: ' . $types . ', Params: ' . count($params) . ')');
                }

                if (!$stmt->execute()) {
                    throw new Exception('Failed to update event: ' . $stmt->error);
                }

                // Delete images that are no longer used
                foreach ($existingImages as $oldImage) {
                    if (!in_array($oldImage, $retainedImages)) {
                        $fullPath = UPLOAD_DIR . '/' . $oldImage;
                        $miniPath = UPLOAD_MINI_DIR . '/' . $oldImage;
                        
                        if (file_exists($fullPath)) {
                            unlink($fullPath);
                        }
                        
                        if (file_exists($miniPath)) {
                            unlink($miniPath);
                        }
                    }
                }

                echo json_encode([
                    'success' => true,
                    'eventId' => $eventId,
                    'uploadedFiles' => $uploadedImages,
                    'retainedFiles' => $retainedImages,
                    'paths' => [
                        'upload_dir' => WEB_UPLOAD_PATH,
                        'upload_mini_dir' => WEB_UPLOAD_MINI_PATH
                    ]
                ]);
                
            } catch (Exception $e) {
                error_log("Error in updateEvent: " . $e->getMessage());
                if (!empty($uploadedImages)) {
                    foreach ($uploadedImages as $fileName) {
                        $fullPath = UPLOAD_DIR . '/' . $fileName;
                        $miniPath = UPLOAD_MINI_DIR . '/' . $fileName;
                        
                        if (file_exists($fullPath)) {
                            unlink($fullPath);
                        }
                        
                        if (file_exists($miniPath)) {
                            unlink($miniPath);
                        }
                    }
                }
                
                echo json_encode([
                    'success' => false,
                    'message' => $e->getMessage()
                ]);
            }
            break;

        default:
            throw new Exception('Invalid action: ' . $action);
    }

    // В случае удаления события, комментарии будут удалены автоматически благодаря ON DELETE CASCADE

} catch (Exception $e) {
    debug_log("Error occurred", [
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);

    // Очищаем буфер и отправляем ошибку
    ob_end_clean();
    
    // Убеждаемся, что заголовки корректны
    header('Content-Type: application/json');
    header('HTTP/1.1 500 Internal Server Error');
    
    // Возвращаем ошибку как JSON
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
    exit;
}

// Закрываем соединение с БД
if (isset($conn)) {
    $conn->close();
}

// Завершаем буферизацию
ob_end_flush();
?> 