<?php
// Script for creating material tables

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
    $sql = file_get_contents(__DIR__ . '/sql/materials_table.sql');
    
    // Execute SQL queries
    $result = $conn->multi_query($sql);
    
    if ($result) {
        echo "<p>Material tables successfully created.</p>";
        
        // Process results of each query
        do {
            // Free results for next query
            if ($res = $conn->store_result()) {
                $res->free();
            }
        } while ($conn->more_results() && $conn->next_result());
    } else {
        echo "<p>Error creating tables: " . $conn->error . "</p>";
    }
    
} catch (Exception $e) {
    echo "<p>An error occurred: " . $e->getMessage() . "</p>";
}
?> 