<?php
// Include database connection
require_once 'database.php';

// Create admin user directly with PHP
try {
    echo "Starting user creation process...\n";
    
    // Create database connection
    $db = new Database();
    $conn = $db->getConnection();
    
    // Check if user exists
    $email = 'Jana.Haigood@AlcuinSchool.org';
    $fullName = 'Jana Haigood';
    $department = 'admin';
    $role = 'admin';
    $password = 'roooot'; 
    
    echo "Checking if user exists...\n";
    $checkStmt = $conn->prepare("SELECT id, email FROM users WHERE email = ?");
    $checkStmt->bind_param('s', $email);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $existingUser = $result->fetch_assoc();
    
    // Hash the password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    if ($existingUser) {
        // Update user
        echo "User exists. Updating role to admin...\n";
        $updateStmt = $conn->prepare("UPDATE users SET department = ?, role = ?, password = ? WHERE email = ?");
        $updateStmt->bind_param('ssss', $department, $role, $passwordHash, $email);
        
        if ($updateStmt->execute()) {
            echo "User '{$fullName}' updated successfully with admin role.\n";
        } else {
            echo "Error updating user: " . $updateStmt->error . "\n";
        }
    } else {
        // Create new user
        echo "User doesn't exist. Creating new admin user...\n";
        $insertStmt = $conn->prepare("INSERT INTO users (email, full_name, department, role, password) VALUES (?, ?, ?, ?, ?)");
        $insertStmt->bind_param('sssss', $email, $fullName, $department, $role, $passwordHash);
        
        if ($insertStmt->execute()) {
            echo "Admin user '{$fullName}' created successfully.\n";
        } else {
            echo "Error creating user: " . $insertStmt->error . "\n";
        }
    }
    
    echo "Process completed.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?> 