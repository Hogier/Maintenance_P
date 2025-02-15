<?php
// Включаем буферизацию вывода
ob_start();

header('Content-Type: application/json');
date_default_timezone_set('America/Chicago');

// Настройка обработки ошибок
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Изменяем путь к лог-файлу на директорию с гарантированными правами
ini_set('error_log', '/Applications/XAMPP/xamppfiles/logs/php_error.log');

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
    $password = '';     // Пустой пароль (стандартно для XAMPP)
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

    // SQL для создания таблицы событий
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
        tables TEXT NULL,
        chairs TEXT NULL,
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

        // Обновляем существующие записи
        $updateStmt = $conn->prepare("UPDATE events SET tables_needed = CASE WHEN tables != 'no' AND tables IS NOT NULL THEN 'yes' ELSE 'no' END, chairs_needed = CASE WHEN chairs != 'no' AND chairs IS NOT NULL THEN 'yes' ELSE 'no' END");
        if (!$updateStmt->execute()) {
            throw new Exception('Failed to update event records: ' . $updateStmt->error);
        }
        $updateStmt->close();

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
                
                // Получаем все события
                $stmt = $conn->prepare("SELECT * FROM events ORDER BY startDate ASC");
                if (!$stmt->execute()) {
                    throw new Exception('Failed to get events: ' . $stmt->error);
                }

                $result = $stmt->get_result();
                $events = [];
                while ($row = $result->fetch_assoc()) {
                    // Получаем комментарии для каждого события
                    $commentStmt = $conn->prepare("SELECT * FROM event_comments WHERE event_id = ? ORDER BY created_at ASC");
                    $commentStmt->bind_param('i', $row['id']);
                    $commentStmt->execute();
                    $commentResult = $commentStmt->get_result();
                    
                    $comments = [];
                    while ($commentRow = $commentResult->fetch_assoc()) {
                        $comments[] = [
                            'id' => $commentRow['id'],
                            'author' => $commentRow['author'],
                            'text' => $commentRow['text'],
                            'date' => $commentRow['created_at']
                        ];
                    }
                    $commentStmt->close();

                    // Добавляем событие вместе с его комментариями
                    $events[] = array_merge($row, ['comments' => $comments]);
                }

                $stmt->close();

                debug_log("Found events", count($events));

                // Очищаем буфер перед отправкой ответа
                ob_end_clean();
                
                echo json_encode([
                    'success' => true,
                    'events' => $events
                ]);
                exit;
                
            } catch (Exception $e) {
                debug_log("Error in getEvents", [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                
                // Очищаем буфер и отправляем ошибку
                ob_end_clean();
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error in getEvents: ' . $e->getMessage()
                ]);
                exit;
            }
            break;

        case 'addEvent':
            if (!isset($_POST['eventData'])) {
                throw new Exception('No event data provided');
            }

            $eventData = json_decode($_POST['eventData'], true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid JSON data: ' . json_last_error_msg());
            }

            // Преобразуем строки дат в объекты DateTime для правильной обработки
            $startDate = new DateTime($eventData['startDate']);
            $setupDate = !empty($eventData['setupDate']) ? new DateTime($eventData['setupDate']) : null;
            $endDate = !empty($eventData['endDate']) ? new DateTime($eventData['endDate']) : null;

            // Преобразуем формат даты createdAt из ISO в MySQL datetime
            $createdAtISO = $eventData['createdAt'];
            $createdAt = date('Y-m-d H:i:s', strtotime($createdAtISO));
            $eventData['createdAt'] = $createdAt;

            debug_log("Parsed event data", $eventData);

            // Декодируем данные о столах из JSON
            $tablesData = json_decode($eventData['tables'], true);
            
            // Подготавливаем данные
            error_log("tables_needed before: " . print_r($eventData['tables_needed'], true));
            error_log("chairs_needed before: " . print_r($eventData['chairs_needed'], true));
            
            $tablesNeeded = isset($eventData['tables_needed']) ? $eventData['tables_needed'] : 'no';
            $table6ft = isset($tablesData['6ft']) ? intval($tablesData['6ft']) : 0;
            $table8ft = isset($tablesData['8ft']) ? intval($tablesData['8ft']) : 0;
            $tableRound = isset($tablesData['round']) ? intval($tablesData['round']) : 0;
            $tableclothColor = isset($tablesData['tablecloth']) ? $tablesData['tablecloth'] : null;
            
            // Подготавливаем данные для стульев
            $chairsNeeded = isset($eventData['chairsNeeded']) ? $eventData['chairsNeeded'] : 'no';
            $chairs_count = isset($eventData['chairs_count']) ? intval($eventData['chairs_count']) : 0;

            // Подготавливаем данные для столов
            $tables6ft = isset($eventData['tables6ft']) ? $eventData['tables6ft'] : 'no';
            $tables8ft = isset($eventData['tables8ft']) ? $eventData['tables8ft'] : 'no';
            $tablesRound = isset($eventData['tablesRound']) ? $eventData['tablesRound'] : 'no';
            $tables6ftCount = isset($eventData['tables6ftCount']) ? intval($eventData['tables6ftCount']) : 0;
            $tables8ftCount = isset($eventData['tables8ftCount']) ? intval($eventData['tables8ftCount']) : 0;
            $tablesRoundCount = isset($eventData['tablesRoundCount']) ? intval($eventData['tablesRoundCount']) : 0;

            error_log("tables_needed after: " . print_r($eventData['tables_needed'], true));
            error_log("chairs_needed after: " . print_r($chairsNeeded, true));

            $stmt = $conn->prepare("INSERT INTO events (
                name, startDate, startTime, setupDate, setupTime, 
                endDate, endTime, location, contact, email, 
                phone, alcuinContact, attendees, tables, chairs, 
                podium, monitors, laptop, ipad, microphones, 
                speaker, avAssistance, security, buildingAccess, otherConsiderations, 
                status, createdBy, createdAt, setupImages, tables6ft, 
                tables8ft, tablesRound, tables6ftCount, tables8ftCount, tablesRoundCount, 
                tablecloth_color, chairs_count, chairs_needed, tables_needed
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                ?, ?, ?, ?, ?, ?, ?, ?, ?
            )");

            if (!$stmt) {
                throw new Exception('Failed to prepare statement: ' . $conn->error);
            }

            // Создаем временные переменные для всех параметров
            $name = $eventData['name'];
            $startDateStr = $startDate->format('Y-m-d');
            $startTimeStr = $eventData['startTime'];
            $setupDateStr = $setupDate ? $setupDate->format('Y-m-d') : null;
            $setupTimeStr = $eventData['setupTime'] ?? null;
            $endDateStr = $endDate ? $endDate->format('Y-m-d') : null;
            $endTimeStr = $eventData['endTime'] ?? null;
            $locationStr = $eventData['location'];
            $contactStr = $eventData['contact'];
            $emailStr = $eventData['email'];
            $phoneStr = $eventData['phone'];
            $alcuinContactStr = $eventData['alcuinContact'];
            $attendeesStr = $eventData['attendees'];
            $tablesStr = $eventData['tables'];
            $chairsStr = $eventData['chairs'];
            $podiumStr = $eventData['podium'];
            $monitorsStr = $eventData['monitors'];
            $laptopStr = $eventData['laptop'];
            $ipadStr = $eventData['ipad'];
            $microphonesStr = $eventData['microphones'];
            $speakerStr = $eventData['speaker'];
            $avAssistanceStr = $eventData['avAssistance'];
            $securityStr = $eventData['security'];
            $buildingAccessStr = $eventData['buildingAccess'];
            $otherConsiderationsStr = $eventData['otherConsiderations'];
            $statusStr = 'pending';
            $createdByStr = $eventData['createdBy'];
            $createdAtStr = $eventData['createdAt'];
            $setupImagesStr = $eventData['setupImages'];
            $tables6ftStr = $tables6ft;
            $tables8ftStr = $tables8ft;
            $tablesRoundStr = $tablesRound;
            $tables6ftCountInt = intval($tables6ftCount);
            $tables8ftCountInt = intval($tables8ftCount);
            $tablesRoundCountInt = intval($tablesRoundCount);
            $tableclothColorStr = $tablecloth_color;
            $chairsCountInt = intval($chairs_count);
            $chairsNeededStr = $chairsNeeded;
            $tablesNeededStr = $tablesNeeded;

            if (!$stmt->bind_param('ssssssssssssssssssssssssssssssssiiiisss',
                $name, $startDateStr, $startTimeStr, $setupDateStr, $setupTimeStr,
                $endDateStr, $endTimeStr, $locationStr, $contactStr, $emailStr,
                $phoneStr, $alcuinContactStr, $attendeesStr, $tablesStr, $chairsStr,
                $podiumStr, $monitorsStr, $laptopStr, $ipadStr, $microphonesStr,
                $speakerStr, $avAssistanceStr, $securityStr, $buildingAccessStr, $otherConsiderationsStr,
                $statusStr, $createdByStr, $createdAtStr, $setupImagesStr, $tables6ftStr,
                $tables8ftStr, $tablesRoundStr, $tables6ftCountInt, $tables8ftCountInt, $tablesRoundCountInt,
                $tableclothColorStr, $chairsCountInt, $chairsNeededStr, $tablesNeededStr
            )) {
                throw new Exception('Failed to bind parameters: ' . $stmt->error);
            }

            if (!$stmt->execute()) {
                throw new Exception('Execute failed: ' . $stmt->error);
            }

            debug_log("Event created successfully");

            $response = [
                'success' => true,
                'message' => 'Event created successfully',
                'eventId' => $conn->insert_id
            ];

            $stmt->close();
            
            // Очищаем буфер и отправляем ответ
            ob_end_clean();
            echo json_encode($response);
            exit;

        case 'uploadFile':
            if (!isset($_FILES['file'])) {
                echo json_encode(['success' => false, 'message' => 'No file uploaded']);
                exit;
            }

            $file = $_FILES['file'];
            if ($file['error'] !== UPLOAD_ERR_OK) {
                echo json_encode(['success' => false, 'message' => 'File upload error: ' . $file['error']]);
                exit;
            }

            // Создаем директорию для загрузок, если её нет
            $uploadDir = 'uploads/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            // Генерируем уникальное имя файла
            $fileName = uniqid() . '_' . basename($file['name']);
            $uploadPath = $uploadDir . $fileName;

            // Перемещаем загруженный файл
            if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
                echo json_encode([
                    'success' => true,
                    'fileUrl' => $uploadPath
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to move uploaded file'
                ]);
            }
            exit;

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

            // Подготавливаем и выполняем запрос для добавления комментария
            $stmt = $conn->prepare("INSERT INTO event_comments (event_id, author, text, created_at) VALUES (?, ?, ?, ?)");
            if (!$stmt) {
                throw new Exception('Failed to prepare comment statement: ' . $conn->error);
            }

            // Преобразуем дату в формат MySQL
            $date = date('Y-m-d H:i:s', strtotime($commentData['date']));

            if (!$stmt->bind_param('isss', 
                $commentData['eventId'],
                $commentData['author'],
                $commentData['text'],
                $date
            )) {
                throw new Exception('Failed to bind comment parameters: ' . $stmt->error);
            }

            if (!$stmt->execute()) {
                throw new Exception('Failed to add comment: ' . $stmt->error);
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
                    'date' => $row['created_at']
                ];
            }

            $stmt->close();

            echo json_encode([
                'success' => true,
                'comments' => $comments
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

        case 'createEvent':
            try {
                // Логируем входящие данные
                debug_log("Creating event - received data:", $_POST);

                if (!isset($_POST['eventData'])) {
                    throw new Exception('No event data provided');
                }

                $eventData = json_decode($_POST['eventData'], true);
                
                // Проверяем успешность декодирования JSON
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new Exception('Invalid JSON data: ' . json_last_error_msg());
                }

                // Логируем декодированные данные
                debug_log("Decoded event data:", $eventData);

                // Преобразуем строки дат в объекты DateTime для правильной обработки
                $startDate = new DateTime($eventData['startDate']);
                $setupDate = !empty($eventData['setupDate']) ? new DateTime($eventData['setupDate']) : null;
                $endDate = !empty($eventData['endDate']) ? new DateTime($eventData['endDate']) : null;

                // Преобразуем формат даты createdAt из ISO в MySQL datetime
                $createdAtISO = $eventData['createdAt'];
                $createdAt = date('Y-m-d H:i:s', strtotime($createdAtISO));
                $eventData['createdAt'] = $createdAt;

                // Декодируем данные о столах из JSON
                $tablesData = json_decode($eventData['tables'], true);
                
                // Подготавливаем данные
                error_log("tables_needed before: " . print_r($eventData['tables_needed'], true));
                error_log("chairs_needed before: " . print_r($eventData['chairs_needed'], true));
                
                $tablesNeeded = isset($eventData['tables_needed']) ? $eventData['tables_needed'] : 'no';
                $table6ft = isset($tablesData['6ft']) ? intval($tablesData['6ft']) : 0;
                $table8ft = isset($tablesData['8ft']) ? intval($tablesData['8ft']) : 0;
                $tableRound = isset($tablesData['round']) ? intval($tablesData['round']) : 0;
                $tableclothColor = isset($tablesData['tablecloth']) ? $tablesData['tablecloth'] : null;
                
                // Подготавливаем данные для стульев
                $chairsNeeded = isset($eventData['chairsNeeded']) ? $eventData['chairsNeeded'] : 'no';
                $chairs_count = isset($eventData['chairs_count']) ? intval($eventData['chairs_count']) : 0;

                // Подготавливаем данные для столов
                $tables6ft = isset($eventData['tables6ft']) ? $eventData['tables6ft'] : 'no';
                $tables8ft = isset($eventData['tables8ft']) ? $eventData['tables8ft'] : 'no';
                $tablesRound = isset($eventData['tablesRound']) ? $eventData['tablesRound'] : 'no';
                $tables6ftCount = isset($eventData['tables6ftCount']) ? intval($eventData['tables6ftCount']) : 0;
                $tables8ftCount = isset($eventData['tables8ftCount']) ? intval($eventData['tables8ftCount']) : 0;
                $tablesRoundCount = isset($eventData['tablesRoundCount']) ? intval($eventData['tablesRoundCount']) : 0;

                error_log("tables_needed after: " . print_r($eventData['tables_needed'], true));
                error_log("chairs_needed after: " . print_r($chairsNeeded, true));

                $stmt = $conn->prepare("INSERT INTO events (
                    name, startDate, startTime, setupDate, setupTime, 
                    endDate, endTime, location, contact, email, 
                    phone, alcuinContact, attendees, tables, chairs, 
                    podium, monitors, laptop, ipad, microphones, 
                    speaker, avAssistance, security, buildingAccess, otherConsiderations, 
                    status, createdBy, createdAt, setupImages, tables6ft, 
                    tables8ft, tablesRound, tables6ftCount, tables8ftCount, tablesRoundCount, 
                    tablecloth_color, chairs_count, chairs_needed, tables_needed
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                    ?, ?, ?, ?, ?, ?, ?, ?, ?
                )");

                if (!$stmt) {
                    throw new Exception('Failed to prepare statement: ' . $conn->error);
                }

                // Создаем временные переменные для setupTime и endTime
                $setupTimeTemp = $eventData['setupTime'] ?? null;
                $endTimeTemp = $eventData['endTime'] ?? null;

                // Создаем переменные для привязки параметров
                $name = $eventData['name'];
                $startDateFormatted = $startDate->format('Y-m-d');
                $startTime = $eventData['startTime'];
                $setupDateFormatted = $setupDate ? $setupDate->format('Y-m-d') : null;
                $setupTime = $setupTimeTemp;
                $endDateFormatted = $endDate ? $endDate->format('Y-m-d') : null;
                $endTime = $endTimeTemp;
                $location = $eventData['location'];
                $contact = $eventData['contact'];
                $email = $eventData['email'];
                $phone = $eventData['phone'];
                $alcuinContact = $eventData['alcuinContact'];
                $attendeesVal = $eventData['attendees'];
                $tablesVal = $eventData['tables'];
                $chairsVal = $eventData['chairs'];
                $podium = $eventData['podium'];
                $monitors = $eventData['monitors'];
                $laptop = $eventData['laptop'];
                $ipad = $eventData['ipad'];
                $microphones = $eventData['microphones'];
                $speaker = $eventData['speaker'];
                $avAssistance = $eventData['avAssistance'];
                $security = $eventData['security'];
                $buildingAccess = $eventData['buildingAccess'];
                $otherConsiderations = $eventData['otherConsiderations'];
                $statusVal = 'pending';
                $createdBy = $eventData['createdBy'];
                $createdAt = $eventData['createdAt'];
                $setupImages = $eventData['setupImages'];
                $tables6ftVal = $tables6ft;
                $tables8ftVal = $tables8ft;
                $tablesRoundVal = $tablesRound;
                $tables6ftCountVal = intval($tables6ftCount);
                $tables8ftCountVal = intval($tables8ftCount);
                $tablesRoundCountVal = intval($tablesRoundCount);
                $tableclothColorVal = $tablecloth_color;
                $chairsCountVal = intval($chairs_count);
                $chairsNeededVal = $chairsNeeded;
                $tablesNeededVal = $tablesNeeded;

                if (!$stmt->bind_param('ssssssssssssssssssssssssssssssssiiiisss',
                    $name, $startDateFormatted, $startTime, $setupDateFormatted, $setupTime,
                    $endDateFormatted, $endTime, $location, $contact, $email,
                    $phone, $alcuinContact, $attendeesVal, $tablesVal, $chairsVal,
                    $podium, $monitors, $laptop, $ipad, $microphones,
                    $speaker, $avAssistance, $security, $buildingAccess, $otherConsiderations,
                    $statusVal, $createdBy, $createdAt, $setupImages, $tables6ftVal,
                    $tables8ftVal, $tablesRoundVal, $tables6ftCountVal, $tables8ftCountVal, $tablesRoundCountVal,
                    $tableclothColorVal, $chairsCountVal, $chairsNeededVal, $tablesNeededVal
                )) {
                    throw new Exception('Failed to bind parameters: ' . $stmt->error);
                }

                if (!$stmt->execute()) {
                    throw new Exception('Execute failed: ' . $stmt->error);
                }

                debug_log("Event created successfully");

                $response = [
                    'success' => true,
                    'message' => 'Event created successfully',
                    'eventId' => $conn->insert_id
                ];

                $stmt->close();
                
                // Очищаем буфер и отправляем ответ
                ob_end_clean();
                echo json_encode($response);
                exit;

            } catch (Exception $e) {
                debug_log("Error in createEvent:", [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                
                // Отправляем детальный ответ об ошибке
                echo json_encode([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'debug' => [
                        'error_type' => get_class($e),
                        'file' => $e->getFile(),
                        'line' => $e->getLine()
                    ]
                ]);
                exit;
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
    http_response_code(500);
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