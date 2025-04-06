<?php
// Enable error reporting for development
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Include database connection
require_once 'database.php';

// Create database connection
$db = new Database();
$conn = $db->getConnection();

// Function to get all materials
function getAllMaterials($conn) {
    $query = "SELECT * FROM materials ORDER BY name";
    $result = $conn->query($query);
    
    $materials = [];
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $materials[] = $row;
        }
    }
    
    return $materials;
}

// Function to get all orders
function getAllOrders($conn) {
    $query = "SELECT mo.*, 
              (SELECT GROUP_CONCAT(CONCAT(m.name, ' (', moi.quantity, ' ', m.unit, ')') SEPARATOR ', ') 
               FROM material_order_items moi 
               JOIN materials m ON moi.material_id = m.id 
               WHERE moi.order_id = mo.id) as items_list
              FROM material_orders mo
              ORDER BY mo.created_at DESC";
    
    $result = $conn->query($query);
    
    $orders = [];
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $orders[] = $row;
        }
    }
    
    return $orders;
}

$materials = getAllMaterials($conn);
$orders = getAllOrders($conn);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Materials English Verification</title>
    <link rel="stylesheet" href="materials.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            padding: 0;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #2980b9;
            margin-top: 30px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .category-tag {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 14px;
            color: white;
            background-color: #3498db;
        }
        .order-card {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 15px;
            background-color: #f9f9f9;
        }
        .order-header {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 10px;
        }
        .status-pending {
            color: #f39c12;
        }
        .status-approved {
            color: #27ae60;
        }
        .status-rejected {
            color: #e74c3c;
        }
        .status-delivered {
            color: #2980b9;
        }
        .back-link {
            display: inline-block;
            margin-top: 20px;
            color: #3498db;
            text-decoration: none;
        }
        .back-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Materials English Verification</h1>
        
        <h2>Materials List</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Unit</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($materials as $material): ?>
                <tr>
                    <td><?php echo $material['id']; ?></td>
                    <td><?php echo $material['name']; ?></td>
                    <td>
                        <span class="category-tag">
                            <?php 
                            $categories = [
                                'cleaning' => 'Cleaning supplies',
                                'paper' => 'Paper products',
                                'kitchen' => 'Kitchen items',
                                'laundry' => 'Laundry products',
                                'other' => 'Other'
                            ];
                            echo isset($categories[$material['category']]) ? $categories[$material['category']] : $material['category']; 
                            ?>
                        </span>
                    </td>
                    <td><?php echo $material['description']; ?></td>
                    <td><?php echo $material['unit']; ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        
        <h2>Recent Orders</h2>
        <div class="orders-container">
            <?php if (empty($orders)): ?>
                <p>No orders found.</p>
            <?php else: ?>
                <?php foreach ($orders as $order): ?>
                    <div class="order-card">
                        <div class="order-header">
                            <div class="order-id"><strong>Order #<?php echo $order['id']; ?></strong></div>
                            <div class="order-date"><?php echo date('M d, Y H:i', strtotime($order['created_at'])); ?></div>
                        </div>
                        <div class="order-status <?php echo 'status-' . $order['status']; ?>">
                            <strong>Status:</strong> <?php echo ucfirst($order['status']); ?>
                        </div>
                        <div class="order-items">
                            <strong>Items:</strong> <?php echo $order['items_list'] ?: 'No items'; ?>
                        </div>
                        <?php if (!empty($order['notes'])): ?>
                            <div class="order-notes">
                                <strong>Notes:</strong> <?php echo $order['notes']; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
        
        <a href="materials.php" class="back-link">Go to Materials Page</a>
    </div>
</body>
</html> 