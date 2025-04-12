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
error_log("Project API: Database connection established.");

// Allow requests from specified origin
header("Access-Control-Allow-Origin: *"); // Replace * with your frontend domain in production
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight requests (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
error_log("Project API: Received {$method} request");

// Basic routing based on the request method
switch ($method) {
    case 'GET':
        error_log("Project API: Processing GET request");
        handleGetProjects($pdo);
        break;
    case 'POST':
        error_log("Project API: Processing POST request");
        // Логируем содержимое запроса
        $rawInput = file_get_contents('php://input');
        error_log("Project API: Received data: " . $rawInput);
        handlePostProject($pdo);
        break;
    case 'PUT':
        error_log("Project API: Processing PUT request");
        handlePutProject($pdo);
        break;
    case 'DELETE':
        error_log("Project API: Processing DELETE request");
        handleDeleteProject($pdo);
        break;
    default:
        http_response_code(405); // Method Not Allowed
        echo json_encode(["message" => "Method not allowed"]);
        break;
}

function handleGetProjects($pdo) {
    // Check for ID in the query string for fetching a specific project
    $id = isset($_GET['id']) ? filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) : null;

    try {
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM construction_projects WHERE id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $project = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($project) {
                echo json_encode($project);
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Project not found"]);
            }
        } else {
            // Проверяем, существует ли таблица
            try {
                $stmt = $pdo->query("SHOW TABLES LIKE 'construction_projects'");
                $tableExists = $stmt->rowCount() > 0;
                
                if (!$tableExists) {
                    // Таблица не существует, создаем ее
                    error_log("Project API: Table 'construction_projects' does not exist, creating...");
                    
                    $createTableSQL = "
                    CREATE TABLE IF NOT EXISTS `construction_projects` (
                      `id` int(11) NOT NULL AUTO_INCREMENT,
                      `project_name` varchar(255) NOT NULL,
                      `description` text,
                      `start_date` date NOT NULL,
                      `end_date` date DEFAULT NULL,
                      `status` varchar(50) NOT NULL DEFAULT 'planned',
                      `manager_id` int(11) DEFAULT NULL,
                      `budget` decimal(15,2) DEFAULT NULL,
                      `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                      PRIMARY KEY (`id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
                    ";
                    
                    $pdo->exec($createTableSQL);
                    echo json_encode([]);
                    return;
                }
                
                // Таблица существует, получаем проекты
                $stmt = $pdo->query("SELECT * FROM construction_projects ORDER BY start_date DESC");
                $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);
                echo json_encode($projects);
            } catch (PDOException $e) {
                error_log("Project API: Error checking table: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(["message" => "Database error: " . $e->getMessage()]);
            }
        }
    } catch (PDOException $e) {
        error_log("Project API: Error in handleGetProjects: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}

function handlePostProject($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);

    // Basic validation
    if (empty($data['project_name']) || empty($data['start_date'])) {
        http_response_code(400);
        echo json_encode(["message" => "Missing required fields: project_name and start_date are required."]);
        return;
    }

    $sql = "INSERT INTO construction_projects (project_name, description, start_date, end_date, status, manager_id, budget) VALUES (:project_name, :description, :start_date, :end_date, :status, :manager_id, :budget)";
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':project_name', $data['project_name']);
        $stmt->bindParam(':description', $data['description']);
        $stmt->bindParam(':start_date', $data['start_date']);
        $stmt->bindParam(':end_date', $data['end_date']);
        $stmt->bindParam(':status', $data['status']);
        $stmt->bindParam(':manager_id', $data['manager_id'], PDO::PARAM_INT);
        $stmt->bindParam(':budget', $data['budget']);

        if ($stmt->execute()) {
            $lastId = $pdo->lastInsertId();
            http_response_code(201); // Created
            echo json_encode(["message" => "Project created successfully", "id" => $lastId]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to create project"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}

function handlePutProject($pdo) {
    $id = isset($_GET['id']) ? filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "Project ID is required for update"]);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    // Basic validation (at least one field must be present)
    if (empty($data)) {
        http_response_code(400);
        echo json_encode(["message" => "No data provided for update"]);
        return;
    }

    $fields = [];
    $params = [':id' => $id];
    foreach ($data as $key => $value) {
        // Ensure only valid columns are updated
        if (in_array($key, ['project_name', 'description', 'start_date', 'end_date', 'status', 'manager_id', 'budget'])) {
            $fields[] = "$key = :$key";
            $params[":$key"] = $value;
        }
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(["message" => "No valid fields provided for update"]);
        return;
    }

    $sql = "UPDATE construction_projects SET " . implode(', ', $fields) . " WHERE id = :id";

    try {
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($params)) {
            if ($stmt->rowCount() > 0) {
                echo json_encode(["message" => "Project updated successfully"]);
            } else {
                // Check if the project exists
                $checkStmt = $pdo->prepare("SELECT id FROM construction_projects WHERE id = :id");
                $checkStmt->execute(['id' => $id]);
                if ($checkStmt->rowCount() === 0) {
                    http_response_code(404);
                    echo json_encode(["message" => "Project not found"]);
                } else {
                     echo json_encode(["message" => "No changes detected for the project"]);
                }
            }
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to update project"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}

function handleDeleteProject($pdo) {
    $id = isset($_GET['id']) ? filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "Project ID is required for deletion"]);
        return;
    }

    $sql = "DELETE FROM construction_projects WHERE id = :id";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                echo json_encode(["message" => "Project deleted successfully"]);
            } else {
                http_response_code(404); // Not Found
                echo json_encode(["message" => "Project not found or already deleted"]);
            }
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to delete project"]);
        }
    } catch (PDOException $e) {
        // Check for foreign key constraint violation (simplified check)
        if (strpos($e->getMessage(), 'FOREIGN KEY constraint') !== false) {
             http_response_code(409); // Conflict
             echo json_encode(["message" => "Cannot delete project: It might be referenced by other records (e.g., files, contractors)."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Database error: " . $e->getMessage()]);
        }
    }
}

?> 