<?php
header("Content-Type: application/json");
include_once '../../includes/db_connect.php';
include_once '../../includes/functions.php';

// Define the upload directory relative to the document root
// IMPORTANT: Ensure this directory exists and is writable by the web server.
// Example assumes script is in /backend/construction/ and uploads are in /uploads/construction_files/
$upload_dir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/construction_files/'; // Adjust path as needed
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0775, true); // Create directory if it doesn't exist
}

// Allow requests from specified origin
header("Access-Control-Allow-Origin: *"); // Replace * with your frontend domain in production
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS"); // Typically don't PUT files directly
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight requests (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];

// Routing
switch ($method) {
    case 'GET':
        handleGetFiles($pdo);
        break;
    case 'POST':
        // File uploads are handled via POST with multipart/form-data
        handleUploadFile($pdo, $upload_dir);
        break;
    case 'DELETE':
        handleDeleteFile($pdo, $upload_dir);
        break;
    default:
        http_response_code(405); // Method Not Allowed
        echo json_encode(["message" => "Method not allowed"]);
        break;
}

function handleGetFiles($pdo) {
    $projectId = isset($_GET['project_id']) ? filter_input(INPUT_GET, 'project_id', FILTER_VALIDATE_INT) : null;
    $fileId = isset($_GET['id']) ? filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) : null;

    if (!$projectId && !$fileId) {
        http_response_code(400);
        echo json_encode(["message" => "Project ID or File ID is required"]);
        return;
    }

    try {
        if ($fileId) {
             $stmt = $pdo->prepare("SELECT * FROM construction_project_files WHERE id = :id");
             $stmt->bindParam(':id', $fileId, PDO::PARAM_INT);
             $stmt->execute();
             $file = $stmt->fetch(PDO::FETCH_ASSOC);
             if ($file) {
                 echo json_encode($file);
             } else {
                 http_response_code(404);
                 echo json_encode(["message" => "File not found"]);
             }
        } elseif ($projectId) {
            $stmt = $pdo->prepare("SELECT id, project_id, file_name, file_type, file_size, upload_date FROM construction_project_files WHERE project_id = :project_id ORDER BY upload_date DESC");
            $stmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
            $stmt->execute();
            $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($files);
        }

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}

function handleUploadFile($pdo, $upload_dir) {
    // Check if project_id is provided (e.g., via POST data alongside the file)
    if (!isset($_POST['project_id'])) {
        http_response_code(400);
        echo json_encode(["message" => "Project ID is required for file upload."]);
        return;
    }
    $projectId = filter_input(INPUT_POST, 'project_id', FILTER_VALIDATE_INT);
    if (!$projectId) {
        http_response_code(400);
        echo json_encode(["message" => "Invalid Project ID."]);
        return;
    }

    // Check if file was uploaded
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        $upload_errors = [
            UPLOAD_ERR_INI_SIZE   => "The uploaded file exceeds the upload_max_filesize directive in php.ini.",
            UPLOAD_ERR_FORM_SIZE  => "The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form.",
            UPLOAD_ERR_PARTIAL    => "The uploaded file was only partially uploaded.",
            UPLOAD_ERR_NO_FILE    => "No file was uploaded.",
            UPLOAD_ERR_NO_TMP_DIR => "Missing a temporary folder.",
            UPLOAD_ERR_CANT_WRITE => "Failed to write file to disk.",
            UPLOAD_ERR_EXTENSION  => "A PHP extension stopped the file upload.",
        ];
        $error_message = isset($upload_errors[$_FILES['file']['error']]) ? $upload_errors[$_FILES['file']['error']] : "Unknown upload error.";
        echo json_encode(["message" => "File upload error: " . $error_message]);
        return;
    }

    $file = $_FILES['file'];
    $fileName = basename($file['name']);
    $fileType = $file['type'];
    $fileSize = $file['size'];
    $fileTmpName = $file['tmp_name'];

    // Sanitize filename (optional but recommended)
    $safeFileName = preg_replace("/[^a-zA-Z0-9._-]/", "_", $fileName);
    // Create a unique filename to avoid overwrites
    $uniqueFileName = uniqid("proj" . $projectId . "_", true) . '_' . $safeFileName;
    $targetPath = $upload_dir . $uniqueFileName;

    // Optional: Add file size and type validation
    $maxFileSize = 50 * 1024 * 1024; // 50 MB
    $allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if ($fileSize > $maxFileSize) {
        http_response_code(400);
        echo json_encode(["message" => "File is too large. Maximum size is " . ($maxFileSize / 1024 / 1024) . " MB."]);
        return;
    }
    if (!in_array($fileType, $allowedTypes)) {
         // Be careful with MIME type checking, it can be spoofed.
         // Consider more robust checks if security is critical.
        http_response_code(400);
        echo json_encode(["message" => "Invalid file type. Allowed types: " . implode(', ', $allowedTypes)]);
        return;
    }

    // Move the uploaded file
    if (move_uploaded_file($fileTmpName, $targetPath)) {
        // File moved successfully, now add record to database
        $sql = "INSERT INTO construction_project_files (project_id, file_name, file_path, file_type, file_size) VALUES (:project_id, :file_name, :file_path, :file_type, :file_size)";
        try {
            $stmt = $pdo->prepare($sql);
            $stmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
            $stmt->bindParam(':file_name', $safeFileName); // Store the original (sanitized) name
            $stmt->bindParam(':file_path', $uniqueFileName); // Store the unique name used on the server
            $stmt->bindParam(':file_type', $fileType);
            $stmt->bindParam(':file_size', $fileSize, PDO::PARAM_INT);

            if ($stmt->execute()) {
                $lastId = $pdo->lastInsertId();
                http_response_code(201);
                echo json_encode(["message" => "File uploaded successfully", "id" => $lastId, "fileName" => $safeFileName, "filePath" => $uniqueFileName]);
            } else {
                // If DB insert fails, try to delete the uploaded file
                unlink($targetPath);
                http_response_code(500);
                echo json_encode(["message" => "Failed to save file record to database"]);
            }
        } catch (PDOException $e) {
            // If DB error occurs, try to delete the uploaded file
            unlink($targetPath);
            http_response_code(500);
            echo json_encode(["message" => "Database error: " . $e->getMessage()]);
        }
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Failed to move uploaded file."]);
    }
}

function handleDeleteFile($pdo, $upload_dir) {
    $id = isset($_GET['id']) ? filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT) : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "File ID is required for deletion"]);
        return;
    }

    try {
        // First, get the file path from the database
        $stmt = $pdo->prepare("SELECT file_path FROM construction_project_files WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $file = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$file) {
            http_response_code(404);
            echo json_encode(["message" => "File record not found in database"]);
            return;
        }

        $filePath = $upload_dir . $file['file_path'];

        // Second, delete the record from the database
        $deleteStmt = $pdo->prepare("DELETE FROM construction_project_files WHERE id = :id");
        $deleteStmt->bindParam(':id', $id, PDO::PARAM_INT);

        if ($deleteStmt->execute()) {
            if ($deleteStmt->rowCount() > 0) {
                // Third, delete the actual file from the server
                if (file_exists($filePath)) {
                    if (unlink($filePath)) {
                        echo json_encode(["message" => "File deleted successfully"]);
                    } else {
                        // Log error: file existed but couldn't be deleted
                        error_log("Could not delete file: " . $filePath);
                        // Inform user, but DB record is already gone
                        echo json_encode(["message" => "File record deleted, but failed to delete physical file."]);
                    }
                } else {
                     // Log warning: file path in DB but file doesn't exist
                     error_log("File not found for deletion, but DB record removed: " . $filePath);
                     echo json_encode(["message" => "File record deleted, but physical file was not found."]);
                }
            } else {
                // This case should ideally be caught by the initial check, but included for robustness
                http_response_code(404);
                echo json_encode(["message" => "File record not found or already deleted"]);
            }
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to delete file record from database"]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Database error: " . $e->getMessage()]);
    }
}

?> 