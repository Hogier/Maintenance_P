<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once dirname(__FILE__) . '/database.php';
require_once dirname(__FILE__) . '/vendor/phpmailer/phpmailer/src/Exception.php';
require_once dirname(__FILE__) . '/vendor/phpmailer/phpmailer/src/PHPMailer.php';
require_once dirname(__FILE__) . '/vendor/phpmailer/phpmailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

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
        
        // Настройки сервера
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'dmitriy.palchikov@gmail.com';
        $mail->Password = 'rgnj nxtv rqkq fyyp';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        
        // Настройки отправителя и получателя
        $mail->setFrom('dmitriy.palchikov@gmail.com', 'Admin');
        $mail->addAddress($to);
        
        // Контент
        $mail->isHTML(true);
        $mail->Subject = 'Access Code for Registration';
        $mail->Body = "Your access code for registration is: <br><br><strong style='font-size: 24px;'>{$code}</strong><br><br>This code will be valid for one month.";
        
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Email sending failed: " . $e->getMessage());
        throw new Exception("Failed to send email: " . $e->getMessage());
    }
}

function saveAccessCode($code) {
    try {
        $database = new Database();
        $conn = $database->getConnection();
        
        $currentDate = date('Y-m-d H:i:s');
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
        
        $stmt = $conn->prepare("INSERT INTO access_codes (code, status, created_at, expires_at) VALUES (?, 'active', ?, ?)");
        $stmt->bind_param('sss', $code, $currentDate, $expiresAt);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to save code: " . $conn->error);
        }
        
        return true;
    } catch (Exception $e) {
        error_log("Error saving code: " . $e->getMessage());
        throw new Exception("Failed to save code: " . $e->getMessage());
    }
}
?> 