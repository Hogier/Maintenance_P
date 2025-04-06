<?php
// Script to update materials database to English

// Enable error display for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Database connection
require_once 'database.php';

try {
    // Create Database instance
    $db = new Database();
    $conn = $db->getConnection();
    
    // Read SQL file
    $sql = file_get_contents(__DIR__ . '/update_materials_english.sql');
    
    // Display current materials before update
    echo "<h2>Materials before update:</h2>";
    $result = $conn->query("SELECT id, name, description, unit FROM materials ORDER BY id");
    echo "<table border='1'><tr><th>ID</th><th>Name</th><th>Description</th><th>Unit</th></tr>";
    while ($row = $result->fetch_assoc()) {
        echo "<tr><td>{$row['id']}</td><td>{$row['name']}</td><td>{$row['description']}</td><td>{$row['unit']}</td></tr>";
    }
    echo "</table>";
    
    // Execute SQL queries
    if ($conn->multi_query($sql)) {
        echo "<p>Materials successfully updated to English.</p>";
        
        // Process results of each query
        do {
            // Free results for next query
            if ($res = $conn->store_result()) {
                $res->free();
            }
        } while ($conn->more_results() && $conn->next_result());
    } else {
        echo "<p>Error updating materials: " . $conn->error . "</p>";
    }
    
    // Display updated materials
    echo "<h2>Materials after update:</h2>";
    $result = $conn->query("SELECT id, name, description, unit FROM materials ORDER BY id");
    echo "<table border='1'><tr><th>ID</th><th>Name</th><th>Description</th><th>Unit</th></tr>";
    while ($row = $result->fetch_assoc()) {
        echo "<tr><td>{$row['id']}</td><td>{$row['name']}</td><td>{$row['description']}</td><td>{$row['unit']}</td></tr>";
    }
    echo "</table>";
    
    // Update SQL file if needed
    $updateSql = "-- SQL for creating material tables\n\n";
    $updateSql .= "-- Table for storing materials\n";
    $updateSql .= "CREATE TABLE IF NOT EXISTS materials (\n";
    $updateSql .= "    id INT AUTO_INCREMENT PRIMARY KEY,\n";
    $updateSql .= "    name VARCHAR(255) NOT NULL,\n";
    $updateSql .= "    category ENUM('cleaning', 'paper', 'kitchen', 'laundry', 'other') NOT NULL,\n";
    $updateSql .= "    description TEXT,\n";
    $updateSql .= "    unit VARCHAR(50) NOT NULL, -- e.g., rolls, boxes, bottles\n";
    $updateSql .= "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n";
    $updateSql .= "    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n";
    $updateSql .= ");\n\n";
    $updateSql .= "-- Table for storing material orders\n";
    $updateSql .= "CREATE TABLE IF NOT EXISTS material_orders (\n";
    $updateSql .= "    id INT AUTO_INCREMENT PRIMARY KEY,\n";
    $updateSql .= "    user_id INT NOT NULL,\n";
    $updateSql .= "    status ENUM('pending', 'approved', 'rejected', 'delivered') DEFAULT 'pending',\n";
    $updateSql .= "    notes TEXT,\n";
    $updateSql .= "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n";
    $updateSql .= "    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n";
    $updateSql .= "    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE\n";
    $updateSql .= ");\n\n";
    $updateSql .= "-- Table for order items (many-to-many relationship)\n";
    $updateSql .= "CREATE TABLE IF NOT EXISTS material_order_items (\n";
    $updateSql .= "    id INT AUTO_INCREMENT PRIMARY KEY,\n";
    $updateSql .= "    order_id INT NOT NULL,\n";
    $updateSql .= "    material_id INT NOT NULL,\n";
    $updateSql .= "    quantity INT NOT NULL DEFAULT 1,\n";
    $updateSql .= "    FOREIGN KEY (order_id) REFERENCES material_orders(id) ON DELETE CASCADE,\n";
    $updateSql .= "    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE\n";
    $updateSql .= ");\n\n";
    $updateSql .= "-- Insert initial test data\n";
    $updateSql .= "INSERT INTO materials (name, category, description, unit) VALUES\n";
    $updateSql .= "('Toilet Paper', 'paper', 'Standard toilet paper rolls', 'rolls'),\n";
    $updateSql .= "('Paper Towels', 'paper', 'Kitchen paper towels', 'rolls'),\n";
    $updateSql .= "('Hand Soap', 'cleaning', 'Bathroom hand soap', 'bottles'),\n";
    $updateSql .= "('Dish Soap', 'kitchen', 'Dishwashing liquid', 'bottles'),\n";
    $updateSql .= "('Laundry Detergent', 'laundry', 'Standard laundry detergent', 'boxes'),\n";
    $updateSql .= "('Disinfectant Spray', 'cleaning', 'Surface disinfectant spray', 'bottles'),\n";
    $updateSql .= "('Hand Sanitizer', 'cleaning', 'Alcohol-based hand sanitizer', 'bottles'),\n";
    $updateSql .= "('Facial Tissues', 'paper', 'Facial tissue boxes', 'boxes'),\n";
    $updateSql .= "('Paper Napkins', 'paper', 'Paper napkins for dining', 'packs'),\n";
    $updateSql .= "('Whiteboard Cleaner', 'cleaning', 'Whiteboard cleaning solution', 'bottles');";
    
    // Write updated SQL file
    file_put_contents(__DIR__ . '/sql/materials_table_english.sql', $updateSql);
    echo "<p>Updated SQL file created: sql/materials_table_english.sql</p>";
    
} catch (Exception $e) {
    echo "<p>An error occurred: " . $e->getMessage() . "</p>";
}

echo "<p><a href='materials.php'>Go to Materials Page</a></p>";
?> 