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
    $projectId = isset($_GET['project_id']) ? filter_input(INPUT_GET, 'project_id', FILTER_VALIDATE_INT) : null;

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
        } elseif ($projectId) {
            // Fetch employees for a specific project
            $stmt = $pdo->prepare("SELECT ce.*, u.full_name, u.email, u.phone FROM construction_employees ce JOIN users u ON ce.user_id = u.id WHERE ce.project_id = :project_id ORDER BY u.full_name");
            $stmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
            $stmt->execute();
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($employees);
        } else {
            // Fetch all employees assignments (might not be very useful without project context)
            // Consider joining with users table if needed for general listing
            $stmt = $pdo->query("SELECT ce.*, u.full_name FROM construction_employees ce JOIN users u ON ce.user_id = u.id ORDER BY ce.project_id, u.full_name");
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
    if (empty($data['project_id']) || empty($data['user_id']) || empty($data['role'])) {
        http_response_code(400);
        echo json_encode(["message" => "Missing required fields: project_id, user_id, and role are required."]);
        return;
    }

    // Optional: Check if user exists in the users table
    // Optional: Check if project exists in the construction_projects table
    // Optional: Check if this user is already assigned to this project

    $sql = "INSERT INTO construction_employees (project_id, user_id, role, assigned_date) VALUES (:project_id, :user_id, :role, :assigned_date)";
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':project_id', $data['project_id'], PDO::PARAM_INT);
        $stmt->bindParam(':user_id', $data['user_id'], PDO::PARAM_INT);
        $stmt->bindParam(':role', $data['role']);
        // Use current date if not provided
        $assigned_date = isset($data['assigned_date']) ? $data['assigned_date'] : date('Y-m-d');
        $stmt->bindParam(':assigned_date', $assigned_date);


        if ($stmt->execute()) {
            $lastId = $pdo->lastInsertId();
            http_response_code(201);
            echo json_encode(["message" => "Employee assigned successfully", "assignment_id" => $lastId]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to assign employee"]);
        }
    } catch (PDOException $e) {
         // Check for duplicate entry (user already assigned to project)
        if ($e->getCode() == 23000) { // Integrity constraint violation
             http_response_code(409); // Conflict
             echo json_encode(["message" => "This employee is already assigned to this project."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Database error: " . $e->getMessage()]);
        }
    }
}

function handleUpdateEmployee($pdo) {
    // Note: Usually you update the 'role' or 'assignment details'.
    // Updating project_id or user_id might be better handled by delete + add.
    // This implementation focuses on updating the 'role'.

    $id = isset($_GET['id']) ? filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "Assignment ID is required for update"]);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['role'])) { // Only allowing role update here
        http_response_code(400);
        echo json_encode(["message" => "No role provided for update"]);
        return;
    }

    $sql = "UPDATE construction_employees SET role = :role WHERE id = :id";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':role', $data['role']);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                echo json_encode(["message" => "Employee role updated successfully"]);
            } else {
                 $checkStmt = $pdo->prepare("SELECT id FROM construction_employees WHERE id = :id");
                 $checkStmt->execute(['id' => $id]);
                 if ($checkStmt->rowCount() === 0) {
                     http_response_code(404);
                     echo json_encode(["message" => "Employee assignment not found"]);
                 } else {
                    echo json_encode(["message" => "No changes detected for the employee role"]);
                 }
            }
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to update employee role"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}

function handleDeleteEmployee($pdo) {
    // This deletes the assignment of the employee to the project, not the user itself.
    $id = isset($_GET['id']) ? filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "Assignment ID is required for deletion"]);
        return;
    }

    $sql = "DELETE FROM construction_employees WHERE id = :id";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                echo json_encode(["message" => "Employee assignment deleted successfully"]);
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Employee assignment not found or already deleted"]);
            }
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to delete employee assignment"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}

?> 