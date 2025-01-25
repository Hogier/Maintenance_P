<?php
// Включаем буферизацию вывода
ob_start();

header('Content-Type: application/json');
date_default_timezone_set('America/Chicago');

// Включаем отображение ошибок для отладки
error_reporting(E_ALL);
ini_set('display_errors', 1); // Временно включим для отладки

// Настраиваем PHP error log
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

// Функция для логирования
function debug_log($message, $data = null) {
    $log = date('Y-m-d H:i:s') . " - " . $message;
    if ($data !== null) {
        $log .= "\n" . print_r($data, true);
    }
    file_put_contents(__DIR__ . '/debug.log', $log . "\n\n", FILE_APPEND);
}

try {
    // Параметры подключения к базе данных
    $host = 'localhost';
    $user = 'root';
    $password = '';
    $database = 'maintenancedb';

    debug_log("Connecting to database");

    // Подключение к базе данных
    $conn = new mysqli($host, $user, $password, $database);
    if ($conn->connect_error) {
        throw new Exception('Connection failed: ' . $conn->connect_error);
    }
    $conn->set_charset('utf8');

    debug_log("Connected successfully");

    // Получение данных из POST-запроса
    $action = $_POST['action'] ?? '';
    debug_log("Action received", $action);

    switch ($action) {
        case 'getEvents':
            try {
                debug_log("Getting events");
                
                // Получение списка событий
                $result = $conn->query("SELECT * FROM events ORDER BY startDate, startTime");
                
                if (!$result) {
                    throw new Exception('Error fetching events: ' . $conn->error);
                }

                $events = [];
                while ($row = $result->fetch_assoc()) {
                    // Декодируем JSON для setupImages
                    if (isset($row['setupImages'])) {
                        $row['setupImages'] = json_decode($row['setupImages'], true) ?? [];
                    }
                    $events[] = $row;
                }

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
                throw new Exception('JSON decode error: ' . json_last_error_msg());
            }

            // Полный SQL запрос
            $sql = "INSERT INTO events (
                name, startDate, startTime, setupDate, setupTime,
                endDate, endTime, location, contact, email,
                phone, alcuinContact, attendees, tables, chairs,
                podium, monitors, laptop, ipad, microphones,
                speaker, avAssistance, security, buildingAccess,
                otherConsiderations, status, createdBy, createdAt,
                setupImages
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Prepare failed: ' . $conn->error);
            }

            $setupImagesJson = json_encode($eventData['setupImages'] ?? []);

            // Привязываем все параметры
            if (!$stmt->bind_param('ssssssssssssisssssssssssssssss',
                $eventData['name'],
                $eventData['startDate'],
                $eventData['startTime'],
                $eventData['setupDate'],
                $eventData['setupTime'],
                $eventData['endDate'],
                $eventData['endTime'],
                $eventData['location'],
                $eventData['contact'],
                $eventData['email'],
                $eventData['phone'],
                $eventData['alcuinContact'],
                $eventData['attendees'],
                $eventData['tables'],
                $eventData['chairs'],
                $eventData['podium'],
                $eventData['monitors'],
                $eventData['laptop'],
                $eventData['ipad'],
                $eventData['microphones'],
                $eventData['speaker'],
                $eventData['avAssistance'],
                $eventData['security'],
                $eventData['buildingAccess'],
                $eventData['otherConsiderations'],
                $eventData['status'],
                $eventData['createdBy'],
                $eventData['createdAt'],
                $setupImagesJson
            )) {
                throw new Exception('Bind failed: ' . $stmt->error);
            }

            if (!$stmt->execute()) {
                throw new Exception('Execute failed: ' . $stmt->error);
            }

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
                throw new Exception('No file uploaded');
            }

            $file = $_FILES['file'];
            if ($file['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('File upload error: ' . $file['error']);
            }

            $fileName = uniqid() . '_' . basename($file['name']);
            $uploadDir = 'uploads/';
            
            if (!file_exists($uploadDir)) {
                if (!mkdir($uploadDir, 0777, true)) {
                    throw new Exception('Failed to create upload directory');
                }
            }

            $uploadPath = $uploadDir . $fileName;

            if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
                throw new Exception('Failed to move uploaded file');
            }

            echo json_encode([
                'success' => true,
                'fileUrl' => $uploadPath
            ]);
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

        default:
            throw new Exception('Invalid action: ' . $action);
    }

} catch (Exception $e) {
    debug_log("Error occurred", [
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);

    // Очищаем буфер и отправляем ошибку
    ob_end_clean();
    http_response_code(500);
    $error = [
        'success' => false,
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ];
    echo json_encode($error);
    exit;
}

if (isset($conn)) {
    $conn->close();
}

// Завершаем буферизацию и отправляем вывод
ob_end_flush();
?> 