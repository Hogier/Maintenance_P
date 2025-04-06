<?php
// API for managing project files
require_once '../db_connection.php';

// Determine action from request
$action = isset($_GET['action']) ? $_GET['action'] : '';
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$projectId = isset($_GET['project_id']) ? (int)$_GET['project_id'] : 0;

// Handle different HTTP methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Get files
        if ($id > 0) {
            // Get specific file
            $result = getFile($id);
        } elseif ($projectId > 0) {
            // Get all project files
            $result = getProjectFiles($projectId);
        } else {
            sendResponse(false, "File ID or project ID not specified", null);
        }
        break;
        
    case 'POST':
        // Upload files
        if ($projectId > 0) {
            $fileData = $_FILES['file'] ?? null;
            $fileCategory = $_POST['category'] ?? 'document';
            
            if ($fileData) {
                $result = uploadProjectFile($projectId, $fileData, $fileCategory);
            } else {
                sendResponse(false, "No file was uploaded", null);
            }
        } else {
            sendResponse(false, "Project ID not specified", null);
        }
        break;
        
    case 'DELETE':
        // Delete file
        if ($id > 0) {
            $result = deleteFile($id);
        } else {
            sendResponse(false, "File ID not specified", null);
        }
        break;
        
    default:
        sendResponse(false, "Method not supported", null);
        break;
}

// Function to get all project files
function getProjectFiles($projectId) {
    global $pdo;
    
    try {
        $query = "SELECT * FROM construction_project_files WHERE project_id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$projectId]);
        
        $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if ($files) {
            sendResponse(true, "Project files retrieved successfully", $files);
        } else {
            sendResponse(true, "No files found for project", []);
        }
    } catch (PDOException $e) {
        sendResponse(false, "Error retrieving project files: " . $e->getMessage(), null);
    }
}

// Function to get specific file
function getFile($id) {
    global $pdo;
    
    try {
        // Get file information
        $query = "SELECT * FROM construction_project_files WHERE id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$id]);
        
        $file = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($file) {
            // Check if file exists
            if (file_exists($file['file_path'])) {
                sendResponse(true, "File retrieved successfully", $file);
            } else {
                sendResponse(false, "File not found on server", null);
            }
        } else {
            sendResponse(false, "File not found with ID: " . $id, null);
        }
    } catch (PDOException $e) {
        sendResponse(false, "Error retrieving file: " . $e->getMessage(), null);
    }
}

// Function to upload project file
function uploadProjectFile($projectId, $fileData, $fileCategory) {
    global $pdo;
    
    // Check if project exists
    try {
        $query = "SELECT id FROM construction_projects WHERE id = :id";
        $stmt = $pdo->prepare($query);
        $stmt->bindParam(':id', $projectId, PDO::PARAM_INT);
        $stmt->execute();
        
        if (!$stmt->fetch()) {
            sendResponse(false, "Project with ID " . $projectId . " not found", null);
            return;
        }
    } catch (PDOException $e) {
        sendResponse(false, "Error checking project: " . $e->getMessage(), null);
        return;
    }
    
    // Process and save file
    try {
        // Directories for saving files
        $uploadDir = '../project_upload/project_files/';
        $miniDir = '../project_upload/project_mini/';
        
        // Create directories if they don't exist
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        if (!file_exists($miniDir)) {
            mkdir($miniDir, 0777, true);
        }
        
        $originalName = $fileData['name'];
        $fileType = pathinfo($originalName, PATHINFO_EXTENSION);
        $mimeType = $fileData['type'];
        
        // Generate unique filename
        $fileName = uniqid('project_' . $projectId . '_') . '.' . $fileType;
        $filePath = $uploadDir . $fileName;
        $miniPath = '';
        
        // Move uploaded file
        if (move_uploaded_file($fileData['tmp_name'], $filePath)) {
            // If it's an image, create thumbnail
            if (strpos($mimeType, 'image/') === 0) {
                $miniName = 'mini_' . $fileName;
                $miniPath = $miniDir . $miniName;
                
                createThumbnail($filePath, $miniPath, 200);
            }
            
            // Save file information to database
            $query = "INSERT INTO construction_project_files 
                      (project_id, file_name, original_name, file_type, file_category, mime_type, file_path, mini_path, upload_date) 
                      VALUES (:project_id, :file_name, :original_name, :file_type, :file_category, :mime_type, :file_path, :mini_path, NOW())";
            
            $stmt = $pdo->prepare($query);
            $stmt->bindParam(':project_id', $projectId, PDO::PARAM_INT);
            $stmt->bindParam(':file_name', $fileName);
            $stmt->bindParam(':original_name', $originalName);
            $stmt->bindParam(':file_type', $fileType);
            $stmt->bindParam(':file_category', $fileCategory);
            $stmt->bindParam(':mime_type', $mimeType);
            $stmt->bindParam(':file_path', $filePath);
            $stmt->bindParam(':mini_path', $miniPath);
            $stmt->execute();
            
            $fileId = $pdo->lastInsertId();
            
            sendResponse(true, "File uploaded successfully", [
                'id' => $fileId,
                'file_name' => $fileName,
                'original_name' => $originalName,
                'file_path' => $filePath,
                'mini_path' => $miniPath,
                'file_category' => $fileCategory
            ]);
        } else {
            sendResponse(false, "Error moving uploaded file", null);
        }
    } catch (Exception $e) {
        sendResponse(false, "Error processing file: " . $e->getMessage(), null);
    }
}

// Function to send JSON response
function sendResponse($success, $message, $data = null) {
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit;
}

// Function to create thumbnail of image
function createThumbnail($source, $destination, $maxWidth) {
    list($width, $height) = getimagesize($source);
    
    $ratio = $maxWidth / $width;
    $newWidth = $maxWidth;
    $newHeight = $height * $ratio;
    
    $thumb = imagecreatetruecolor($newWidth, $newHeight);
    
    switch (mime_content_type($source)) {
        case 'image/jpeg':
            $sourceImage = imagecreatefromjpeg($source);
            break;
        case 'image/png':
            $sourceImage = imagecreatefrompng($source);
            imagealphablending($thumb, false);
            imagesavealpha($thumb, true);
            break;
        case 'image/gif':
            $sourceImage = imagecreatefromgif($source);
            break;
        default:
            return false;
    }
    
    imagecopyresampled($thumb, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
    
    switch (mime_content_type($source)) {
        case 'image/jpeg':
            imagejpeg($thumb, $destination, 80);
            break;
        case 'image/png':
            imagepng($thumb, $destination, 8);
            break;
        case 'image/gif':
            imagegif($thumb, $destination);
            break;
    }
    
    imagedestroy($sourceImage);
    imagedestroy($thumb);
    
    return true;
}

// Function to delete a file
function deleteFile($id) {
    global $pdo;
    
    try {
        // Get file information
        $query = "SELECT * FROM construction_project_files WHERE id = ?";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$id]);
        
        $file = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($file) {
            // Delete file from filesystem
            if (!empty($file['file_path']) && file_exists($file['file_path'])) {
                unlink($file['file_path']);
            }
            
            // Delete thumbnail if exists
            if (!empty($file['mini_path']) && file_exists($file['mini_path'])) {
                unlink($file['mini_path']);
            }
            
            // Delete from database
            $query = "DELETE FROM construction_project_files WHERE id = ?";
            $stmt = $pdo->prepare($query);
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                sendResponse(true, "File deleted successfully", null);
            } else {
                sendResponse(false, "Error deleting file from database", null);
            }
        } else {
            sendResponse(false, "File not found with ID: " . $id, null);
        }
    } catch (PDOException $e) {
        sendResponse(false, "Error deleting file: " . $e->getMessage(), null);
    }
} 