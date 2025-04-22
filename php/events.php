<?php
// Include necessary headers
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
date_default_timezone_set('America/Chicago');

// Error handling settings
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '/Applications/XAMPP/xamppfiles/logs/php_error.log');

// Function for logging
function debug_log($message, $data = null) {
    $logFile = '/Applications/XAMPP/xamppfiles/logs/php_error.log';
    $log = date('Y-m-d H:i:s') . " - " . $message;
    if ($data !== null) {
        if (is_array($data) || is_object($data)) {
            $log .= "\n" . print_r($data, true);
        } else {
            $log .= "\n" . $data;
        }
    }
    error_log($log . "\n\n", 3, $logFile);
}

try {
    // Database connection parameters
    $host = 'localhost';
    $user = 'root';
    $password = '';
    $database = 'maintenancedb';

    // Connect to database
    $conn = new mysqli($host, $user, $password, $database);
    if ($conn->connect_error) {
        throw new Exception('Database connection failed: ' . $conn->connect_error);
    }
    $conn->set_charset('utf8');
    
    // Check if action is specified
    if (!isset($_POST['action'])) {
        throw new Exception('No action specified');
    }
    
    $action = $_POST['action'];
    debug_log("Processing events action: " . $action, $_POST);
    
    switch ($action) {
        case 'getEvents':
            try {
                // Get user data from the request
                $userId = isset($_POST['userId']) ? $_POST['userId'] : '';
                $userFullName = isset($_POST['userFullName']) ? $_POST['userFullName'] : '';
                
                debug_log("Getting events for user", ['userId' => $userId, 'userFullName' => $userFullName]);
                
                // Get all events
                $stmt = $conn->prepare("SELECT 
                    id, name, startDate, startTime, setupDate, setupTime,
                    endDate, endTime, location, contact, email,
                    phone, alcuinContact, attendees,
                    podium, monitors, laptop, ipad, microphones,
                    speaker, avAssistance, security, buildingAccess, otherConsiderations,
                    status, approved, approvedBy, approvedAt, createdBy, createdAt, setupImages,
                    tables6ft, tables8ft, tablesRound,
                    tables6ftCount, tables8ftCount, tablesRoundCount,
                    tablecloth_color, chairs_count, chairs_needed, tables_needed
                FROM events ORDER BY startDate ASC");

                if (!$stmt->execute()) {
                    throw new Exception('Failed to get events: ' . $stmt->error);
                }

                $result = $stmt->get_result();
                $events = [];
                
                while ($row = $result->fetch_assoc()) {
                    // Get comments for each event
                    $eventId = $row['id'];
                    
                    $commentsQuery = "SELECT id, event_id, author, text, created_at, userPhotoUrl 
                                     FROM event_comments 
                                     WHERE event_id = ? 
                                     ORDER BY created_at ASC";
                                     
                    $commentsStmt = $conn->prepare($commentsQuery);
                    
                    if (!$commentsStmt) {
                        throw new Exception('Failed to prepare comments statement: ' . $conn->error);
                    }

                    $commentsStmt->bind_param('i', $eventId);
                    $commentsStmt->execute();
                    $commentsResult = $commentsStmt->get_result();
                    
                    $comments = [];
                    while ($commentRow = $commentsResult->fetch_assoc()) {
                        $comments[] = [
                            'id' => $commentRow['id'],
                            'author' => $commentRow['author'],
                            'text' => $commentRow['text'],
                            'date' => $commentRow['created_at'],
                            'userPhotoUrl' => $commentRow['userPhotoUrl']
                        ];
                    }
                    
                    $commentsStmt->close();

                    // Add the event with comments to the results
                    $eventData = $row;
                    $eventData['comments'] = $comments;
                    
                    // Handle the case where createdBy is undefined or empty
                    if (empty($eventData['createdBy']) || $eventData['createdBy'] === 'undefined') {
                        $eventData['createdBy'] = $userFullName ? $userFullName : 'Unknown User';
                    }
                    
                    $events[] = $eventData;
                }

                debug_log("Found events", count($events));

                echo json_encode([
                    'success' => true,
                    'events' => $events
                ]);

                $stmt->close();
            } catch (Exception $e) {
                debug_log("Error getting events", [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                echo json_encode([
                    'success' => false,
                    'message' => $e->getMessage()
                ]);
            }
            break;
            
        default:
            // For other actions, direct to the main events_db.php file
            $filePath = $_SERVER['DOCUMENT_ROOT'] . '/Maintenance_P/events_db.php';
            
            if (file_exists($filePath)) {
                // Forward the request to the main events handler
                include($filePath);
            } else {
                throw new Exception('Main events handler not found');
            }
            break;
    }
    
} catch (Exception $e) {
    debug_log("Error in events.php", [
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?> 