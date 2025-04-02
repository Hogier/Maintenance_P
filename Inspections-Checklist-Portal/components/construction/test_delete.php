<?php
// Simple test script for testing the DELETE method of files.php

// Set file ID to delete (change this to a valid file ID)
$fileId = 1; 

// Initialize cURL session
$ch = curl_init();

// Set cURL options
curl_setopt($ch, CURLOPT_URL, "http://localhost/Maintenance_P/Inspections-Checklist-Portal/components/construction/api/files.php?id=" . $fileId);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// Execute cURL session
$response = curl_exec($ch);

// Check for errors
if(curl_errno($ch)) {
    echo 'cURL error: ' . curl_error($ch);
} else {
    // Print response
    echo "Response: <pre>";
    print_r(json_decode($response, true));
    echo "</pre>";
}

// Close cURL session
curl_close($ch);
?> 