-- SQL for creating material tables

-- Table for storing materials
CREATE TABLE IF NOT EXISTS materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category ENUM('cleaning', 'paper', 'kitchen', 'laundry', 'other') NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL, -- e.g., rolls, boxes, bottles
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for storing material orders
CREATE TABLE IF NOT EXISTS material_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'delivered') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for order items (many-to-many relationship)
CREATE TABLE IF NOT EXISTS material_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    material_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES material_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);

-- Insert initial test data
INSERT INTO materials (name, category, description, unit) VALUES
('Toilet Paper', 'paper', 'Standard toilet paper rolls', 'rolls'),
('Paper Towels', 'paper', 'Kitchen paper towels', 'rolls'),
('Hand Soap', 'cleaning', 'Bathroom hand soap', 'bottles'),
('Dish Soap', 'kitchen', 'Dishwashing liquid', 'bottles'),
('Laundry Detergent', 'laundry', 'Standard laundry detergent', 'boxes'),
('Disinfectant Spray', 'cleaning', 'Surface disinfectant spray', 'bottles'),
('Hand Sanitizer', 'cleaning', 'Alcohol-based hand sanitizer', 'bottles'),
('Facial Tissues', 'paper', 'Facial tissue boxes', 'boxes'),
('Paper Napkins', 'paper', 'Paper napkins for dining', 'packs'),
('Whiteboard Cleaner', 'cleaning', 'Whiteboard cleaning solution', 'bottles');