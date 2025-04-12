<?php
header("Content-Type: application/json");
include_once '../../includes/db_connect.php';
include_once '../../includes/functions.php';

// Allow requests from specified origin
header("Access-Control-Allow-Origin: *"); // Replace * with your frontend domain in production
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight requests (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];

// Routing
switch ($method) {
    case 'GET':
        handleGetEmployees($pdo);
        break;
    case 'POST':
        handleAddEmployee($pdo);
        break;
    case 'PUT':
        handleUpdateEmployee($pdo);
        break;
    case 'DELETE':
        handleDeleteEmployee($pdo);
        break;
    default:
        http_response_code(405); // Method Not Allowed
        echo json_encode(["message" => "Method not allowed"]);
        break;
}

function handleGetEmployees($pdo) {
    $id = isset($_GET['id']) ? filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) : null;
    $contractorId = isset($_GET['contractor_id']) ? filter_input(INPUT_GET, 'contractor_id', FILTER_VALIDATE_INT) : null;

    try {
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM construction_employees WHERE id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $employee = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($employee) {
                echo json_encode($employee);
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Employee not found"]);
            }
        } elseif ($contractorId) {
            // Fetch employees for a specific contractor
            $stmt = $pdo->prepare("SELECT * FROM construction_employees WHERE contractor_id = :contractor_id ORDER BY full_name");
            $stmt->bindParam(':contractor_id', $contractorId, PDO::PARAM_INT);
            $stmt->execute();
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($employees);
        } else {
            // Fetch all employees
            $stmt = $pdo->query("SELECT * FROM construction_employees ORDER BY contractor_id, full_name");
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($employees);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}

function handleAddEmployee($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);

    // Basic validation
    if (empty($data['contractor_id']) || empty($data['full_name']) || empty($data['position'])) {
        http_response_code(400);
        echo json_encode(["message" => "Missing required fields: contractor_id, full_name, and position are required."]);
        return;
    }

    $sql = "INSERT INTO construction_employees (contractor_id, full_name, position, phone) 
            VALUES (:contractor_id, :full_name, :position, :phone)";
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':contractor_id', $data['contractor_id'], PDO::PARAM_INT);
        $stmt->bindParam(':full_name', $data['full_name']);
        $stmt->bindParam(':position', $data['position']);
        $stmt->bindParam(':phone', $data['phone']);

        if ($stmt->execute()) {
            $lastId = $pdo->lastInsertId();
            http_response_code(201);
            echo json_encode([
                "message" => "Employee added successfully", 
                "id" => $lastId,
                "employee" => [
                    "id" => $lastId,
                    "contractor_id" => $data['contractor_id'],
                    "full_name" => $data['full_name'],
                    "position" => $data['position'],
                    "phone" => $data['phone']
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to add employee"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}

function handleUpdateEmployee($pdo) {
    $id = isset($_GET['id']) ? filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "Employee ID is required for update"]);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data)) {
        http_response_code(400);
        echo json_encode(["message" => "No data provided for update"]);
        return;
    }

    $fields = [];
    $params = [':id' => $id];
    
    // Define allowed fields
    $allowed_fields = ['full_name', 'position', 'phone'];
    
    foreach ($data as $key => $value) {
        if (in_array($key, $allowed_fields)) {
            $fields[] = "`$key` = :$key";
            $params[":$key"] = $value;
        }
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(["message" => "No valid fields provided for update"]);
        return;
    }

    $sql = "UPDATE construction_employees SET " . implode(', ', $fields) . " WHERE id = :id";

    try {
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($params);
        $rowCount = $stmt->rowCount();

        if ($result) {
            $checkStmt = $pdo->prepare("SELECT id FROM construction_employees WHERE id = :id");
            $checkStmt->execute([':id' => $id]);
            if ($checkStmt->rowCount() > 0) {
                if ($rowCount > 0) {
                    // Get updated employee data
                    $stmt = $pdo->prepare("SELECT * FROM construction_employees WHERE id = :id");
                    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                    $stmt->execute();
                    $employee = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    echo json_encode([
                        "message" => "Employee updated successfully",
                        "employee" => $employee
                    ]);
                } else {
                    echo json_encode(["message" => "No changes detected"]);
                }
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Employee not found"]);
            }
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to update employee"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}

function handleDeleteEmployee($pdo) {
    $id = isset($_GET['id']) ? filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "Employee ID is required for deletion"]);
        return;
    }

    $sql = "DELETE FROM construction_employees WHERE id = :id";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                echo json_encode(["message" => "Employee deleted successfully"]);
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Employee not found or already deleted"]);
            }
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to delete employee"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}
?>
