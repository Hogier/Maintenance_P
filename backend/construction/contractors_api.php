<?php
// Включаем отладку для разработки
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");

// Проверяем, существуют ли файлы подключения
if (!file_exists('../../includes/db_connect.php')) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Backend configuration error: db_connect.php not found",
        "path" => realpath('../../includes/db_connect.php')
    ]);
    exit;
}

if (!file_exists('../../includes/functions.php')) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Backend configuration error: functions.php not found",
        "path" => realpath('../../includes/functions.php')
    ]);
    exit;
}

// Подключаем файлы
include_once '../../includes/db_connect.php';
include_once '../../includes/functions.php';

// Записываем информацию о подключении в лог для отладки
error_log("Contractors API: Database connection established.");

// Разрешаем CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Обрабатываем preflight-запросы
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
error_log("Contractors API: Received {$method} request");

// Маршрутизация
switch ($method) {
    case 'GET':
        error_log("Contractors API: Processing GET request");
        handleGetContractors($pdo);
        break;
    case 'POST':
        error_log("Contractors API: Processing POST request");
        // Логируем содержимое запроса
        $rawInput = file_get_contents('php://input');
        error_log("Contractors API: Received data: " . $rawInput);
        handleAddContractor($pdo);
        break;
    case 'PUT':
        error_log("Contractors API: Processing PUT request");
        handleUpdateContractor($pdo);
        break;
    case 'DELETE':
        error_log("Contractors API: Processing DELETE request");
        handleDeleteContractor($pdo);
        break;
    default:
        http_response_code(405); // Method Not Allowed
        echo json_encode(["message" => "Method not allowed"]);
        break;
}

function handleGetContractors($pdo) {
    $id = isset($_GET['id']) ? filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) : null;
    $projectId = isset($_GET['project_id']) ? filter_input(INPUT_GET, 'project_id', FILTER_VALIDATE_INT) : null;

    error_log("Contractors API: GET request received. ID=" . ($id ?? 'null') . ", ProjectID=" . ($projectId ?? 'null'));

    try {
        /*
        // --- ВРЕМЕННО ЗАКОММЕНТИРОВАННЫЙ БЛОК ПРОВЕРКИ ТАБЛИЦЫ ---
        try {
            error_log("Contractors API: Checking if table 'construction_contractors' exists...");
            $stmtCheck = $pdo->query("SHOW TABLES LIKE 'construction_contractors'");
            $tableExists = $stmtCheck->rowCount() > 0;
            error_log("Contractors API: Table check result - tableExists = " . ($tableExists ? 'true' : 'false'));

            if (!$tableExists) {
                error_log("Contractors API: Table 'construction_contractors' reported as not existing. Attempting to create...");
                // ... код создания таблицы ... (оставляем как есть, но логируем, что сюда попали)
                $createTableSQL = "
                CREATE TABLE IF NOT EXISTS `construction_contractors` (
                  `id` int(11) NOT NULL AUTO_INCREMENT,
                  `project_id` int(11) DEFAULT NULL,
                  `company_name` varchar(255) NOT NULL,
                  `contact_person` varchar(255) DEFAULT NULL,
                  `phone` varchar(50) DEFAULT NULL,
                  `email` varchar(255) DEFAULT NULL,
                  `scope_of_work` text,
                  PRIMARY KEY (`id`),
                  KEY `project_id` (`project_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
                ";
                $pdo->exec($createTableSQL);
                error_log("Contractors API: Table creation attempted. Returning empty array as table was initially not found.");
                echo json_encode([]); // Возвращаем пустой массив, как и раньше
                return;
            }
        } catch (PDOException $e) {
            // Ошибка именно на этапе проверки/создания таблицы
            error_log("Contractors API: PDOException during table check/creation: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["message" => "Database error during table check/creation: " . $e->getMessage()]);
            return;
        }
        // --- Конец блока проверки таблицы ---
        error_log("Contractors API: Table check SKIPPED (temporary test). Proceeding to fetch data...");
        */
        
        // Сразу переходим к выборке данных
        error_log("Contractors API: Proceeding directly to fetch data (table check skipped)...");

        if ($id) {
            error_log("Contractors API: Fetching contractor by ID: " . $id);
            $stmt = $pdo->prepare("SELECT * FROM construction_contractors WHERE id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $contractor = $stmt->fetch(PDO::FETCH_ASSOC);
            error_log("Contractors API: Fetch by ID " . $id . " result: " . ($contractor ? 'Found' : 'Not found'));
            if ($contractor) {
                echo json_encode($contractor);
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Contractor not found"]);
            }
        } elseif ($projectId) {
            error_log("Contractors API: Fetching contractors by ProjectID: " . $projectId);
            $stmt = $pdo->prepare("SELECT * FROM construction_contractors WHERE project_id = :project_id ORDER BY company_name");
            $stmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
            $stmt->execute();
            $contractors = $stmt->fetchAll(PDO::FETCH_ASSOC);
            error_log("Contractors API: Fetch by ProjectID " . $projectId . " result: " . count($contractors) . " records found.");
            echo json_encode($contractors);
        } else {
            error_log("Contractors API: Fetching all contractors.");
            // Исправляем потенциальную ошибку: используем prepare + execute для большей унификации и безопасности
            $stmt = $pdo->prepare("SELECT * FROM construction_contractors ORDER BY company_name");
            $stmt->execute();
            $contractors = $stmt->fetchAll(PDO::FETCH_ASSOC);
            error_log("Contractors API: Fetch all contractors result: " . count($contractors) . " records found.");
            echo json_encode($contractors);
        }

    } catch (PDOException $e) {
        // Ошибка на этапе основного запроса SELECT
        error_log("Contractors API: PDOException during data fetching (after table check): " . $e->getMessage() . " | ID=" . ($id ?? 'null') . ", ProjectID=" . ($projectId ?? 'null'));
        http_response_code(500);
        // Не показываем детали ошибки PDO пользователю напрямую в продакшене
        echo json_encode(["message" => "Database error retrieving contractor data."]);
    }
}

function handleAddContractor($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['project_id']) || empty($data['company_name'])) {
        http_response_code(400);
        echo json_encode(["message" => "Missing required fields: project_id and company_name are required."]);
        return;
    }

    $sql = "INSERT INTO construction_contractors (project_id, company_name, contact_person, contact_person_position, phone, email, business_type, location, rating) VALUES (:project_id, :company_name, :contact_person, :contact_person_position, :phone, :email, :business_type, :location, :rating)";
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':project_id', $data['project_id'], PDO::PARAM_INT);
        $stmt->bindParam(':company_name', $data['company_name']);
        $stmt->bindParam(':contact_person', $data['contact_person']);
        $stmt->bindParam(':contact_person_position', $data['contact_person_position']);
        $stmt->bindParam(':phone', $data['phone']);
        $stmt->bindParam(':email', $data['email']);
        $stmt->bindParam(':business_type', $data['business_type']);
        $stmt->bindParam(':location', $data['location']);
        $stmt->bindParam(':rating', $data['rating'], PDO::PARAM_INT);

        if ($stmt->execute()) {
            $lastId = $pdo->lastInsertId();
            http_response_code(201);
            echo json_encode(["message" => "Contractor added successfully", "id" => $lastId]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to add contractor"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}

function handleUpdateContractor($pdo) {
    $id = isset($_GET['id']) ? filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "Contractor ID is required for update"]);
        error_log("Contractors API Update: Missing ID."); 
        return;
    }

    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    error_log("Contractors API Update [ID:{$id}]: Received raw data: " . $rawInput); 
    error_log("Contractors API Update [ID:{$id}]: Decoded data: " . json_encode($data)); 

    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(["message" => "Invalid JSON provided for update"]);
        error_log("Contractors API Update: Invalid JSON for ID=" . $id . ". JSON Error: " . json_last_error_msg()); 
        return;
    }

    if (empty($data)) {
        http_response_code(400);
        echo json_encode(["message" => "No data provided for update"]);
        error_log("Contractors API Update: Empty data for ID=" . $id); 
        return;
    }

    $fields = [];
    $params = [':id' => $id];
    // Убедитесь, что все поля из $data, которые есть в таблице, здесь перечислены
    $allowed_fields = [
        'project_id', 
        'company_name', 
        'contact_person', 
        'contact_person_position', 
        'phone', 
        'email', 
        'business_type', 
        'location', 
        'rating'
    ]; 
    
    error_log("Contractors API Update [ID:{$id}]: Allowed fields: " . json_encode($allowed_fields));

    foreach ($data as $key => $value) {
        error_log("Contractors API Update [ID:{$id}]: Processing key '{$key}' with value: " . json_encode($value)); 
        if (in_array($key, $allowed_fields)) {
            $fields[] = "`$key` = :$key";
            // Приводим нужные поля к int. Обратите внимание: null останется null.
            if ($key === 'project_id' || $key === 'rating') {
                 $params[":$key"] = ($value !== null) ? (int)$value : null;
            } else {
                 $params[":$key"] = $value;
            }
            error_log("Contractors API Update [ID:{$id}]: Added field '{$key}' = " . json_encode($params[":$key"]) . " to update."); 
        } else {
            error_log("Contractors API Update [ID:{$id}]: Skipped field '{$key}' (not in allowed_fields)."); 
        }
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(["message" => "No valid fields provided for update"]);
        error_log("Contractors API Update: No valid fields for ID=" . $id . " in data: " . json_encode($data));
        return;
    }

    $sql = "UPDATE construction_contractors SET " . implode(', ', $fields) . " WHERE id = :id";
    error_log("Contractors API Update [ID:{$id}]: Final SQL: " . $sql); 
    error_log("Contractors API Update [ID:{$id}]: Final Params: " . json_encode($params)); 

    try {
        $stmt = $pdo->prepare($sql);
        
        // Важно: Привязываем параметры через bindParam, чтобы точно контролировать типы
        foreach ($params as $paramKey => &$paramValue) { // Используем & для передачи по ссылке
             $pdoType = PDO::PARAM_STR; // По умолчанию строка
             if ($paramKey === ':id' || $paramKey === ':project_id' || $paramKey === ':rating') {
                 // Проверяем на null перед установкой типа INT
                 if ($paramValue === null) {
                      $pdoType = PDO::PARAM_NULL;
                 } else {
                      $pdoType = PDO::PARAM_INT;
                      $paramValue = (int)$paramValue; // Убедимся, что это число
                 }
             }
             error_log("Contractors API Update [ID:{$id}]: Binding {$paramKey} with type {$pdoType} and value " . json_encode($paramValue));
             $stmt->bindParam($paramKey, $paramValue, $pdoType);
        }
        unset($paramValue); // Разрываем ссылку после цикла

        $executeResult = $stmt->execute(); // Теперь вызываем execute без параметров
        $rowCount = $stmt->rowCount();
        
        error_log("Contractors API Update [ID:{$id}]: Execute result: " . ($executeResult ? 'true' : 'false')); 
        error_log("Contractors API Update [ID:{$id}]: RowCount: " . $rowCount); 

        if ($executeResult) {
            $checkStmt = $pdo->prepare("SELECT id FROM construction_contractors WHERE id = :id");
            $checkStmt->execute([':id' => $id]);
            if ($checkStmt->rowCount() > 0) {
                http_response_code(200);
                if ($rowCount > 0) {
                    echo json_encode(["message" => "Contractor updated successfully"]);
                } else {
                    echo json_encode(["message" => "Contractor data submitted, no changes detected."]); 
                }
            } else {
                 http_response_code(404);
                 echo json_encode(["message" => "Contractor not found after update attempt."]);
                 error_log("Contractors API Update: Contractor not found (ID=" . $id . ") after successful execute.");
            }
        } else {
            http_response_code(500);
            $errorInfo = $stmt->errorInfo();
            error_log("Contractors API Update: Failed to execute statement for ID=" . $id . ". Error: [" . $errorInfo[0] . "] " . $errorInfo[2]);
            echo json_encode(["message" => "Failed to update contractor", "error" => $errorInfo[2]]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        error_log("Contractors API Update: Database error for ID=" . $id . ". Error: " . $e->getMessage());
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}

function handleDeleteContractor($pdo) {
    $id = isset($_GET['id']) ? filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "Contractor ID is required for deletion"]);
        return;
    }

    $sql = "DELETE FROM construction_contractors WHERE id = :id";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                echo json_encode(["message" => "Contractor deleted successfully"]);
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Contractor not found or already deleted"]);
            }
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to delete contractor"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}

?> 