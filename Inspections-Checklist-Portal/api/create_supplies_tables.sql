-- Script to create necessary tables for supplies module

-- Create supply_orders table if not exists
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

-- Create supply_order_items table if not exists
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