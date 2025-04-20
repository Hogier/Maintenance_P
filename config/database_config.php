<?php
define('DB_HOST', 'macan.cityhost.com.ua');
define('DB_USER', 'chff6ee508');
define('DB_PASS', '73b6bd56cf');
define('DB_NAME', 'chff6ee508');

function getDBConnection() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($conn->connect_error) {
            throw new Exception("Connection failed: " . $conn->connect_error);
        }
        
        $conn->set_charset("utf8");
        return $conn;
    } catch (Exception $e) {
        error_log("Database connection error: " . $e->getMessage());
        return null;
    }
} 