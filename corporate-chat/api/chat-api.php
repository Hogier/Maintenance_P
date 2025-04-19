<?php
// Отключаем любой вывод ошибок - вместо этого будем их логировать
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Устанавливаем заголовок JSON
header('Content-Type: application/json');

// Функция для логирования
function debug_log($message) {
    // Записываем в error_log вместо файла, чтобы избежать проблем с разрешениями
    error_log("CHAT_API: " . $message);
}

debug_log("API Request: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);
debug_log("GET params: " . print_r($_GET, true));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $post_data = file_get_contents('php://input');
    debug_log("POST data: " . $post_data);
}

// Создаем прямое подключение к БД через PDO
try {
    // Подключаемся к базе данных напрямую через PDO
    $host = 'localhost';
    $dbname = 'maintenancedb';
    $username = 'root';
    $password = '';
    $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    debug_log("Database connection established directly via PDO");
} catch(PDOException $e) {
    debug_log("Database connection failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    debug_log("Starting session");
    session_start();
    debug_log("Session started, session_id: " . session_id());
}

// Лог текущей сессии для отладки
debug_log("Current session data: " . json_encode($_SESSION));

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    debug_log("User not logged in. Session data: " . json_encode($_SESSION));
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized. Please log in.']);
    exit;
}

debug_log("User logged in with ID: " . $_SESSION['user_id']);

// Check user role
try {
    $userId = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT role FROM users WHERE id = :user_id");
    $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $stmt->execute();
    $userRole = $stmt->fetchColumn();
    
    // Verify the user has one of the allowed roles
    $allowedRoles = ['admin', 'support', 'user'];
    if (!in_array($userRole, $allowedRoles)) {
        http_response_code(403);
        echo json_encode(['error' => 'Access denied. Insufficient permissions.']);
        exit;
    }
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error verifying user role: ' . $e->getMessage()]);
    exit;
}

// Get the request method and action
$request_method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? strtolower(trim($_GET['action'])) : '';

// Нормализуем варианты action, убедимся что работаем с нижним регистром и без подчеркиваний
$action = strtolower($action);
$action_normalized = str_replace('_', '', $action);

// Добавляем детальное логирование
debug_log("Raw action param: '" . $action . "'");
debug_log("Normalized action param: '" . $action_normalized . "'");
debug_log("REQUEST_URI: " . $_SERVER['REQUEST_URI']);
debug_log("GET params: " . json_encode($_GET));

debug_log("Processing action: " . $action);

// Routes - используем нормализованные варианты имен для большей устойчивости
switch ($action) {
    case 'get_users':
    case 'getusers':
        getUsers();
        break;
    case 'get_direct_chats':
    case 'getdirectchats':
        getDirectChats();
        break;
    case 'get_group_chats':
    case 'getgroupchats':
        getGroupChats();
        break;
    case 'get_messages':
    case 'getmessages':
        getMessages();
        break;
    case 'send_message':
    case 'sendmessage':
        sendMessage();
        break;
    case 'create_group':
    case 'creategroup':
        createGroup();
        break;
    case 'add_users_to_group':
    case 'adduserstogroup':
        addUsersToGroup();
        break;
    case 'remove_user_from_group':
    case 'removeuserfromgroup':
        removeUserFromGroup();
        break;
    case 'delete_user':
    case 'deleteuser':
        deleteUser();
        break;
    default:
        http_response_code(404);
        debug_log("Invalid action: '" . $action . "'");
        echo json_encode(['success' => false, 'error' => 'Invalid action: ' . $action]);
        exit;
}

/**
 * Get list of all users
 */
function getUsers() {
    global $conn;
    $currentUserId = $_SESSION['user_id'];
    
    try {
        // Get all active users except current user
        $sql = "SELECT id, full_name, email, role, department FROM users WHERE id != :current_user_id";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':current_user_id', $currentUserId, PDO::PARAM_INT);
        $stmt->execute();
        
        $users = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $users[] = [
                'id' => $row['id'],
                'name' => $row['full_name'],
                'email' => $row['email'],
                'role' => $row['role'],
                'department' => $row['department'],
                'avatar' => './assets/user-avatar.png', // Default avatar
                'status' => 'online'
            ];
        }
        
        echo json_encode(['success' => true, 'users' => $users]);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        exit;
    }
}

/**
 * Get direct chats for current user
 */
function getDirectChats() {
    global $conn;
    $current_user_id = $_SESSION['user_id'];
    
    debug_log("getDirectChats for user ID: " . $current_user_id);
    
    try {
        // Check if chat_direct table exists
        $checkTableStmt = $conn->prepare("SHOW TABLES LIKE 'chat_direct'");
        $checkTableStmt->execute();
        
        if ($checkTableStmt->rowCount() == 0) {
            debug_log("chat_direct table doesn't exist, creating it");
            // Table doesn't exist yet, create it
            try {
                $conn->exec("
                    CREATE TABLE IF NOT EXISTS `chat_direct` (
                        `id` INT(11) NOT NULL AUTO_INCREMENT,
                        `user1_id` INT(11) NOT NULL,
                        `user2_id` INT(11) NOT NULL,
                        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (`id`),
                        UNIQUE KEY `unique_participants` (`user1_id`, `user2_id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");
                
                debug_log("chat_direct table created successfully");
                
                // Also create messages table if it doesn't exist
                $conn->exec("
                    CREATE TABLE IF NOT EXISTS `chat_messages` (
                        `id` INT(11) NOT NULL AUTO_INCREMENT,
                        `direct_chat_id` INT(11) DEFAULT NULL,
                        `group_id` INT(11) DEFAULT NULL,
                        `sender_id` INT(11) NOT NULL,
                        `message` TEXT NOT NULL,
                        `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        `is_read` TINYINT(1) NOT NULL DEFAULT '0',
                        PRIMARY KEY (`id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");
                
                debug_log("chat_messages table created successfully");
            } catch (PDOException $e) {
                debug_log("Error creating tables: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Could not create chat tables: ' . $e->getMessage()]);
                exit;
            }
        }
        
        debug_log("Preparing SQL query for direct chats");
        
        // Get all direct chats where the current user is a participant
        $sql = "
            SELECT cd.*, 
                   u.full_name as user_name,
                   u.department as user_department,
                   (SELECT message FROM chat_messages 
                    WHERE (direct_chat_id = cd.id) 
                    ORDER BY sent_at DESC LIMIT 1) as lastMessage,
                   (SELECT sent_at FROM chat_messages 
                    WHERE (direct_chat_id = cd.id) 
                    ORDER BY sent_at DESC LIMIT 1) as timestamp,
                   (SELECT COUNT(*) FROM chat_messages 
                    WHERE direct_chat_id = cd.id 
                    AND sender_id != :current_user_id1 
                    AND is_read = 0) as unread
            FROM chat_direct cd
            LEFT JOIN users u ON (cd.user1_id = :current_user_id2 AND u.id = cd.user2_id) 
                              OR (cd.user2_id = :current_user_id3 AND u.id = cd.user1_id)
            WHERE cd.user1_id = :current_user_id4 OR cd.user2_id = :current_user_id5
        ";
        
        debug_log("SQL Query: " . $sql);
        
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':current_user_id1', $current_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':current_user_id2', $current_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':current_user_id3', $current_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':current_user_id4', $current_user_id, PDO::PARAM_INT);
        $stmt->bindParam(':current_user_id5', $current_user_id, PDO::PARAM_INT);
        
        debug_log("Executing SQL query");
        $stmt->execute();
        
        $chats = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Determine the other user
            $userId = ($row['user1_id'] == $current_user_id) ? $row['user2_id'] : $row['user1_id'];
            
            $chats[] = [
                'id' => 'd' . $row['id'],
                'userId' => $userId,
                'userName' => $row['user_name'] ?? 'Unknown User',
                'userDepartment' => $row['user_department'] ?? '',
                'lastMessage' => $row['lastMessage'] ?? 'No messages yet',
                'timestamp' => $row['timestamp'] ?? $row['created_at'],
                'unread' => intval($row['unread'] ?? 0)
            ];
        }
        
        debug_log("Found " . count($chats) . " direct chats");
        
        echo json_encode(['success' => true, 'directChats' => $chats]);
        exit;
    } catch (PDOException $e) {
        debug_log("Error in getDirectChats: " . $e->getMessage());
        debug_log("Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        exit;
    }
}

/**
 * Get group chats for current user
 */
function getGroupChats() {
    global $conn;
    $current_user_id = $_SESSION['user_id'];
    
    try {
        // Check if chat_groups table exists
        $checkTableStmt = $conn->prepare("SHOW TABLES LIKE 'chat_groups'");
        $checkTableStmt->execute();
        
        if ($checkTableStmt->rowCount() == 0) {
            // Table doesn't exist yet, create it
            try {
                $conn->exec("
                    CREATE TABLE IF NOT EXISTS `chat_groups` (
                        `id` INT(11) NOT NULL AUTO_INCREMENT,
                        `name` VARCHAR(255) NOT NULL,
                        `created_by` INT(11) NOT NULL,
                        `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (`id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");
                
                // Create group members table if it doesn't exist
                $conn->exec("
                    CREATE TABLE IF NOT EXISTS `chat_group_members` (
                        `id` INT(11) NOT NULL AUTO_INCREMENT,
                        `group_id` INT(11) NOT NULL,
                        `user_id` INT(11) NOT NULL,
                        `is_admin` TINYINT(1) NOT NULL DEFAULT '0',
                        `joined_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (`id`),
                        UNIQUE KEY `unique_group_member` (`group_id`, `user_id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");
                
                // Ensure chat_messages table exists
                $conn->exec("
                    CREATE TABLE IF NOT EXISTS `chat_messages` (
                        `id` INT(11) NOT NULL AUTO_INCREMENT,
                        `direct_chat_id` INT(11) DEFAULT NULL,
                        `group_id` INT(11) DEFAULT NULL,
                        `sender_id` INT(11) NOT NULL,
                        `message` TEXT NOT NULL,
                        `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        `is_read` TINYINT(1) NOT NULL DEFAULT '0',
                        PRIMARY KEY (`id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Could not create chat tables: ' . $e->getMessage()]);
                return;
            }
        }
        
        // Get all group chats where the current user is a member
        $stmt = $conn->prepare("
            SELECT cg.*, 
                   (SELECT COUNT(*) FROM chat_group_members WHERE group_id = cg.id) as member_count,
                   (SELECT message FROM chat_messages 
                    WHERE group_id = cg.id 
                    ORDER BY sent_at DESC LIMIT 1) as lastMessage,
                   (SELECT sent_at FROM chat_messages 
                    WHERE group_id = cg.id 
                    ORDER BY sent_at DESC LIMIT 1) as timestamp,
                   (SELECT COUNT(*) FROM chat_messages 
                    WHERE group_id = cg.id 
                    AND sender_id != :current_user_id 
                    AND is_read = 0) as unread
            FROM chat_groups cg
            INNER JOIN chat_group_members cgm ON cg.id = cgm.group_id
            WHERE cgm.user_id = :current_user_id
        ");
        $stmt->bindParam(':current_user_id', $current_user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $groups = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Get group members
            $memberStmt = $conn->prepare("
                SELECT u.id 
                FROM chat_group_members cgm
                JOIN users u ON cgm.user_id = u.id
                WHERE cgm.group_id = :group_id
            ");
            $memberStmt->bindParam(':group_id', $row['id'], PDO::PARAM_INT);
            $memberStmt->execute();
            
            $members = [];
            while ($member = $memberStmt->fetch(PDO::FETCH_ASSOC)) {
                $members[] = $member['id'];
            }
            
            $groups[] = [
                'id' => 'g' . $row['id'],
                'name' => $row['name'],
                'members' => $members,
                'lastMessage' => $row['lastMessage'] ?? 'No messages yet',
                'timestamp' => $row['timestamp'] ?? $row['created_at'],
                'unread' => intval($row['unread'] ?? 0)
            ];
        }
        
        echo json_encode(['success' => true, 'groupChats' => $groups]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

/**
 * Get messages for a specific chat
 */
function getMessages() {
    global $conn;
    $current_user_id = $_SESSION['user_id'];
    
    // Get chat ID from request
    $chat_id = isset($_GET['chat_id']) ? $_GET['chat_id'] : null;
    
    if (!$chat_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Chat ID is required']);
        exit;
    }
    
    try {
        $messages = [];
        
        // Determine if this is a direct chat or group chat
        $chat_type = $chat_id[0];
        $chat_db_id = intval(substr($chat_id, 1));
        
        if ($chat_type === 'd') {
            // Direct chat messages
            // First verify that the user is a participant in this chat
            $stmt = $conn->prepare("
                SELECT * FROM chat_direct 
                WHERE id = :chat_id AND (user1_id = :user_id OR user2_id = :user_id)
            ");
            $stmt->bindParam(':chat_id', $chat_db_id, PDO::PARAM_INT);
            $stmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
            $stmt->execute();
            
            if ($stmt->rowCount() === 0) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'You are not a participant in this chat']);
                exit;
            }
            
            // Get messages
            $msgStmt = $conn->prepare("
                SELECT cm.*, u.full_name as sender_name
                FROM chat_messages cm
                JOIN users u ON cm.sender_id = u.id
                WHERE cm.direct_chat_id = :chat_id
                ORDER BY cm.sent_at ASC
            ");
            $msgStmt->bindParam(':chat_id', $chat_db_id, PDO::PARAM_INT);
            $msgStmt->execute();
            
            // Update unread status for messages
            $updateStmt = $conn->prepare("
                UPDATE chat_messages
                SET is_read = 1
                WHERE direct_chat_id = :chat_id AND sender_id != :user_id
            ");
            $updateStmt->bindParam(':chat_id', $chat_db_id, PDO::PARAM_INT);
            $updateStmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
            $updateStmt->execute();
            
        } else if ($chat_type === 'g') {
            // Group chat messages
            // First verify that the user is a member of this group
            $stmt = $conn->prepare("
                SELECT * FROM chat_group_members 
                WHERE group_id = :group_id AND user_id = :user_id
            ");
            $stmt->bindParam(':group_id', $chat_db_id, PDO::PARAM_INT);
            $stmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
            $stmt->execute();
            
            if ($stmt->rowCount() === 0) {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'You are not a member of this group']);
                exit;
            }
            
            // Get messages
            $msgStmt = $conn->prepare("
                SELECT cm.*, u.full_name as sender_name
                FROM chat_messages cm
                JOIN users u ON cm.sender_id = u.id
                WHERE cm.group_id = :group_id
                ORDER BY cm.sent_at ASC
            ");
            $msgStmt->bindParam(':group_id', $chat_db_id, PDO::PARAM_INT);
            $msgStmt->execute();
            
            // Update unread status for messages
            $updateStmt = $conn->prepare("
                UPDATE chat_messages
                SET is_read = 1
                WHERE group_id = :group_id AND sender_id != :user_id
            ");
            $updateStmt->bindParam(':group_id', $chat_db_id, PDO::PARAM_INT);
            $updateStmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
            $updateStmt->execute();
            
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid chat ID format']);
            exit;
        }
        
        // Process messages
        while ($row = $msgStmt->fetch(PDO::FETCH_ASSOC)) {
            $messages[] = [
                'id' => $row['id'],
                'sender' => $row['sender_id'],
                'sender_name' => $row['sender_name'],
                'text' => $row['message'],
                'timestamp' => $row['sent_at']
            ];
        }
        
        echo json_encode(['success' => true, 'messages' => $messages]);
        exit;
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        exit;
    }
}

/**
 * Send a message to a chat
 */
function sendMessage() {
    global $conn;
    $current_user_id = $_SESSION['user_id'];
    
    debug_log("sendMessage called by user: " . $current_user_id);
    
    // Check if request is POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        debug_log("Method not allowed: " . $_SERVER['REQUEST_METHOD']);
        echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
        exit;
    }
    
    // Get request body
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    if (!isset($data['chat_id']) || !isset($data['message'])) {
        http_response_code(400);
        debug_log("Missing required fields");
        echo json_encode(['success' => false, 'error' => 'Chat ID and message are required']);
        exit;
    }
    
    $chat_id = $data['chat_id'];
    $message_text = $data['message'];
    
    debug_log("Sending message to chat: " . $chat_id . ", message: " . $message_text);
    
    try {
        // Determine if this is a direct chat or group chat
        if (strpos($chat_id, 'dnew_') === 0) {
            // This is a new direct chat
            debug_log("New direct chat detected: " . $chat_id);
            $recipient_id = intval(substr($chat_id, 5));
            
            debug_log("Creating new direct chat with recipient: " . $recipient_id);
            
            // Verify recipient exists
            $userStmt = $conn->prepare("SELECT id FROM users WHERE id = :user_id");
            $userStmt->bindParam(':user_id', $recipient_id, PDO::PARAM_INT);
            $userStmt->execute();
            
            if ($userStmt->rowCount() === 0) {
                http_response_code(404);
                debug_log("Recipient not found: " . $recipient_id);
                echo json_encode(['success' => false, 'error' => 'Recipient not found']);
                exit;
            }
            
            // Create new direct chat
            $createStmt = $conn->prepare("
                INSERT INTO chat_direct (user1_id, user2_id) 
                VALUES (:user1_id, :user2_id)
            ");
            $createStmt->bindParam(':user1_id', $current_user_id, PDO::PARAM_INT);
            $createStmt->bindParam(':user2_id', $recipient_id, PDO::PARAM_INT);
            $createStmt->execute();
            
            $chat_db_id = $conn->lastInsertId();
            debug_log("Created new direct chat with ID: " . $chat_db_id);
            
            // Insert message
            $stmt = $conn->prepare("
                INSERT INTO chat_messages (direct_chat_id, sender_id, message) 
                VALUES (:chat_id, :sender_id, :message)
            ");
            $stmt->bindParam(':chat_id', $chat_db_id, PDO::PARAM_INT);
            $stmt->bindParam(':sender_id', $current_user_id, PDO::PARAM_INT);
            $stmt->bindParam(':message', $message_text);
            $stmt->execute();
            
            $messageId = $conn->lastInsertId();
            debug_log("Inserted message with ID: " . $messageId);
            
            // Get user info
            $userStmt = $conn->prepare("SELECT full_name FROM users WHERE id = :user_id");
            $userStmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
            $userStmt->execute();
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);
            
            // Return the new message and chat details
            $new_message = [
                'id' => $messageId,
                'chat_id' => 'd' . $chat_db_id,
                'sender' => $current_user_id,
                'sender_name' => $user['full_name'],
                'text' => $message_text,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            $response = [
                'success' => true, 
                'message' => $new_message,
                'chat' => [
                    'id' => 'd' . $chat_db_id,
                    'userId' => $recipient_id
                ]
            ];
            
            debug_log("Sending new chat response: " . json_encode($response));
            echo json_encode($response);
            exit;
        }
        
        $chat_type = $chat_id[0];
        $chat_db_id = intval(substr($chat_id, 1));
        
        debug_log("Processing chat type: " . $chat_type . ", chat_db_id: " . $chat_db_id);
        
        if ($chat_type === 'd') {
            // Direct chat
            // Verify user is a participant
            $checkStmt = $conn->prepare("
                SELECT * FROM chat_direct 
                WHERE id = :chat_id AND (user1_id = :user_id OR user2_id = :user_id)
            ");
            $checkStmt->bindParam(':chat_id', $chat_db_id, PDO::PARAM_INT);
            $checkStmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
            $checkStmt->execute();
            
            if ($checkStmt->rowCount() === 0) {
                debug_log("User is not a participant in this chat: chat_id=" . $chat_db_id . ", user_id=" . $current_user_id);
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'You are not a participant in this chat']);
                exit;
            }
            
            // Insert message
            $stmt = $conn->prepare("
                INSERT INTO chat_messages (direct_chat_id, sender_id, message) 
                VALUES (:chat_id, :sender_id, :message)
            ");
            $stmt->bindParam(':chat_id', $chat_db_id, PDO::PARAM_INT);
            $stmt->bindParam(':sender_id', $current_user_id, PDO::PARAM_INT);
            $stmt->bindParam(':message', $message_text);
            $stmt->execute();
            
            $messageId = $conn->lastInsertId();
            debug_log("Inserted direct chat message with ID: " . $messageId);
            
        } else if ($chat_type === 'g') {
            // Group chat
            // Verify user is a member
            $checkStmt = $conn->prepare("
                SELECT * FROM chat_group_members 
                WHERE group_id = :group_id AND user_id = :user_id
            ");
            $checkStmt->bindParam(':group_id', $chat_db_id, PDO::PARAM_INT);
            $checkStmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
            $checkStmt->execute();
            
            if ($checkStmt->rowCount() === 0) {
                debug_log("User is not a member of this group: group_id=" . $chat_db_id . ", user_id=" . $current_user_id);
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'You are not a member of this group']);
                exit;
            }
            
            // Insert message
            $stmt = $conn->prepare("
                INSERT INTO chat_messages (group_id, sender_id, message) 
                VALUES (:group_id, :sender_id, :message)
            ");
            $stmt->bindParam(':group_id', $chat_db_id, PDO::PARAM_INT);
            $stmt->bindParam(':sender_id', $current_user_id, PDO::PARAM_INT);
            $stmt->bindParam(':message', $message_text);
            $stmt->execute();
            
            $messageId = $conn->lastInsertId();
            debug_log("Inserted group chat message with ID: " . $messageId);
            
        } else {
            debug_log("Invalid chat ID format: " . $chat_id);
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid chat ID format']);
            exit;
        }
        
        // Get user info
        $userStmt = $conn->prepare("SELECT full_name FROM users WHERE id = :user_id");
        $userStmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
        $userStmt->execute();
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        
        // Return the new message
        $new_message = [
            'id' => $messageId,
            'chat_id' => $chat_id,
            'sender' => $current_user_id,
            'sender_name' => $user['full_name'],
            'text' => $message_text,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        $response = ['success' => true, 'message' => $new_message];
        debug_log("Sending message response: " . json_encode($response));
        echo json_encode($response);
        exit;
        
    } catch (PDOException $e) {
        debug_log("Error in sendMessage: " . $e->getMessage());
        debug_log("Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        exit;
    }
}

/**
 * Create a new group chat
 */
function createGroup() {
    global $conn;
    $current_user_id = $_SESSION['user_id'];
    
    // Check if request is POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed. Use POST.']);
        return;
    }
    
    // Get request body
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    if (!isset($data['name']) || !isset($data['members'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Group name and members are required']);
        return;
    }
    
    $group_name = $data['name'];
    $members = $data['members'];
    
    // Add current user to members if not already included
    if (!in_array($current_user_id, $members)) {
        $members[] = $current_user_id;
    }
    
    try {
        // Begin transaction
        $conn->beginTransaction();
        
        // Create the group
        $stmt = $conn->prepare("
            INSERT INTO chat_groups (name, created_by) 
            VALUES (:name, :created_by)
        ");
        $stmt->bindParam(':name', $group_name);
        $stmt->bindParam(':created_by', $current_user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $group_id = $conn->lastInsertId();
        
        // Add members
        $memberStmt = $conn->prepare("
            INSERT INTO chat_group_members (group_id, user_id, is_admin) 
            VALUES (:group_id, :user_id, :is_admin)
        ");
        
        foreach ($members as $member_id) {
            // Verify user exists
            $userStmt = $conn->prepare("SELECT id FROM users WHERE id = :user_id");
            $userStmt->bindParam(':user_id', $member_id, PDO::PARAM_INT);
            $userStmt->execute();
            
            if ($userStmt->rowCount() > 0) {
                // Add user to group
                $is_admin = ($member_id == $current_user_id) ? 1 : 0;
                $memberStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
                $memberStmt->bindParam(':user_id', $member_id, PDO::PARAM_INT);
                $memberStmt->bindParam(':is_admin', $is_admin, PDO::PARAM_INT);
                $memberStmt->execute();
            }
        }
        
        // Add initial message
        $message = 'Group created';
        $msgStmt = $conn->prepare("
            INSERT INTO chat_messages (group_id, sender_id, message) 
            VALUES (:group_id, :sender_id, :message)
        ");
        $msgStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
        $msgStmt->bindParam(':sender_id', $current_user_id, PDO::PARAM_INT);
        $msgStmt->bindParam(':message', $message);
        $msgStmt->execute();
        
        $conn->commit();
        
        // Get the new group info
        $groupInfo = [
            'id' => 'g' . $group_id,
            'name' => $group_name,
            'members' => $members,
            'lastMessage' => 'Group created',
            'timestamp' => date('Y-m-d H:i:s'),
            'unread' => 0
        ];
        
        echo json_encode(['success' => true, 'group' => $groupInfo]);
        
    } catch (PDOException $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

/**
 * Add users to an existing group chat
 */
function addUsersToGroup() {
    global $conn;
    $current_user_id = $_SESSION['user_id'];
    
    // Check if request is POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed. Use POST.']);
        return;
    }
    
    // Get request body
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    if (!isset($data['group_id']) || !isset($data['user_ids'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Group ID and user IDs are required']);
        return;
    }
    
    $group_id_str = $data['group_id'];
    $user_ids = $data['user_ids'];
    
    // Extract numeric group ID
    if (!preg_match('/^g(\d+)$/', $group_id_str, $matches)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid group ID format']);
        return;
    }
    
    $group_id = intval($matches[1]);
    
    try {
        // Check if current user is a member and an admin
        $checkStmt = $conn->prepare("
            SELECT * FROM chat_group_members 
            WHERE group_id = :group_id AND user_id = :user_id AND is_admin = 1
        ");
        $checkStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
        $checkStmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
        $checkStmt->execute();
        
        if ($checkStmt->rowCount() === 0) {
            http_response_code(403);
            echo json_encode(['error' => 'Only group admins can add users']);
            return;
        }
        
        // Begin transaction
        $conn->beginTransaction();
        
        // Get group info
        $groupStmt = $conn->prepare("SELECT name FROM chat_groups WHERE id = :group_id");
        $groupStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
        $groupStmt->execute();
        
        if ($groupStmt->rowCount() === 0) {
            $conn->rollBack();
            http_response_code(404);
            echo json_encode(['error' => 'Group not found']);
            return;
        }
        
        $group = $groupStmt->fetch(PDO::FETCH_ASSOC);
        
        // Add users to group
        $memberStmt = $conn->prepare("
            INSERT INTO chat_group_members (group_id, user_id, is_admin) 
            VALUES (:group_id, :user_id, 0)
            ON DUPLICATE KEY UPDATE joined_at = CURRENT_TIMESTAMP
        ");
        
        $added_users = [];
        $added_names = [];
        
        foreach ($user_ids as $user_id) {
            // Verify user exists
            $userStmt = $conn->prepare("SELECT id, full_name FROM users WHERE id = :user_id");
            $userStmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $userStmt->execute();
            
            if ($userStmt->rowCount() > 0) {
                $user = $userStmt->fetch(PDO::FETCH_ASSOC);
                
                // Check if user is already in group
                $existsStmt = $conn->prepare("
                    SELECT * FROM chat_group_members 
                    WHERE group_id = :group_id AND user_id = :user_id
                ");
                $existsStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
                $existsStmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                $existsStmt->execute();
                
                if ($existsStmt->rowCount() === 0) {
                    // Add user to group
                    $memberStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
                    $memberStmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                    $memberStmt->execute();
                    
                    $added_users[] = $user_id;
                    $added_names[] = $user['full_name'];
                }
            }
        }
        
        // Add system message
        if (count($added_users) > 0) {
            $message = count($added_users) > 1 ? 
                       'Added ' . implode(', ', $added_names) . ' to the group' : 
                       'Added ' . $added_names[0] . ' to the group';
            
            $msgStmt = $conn->prepare("
                INSERT INTO chat_messages (group_id, sender_id, message) 
                VALUES (:group_id, :sender_id, :message)
            ");
            $msgStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
            $msgStmt->bindParam(':sender_id', $current_user_id, PDO::PARAM_INT);
            $msgStmt->bindParam(':message', $message);
            $msgStmt->execute();
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true, 
            'group_id' => $group_id_str, 
            'added_users' => $added_users,
            'message' => count($added_users) > 0 ? 'Users added successfully' : 'No new users added'
        ]);
        
    } catch (PDOException $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

/**
 * Remove a user from a group chat
 */
function removeUserFromGroup() {
    global $conn;
    $current_user_id = $_SESSION['user_id'];
    
    // Check if request is POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed. Use POST.']);
        return;
    }
    
    // Get request body
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    if (!isset($data['group_id']) || !isset($data['user_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Group ID and user ID are required']);
        return;
    }
    
    $group_id_str = $data['group_id'];
    $user_id_to_remove = $data['user_id'];
    
    // Extract numeric group ID
    if (!preg_match('/^g(\d+)$/', $group_id_str, $matches)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid group ID format']);
        return;
    }
    
    $group_id = intval($matches[1]);
    
    try {
        // Check group exists
        $groupStmt = $conn->prepare("SELECT * FROM chat_groups WHERE id = :group_id");
        $groupStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
        $groupStmt->execute();
        
        if ($groupStmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Group not found']);
            return;
        }
        
        // Check if current user is admin (if removing someone else) or is removing themselves
        if ($current_user_id != $user_id_to_remove) {
            $adminStmt = $conn->prepare("
                SELECT * FROM chat_group_members 
                WHERE group_id = :group_id AND user_id = :user_id AND is_admin = 1
            ");
            $adminStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
            $adminStmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
            $adminStmt->execute();
            
            if ($adminStmt->rowCount() === 0) {
                http_response_code(403);
                echo json_encode(['error' => 'Only group admins can remove other users']);
                return;
            }
        }
        
        // Check if user to remove is in group
        $memberStmt = $conn->prepare("
            SELECT * FROM chat_group_members 
            WHERE group_id = :group_id AND user_id = :user_id
        ");
        $memberStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
        $memberStmt->bindParam(':user_id', $user_id_to_remove, PDO::PARAM_INT);
        $memberStmt->execute();
        
        if ($memberStmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'User is not a member of this group']);
            return;
        }
        
        // Get user name for message
        $userStmt = $conn->prepare("SELECT full_name FROM users WHERE id = :user_id");
        $userStmt->bindParam(':user_id', $user_id_to_remove, PDO::PARAM_INT);
        $userStmt->execute();
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        $user_name = $user ? $user['full_name'] : 'User';
        
        // Begin transaction
        $conn->beginTransaction();
        
        // Remove user from group
        $deleteStmt = $conn->prepare("
            DELETE FROM chat_group_members 
            WHERE group_id = :group_id AND user_id = :user_id
        ");
        $deleteStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
        $deleteStmt->bindParam(':user_id', $user_id_to_remove, PDO::PARAM_INT);
        $deleteStmt->execute();
        
        // Add removal message if not leaving oneself
        if ($current_user_id != $user_id_to_remove) {
            $message = $user_name . ' was removed from the group';
            $msgStmt = $conn->prepare("
                INSERT INTO chat_messages (group_id, sender_id, message) 
                VALUES (:group_id, :sender_id, :message)
            ");
            $msgStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
            $msgStmt->bindParam(':sender_id', $current_user_id, PDO::PARAM_INT);
            $msgStmt->bindParam(':message', $message);
            $msgStmt->execute();
        } else {
            $message = $user_name . ' left the group';
            $msgStmt = $conn->prepare("
                INSERT INTO chat_messages (group_id, sender_id, message) 
                VALUES (:group_id, :sender_id, :message)
            ");
            $msgStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
            $msgStmt->bindParam(':sender_id', $current_user_id, PDO::PARAM_INT);
            $msgStmt->bindParam(':message', $message);
            $msgStmt->execute();
        }
        
        // If no members left, delete the group
        $countStmt = $conn->prepare("
            SELECT COUNT(*) FROM chat_group_members WHERE group_id = :group_id
        ");
        $countStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
        $countStmt->execute();
        $memberCount = $countStmt->fetchColumn();
        
        $groupDeleted = false;
        
        if ($memberCount == 0) {
            // Delete all group messages
            $delMsgStmt = $conn->prepare("DELETE FROM chat_messages WHERE group_id = :group_id");
            $delMsgStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
            $delMsgStmt->execute();
            
            // Delete group
            $delGroupStmt = $conn->prepare("DELETE FROM chat_groups WHERE id = :group_id");
            $delGroupStmt->bindParam(':group_id', $group_id, PDO::PARAM_INT);
            $delGroupStmt->execute();
            
            $groupDeleted = true;
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'group_id' => $group_id_str,
            'removed_user' => $user_id_to_remove,
            'group_deleted' => $groupDeleted
        ]);
        
    } catch (PDOException $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

/**
 * Delete a user from the chat system and all associated messages
 */
function deleteUser() {
    global $conn;
    $current_user_id = $_SESSION['user_id'];
    
    // Check if request is POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed. Use POST.']);
        return;
    }
    
    // Get request body
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    if (!isset($data['user_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'User ID is required']);
        return;
    }
    
    $user_id_to_delete = $data['user_id'];
    
    // Only admins can delete other users, users can delete themselves
    if ($current_user_id != $user_id_to_delete) {
        $stmt = $conn->prepare("SELECT role FROM users WHERE id = :user_id");
        $stmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
        $stmt->execute();
        $role = $stmt->fetchColumn();
        
        if ($role !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Only admins can delete other users']);
            return;
        }
    }
    
    try {
        // Start transaction to ensure all operations complete or none do
        $conn->beginTransaction();
        
        // Get user information for notification
        $userStmt = $conn->prepare("SELECT full_name FROM users WHERE id = :user_id");
        $userStmt->bindParam(':user_id', $user_id_to_delete, PDO::PARAM_INT);
        $userStmt->execute();
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            return;
        }
        
        $user_name = $user['full_name'] ?? 'Unknown User';
        
        // 1. Handle direct chats - find all direct chats where the user is a participant
        $directChatsStmt = $conn->prepare("
            SELECT id FROM chat_direct 
            WHERE user1_id = :user_id OR user2_id = :user_id
        ");
        $directChatsStmt->bindParam(':user_id', $user_id_to_delete, PDO::PARAM_INT);
        $directChatsStmt->execute();
        
        $directChatIds = array();
        while ($row = $directChatsStmt->fetch(PDO::FETCH_ASSOC)) {
            $directChatIds[] = $row['id'];
        }
        
        // 2. Delete all messages from direct chats involving the user
        if (!empty($directChatIds)) {
            $placeholders = str_repeat('?,', count($directChatIds) - 1) . '?';
            $deleteDirectMsgsStmt = $conn->prepare("
                DELETE FROM chat_messages 
                WHERE direct_chat_id IN ($placeholders)
            ");
            $deleteDirectMsgsStmt->execute($directChatIds);
        }
        
        // 3. Delete all direct chats involving the user
        $deleteDirectChatsStmt = $conn->prepare("
            DELETE FROM chat_direct 
            WHERE user1_id = :user_id OR user2_id = :user_id
        ");
        $deleteDirectChatsStmt->bindParam(':user_id', $user_id_to_delete, PDO::PARAM_INT);
        $deleteDirectChatsStmt->execute();
        
        // 4. Find all group chats where the user is a member
        $groupsStmt = $conn->prepare("
            SELECT group_id, is_admin 
            FROM chat_group_members 
            WHERE user_id = :user_id
        ");
        $groupsStmt->bindParam(':user_id', $user_id_to_delete, PDO::PARAM_INT);
        $groupsStmt->execute();
        
        $groupIds = array();
        while ($row = $groupsStmt->fetch(PDO::FETCH_ASSOC)) {
            $groupIds[] = $row['group_id'];
            
            // Add a message to the group chat that the user was removed
            $msgText = $user_name . ' was removed from the group';
            $notifyStmt = $conn->prepare("
                INSERT INTO chat_messages (group_id, sender_id, message) 
                VALUES (:group_id, :sender_id, :message)
            ");
            $notifyStmt->bindParam(':group_id', $row['group_id'], PDO::PARAM_INT);
            $notifyStmt->bindParam(':sender_id', $current_user_id, PDO::PARAM_INT);
            $notifyStmt->bindParam(':message', $msgText);
            $notifyStmt->execute();
        }
        
        // 5. Delete all messages sent by the user in group chats
        $deleteGroupMsgsStmt = $conn->prepare("
            DELETE FROM chat_messages 
            WHERE sender_id = :user_id AND group_id IS NOT NULL
        ");
        $deleteGroupMsgsStmt->bindParam(':user_id', $user_id_to_delete, PDO::PARAM_INT);
        $deleteGroupMsgsStmt->execute();
        
        // 6. Remove user from all group memberships
        $removeGroupMemberStmt = $conn->prepare("
            DELETE FROM chat_group_members 
            WHERE user_id = :user_id
        ");
        $removeGroupMemberStmt->bindParam(':user_id', $user_id_to_delete, PDO::PARAM_INT);
        $removeGroupMemberStmt->execute();
        
        // 7. Check if any groups are now empty, if so, delete them
        if (!empty($groupIds)) {
            foreach ($groupIds as $groupId) {
                $countStmt = $conn->prepare("
                    SELECT COUNT(*) 
                    FROM chat_group_members 
                    WHERE group_id = :group_id
                ");
                $countStmt->bindParam(':group_id', $groupId, PDO::PARAM_INT);
                $countStmt->execute();
                $memberCount = $countStmt->fetchColumn();
                
                if ($memberCount == 0) {
                    // Delete all messages from the group
                    $delMsgStmt = $conn->prepare("
                        DELETE FROM chat_messages 
                        WHERE group_id = :group_id
                    ");
                    $delMsgStmt->bindParam(':group_id', $groupId, PDO::PARAM_INT);
                    $delMsgStmt->execute();
                    
                    // Delete the group
                    $delGroupStmt = $conn->prepare("
                        DELETE FROM chat_groups 
                        WHERE id = :group_id
                    ");
                    $delGroupStmt->bindParam(':group_id', $groupId, PDO::PARAM_INT);
                    $delGroupStmt->execute();
                }
            }
        }
        
        // 8. Delete any message read records for the user
        $deleteReadMsgsStmt = $conn->prepare("
            DELETE FROM chat_message_read 
            WHERE user_id = :user_id
        ");
        $deleteReadMsgsStmt->bindParam(':user_id', $user_id_to_delete, PDO::PARAM_INT);
        $deleteReadMsgsStmt->execute();
        
        // Commit all changes
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'User and all associated chat data successfully deleted'
        ]);
        
    } catch (PDOException $e) {
        // Rollback transaction on error
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}
