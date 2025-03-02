<?php
// Enable output buffering
ob_start();

// Set timezone
date_default_timezone_set('America/Chicago');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', dirname(__FILE__) . '/verify_debug.log');

// Make sure log file is writable
$logFile = dirname(__FILE__) . '/verify_debug.log';
if (!file_exists($logFile)) {
    touch($logFile);
    chmod($logFile, 0666);
}

require_once dirname(__FILE__) . '/database.php';
require_once dirname(__FILE__) . '/vendor/phpmailer/phpmailer/src/Exception.php';
require_once dirname(__FILE__) . '/vendor/phpmailer/phpmailer/src/PHPMailer.php';
require_once dirname(__FILE__) . '/vendor/phpmailer/phpmailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function debug_log($message) {
    $timestamp = date('Y-m-d H:i:s');
    $timezone = date_default_timezone_get();
    error_log("[$timestamp $timezone] $message\n", 3, "verify_debug.log");
}

function formatCode($code) {
    $cleanCode = preg_replace('/[\s-]/', '', $code);
    if (strlen($cleanCode) === 12) {
        return substr($cleanCode, 0, 4) . '-' . 
               substr($cleanCode, 4, 4) . '-' . 
               substr($cleanCode, 8, 4);
    }
    return $cleanCode;
}

function generateAccessCode() {
    try {
        $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $code = '';
        
        // Generate three groups of four characters
        for ($group = 0; $group < 3; $group++) {
            for ($i = 0; $i < 4; $i++) {
                $code .= $characters[random_int(0, strlen($characters) - 1)];
            }
            if ($group < 2) {
                $code .= '-';
            }
        }
        
        return $code;
    } catch (Exception $e) {
        error_log("Error generating code: " . $e->getMessage());
        throw new Exception("Failed to generate access code");
    }
}

function sendEmailWithCode($to, $code) {
    try {
        $mail = new PHPMailer(true);
        
        // Server settings
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'dmitriy.palchikov@gmail.com';
        $mail->Password = 'rgnj nxtv rqkq fyyp';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        
        // Sender and recipient settings
        $mail->setFrom('dmitriy.palchikov@gmail.com', 'Admin');
        $mail->addAddress($to);
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = 'Access Code for Registration';
        $mail->Body = "Your access code for registration is: <br><br><strong style='font-size: 24px;'>{$code}</strong><br><br>This code will be valid for one month.";
        
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Email sending failed: " . $e->getMessage());
        return false;
    }
}

function updateAccessCode() {
    // Create database connection
    $db = new Database();
    $conn = $db->getConnection();
    
    $newCode = generateAccessCode();
    $currentDate = date('Y-m-d H:i:s');
    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
    $adminEmail = 'dmitriy.palchikov@gmail.com';
    
    // Check existing codes
    $stmt = $conn->prepare("SELECT * FROM access_codes WHERE status = 'active' AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1");
    $stmt->execute();
    $result = $stmt->get_result();
    $existingCode = $result->fetch_assoc();
    
    if ($existingCode) {
        // Code is still valid
        $conn->close();
        return $existingCode['code'];
    }
    
    // Create new code
    $stmt = $conn->prepare("INSERT INTO access_codes (code, status, created_at, expires_at) VALUES (?, 'active', ?, ?)");
    $stmt->bind_param('sss', $newCode, $currentDate, $expiresAt);
    
    if ($stmt->execute()) {
        // Send code via email
        if (sendEmailWithCode($adminEmail, $newCode)) {
            $conn->close();
            return $newCode;
        }
    }
    
    $conn->close();
    return false;
}

// Function to send JSON response
function sendJsonResponse($success, $message) {
    // Clear output buffer
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Set headers
    header('Content-Type: application/json');
    header('Cache-Control: no-cache, must-revalidate');
    
    // Send response
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}

// Handle POST request for code verification
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    debug_log("=== Starting code verification ===");
    debug_log("POST data: " . print_r($_POST, true));
    
    try {
        // Check if action and code are provided
        if (!isset($_POST['action']) || !isset($_POST['code'])) {
            debug_log("Error: Missing action or code");
            sendJsonResponse(false, "Invalid request: Missing required parameters");
        }

        if ($_POST['action'] !== 'verifyAccessCode') {
            debug_log("Error: Invalid action - " . $_POST['action']);
            sendJsonResponse(false, "Invalid action");
        }

        // Create database connection
        $db = new Database();
        $conn = $db->getConnection();
        
        debug_log("Starting transaction");
        // Disable autocommit for transaction management
        $conn->autocommit(FALSE);
        
        $code = $_POST['code'];
        debug_log("Received code: " . $code);
        
        // Format the code
        debug_log("Original code: " . $code);
        $cleanCode = preg_replace('/[\s-]/', '', $code);
        debug_log("Clean code: " . $cleanCode);
        $formattedCode = formatCode($cleanCode);
        debug_log("Formatted code: " . $formattedCode);
        
        // Get current server time
        $currentTime = date('Y-m-d H:i:s');
        debug_log("Current server time: " . $currentTime);
        
        // Simple check for active code
        $stmt = $conn->prepare("
            SELECT * FROM access_codes 
            WHERE code = ? 
            AND status = 'active' 
            AND expires_at > ? 
            FOR UPDATE
        ");
        $stmt->bind_param('ss', $formattedCode, $currentTime);
        $stmt->execute();
        $result = $stmt->get_result();
        $codeData = $result->fetch_assoc();
        
        debug_log("Code data from database: " . print_r($codeData, true));
        
        if (!$codeData) {
            $conn->rollback();
            debug_log("Error: Code not found or not active");
            sendJsonResponse(false, 'Invalid or expired code');
        }
        
        // Code is valid - mark it as used
        debug_log("Code is valid, marking as used");
        
        $updateStmt = $conn->prepare("
            UPDATE access_codes 
            SET status = 'used', used_at = ? 
            WHERE id = ? 
            AND status = 'active'
        ");
        $updateStmt->bind_param('si', $currentTime, $codeData['id']);
        $updateResult = $updateStmt->execute();
        
        debug_log("Update result: " . ($updateResult ? 'Success' : 'Failed'));
        debug_log("Rows affected: " . $updateStmt->affected_rows);
        
        if ($updateResult && $updateStmt->affected_rows > 0) {
            debug_log("Committing transaction");
            $conn->commit();
            debug_log("Code successfully verified and marked as used");
            sendJsonResponse(true, 'Code verified successfully');
        } else {
            debug_log("Rolling back transaction - no rows affected");
            $conn->rollback();
            debug_log("Error: Failed to update code status");
            sendJsonResponse(false, 'Invalid or expired code: Failed to update status');
        }
        
    } catch (Exception $e) {
        if (isset($conn)) {
            debug_log("Rolling back transaction due to error: " . $e->getMessage());
            $conn->rollback();
        }
        debug_log("Error: " . $e->getMessage());
        sendJsonResponse(false, 'An error occurred while verifying the code');
    } finally {
        // Restore autocommit and close connection
        if (isset($conn)) {
            $conn->autocommit(TRUE);
            $conn->close();
            debug_log("Connection closed");
        }
    }
}

debug_log("=== End of script ===");
exit;
?> 