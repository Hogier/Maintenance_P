<?php
// File upload handler for ConstructionManager.js
require_once 'db_connection.php';

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Only POST method is allowed'
    ]);
    exit;
}

// Check if file was uploaded
if (!isset($_FILES['file']) || empty($_FILES['file']['name'])) {
    echo json_encode([
        'success' => false,
        'message' => 'No file was uploaded'
    ]);
    exit;
}

// Get project information and file category
$projectId = isset($_POST['project_id']) ? (int)$_POST['project_id'] : 0;
$fileCategory = isset($_POST['category']) ? $_POST['category'] : 'document';

if ($projectId <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Project ID is not specified or invalid'
    ]);
    exit;
}

// Check if project exists
try {
    $query = "SELECT id FROM construction_projects WHERE id = :id";
    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':id', $projectId, PDO::PARAM_INT);
    $stmt->execute();
    
    if (!$stmt->fetch()) {
        echo json_encode([
            'success' => false,
            'message' => 'Project with ID ' . $projectId . ' not found'
        ]);
        exit;
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error checking project: ' . $e->getMessage()
    ]);
    exit;
}

// Process uploaded file
$fileData = $_FILES['file'];
$uploadDir = 'project_upload/project_files/';
$miniDir = 'project_upload/project_mini/';

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

try {
    // Move uploaded file
    if (move_uploaded_file($fileData['tmp_name'], $filePath)) {
        // If it's an image, create thumbnail
        if (strpos($mimeType, 'image/') === 0) {
            $miniName = 'mini_' . $fileName;
            $miniPath = $miniDir . $miniName;
            
            // Function to create thumbnail
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
        
        // Form full paths for file access
        $fileUrl = getBaseUrl() . $filePath;
        $miniUrl = !empty($miniPath) ? getBaseUrl() . $miniPath : '';
        
        echo json_encode([
            'success' => true,
            'message' => 'File uploaded successfully',
            'data' => [
                'id' => $fileId,
                'file_name' => $fileName,
                'original_name' => $originalName,
                'file_path' => $fileUrl,
                'mini_path' => $miniUrl,
                'file_category' => $fileCategory
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error moving uploaded file'
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error processing file: ' . $e->getMessage()
    ]);
}

// Function to create thumbnail
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

// Function to get base URL
function getBaseUrl() {
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
    $host = $_SERVER['HTTP_HOST'];
    $script = dirname($_SERVER['SCRIPT_NAME']);
    
    return $protocol . $host . $script . '/';
}
?> 