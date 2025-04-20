<?php
// Отключение отображения ошибок PHP в выводе
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', '/Applications/XAMPP/xamppfiles/logs/php_error_log');

// Создание файла лога для диагностики
$debug_file = __DIR__ . '/api_debug.log';
file_put_contents($debug_file, "=== Запрос API " . date('Y-m-d H:i:s') . " ===\n", FILE_APPEND);
file_put_contents($debug_file, "Метод: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
file_put_contents($debug_file, "URL: " . $_SERVER['REQUEST_URI'] . "\n", FILE_APPEND);

// Установка заголовков для JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Для preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Инициализация соединения и ответа
$conn = null;
$response = ['success' => false, 'message' => 'Неизвестная ошибка'];

try {
    // Параметры соединения с базой данных
    $servername = "macan.cityhost.com.ua";
    $username = "chff6ee508";
    $password = "73b6bd56cf";
    $dbname = "chff6ee508";
    
    file_put_contents($debug_file, "Попытка соединения с базой данных: $servername, $username, $dbname\n", FILE_APPEND);
    
    // Соединение с базой данных
    $conn = new mysqli($servername, $username, $password, $dbname);
    
    // Проверка соединения
    if ($conn->connect_error) {
        file_put_contents($debug_file, "Ошибка соединения: " . $conn->connect_error . "\n", FILE_APPEND);
        throw new Exception("Ошибка соединения: " . $conn->connect_error);
    }
    
    file_put_contents($debug_file, "Соединение с базой данных успешно\n", FILE_APPEND);
    
    // Проверка существования таблицы
    $tableCheckResult = $conn->query("SHOW TABLES LIKE 'calendar_events'");
    if ($tableCheckResult->num_rows == 0) {
        file_put_contents($debug_file, "Таблица calendar_events не существует, создаем...\n", FILE_APPEND);
        
        // Создание таблицы если она не существует
        $createTableSQL = "CREATE TABLE IF NOT EXISTS calendar_events (
            id INT(11) AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            event_date DATETIME NOT NULL,
            event_type VARCHAR(50) DEFAULT 'reminder',
            color VARCHAR(50),
            is_completed TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )";
        
        if (!$conn->query($createTableSQL)) {
            file_put_contents($debug_file, "Ошибка создания таблицы: " . $conn->error . "\n", FILE_APPEND);
            throw new Exception("Ошибка создания таблицы: " . $conn->error);
        }
        
        file_put_contents($debug_file, "Таблица создана успешно\n", FILE_APPEND);
    } else {
        file_put_contents($debug_file, "Таблица calendar_events существует\n", FILE_APPEND);
    }
    
    // Обработка запроса в зависимости от метода
    $method = $_SERVER['REQUEST_METHOD'];
    file_put_contents($debug_file, "Обработка метода: $method\n", FILE_APPEND);
    
    switch ($method) {
        case 'GET':
            // Получение списка событий
            $start_date = isset($_GET['start_date']) ? $_GET['start_date'] : null;
            $end_date = isset($_GET['end_date']) ? $_GET['end_date'] : null;
            
            $where = "";
            if ($start_date && $end_date) {
                $where = "WHERE DATE(event_date) BETWEEN '$start_date' AND '$end_date'";
            }
            
            $sql = "SELECT * FROM calendar_events $where ORDER BY event_date ASC";
            file_put_contents($debug_file, "SQL запрос GET: $sql\n", FILE_APPEND);
            
            $result = $conn->query($sql);
            
            $events = [];
            if ($result) {
                file_put_contents($debug_file, "Запрос выполнен успешно, найдено записей: " . $result->num_rows . "\n", FILE_APPEND);
                
                while ($row = $result->fetch_assoc()) {
                    $events[] = [
                        'id' => $row['id'],
                        'title' => $row['title'],
                        'description' => isset($row['description']) ? $row['description'] : null,
                        'date' => $row['event_date'],
                        'type' => isset($row['event_type']) ? $row['event_type'] : 'reminder',
                        'color' => isset($row['color']) ? $row['color'] : null,
                        'is_completed' => isset($row['is_completed']) ? (bool)$row['is_completed'] : false
                    ];
                }
                $response = ['success' => true, 'records' => $events];
            } else {
                file_put_contents($debug_file, "Ошибка выполнения запроса: " . $conn->error . "\n", FILE_APPEND);
                throw new Exception("Ошибка при получении событий: " . $conn->error);
            }
            break;
            
        case 'POST':
            // Создание нового события
            $json = file_get_contents('php://input');
            file_put_contents($debug_file, "Полученные данные POST: $json\n", FILE_APPEND);
            
            $data = json_decode($json, true);
            if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
                file_put_contents($debug_file, "Ошибка разбора JSON: " . json_last_error_msg() . "\n", FILE_APPEND);
                $response = ['success' => false, 'message' => 'Ошибка формата данных: ' . json_last_error_msg()];
                break;
            }
            
            file_put_contents($debug_file, "Разобранные данные: " . print_r($data, true) . "\n", FILE_APPEND);
            
            if (!$data || !isset($data['title']) || !isset($data['event_date'])) {
                file_put_contents($debug_file, "Отсутствуют обязательные поля\n", FILE_APPEND);
                $response = ['success' => false, 'message' => 'Требуется название и дата события'];
                break;
            }
            
            // Подготовка и экранирование данных
            $title = $conn->real_escape_string($data['title']);
            $description = isset($data['description']) ? $conn->real_escape_string($data['description']) : '';
            $event_date = $conn->real_escape_string($data['event_date']);
            $event_type = isset($data['event_type']) ? $conn->real_escape_string($data['event_type']) : 'reminder';
            $color = isset($data['color']) ? $conn->real_escape_string($data['color']) : '';
            $is_completed = isset($data['is_completed']) ? ($data['is_completed'] ? 1 : 0) : 0;
            
            // SQL запрос для вставки
            $sql = "INSERT INTO calendar_events (title, description, event_date, event_type, color, user_id, is_completed, related_id, related_type) 
                VALUES ('$title', '$description', '$event_date', '$event_type', '$color', 1, $is_completed, NULL, NULL)";
            
            file_put_contents($debug_file, "SQL запрос INSERT: $sql\n", FILE_APPEND);
            
            // Проверка прав доступа к таблице
            $testSelectSql = "SELECT 1 FROM calendar_events LIMIT 1";
            if (!$conn->query($testSelectSql)) {
                file_put_contents($debug_file, "Ошибка доступа к таблице: " . $conn->error . "\n", FILE_APPEND);
                throw new Exception("Нет доступа к таблице: " . $conn->error);
            }
            
            // Выполнение запроса на вставку
            if ($conn->query($sql)) {
                $id = $conn->insert_id;
                file_put_contents($debug_file, "Событие создано успешно с ID: $id\n", FILE_APPEND);
                
                // Проверка, действительно ли запись была создана
                $verifySql = "SELECT * FROM calendar_events WHERE id = $id";
                $verifyResult = $conn->query($verifySql);
                
                if ($verifyResult && $verifyResult->num_rows > 0) {
                    file_put_contents($debug_file, "Подтверждено - запись найдена в базе\n", FILE_APPEND);
                    $response = ['success' => true, 'id' => $id, 'message' => 'Событие создано успешно'];
                } else {
                    file_put_contents($debug_file, "ОШИБКА: Запись не найдена после вставки! Запрос: $verifySql\n", FILE_APPEND);
                    $response = ['success' => false, 'message' => 'Ошибка проверки созданной записи'];
                }
            } else {
                file_put_contents($debug_file, "Ошибка INSERT: " . $conn->error . "\n", FILE_APPEND);
                throw new Exception("Ошибка при создании события: " . $conn->error);
            }
            break;
            
        case 'PUT':
            // Обновление события
            $json = file_get_contents('php://input');
            file_put_contents($debug_file, "Полученные данные PUT: $json\n", FILE_APPEND);
            
            $data = json_decode($json, true);
            if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
                file_put_contents($debug_file, "Ошибка разбора JSON: " . json_last_error_msg() . "\n", FILE_APPEND);
                $response = ['success' => false, 'message' => 'Ошибка формата данных: ' . json_last_error_msg()];
                break;
            }
            
            if (!$data || !isset($data['id'])) {
                file_put_contents($debug_file, "Отсутствует ID события\n", FILE_APPEND);
                $response = ['success' => false, 'message' => 'Требуется ID события'];
                break;
            }
            
            $id = $conn->real_escape_string($data['id']);
            $updates = [];
            
            if (isset($data['title'])) {
                $updates[] = "title = '" . $conn->real_escape_string($data['title']) . "'";
            }
            if (isset($data['description'])) {
                $updates[] = "description = '" . $conn->real_escape_string($data['description']) . "'";
            }
            if (isset($data['event_date'])) {
                $updates[] = "event_date = '" . $conn->real_escape_string($data['event_date']) . "'";
            }
            if (isset($data['event_type'])) {
                $updates[] = "event_type = '" . $conn->real_escape_string($data['event_type']) . "'";
            }
            if (isset($data['color'])) {
                $updates[] = "color = '" . $conn->real_escape_string($data['color']) . "'";
            }
            if (isset($data['is_completed'])) {
                $updates[] = "is_completed = " . ($data['is_completed'] ? 1 : 0);
            }
            
            if (empty($updates)) {
                file_put_contents($debug_file, "Нет данных для обновления\n", FILE_APPEND);
                $response = ['success' => false, 'message' => 'Нет данных для обновления'];
                break;
            }
            
            $update_str = implode(', ', $updates);
            $sql = "UPDATE calendar_events SET $update_str WHERE id = $id";
            
            file_put_contents($debug_file, "SQL запрос UPDATE: $sql\n", FILE_APPEND);
            
            if ($conn->query($sql)) {
                file_put_contents($debug_file, "Событие обновлено успешно\n", FILE_APPEND);
                $response = ['success' => true, 'message' => 'Событие обновлено успешно'];
            } else {
                file_put_contents($debug_file, "Ошибка UPDATE: " . $conn->error . "\n", FILE_APPEND);
                throw new Exception("Ошибка при обновлении события: " . $conn->error);
            }
            break;
            
        case 'DELETE':
            // Удаление события
            $json = file_get_contents('php://input');
            file_put_contents($debug_file, "Полученные данные DELETE: $json\n", FILE_APPEND);
            
            $data = json_decode($json, true);
            if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
                file_put_contents($debug_file, "Ошибка разбора JSON: " . json_last_error_msg() . "\n", FILE_APPEND);
                $response = ['success' => false, 'message' => 'Ошибка формата данных: ' . json_last_error_msg()];
                break;
            }
            
            if (!$data || !isset($data['id'])) {
                file_put_contents($debug_file, "Отсутствует ID события\n", FILE_APPEND);
                $response = ['success' => false, 'message' => 'Требуется ID события'];
                break;
            }
            
            $id = $conn->real_escape_string($data['id']);
            $sql = "DELETE FROM calendar_events WHERE id = $id";
            
            file_put_contents($debug_file, "SQL запрос DELETE: $sql\n", FILE_APPEND);
            
            if ($conn->query($sql)) {
                file_put_contents($debug_file, "Событие удалено успешно\n", FILE_APPEND);
                $response = ['success' => true, 'message' => 'Событие удалено успешно'];
            } else {
                file_put_contents($debug_file, "Ошибка DELETE: " . $conn->error . "\n", FILE_APPEND);
                throw new Exception("Ошибка при удалении события: " . $conn->error);
            }
            break;
            
        default:
            file_put_contents($debug_file, "Неподдерживаемый метод: $method\n", FILE_APPEND);
            $response = ['success' => false, 'message' => 'Неподдерживаемый метод запроса'];
            break;
    }
    
} catch (Exception $e) {
    // Логирование ошибки
    $errorMessage = $e->getMessage();
    file_put_contents($debug_file, "ОШИБКА: $errorMessage\n", FILE_APPEND);
    file_put_contents($debug_file, "Трассировка: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    error_log("Calendar API Error: " . $errorMessage);
    $response = ['success' => false, 'message' => 'Произошла ошибка: ' . $errorMessage];
} finally {
    // Возвращаем JSON ответ
    file_put_contents($debug_file, "Ответ: " . json_encode($response) . "\n", FILE_APPEND);
    echo json_encode($response);
    
    // Закрываем соединение с базой данных
    if ($conn) {
        $conn->close();
        file_put_contents($debug_file, "Соединение с базой данных закрыто\n", FILE_APPEND);
    }
    
    file_put_contents($debug_file, "=== Конец запроса ===\n\n", FILE_APPEND);
}
?> 