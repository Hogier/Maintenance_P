<?php
// Headers for cross-domain requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Required for file operations
session_start();

// Connect to the database
require_once __DIR__ . "/db_config.php";
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

// Check connection
if ($conn->connect_error) {
    die(json_encode([
        "success" => false,
        "error" => "Connection failed: " . $conn->connect_error
    ]));
}

$conn->set_charset("utf8mb4");

// Check for auth
$user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;

if (!$user_id) {
    echo json_encode([
        "success" => false,
        "error" => "Unauthorized access"
    ]);
    exit;
}

// Define actions
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'upload_file':
        handleFileUpload($conn);
        break;
    case 'get_file':
        getFile($conn);
        break;
    case 'delete_file':
        deleteFile($conn);
        break;
    case 'test_connection':
        testConnection($conn);
        break;
    default:
        echo json_encode([
            "success" => false,
            "error" => "Invalid action"
        ]);
        break;
}

/**
 * Handle file upload process
 */
function handleFileUpload($conn) {
    global $user_id;
    
    // Check if the request contains a file
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $error = isset($_FILES['file']) ? getUploadErrorMessage($_FILES['file']['error']) : "No file uploaded";
        echo json_encode([
            "success" => false,
            "error" => $error
        ]);
        return;
    }
    
    // Validate chat_id and message parameters
    $chat_id = isset($_POST['chat_id']) ? $_POST['chat_id'] : null;
    $message_text = isset($_POST['message']) ? $_POST['message'] : '';
    $chat_type = isset($_POST['chat_type']) ? $_POST['chat_type'] : 'direct';
    
    if (!$chat_id) {
        echo json_encode([
            "success" => false,
            "error" => "Chat ID is required"
        ]);
        return;
    }
    
    // Parse chat_id to handle formats like 'd10' or 'g5'
    // Frontend sends IDs like 'd10' for direct chats and 'g5' for group chats,
    // but database expects numeric IDs
    if ($chat_type === 'direct' && is_string($chat_id) && strlen($chat_id) > 1 && $chat_id[0] === 'd') {
        $chat_id = (int)substr($chat_id, 1);
    } else if ($chat_type === 'group' && is_string($chat_id) && strlen($chat_id) > 1 && $chat_id[0] === 'g') {
        $chat_id = (int)substr($chat_id, 1);
    }
    
    // Log the parsed chat ID for debugging
    error_log("File upload - Parsed chat_id: " . $chat_id . ", chat_type: " . $chat_type);
    
    // Get file info
    $file = $_FILES['file'];
    $fileName = $file['name'];
    $fileType = $file['type'];
    $fileSize = $file['size'];
    $fileTmpPath = $file['tmp_name'];
    $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    
    // Validate file extension and size
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'];
    $maxFileSize = 10 * 1024 * 1024; // 10MB
    
    if (!in_array($fileExtension, $allowedExtensions)) {
        echo json_encode([
            "success" => false,
            "error" => "File type not allowed. Allowed types: " . implode(', ', $allowedExtensions)
        ]);
        return;
    }
    
    if ($fileSize > $maxFileSize) {
        echo json_encode([
            "success" => false,
            "error" => "File size exceeds the limit of 10MB"
        ]);
        return;
    }
    
    // Generate unique file name to prevent overwriting
    $newFileName = uniqid() . '_' . time() . '.' . $fileExtension;
    
    // Determine file destination based on type
    $isImage = in_array($fileExtension, ['jpg', 'jpeg', 'png', 'gif']);
    $isDoc = in_array($fileExtension, ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt']);
    
    if ($isImage) {
        $filePath = "../chat-files/" . $newFileName;
        $thumbnailPath = "../chat-files/mini/" . $newFileName;
    } else if ($isDoc) {
        $filePath = "../chat-files/docs/" . $newFileName;
        $thumbnailPath = null;
    } else {
        $filePath = "../chat-files/" . $newFileName;
        $thumbnailPath = null;
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // First, create the message
        $stmt = $conn->prepare("INSERT INTO chat_messages (direct_chat_id, group_id, sender_id, message, has_file) VALUES (?, ?, ?, ?, 1)");
        
        if ($chat_type === 'direct') {
            $stmt->bind_param("iisi", $chat_id, $null_value, $user_id, $message_text);
        } else {
            $stmt->bind_param("iisi", $null_value, $chat_id, $user_id, $message_text);
        }
        
        $null_value = null;
        $stmt->execute();
        
        $message_id = $conn->insert_id;
        
        if (!$message_id) {
            throw new Exception("Failed to create message record");
        }
        
        // Move the uploaded file to its destination
        if (!move_uploaded_file($fileTmpPath, $filePath)) {
            throw new Exception("Failed to move uploaded file");
        }
        
        // Create thumbnail if it's an image
        if ($isImage) {
            createThumbnail($filePath, $thumbnailPath);
        }
        
        // Now insert the file record
        $stmt = $conn->prepare("INSERT INTO chat_files (message_id, file_name, original_name, file_type, file_size, file_path, thumbnail_path) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("isssiss", $message_id, $newFileName, $fileName, $fileType, $fileSize, $filePath, $thumbnailPath);
        $stmt->execute();
        
        $file_id = $conn->insert_id;
        
        if (!$file_id) {
            throw new Exception("Failed to create file record");
        }
        
        // Commit transaction
        $conn->commit();
        
        // Return success response
        echo json_encode([
            "success" => true,
            "message" => "File uploaded successfully",
            "file" => [
                "id" => $file_id,
                "message_id" => $message_id,
                "file_name" => $newFileName,
                "original_name" => $fileName,
                "file_type" => $fileType,
                "file_size" => $fileSize,
                "file_path" => $filePath,
                "thumbnail_path" => $thumbnailPath,
                "is_image" => $isImage
            ]
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        
        // Clean up any uploaded file
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        
        if ($thumbnailPath && file_exists($thumbnailPath)) {
            unlink($thumbnailPath);
        }
        
        // Log error for debugging
        error_log("File upload error: " . $e->getMessage() . " - Chat ID: " . $chat_id . ", Chat Type: " . $chat_type);
        
        // Return more detailed error information
        echo json_encode([
            "success" => false,
            "error" => $e->getMessage(),
            "debug" => [
                "chat_id" => $chat_id,
                "chat_type" => $chat_type,
                "user_id" => $user_id
            ]
        ]);
    }
}

/**
 * Get file details
 */
function getFile($conn) {
    $file_id = isset($_GET['file_id']) ? (int)$_GET['file_id'] : 0;
    
    if (!$file_id) {
        echo json_encode([
            "success" => false,
            "error" => "File ID is required"
        ]);
        return;
    }
    
    $stmt = $conn->prepare("SELECT * FROM chat_files WHERE id = ?");
    $stmt->bind_param("i", $file_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode([
            "success" => false,
            "error" => "File not found"
        ]);
        return;
    }
    
    $file = $result->fetch_assoc();
    
    echo json_encode([
        "success" => true,
        "file" => $file
    ]);
}

/**
 * Delete a file
 */
function deleteFile($conn) {
    global $user_id;
    
    $file_id = isset($_POST['file_id']) ? (int)$_POST['file_id'] : 0;
    
    if (!$file_id) {
        echo json_encode([
            "success" => false,
            "error" => "File ID is required"
        ]);
        return;
    }
    
    // First, check if the user is allowed to delete this file
    $stmt = $conn->prepare("
        SELECT f.*, m.sender_id 
        FROM chat_files f
        JOIN chat_messages m ON f.message_id = m.id
        WHERE f.id = ?
    ");
    $stmt->bind_param("i", $file_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode([
            "success" => false,
            "error" => "File not found"
        ]);
        return;
    }
    
    $file = $result->fetch_assoc();
    
    // Check if user is the sender of the message
    if ($file['sender_id'] != $user_id) {
        echo json_encode([
            "success" => false,
            "error" => "You don't have permission to delete this file"
        ]);
        return;
    }
    
    // Delete the file from the file system
    if (file_exists($file['file_path'])) {
        unlink($file['file_path']);
    }
    
    if ($file['thumbnail_path'] && file_exists($file['thumbnail_path'])) {
        unlink($file['thumbnail_path']);
    }
    
    // Delete the file record
    $stmt = $conn->prepare("DELETE FROM chat_files WHERE id = ?");
    $stmt->bind_param("i", $file_id);
    $stmt->execute();
    
    echo json_encode([
        "success" => true,
        "message" => "File deleted successfully"
    ]);
}

/**
 * Create thumbnail for image
 */
function createThumbnail($sourcePath, $destPath, $width = 200) {
    list($origWidth, $origHeight, $type) = getimagesize($sourcePath);
    
    $ratio = $origWidth / $origHeight;
    $height = $width / $ratio;
    
    $thumbnail = imagecreatetruecolor($width, $height);
    
    switch ($type) {
        case IMAGETYPE_JPEG:
            $source = imagecreatefromjpeg($sourcePath);
            break;
        case IMAGETYPE_PNG:
            $source = imagecreatefrompng($sourcePath);
            imagealphablending($thumbnail, false);
            imagesavealpha($thumbnail, true);
            break;
        case IMAGETYPE_GIF:
            $source = imagecreatefromgif($sourcePath);
            break;
        default:
            return false;
    }
    
    imagecopyresampled($thumbnail, $source, 0, 0, 0, 0, $width, $height, $origWidth, $origHeight);
    
    switch ($type) {
        case IMAGETYPE_JPEG:
            imagejpeg($thumbnail, $destPath, 90);
            break;
        case IMAGETYPE_PNG:
            imagepng($thumbnail, $destPath, 9);
            break;
        case IMAGETYPE_GIF:
            imagegif($thumbnail, $destPath);
            break;
    }
    
    imagedestroy($source);
    imagedestroy($thumbnail);
    
    return true;
}

/**
 * Get human-readable error message for upload errors
 */
function getUploadErrorMessage($errorCode) {
    switch ($errorCode) {
        case UPLOAD_ERR_INI_SIZE:
            return "The uploaded file exceeds the upload_max_filesize directive in php.ini";
        case UPLOAD_ERR_FORM_SIZE:
            return "The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form";
        case UPLOAD_ERR_PARTIAL:
            return "The uploaded file was only partially uploaded";
        case UPLOAD_ERR_NO_FILE:
            return "No file was uploaded";
        case UPLOAD_ERR_NO_TMP_DIR:
            return "Missing a temporary folder";
        case UPLOAD_ERR_CANT_WRITE:
            return "Failed to write file to disk";
        case UPLOAD_ERR_EXTENSION:
            return "A PHP extension stopped the file upload";
        default:
            return "Unknown upload error";
    }
}

/**
 * Test database connection and structure
 */
function testConnection($conn) {
    global $user_id;
    
    // Get chat ID from request
    $chat_id = isset($_GET['chat_id']) ? $_GET['chat_id'] : null;
    $chat_type = isset($_GET['chat_type']) ? $_GET['chat_type'] : 'direct';
    
    // Parse chat ID if provided
    if ($chat_id) {
        $original_chat_id = $chat_id;
        if ($chat_type === 'direct' && is_string($chat_id) && strlen($chat_id) > 1 && $chat_id[0] === 'd') {
            $chat_id = (int)substr($chat_id, 1);
        } else if ($chat_type === 'group' && is_string($chat_id) && strlen($chat_id) > 1 && $chat_id[0] === 'g') {
            $chat_id = (int)substr($chat_id, 1);
        }
    }
    
    $response = [
        'success' => true,
        'connection' => 'OK',
        'user_id' => $user_id,
        'tables' => [],
        'chat_id' => [
            'original' => $chat_id ? $original_chat_id : null,
            'parsed' => $chat_id
        ]
    ];
    
    // Check for tables
    $tables = ['chat_files', 'chat_messages', 'chat_direct', 'chat_groups'];
    foreach ($tables as $table) {
        $result = $conn->query("SHOW TABLES LIKE '$table'");
        $exists = ($result && $result->num_rows > 0);
        $response['tables'][$table] = [
            'exists' => $exists
        ];
        
        if ($exists) {
            // Get row count
            $countResult = $conn->query("SELECT COUNT(*) as count FROM $table");
            if ($countResult) {
                $row = $countResult->fetch_assoc();
                $response['tables'][$table]['count'] = $row['count'];
            }
            
            // Get structure
            $columnsResult = $conn->query("DESCRIBE $table");
            $columns = [];
            while ($columnsResult && $row = $columnsResult->fetch_assoc()) {
                $columns[] = $row['Field'] . ' (' . $row['Type'] . ')';
            }
            $response['tables'][$table]['columns'] = $columns;
        }
    }
    
    // If chat ID is provided, check if it exists in the database
    if ($chat_id) {
        if ($chat_type === 'direct') {
            $stmt = $conn->prepare("SELECT * FROM chat_direct WHERE id = ?");
            $stmt->bind_param("i", $chat_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $response['chat_found'] = ($result && $result->num_rows > 0);
            
            if ($response['chat_found']) {
                $chatData = $result->fetch_assoc();
                $response['chat_data'] = $chatData;
            }
        } else if ($chat_type === 'group') {
            $stmt = $conn->prepare("SELECT * FROM chat_groups WHERE id = ?");
            $stmt->bind_param("i", $chat_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $response['chat_found'] = ($result && $result->num_rows > 0);
            
            if ($response['chat_found']) {
                $chatData = $result->fetch_assoc();
                $response['chat_data'] = $chatData;
            }
        }
    }
    
    echo json_encode($response);
}

$conn->close(); 