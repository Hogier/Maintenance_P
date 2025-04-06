<?php
// File deletion API endpoint for ConstructionManager
header("Content-Type: application/json");

// Include database connection
require_once($_SERVER['DOCUMENT_ROOT'] . '/Maintenance_P/includes/db-connect.php');

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Only DELETE requests are supported.']);
    exit;
}

// Get file ID from query parameters
$fileId = isset($_GET['file_id']) ? intval($_GET['file_id']) : 0;

if (!$fileId) {
    http_response_code(400);
    echo json_encode(['error' => 'File ID is required']);
    exit;
}

try {
    // Start transaction
    $conn->beginTransaction();

    // First, get the file information to delete physical file
    $stmt = $conn->prepare("SELECT file_path, mini_path FROM construction_project_files WHERE id = ?");
    $stmt->execute([$fileId]);
    $fileInfo = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$fileInfo) {
        throw new Exception("File not found");
    }

    // Delete from database
    $stmt = $conn->prepare("DELETE FROM construction_project_files WHERE id = ?");
    $result = $stmt->execute([$fileId]);

    if (!$result) {
        throw new Exception("Failed to delete file from database");
    }

    // Delete physical files if they exist
    $basePath = $_SERVER['DOCUMENT_ROOT'] . '/Maintenance_P/';
    
    if (!empty($fileInfo['file_path'])) {
        $filePath = $basePath . ltrim($fileInfo['file_path'], '/');
        if (file_exists($filePath)) {
            unlink($filePath);
        }
    }
    
    if (!empty($fileInfo['mini_path'])) {
        $miniPath = $basePath . ltrim($fileInfo['mini_path'], '/');
        if (file_exists($miniPath)) {
            unlink($miniPath);
        }
    }

    // Commit transaction
    $conn->commit();

    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'File deleted successfully',
        'file_id' => $fileId
    ]);

} catch (Exception $e) {
    // Rollback transaction on error
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to delete file',
        'message' => $e->getMessage()
    ]);
} 