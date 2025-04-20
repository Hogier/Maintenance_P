<?php
// Set timezone and enable error reporting for debugging
date_default_timezone_set('America/Chicago');
error_reporting(E_ALL);
ini_set('display_errors', 0); // Disable displaying errors to prevent breaking JSON output

// Debug call stack
$backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);
$callStack = [];
foreach ($backtrace as $trace) {
    $callStack[] = isset($trace['file']) ? 
        basename($trace['file']) . ':' . $trace['line'] . ' ' . $trace['function'] : 
        $trace['function'];
}
error_log("API called from: " . implode(' <- ', $callStack));

// Log requests for debugging
error_log("API Request received: " . json_encode($_POST));

// Include database connection - исправленный путь к файлу
require_once dirname(dirname(__DIR__)) . '/database.php';

// Add a flag to prevent double execution
$GLOBALS['API_EXECUTED'] = false;

class SuppliesAPI {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    // Add new supply order from Materials module
    public function addSupplyOrder($orderData) {
        try {
            error_log("addSupplyOrder called with data: " . json_encode($orderData));
            
            // Start transaction
            $this->conn->begin_transaction();
            
            // Extract data
            $orderId = isset($orderData['order_id']) ? intval($orderData['order_id']) : 0;
            $userId = isset($orderData['user_id']) ? intval($orderData['user_id']) : 0;
            $notes = isset($orderData['notes']) ? $orderData['notes'] : '';
            $items = isset($orderData['items']) ? $orderData['items'] : [];
            
            error_log("Extracted data: orderId=$orderId, userId=$userId, items count=" . count($items));
            
            if (!$orderId || !$userId || empty($items)) {
                error_log("Missing required data: orderId=$orderId, userId=$userId, items count=" . count($items));
                return ['success' => false, 'message' => 'Missing required order data'];
            }
            
            // Check if this order already exists in supplies table to avoid duplicates
            $checkStmt = $this->conn->prepare("
                SELECT id FROM supply_orders WHERE original_order_id = ?
            ");
            $checkStmt->bind_param('i', $orderId);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            
            if ($result->num_rows > 0) {
                error_log("Order already exists in supplies: original_order_id=$orderId");
                return ['success' => false, 'message' => 'Order already exists in supplies'];
            }
            
            // Insert into supply_orders table
            $stmt = $this->conn->prepare("
                INSERT INTO supply_orders 
                (original_order_id, user_id, notes, status, created_at) 
                VALUES (?, ?, ?, 'pending', NOW())
            ");
            $stmt->bind_param('iis', $orderId, $userId, $notes);
            $result = $stmt->execute();
            
            if (!$result) {
                error_log("Error executing supply_orders insert: " . $stmt->error);
                throw new Exception("Error inserting into supply_orders: " . $stmt->error);
            }
            
            $supplyOrderId = $this->conn->insert_id;
            error_log("Inserted supply order with ID: $supplyOrderId");
            
            // Insert supply items
            $itemStmt = $this->conn->prepare("
                INSERT INTO supply_order_items
                (supply_order_id, material_id, material_name, quantity, unit)
                VALUES (?, ?, ?, ?, ?)
            ");
            
            foreach ($items as $item) {
                $materialId = intval($item['id']);
                $materialName = $item['name'];
                $quantity = intval($item['quantity']);
                $unit = $item['unit'];
                
                error_log("Inserting item: materialId=$materialId, name=$materialName, quantity=$quantity, unit=$unit");
                
                $itemStmt->bind_param('iisis', $supplyOrderId, $materialId, $materialName, $quantity, $unit);
                $result = $itemStmt->execute();
                
                if (!$result) {
                    error_log("Error executing supply_order_items insert: " . $itemStmt->error);
                    throw new Exception("Error inserting into supply_order_items: " . $itemStmt->error);
                }
            }
            
            // Commit transaction
            $this->conn->commit();
            error_log("Transaction committed successfully");
            
            return [
                'success' => true, 
                'message' => 'Order added to supplies successfully',
                'supply_order_id' => $supplyOrderId
            ];
        } catch (Exception $e) {
            // Rollback on error
            if ($this->conn->inTransaction()) {
                $this->conn->rollback();
                error_log("Transaction rolled back due to error");
            }
            
            // Log error
            error_log("Error adding supply order: " . $e->getMessage());
            
            return [
                'success' => false, 
                'message' => 'Error adding supply order: ' . $e->getMessage()
            ];
        }
    }
    
    // Get all supply orders with filters
    public function getAllSupplyOrders() {
        try {
            // Check if we have filter parameters
            $status = isset($_POST['status']) ? $_POST['status'] : null;
            $dateFrom = isset($_POST['date_from']) ? $_POST['date_from'] : null;
            $dateTo = isset($_POST['date_to']) ? $_POST['date_to'] : null;
            
            $whereClause = [];
            $params = [];
            $types = "";
            
            // Build the query based on filters
            if ($status && $status !== 'all') {
                if ($status === 'active') {
                    // Active orders are those with status pending or processing
                    $whereClause[] = "(so.status = 'pending' OR so.status = 'processing')";
                } else if ($status === 'all_including_hidden') {
                    // Don't add any status filter - show all statuses
                } else {
                    $whereClause[] = "so.status = ?";
                    $params[] = $status;
                    $types .= "s";
                }
            }
            
            if ($dateFrom) {
                $whereClause[] = "so.created_at >= ?";
                $params[] = $dateFrom . " 00:00:00";
                $types .= "s";
            }
            
            if ($dateTo) {
                $whereClause[] = "so.created_at <= ?";
                $params[] = $dateTo . " 23:59:59";
                $types .= "s";
            }
            
            // By default, if no status filter is specified, hide completed and cancelled orders
            if (!$status || $status === 'all') {
                $whereClause[] = "(so.status != 'completed' AND so.status != 'cancelled')";
            }
            
            $whereString = "";
            if (!empty($whereClause)) {
                $whereString = "WHERE " . implode(" AND ", $whereClause);
            }
            
            $query = "
                SELECT so.*, u.full_name as user_name,
                    (SELECT GROUP_CONCAT(CONCAT(soi.material_name, ' (', soi.quantity, ' ', soi.unit, ')') SEPARATOR ', ')
                    FROM supply_order_items soi 
                    WHERE soi.supply_order_id = so.id) as items_list
                FROM supply_orders so
                JOIN users u ON so.user_id = u.id
                $whereString
                ORDER BY so.created_at DESC
            ";
            
            error_log("Filter query: " . $query);
            error_log("Filter params: " . json_encode($params));
            
            $stmt = $this->conn->prepare($query);
            
            // Bind parameters if any
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            $orders = [];
            while ($row = $result->fetch_assoc()) {
                // Добавляем структурированные данные о материалах для каждого заказа
                $row['materials_data'] = $this->getOrderMaterialsGrouped($row['id']);
                $orders[] = $row;
            }
            
            return [
                'success' => true, 
                'data' => $orders,
                'filters' => [
                    'status' => $status,
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'total_records' => count($orders)
                ]
            ];
        } catch (Exception $e) {
            error_log("Error getting supply orders: " . $e->getMessage());
            return ['success' => false, 'message' => 'Error getting supply orders: ' . $e->getMessage()];
        }
    }
    
    // Get count of new orders (pending status)
    public function getNewOrdersCount() {
        try {
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) as count
                FROM supply_orders
                WHERE status = 'pending'
            ");
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            return ['success' => true, 'count' => (int)$row['count']];
        } catch (Exception $e) {
            error_log("Error getting new orders count: " . $e->getMessage());
            return ['success' => false, 'message' => 'Error getting new orders count: ' . $e->getMessage()];
        }
    }
    
    // Update supply order status
    public function updateSupplyOrderStatus($orderId, $status) {
        try {
            // Start transaction
            $this->conn->begin_transaction();
            
            // Update status in supply_orders table
            $stmt = $this->conn->prepare("UPDATE supply_orders SET status = ? WHERE id = ?");
            $stmt->bind_param('si', $status, $orderId);
            $stmt->execute();
            
            if ($stmt->affected_rows === 0) {
                // Roll back transaction
                $this->conn->rollback();
                return ['success' => false, 'message' => 'Supply order not found or status not changed'];
            }
            
            // Get the original_order_id from the supply_orders table
            $orderStmt = $this->conn->prepare("SELECT original_order_id FROM supply_orders WHERE id = ?");
            $orderStmt->bind_param('i', $orderId);
            $orderStmt->execute();
            $result = $orderStmt->get_result();
            $orderData = $result->fetch_assoc();
            
            if ($orderData && isset($orderData['original_order_id'])) {
                $originalOrderId = $orderData['original_order_id'];
                
                // Map status from supplies to materials status
                $materialStatus = $this->mapStatusToMaterialsStatus($status);
                
                // Update status in the original material_orders table
                $updateOriginalStmt = $this->conn->prepare("UPDATE material_orders SET status = ? WHERE id = ?");
                $updateOriginalStmt->bind_param('si', $materialStatus, $originalOrderId);
                $updateOriginalStmt->execute();
                
                error_log("Updated original order #$originalOrderId status to $materialStatus");
            }
            
            // Commit transaction
            $this->conn->commit();
            
            return ['success' => true, 'message' => 'Supply order status updated successfully'];
        } catch (Exception $e) {
            // Roll back transaction on error
            $this->conn->rollback();
            error_log("Error updating supply order status: " . $e->getMessage());
            return ['success' => false, 'message' => 'Error updating supply order status: ' . $e->getMessage()];
        }
    }
    
    // Map status from supplies to materials module
    private function mapStatusToMaterialsStatus($suppliesStatus) {
        $statusMap = [
            'pending' => 'pending',
            'processing' => 'approved', // Processing in supplies = approved in materials
            'completed' => 'delivered',  // Completed in supplies = delivered in materials
            'cancelled' => 'rejected'    // Cancelled in supplies = rejected in materials
        ];
        
        return isset($statusMap[$suppliesStatus]) ? $statusMap[$suppliesStatus] : 'pending';
    }
    
    // Get receipts for a specific order
    public function getOrderReceipts($orderId) {
        try {
            $stmt = $this->conn->prepare("
                SELECT r.*, u.full_name as uploaded_by_name
                FROM supply_receipts r
                LEFT JOIN users u ON r.uploaded_by = u.id
                WHERE r.supply_order_id = ?
                ORDER BY r.upload_date DESC
            ");
            $stmt->bind_param('i', $orderId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $receipts = [];
            while ($row = $result->fetch_assoc()) {
                // Generate URL for the file
                $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
                $row['file_url'] = $baseUrl . $row['file_path'];
                
                $receipts[] = $row;
            }
            
            return ['success' => true, 'receipts' => $receipts];
        } catch (Exception $e) {
            error_log("Error getting receipts: " . $e->getMessage());
            return ['success' => false, 'message' => 'Error getting receipts: ' . $e->getMessage()];
        }
    }
    
    // Upload receipt for an order
    public function uploadReceipt($orderId, $file, $userId) {
        try {
            // Validate input
            if (!$orderId || !$file || !isset($file['tmp_name']) || !$userId) {
                error_log("Missing required data for uploadReceipt: orderId=$orderId, file=" . json_encode($file) . ", userId=$userId");
                return ['success' => false, 'message' => 'Missing required data'];
            }
            
            // Check if file was actually uploaded
            if (!is_uploaded_file($file['tmp_name'])) {
                error_log("File not uploaded via HTTP POST: " . $file['name']);
                return ['success' => false, 'message' => 'Security error: File not uploaded properly'];
            }
            
            // Validate file size (max 10MB)
            $maxSize = 10 * 1024 * 1024; // 10MB
            if ($file['size'] > $maxSize) {
                error_log("File too large: " . $file['size'] . " bytes");
                return ['success' => false, 'message' => 'File is too large. Maximum size is 10MB.'];
            }
            
            // Validate file type
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
            if (!in_array($file['type'], $allowedTypes)) {
                error_log("Invalid file type: " . $file['type']);
                return ['success' => false, 'message' => 'Invalid file type. Please upload an image or PDF file.'];
            }
            
            // Determine file extension
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            
            // Check if supply order exists
            $checkStmt = $this->conn->prepare("SELECT id FROM supply_orders WHERE id = ?");
            $checkStmt->bind_param('i', $orderId);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            
            if ($result->num_rows === 0) {
                error_log("Supply order not found: order_id=$orderId");
                return ['success' => false, 'message' => 'Supply order not found'];
            }
            
            // Create base upload directory if it doesn't exist
            $baseUploadDir = dirname(dirname(__DIR__)) . '/uploads';
            if (!file_exists($baseUploadDir)) {
                error_log("Creating base upload directory: $baseUploadDir");
                if (!mkdir($baseUploadDir, 0755, true)) {
                    error_log("Failed to create base upload directory: $baseUploadDir");
                    return ['success' => false, 'message' => 'Failed to create upload directory'];
                }
            }
            
            // Create receipts directory if it doesn't exist
            $receiptsDir = $baseUploadDir . '/receipts';
            if (!file_exists($receiptsDir)) {
                error_log("Creating receipts directory: $receiptsDir");
                if (!mkdir($receiptsDir, 0755, true)) {
                    error_log("Failed to create receipts directory: $receiptsDir");
                    return ['success' => false, 'message' => 'Failed to create upload directory'];
                }
            }
            
            // Create order-specific directory if it doesn't exist
            $uploadDir = $receiptsDir . '/' . $orderId;
            if (!file_exists($uploadDir)) {
                error_log("Creating order-specific upload directory: $uploadDir");
                if (!mkdir($uploadDir, 0755, true)) {
                    error_log("Failed to create order-specific upload directory: $uploadDir");
                    return ['success' => false, 'message' => 'Failed to create upload directory'];
                }
            }
            
            // Generate a unique filename
            $filename = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9\.\-]/', '_', $file['name']);
            $filepath = $uploadDir . '/' . $filename;
            
            error_log("Moving uploaded file to: $filepath");
            
            // Move the uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filepath)) {
                $phpFileUploadErrors = [
                    0 => 'There is no error, the file uploaded with success',
                    1 => 'The uploaded file exceeds the upload_max_filesize directive in php.ini',
                    2 => 'The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form',
                    3 => 'The uploaded file was only partially uploaded',
                    4 => 'No file was uploaded',
                    6 => 'Missing a temporary folder',
                    7 => 'Failed to write file to disk',
                    8 => 'A PHP extension stopped the file upload',
                ];
                
                $errorMsg = isset($phpFileUploadErrors[$file['error']]) 
                    ? $phpFileUploadErrors[$file['error']] 
                    : 'Unknown upload error';
                    
                error_log("Failed to move uploaded file. Error: " . $errorMsg);
                return ['success' => false, 'message' => 'Failed to move uploaded file: ' . $errorMsg];
            }
            
            // Get file size
            $fileSize = filesize($filepath);
            
            // Generate a web-accessible path
            $webPath = '/uploads/receipts/' . $orderId . '/' . $filename;
            
            error_log("File successfully moved. Web path: $webPath");
            
            // Insert receipt record into database
            $stmt = $this->conn->prepare("
                INSERT INTO supply_receipts 
                (supply_order_id, file_name, file_path, file_type, file_size, uploaded_by)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->bind_param('isssis', $orderId, $file['name'], $webPath, $extension, $fileSize, $userId);
            $result = $stmt->execute();
            
            if (!$result) {
                // Delete the file if database insert fails
                error_log("Database insert failed. Deleting file: $filepath. Error: " . $stmt->error);
                unlink($filepath);
                return ['success' => false, 'message' => 'Failed to save receipt record: ' . $stmt->error];
            }
            
            $receiptId = $this->conn->insert_id;
            
            error_log("Receipt record saved. ID: $receiptId");
            
            return [
                'success' => true, 
                'message' => 'Receipt uploaded successfully',
                'receipt_id' => $receiptId,
                'file_url' => (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]" . $webPath
            ];
        } catch (Exception $e) {
            error_log("Error uploading receipt: " . $e->getMessage());
            return ['success' => false, 'message' => 'Error uploading receipt: ' . $e->getMessage()];
        }
    }
    
    // Delete receipt
    public function deleteReceipt($receiptId, $userId) {
        try {
            // Validate input
            if (!$receiptId || !$userId) {
                error_log("Missing required data for deleteReceipt: receiptId=$receiptId, userId=$userId");
                return ['success' => false, 'message' => 'Missing required data'];
            }
            
            // First, get the receipt info to find the file
            $stmt = $this->conn->prepare("SELECT * FROM supply_receipts WHERE id = ?");
            $stmt->bind_param('i', $receiptId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                error_log("Receipt not found: receipt_id=$receiptId");
                return ['success' => false, 'message' => 'Receipt not found'];
            }
            
            $receipt = $result->fetch_assoc();
            
            // Get physical file path
            $filePath = dirname(dirname(__DIR__)) . $receipt['file_path'];
            
            // Delete the record from database
            $deleteStmt = $this->conn->prepare("DELETE FROM supply_receipts WHERE id = ?");
            $deleteStmt->bind_param('i', $receiptId);
            $deleteResult = $deleteStmt->execute();
            
            if (!$deleteResult) {
                error_log("Error deleting receipt record: " . $deleteStmt->error);
                return ['success' => false, 'message' => 'Database error: ' . $deleteStmt->error];
            }
            
            // Try to delete the physical file if it exists
            if (file_exists($filePath)) {
                if (!unlink($filePath)) {
                    error_log("Warning: Could not delete physical file: $filePath");
                    // We'll still return success since the DB record was deleted
                    return [
                        'success' => true, 
                        'message' => 'Receipt record deleted, but the file could not be removed from disk'
                    ];
                } else {
                    error_log("Physical file deleted: $filePath");
                }
            } else {
                error_log("Warning: Physical file not found: $filePath");
            }
            
            return ['success' => true, 'message' => 'Receipt deleted successfully'];
        } catch (Exception $e) {
            error_log("Error deleting receipt: " . $e->getMessage());
            return ['success' => false, 'message' => 'Error deleting receipt: ' . $e->getMessage()];
        }
    }
    
    // Get detailed order materials grouped by category/type
    public function getOrderMaterialsGrouped($orderId) {
        try {
            // Получаем все материалы для заказа
            $stmt = $this->conn->prepare("
                SELECT * FROM supply_order_items 
                WHERE supply_order_id = ?
                ORDER BY material_name
            ");
            
            $stmt->bind_param('i', $orderId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $allMaterials = [];
            while ($row = $result->fetch_assoc()) {
                $allMaterials[] = $row;
            }
            
            // Если материалов нет, возвращаем пустой массив
            if (empty($allMaterials)) {
                return [];
            }
            
            // Группируем материалы по первому слову в названии (как категория)
            $groupedMaterials = [];
            
            foreach ($allMaterials as $material) {
                // Получаем первое слово как категорию
                $nameParts = explode(' ', $material['material_name']);
                $category = $nameParts[0];
                
                // Если это числа или короткие слова, используем первые два слова
                if (is_numeric($category) || strlen($category) <= 2) {
                    $category = implode(' ', array_slice($nameParts, 0, 2));
                }
                
                // Если категории еще нет, создаем новый массив
                if (!isset($groupedMaterials[$category])) {
                    $groupedMaterials[$category] = [];
                }
                
                // Добавляем материал в соответствующую категорию
                $groupedMaterials[$category][] = $material;
            }
            
            // Сортируем категории по алфавиту
            ksort($groupedMaterials);
            
            return $groupedMaterials;
        } catch (Exception $e) {
            error_log("Error getting order materials: " . $e->getMessage());
            return [];
        }
    }
    
    // Get detailed information about an order
    public function getOrderDetails($orderId) {
        try {
            // Получаем основную информацию о заказе
            $stmt = $this->conn->prepare("
                SELECT so.*, u.full_name as user_name
                FROM supply_orders so
                JOIN users u ON so.user_id = u.id
                WHERE so.id = ?
            ");
            
            $stmt->bind_param('i', $orderId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                return ['success' => false, 'message' => 'Order not found'];
            }
            
            $order = $result->fetch_assoc();
            
            // Получаем сгруппированные материалы
            $order['materials'] = $this->getOrderMaterialsGrouped($orderId);
            
            return ['success' => true, 'order' => $order];
        } catch (Exception $e) {
            error_log("Error getting order details: " . $e->getMessage());
            return ['success' => false, 'message' => 'Error getting order details: ' . $e->getMessage()];
        }
    }
}

// Create necessary tables if they don't exist
function createTablesIfNotExist($conn) {
    try {
        // Create supply_orders table
        $conn->query("
            CREATE TABLE IF NOT EXISTS supply_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                original_order_id INT NOT NULL,
                user_id INT NOT NULL,
                notes TEXT,
                status ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (original_order_id),
                INDEX (user_id),
                INDEX (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        
        // Create supply_order_items table
        $conn->query("
            CREATE TABLE IF NOT EXISTS supply_order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                supply_order_id INT NOT NULL,
                material_id INT NOT NULL,
                material_name VARCHAR(255) NOT NULL,
                quantity INT NOT NULL,
                unit VARCHAR(50) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX (supply_order_id),
                INDEX (material_id),
                FOREIGN KEY (supply_order_id) REFERENCES supply_orders(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        
        // Create supply_receipts table
        $conn->query("
            CREATE TABLE IF NOT EXISTS supply_receipts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                supply_order_id INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                file_type VARCHAR(10) NOT NULL,
                file_size INT NOT NULL,
                upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                uploaded_by INT NOT NULL,
                INDEX (supply_order_id),
                FOREIGN KEY (supply_order_id) REFERENCES supply_orders(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        
        return true;
    } catch (Exception $e) {
        error_log("Error creating tables: " . $e->getMessage());
        return false;
    }
}

// Process API requests
function processApiRequest() {
    // Check if we already executed to prevent double execution
    if ($GLOBALS['API_EXECUTED']) {
        error_log("Preventing duplicate execution of API request");
        return;
    }
    
    // Mark as executed
    $GLOBALS['API_EXECUTED'] = true;
    
    // Start output buffering to prevent any unexpected output
    ob_start();
    error_log("processApiRequest called");
    
    // Initialize database connection
    try {
        $db = new Database();
        $conn = $db->getConnection();
        error_log("Database connection established");
    } catch (Exception $e) {
        error_log("Database connection error: " . $e->getMessage());
        // Clean any previous output
        ob_end_clean();
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Database connection error: ' . $e->getMessage()]);
        exit;
    }
    
    // Create tables if they don't exist
    $tablesCreated = createTablesIfNotExist($conn);
    error_log("Tables created/checked status: " . ($tablesCreated ? 'success' : 'failed'));
    
    // Create API instance
    $api = new SuppliesAPI();
    
    // Process requests
    if ($_SERVER["REQUEST_METHOD"] == "POST") {
        $action = $_POST['action'] ?? '';
        error_log("Processing POST request with action: $action");
        $response = null;
        
        switch ($action) {
            case 'addSupplyOrder':
                $orderDataJson = $_POST['order_data'] ?? '';
                error_log("addSupplyOrder received order_data: $orderDataJson");
                $orderData = json_decode($orderDataJson, true);
                
                if (empty($orderData)) {
                    error_log("Invalid order data format - empty after json_decode");
                    $response = ['success' => false, 'message' => 'Invalid order data format'];
                } else {
                    $response = $api->addSupplyOrder($orderData);
                    error_log("addSupplyOrder response: " . json_encode($response));
                }
                break;
                
            case 'getAllSupplyOrders':
                $response = $api->getAllSupplyOrders();
                break;
                
            case 'getNewOrdersCount':
                $response = $api->getNewOrdersCount();
                break;
                
            case 'updateSupplyOrderStatus':
                $orderId = $_POST['order_id'] ?? 0;
                $status = $_POST['status'] ?? '';
                
                if (!$orderId || !$status) {
                    $response = ['success' => false, 'message' => 'Order ID and status required'];
                } else {
                    $response = $api->updateSupplyOrderStatus($orderId, $status);
                }
                break;
                
            case 'getOrderReceipts':
                $orderId = isset($_POST['order_id']) ? intval($_POST['order_id']) : 0;
                if (!$orderId) {
                    $response = ['success' => false, 'message' => 'Order ID is required'];
                } else {
                    $response = $api->getOrderReceipts($orderId);
                    error_log("getOrderReceipts response for order #$orderId: " . json_encode($response));
                }
                break;
                
            case 'uploadReceipt':
                $orderId = isset($_POST['order_id']) ? intval($_POST['order_id']) : 0;
                if (!$orderId) {
                    $response = ['success' => false, 'message' => 'Order ID is required'];
                    break;
                }
                
                $file = isset($_FILES['receipt_file']) ? $_FILES['receipt_file'] : null;
                if (!$file) {
                    $response = ['success' => false, 'message' => 'No file uploaded'];
                    break;
                }
                
                // Get user ID from session (or use 1 for testing)
                $userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 1;
                
                // Log upload attempt details
                error_log("Attempting to upload receipt for order #$orderId: " . json_encode([
                    'filename' => $file['name'],
                    'size' => $file['size'],
                    'type' => $file['type'],
                    'userId' => $userId
                ]));
                
                $response = $api->uploadReceipt($orderId, $file, $userId);
                error_log("uploadReceipt response: " . json_encode($response));
                break;
                
            case 'deleteReceipt':
                $receiptId = isset($_POST['receipt_id']) ? intval($_POST['receipt_id']) : 0;
                if (!$receiptId) {
                    $response = ['success' => false, 'message' => 'Receipt ID is required'];
                    break;
                }
                
                // Get user ID from session (or use 1 for testing)
                $userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 1;
                
                error_log("Attempting to delete receipt #$receiptId by user #$userId");
                $response = $api->deleteReceipt($receiptId, $userId);
                error_log("deleteReceipt response: " . json_encode($response));
                break;
                
            case 'getOrderDetails':
                $orderId = isset($_POST['order_id']) ? intval($_POST['order_id']) : 0;
                if (!$orderId) {
                    $response = ['success' => false, 'message' => 'Order ID is required'];
                    break;
                }
                
                $response = $api->getOrderDetails($orderId);
                break;
                
            default:
                error_log("Invalid action: $action");
                $response = ['success' => false, 'message' => 'Invalid action'];
                break;
        }
        
        // Clear any previous output
        ob_end_clean();
        
        // Send JSON response
        header('Content-Type: application/json');
        error_log("Sending JSON response: " . json_encode($response));
        echo json_encode($response);
        exit;
    } else {
        // Handle invalid request method
        error_log("Invalid request method: " . $_SERVER["REQUEST_METHOD"]);
        
        // Clear any previous output
        ob_end_clean();
        
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Invalid request method']);
        exit;
    }
}

// Debug inclusion - to check if script is being included more than once
if (isset($GLOBALS['INCLUDED_COUNT'])) {
    $GLOBALS['INCLUDED_COUNT']++;
    error_log("supplies-api.php included multiple times: " . $GLOBALS['INCLUDED_COUNT']);
} else {
    $GLOBALS['INCLUDED_COUNT'] = 1;
    error_log("supplies-api.php included first time");
}

// Only execute API processing once
processApiRequest();
// No closing PHP tag to prevent any whitespace characters from being sent 