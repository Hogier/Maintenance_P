<?php
require_once __DIR__ . '/../classes/AccessCode.php';
require_once __DIR__ . '/../config/config.php';

// List of admin emails
$admin_emails = [
    'dmitriy.palchikov@gmail.com'
    // Добавьте другие email-адреса при необходимости
];

try {
    $accessCode = new AccessCode();
    
    // Deactivate expired codes
    $accessCode->deactivateExpiredCodes();
    
    // Generate new code for each admin
    foreach ($admin_emails as $email) {
        $result = $accessCode->createNewCode($email);
        if ($result['success']) {
            echo "Successfully generated and sent code {$result['code']} to {$email}\n";
        } else {
            echo "Failed to generate/send code for {$email}: {$result['message']}\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
} 