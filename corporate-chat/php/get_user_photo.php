<?php
// Set headers for JSON response
header('Content-Type: application/json');

// Database connection
require_once '../../database.php';

// Get the user ID from query parameter
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

if (!$user_id) {
    echo json_encode(['success' => false, 'error' => 'User ID is required']);
    exit;
}

try {
    // Initialize database
    $db = new Database();
    $conn = $db->getConnection();
    
    // Get user photo from database
    $stmt = $conn->prepare("SELECT photo FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        if ($row['photo']) {
            // Get the server document root
            $base_path = $_SERVER['DOCUMENT_ROOT'];
            
            // We'll try various path combinations, with the most likely path first
            $paths_to_check = [
                // The path where the image was actually found
                $base_path . '/Maintenance_P/users/img/' . $row['photo'],
                $base_path . '/Maintenance_P/users/img/mini/' . $row['photo'],
                // Standard paths (previous attempts)
                $base_path . '/Maintenance_P/user/' . $row['photo'],
                $base_path . '/Maintenance_P/user/mini/' . $row['photo'],
                // Lowercase variations
                $base_path . '/maintenance_p/users/img/' . $row['photo'],
                $base_path . '/maintenance_p/user/' . $row['photo'],
            ];
            
            // Store all checked paths for debugging
            $paths_checked = [];
            
            // Check each path
            foreach ($paths_to_check as $path) {
                $paths_checked[] = $path;
                if (file_exists($path)) {
                    // Found the file! Now convert server path to URL
                    if (strpos($path, '/Maintenance_P/users/img/mini/') !== false) {
                        $photo_url = '/Maintenance_P/users/img/mini/' . $row['photo'];
                    } else if (strpos($path, '/Maintenance_P/users/img/') !== false) {
                        $photo_url = '/Maintenance_P/users/img/' . $row['photo'];
                    } else if (strpos($path, '/Maintenance_P/user/mini/') !== false) {
                        $photo_url = '/Maintenance_P/user/mini/' . $row['photo'];
                    } else if (strpos($path, '/Maintenance_P/user/') !== false) {
                        $photo_url = '/Maintenance_P/user/' . $row['photo'];
                    } else if (strpos($path, '/maintenance_p/users/img/') !== false) {
                        $photo_url = '/maintenance_p/users/img/' . $row['photo'];
                    } else {
                        // Use direct path
                        $photo_url = '/maintenance_p/user/' . $row['photo'];
                    }
                    
                    echo json_encode([
                        'success' => true, 
                        'photo_url' => $photo_url, 
                        'debug' => 'Found at: ' . $path,
                        'all_paths_checked' => $paths_checked
                    ]);
                    exit; // Exit after finding the file
                }
            }
            
            // If we get here, no file was found
            echo json_encode([
                'success' => false, 
                'error' => 'Photo file not found on server', 
                'debug_paths' => $paths_checked,
                'document_root' => $base_path,
                'filename' => $row['photo']
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'No photo filename in database']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'User not found']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
?> 