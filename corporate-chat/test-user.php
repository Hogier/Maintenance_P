<?php
// Database connection
require_once '../database.php';

// Initialize database connection
try {
    $db = new Database();
    $conn = new PDO("mysql:host=macan.cityhost.com.ua;dbname=chff6ee508", "chff6ee508", "73b6bd56cf");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Get user by email
$email = "Dmytro.Palchykov@alcuinschool.org";

try {
    $stmt = $conn->prepare("SELECT id, full_name, email, role, department FROM users WHERE email = :email");
    $stmt->bindParam(':email', $email, PDO::PARAM_STR);
    $stmt->execute();
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "<pre>";
    print_r($user);
    echo "</pre>";
    
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?> 