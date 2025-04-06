<?php
// Set timezone and enable error reporting for debugging
date_default_timezone_set('America/Chicago');
error_reporting(E_ALL);
ini_set('display_errors', 0); // Disable displaying errors to prevent breaking JSON output

// Include the database connection file
require_once 'database.php';

// Class for handling materials and orders
class MaterialsHandler {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    // Get all materials with optional category filtering
    public function getAllMaterials($category = null) {
        try {
            if ($category) {
                // Normalize category to lowercase for case-insensitive comparison
                $category = strtolower($category);
                
                $stmt = $this->conn->prepare("SELECT * FROM materials WHERE LOWER(category) = ? ORDER BY name");
                $stmt->bind_param('s', $category);
            } else {
                $stmt = $this->conn->prepare("SELECT * FROM materials ORDER BY name");
            }
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            $materials = [];
            while ($row = $result->fetch_assoc()) {
                $materials[] = $row;
            }
            
            return ['success' => true, 'data' => $materials];
        } catch (Exception $e) {
            error_log("Error getting materials: " . $e->getMessage());
            return ['success' => false, 'message' => 'Error getting materials: ' . $e->getMessage()];
        }
    }

    // Search materials by name (for autocomplete)
    public function searchMaterials($query) {
        try {
            $searchQuery = "%$query%";
            $stmt = $this->conn->prepare("SELECT * FROM materials WHERE name LIKE ? ORDER BY name LIMIT 10");
            $stmt->bind_param('s', $searchQuery);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $materials = [];
            while ($row = $result->fetch_assoc()) {
                $materials[] = $row;
            }
            
            return ['success' => true, 'data' => $materials];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error searching materials: ' . $e->getMessage()];
        }
    }

    // Create new order
    public function createOrder($userId, $items, $notes = '') {
        try {
            // Start transaction
            $this->conn->begin_transaction();
            
            // Create order record
            $stmt = $this->conn->prepare("INSERT INTO material_orders (user_id, notes) VALUES (?, ?)");
            $stmt->bind_param('is', $userId, $notes);
            $stmt->execute();
            $orderId = $this->conn->insert_id;
            
            // Add order items
            $itemStmt = $this->conn->prepare("INSERT INTO material_order_items (order_id, material_id, quantity) VALUES (?, ?, ?)");
            
            foreach ($items as $item) {
                $itemStmt->bind_param('iii', $orderId, $item['material_id'], $item['quantity']);
                $itemStmt->execute();
            }
            
            // Commit transaction
            $this->conn->commit();
            
            return ['success' => true, 'message' => 'Order created successfully', 'order_id' => $orderId];
        } catch (Exception $e) {
            // Rollback on error
            $this->conn->rollback();
            return ['success' => false, 'message' => 'Error creating order: ' . $e->getMessage()];
        }
    }

    // Get all user orders
    public function getUserOrders($userId) {
        try {
            $stmt = $this->conn->prepare("
                SELECT mo.*, 
                       (SELECT GROUP_CONCAT(CONCAT(m.name, ' (', moi.quantity, ' ', m.unit, ')') SEPARATOR ', ') 
                        FROM material_order_items moi 
                        JOIN materials m ON moi.material_id = m.id 
                        WHERE moi.order_id = mo.id) as items_list
                FROM material_orders mo
                WHERE mo.user_id = ?
                ORDER BY mo.created_at DESC
            ");
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $orders = [];
            while ($row = $result->fetch_assoc()) {
                $orders[] = $row;
            }
            
            return ['success' => true, 'data' => $orders];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error getting orders: ' . $e->getMessage()];
        }
    }

    // Get all orders (for administrators)
    public function getAllOrders() {
        try {
            $stmt = $this->conn->prepare("
                SELECT mo.*, u.full_name as user_name,
                       (SELECT GROUP_CONCAT(CONCAT(m.name, ' (', moi.quantity, ' ', m.unit, ')') SEPARATOR ', ') 
                        FROM material_order_items moi 
                        JOIN materials m ON moi.material_id = m.id 
                        WHERE moi.order_id = mo.id) as items_list
                FROM material_orders mo
                JOIN users u ON mo.user_id = u.id
                ORDER BY mo.created_at DESC
            ");
            $stmt->execute();
            $result = $stmt->get_result();
            
            $orders = [];
            while ($row = $result->fetch_assoc()) {
                $orders[] = $row;
            }
            
            return ['success' => true, 'data' => $orders];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error getting orders: ' . $e->getMessage()];
        }
    }

    // Get order details including items
    public function getOrderDetails($orderId) {
        try {
            // Get order information
            $orderStmt = $this->conn->prepare("
                SELECT mo.*, u.full_name as user_name
                FROM material_orders mo
                JOIN users u ON mo.user_id = u.id
                WHERE mo.id = ?
            ");
            $orderStmt->bind_param('i', $orderId);
            $orderStmt->execute();
            $orderResult = $orderStmt->get_result();
            $order = $orderResult->fetch_assoc();
            
            if (!$order) {
                return ['success' => false, 'message' => 'Order not found'];
            }
            
            // Get order items
            $itemsStmt = $this->conn->prepare("
                SELECT moi.*, m.name, m.unit, m.category
                FROM material_order_items moi
                JOIN materials m ON moi.material_id = m.id
                WHERE moi.order_id = ?
            ");
            $itemsStmt->bind_param('i', $orderId);
            $itemsStmt->execute();
            $itemsResult = $itemsStmt->get_result();
            
            $items = [];
            while ($row = $itemsResult->fetch_assoc()) {
                $items[] = $row;
            }
            
            $order['items'] = $items;
            
            return ['success' => true, 'data' => $order];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error getting order details: ' . $e->getMessage()];
        }
    }

    // Update order status (for administrators)
    public function updateOrderStatus($orderId, $status) {
        try {
            $stmt = $this->conn->prepare("UPDATE material_orders SET status = ? WHERE id = ?");
            $stmt->bind_param('si', $status, $orderId);
            $stmt->execute();
            
            if ($stmt->affected_rows === 0) {
                return ['success' => false, 'message' => 'Order not found or status not changed'];
            }
            
            return ['success' => true, 'message' => 'Order status updated successfully'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error updating order status: ' . $e->getMessage()];
        }
    }
    
    // Add new material
    public function addMaterial($name, $category, $description, $unit) {
        try {
            // Validate category (it must be one of the allowed values in the ENUM)
            $allowedCategories = ['cleaning', 'paper', 'kitchen', 'laundry', 'other'];
            if (!in_array($category, $allowedCategories)) {
                return [
                    'success' => false, 
                    'message' => 'Invalid category. Allowed values: ' . implode(', ', $allowedCategories),
                    'provided_category' => $category
                ];
            }
            
            // Prepare and execute the SQL query
            $stmt = $this->conn->prepare("INSERT INTO materials (name, category, description, unit) VALUES (?, ?, ?, ?)");
            if (!$stmt) {
                return [
                    'success' => false,
                    'message' => 'Failed to prepare statement: ' . $this->conn->error
                ];
            }
            
            $stmt->bind_param('ssss', $name, $category, $description, $unit);
            $result = $stmt->execute();
            
            if (!$result) {
                return [
                    'success' => false,
                    'message' => 'Error executing query: ' . $stmt->error
                ];
            }
            
            if ($stmt->affected_rows === 0) {
                return [
                    'success' => false,
                    'message' => 'No rows inserted. Operation failed.'
                ];
            }
            
            $newId = $this->conn->insert_id;
            
            // Log successful addition
            error_log("Added new material: ID=$newId, Name=$name, Category=$category");
            
            return [
                'success' => true, 
                'message' => 'Material added successfully', 
                'id' => $newId,
                'data' => [
                    'id' => $newId,
                    'name' => $name,
                    'category' => $category,
                    'description' => $description,
                    'unit' => $unit
                ]
            ];
        } catch (Exception $e) {
            error_log("Error adding material: " . $e->getMessage());
            return ['success' => false, 'message' => 'Error adding material: ' . $e->getMessage()];
        }
    }
    
    // Update existing material
    public function updateMaterial($id, $name, $category, $description, $unit) {
        try {
            // Validate category (it must be one of the allowed values in the ENUM)
            $allowedCategories = ['cleaning', 'paper', 'kitchen', 'laundry', 'other'];
            if (!in_array($category, $allowedCategories)) {
                return [
                    'success' => false, 
                    'message' => 'Invalid category. Allowed values: ' . implode(', ', $allowedCategories),
                    'provided_category' => $category
                ];
            }
            
            // Prepare and execute the SQL query
            $stmt = $this->conn->prepare("UPDATE materials SET name = ?, category = ?, description = ?, unit = ? WHERE id = ?");
            if (!$stmt) {
                return [
                    'success' => false,
                    'message' => 'Failed to prepare statement: ' . $this->conn->error
                ];
            }
            
            $stmt->bind_param('ssssi', $name, $category, $description, $unit, $id);
            $result = $stmt->execute();
            
            if (!$result) {
                return [
                    'success' => false,
                    'message' => 'Error executing query: ' . $stmt->error
                ];
            }
            
            if ($stmt->affected_rows === 0) {
                // This could mean either material not found or no changes were made
                // Let's check if the material exists
                $checkStmt = $this->conn->prepare("SELECT id FROM materials WHERE id = ?");
                $checkStmt->bind_param('i', $id);
                $checkStmt->execute();
                $checkResult = $checkStmt->get_result();
                
                if ($checkResult->num_rows === 0) {
                    return [
                        'success' => false,
                        'message' => 'Material not found'
                    ];
                } else {
                    // Material exists but no changes were made
                    return [
                        'success' => true,
                        'message' => 'No changes were made to the material'
                    ];
                }
            }
            
            // Log successful update
            error_log("Updated material: ID=$id, Name=$name, Category=$category");
            
            return [
                'success' => true, 
                'message' => 'Material updated successfully', 
                'id' => $id,
                'data' => [
                    'id' => $id,
                    'name' => $name,
                    'category' => $category,
                    'description' => $description,
                    'unit' => $unit
                ]
            ];
        } catch (Exception $e) {
            error_log("Error updating material: " . $e->getMessage());
            return ['success' => false, 'message' => 'Error updating material: ' . $e->getMessage()];
        }
    }
    
    // Delete material
    public function deleteMaterial($id) {
        try {
            // Проверяем, существует ли материал
            $checkStmt = $this->conn->prepare("SELECT id, name FROM materials WHERE id = ?");
            $checkStmt->bind_param("i", $id);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            
            if ($result->num_rows === 0) {
                error_log("Material deletion failed: Material with ID $id not found");
                return array('success' => false, 'error' => 'Material not found');
            }
            
            $material = $result->fetch_assoc();
            $materialName = $material['name'];
            
            // Подготавливаем и выполняем запрос на удаление
            $stmt = $this->conn->prepare("DELETE FROM materials WHERE id = ?");
            
            if (!$stmt) {
                error_log("Material deletion failed: " . $this->conn->error);
                return array('success' => false, 'error' => 'Failed to prepare statement');
            }
            
            $stmt->bind_param("i", $id);
            
            if (!$stmt->execute()) {
                error_log("Material deletion failed for ID $id: " . $stmt->error);
                return array('success' => false, 'error' => 'Failed to delete material');
            }
            
            if ($stmt->affected_rows === 0) {
                error_log("Material deletion warning: No rows affected when deleting ID $id");
                return array('success' => false, 'error' => 'No material was deleted');
            }
            
            error_log("Material deleted successfully: ID $id, Name: $materialName");
            return array('success' => true, 'message' => 'Material deleted successfully');
            
        } catch (Exception $e) {
            error_log("Material deletion error: " . $e->getMessage());
            return array('success' => false, 'error' => 'An error occurred while deleting the material');
        }
    }
}

// Send materials API response
function sendMaterialsResponse($data) {
    // Set content type header to ensure proper JSON encoding
    header('Content-Type: application/json; charset=utf-8');
    
    // Send the JSON response
    echo json_encode($data);
    exit; // Terminate script execution after sending response
}

// Process API requests
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['materials_action'])) {
    $handler = new MaterialsHandler();
    $action = $_POST['materials_action'] ?? '';
    $response = null;
    
    switch ($action) {
        case 'getAllMaterials':
            $category = $_POST['category'] ?? null;
            $response = $handler->getAllMaterials($category);
            break;
            
        case 'searchMaterials':
            $query = $_POST['query'] ?? '';
            $response = $handler->searchMaterials($query);
            break;
            
        case 'createOrder':
            $userId = $_POST['user_id'] ?? 0;
            $notes = $_POST['notes'] ?? '';
            $items = json_decode($_POST['items'] ?? '[]', true);
            
            if (!$userId || empty($items)) {
                $response = ['success' => false, 'message' => 'Missing required parameters'];
            } else {
                $response = $handler->createOrder($userId, $items, $notes);
            }
            break;
            
        case 'getUserOrders':
            $userId = $_POST['user_id'] ?? 0;
            
            if (!$userId) {
                $response = ['success' => false, 'message' => 'User ID required'];
            } else {
                $response = $handler->getUserOrders($userId);
            }
            break;
            
        case 'getAllOrders':
            $response = $handler->getAllOrders();
            break;
            
        case 'getOrderDetails':
            $orderId = $_POST['order_id'] ?? 0;
            
            if (!$orderId) {
                $response = ['success' => false, 'message' => 'Order ID required'];
            } else {
                $response = $handler->getOrderDetails($orderId);
            }
            break;
            
        case 'updateOrderStatus':
            $orderId = $_POST['order_id'] ?? 0;
            $status = $_POST['status'] ?? '';
            
            if (!$orderId || !$status) {
                $response = ['success' => false, 'message' => 'Order ID and status required'];
            } else {
                $response = $handler->updateOrderStatus($orderId, $status);
            }
            break;
            
        case 'addMaterial':
            $name = $_POST['name'] ?? '';
            $category = $_POST['category'] ?? '';
            // Normalize category to lowercase
            $category = strtolower($category);
            $description = $_POST['description'] ?? '';
            $unit = $_POST['unit'] ?? '';
            
            if (!$name || !$category || !$unit) {
                $response = ['success' => false, 'message' => 'Name, category and unit required'];
            } else {
                $response = $handler->addMaterial($name, $category, $description, $unit);
            }
            break;
            
        case 'updateMaterial':
            $id = intval($_POST['id'] ?? 0);
            $name = $_POST['name'] ?? '';
            $category = $_POST['category'] ?? '';
            // Normalize category to lowercase
            $category = strtolower($category);
            $description = $_POST['description'] ?? '';
            $unit = $_POST['unit'] ?? '';
            
            if (!$id || !$name || !$category || !$unit) {
                $response = ['success' => false, 'message' => 'ID, name, category and unit required'];
            } else {
                $response = $handler->updateMaterial($id, $name, $category, $description, $unit);
            }
            break;
            
        case 'deleteMaterial':
            $id = $_POST['id'] ?? 0;
            
            if (!$id) {
                $response = ['success' => false, 'message' => 'Material ID required'];
            } else {
                $response = $handler->deleteMaterial($id);
            }
            break;
            
        default:
            $response = ['success' => false, 'message' => 'Invalid materials action'];
    }
    
    // Send the JSON response
    sendMaterialsResponse($response);
}
?> 