<?php
require_once __DIR__ . '/../config/database_config.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class AccessCode {
    private $conn;
    
    public function __construct() {
        $this->conn = getDBConnection();
        if (!$this->conn) {
            throw new Exception("Database connection failed");
        }
    }
    
    public function generateCode() {
        $parts = [];
        for ($i = 0; $i < 3; $i++) {
            $parts[] = substr(str_shuffle("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"), 0, 4);
        }
        return implode("-", $parts);
    }
    
    public function createNewCode($email) {
        $code = $this->generateCode();
        $current_time = date('Y-m-d H:i:s');
        $expires_at = date('Y-m-d H:i:s', strtotime('+30 days'));
        
        $stmt = $this->conn->prepare("INSERT INTO access_codes (code, status, created_at, expires_at) VALUES (?, 'active', ?, ?)");
        $stmt->bind_param("sss", $code, $current_time, $expires_at);
        
        if ($stmt->execute()) {
            if ($this->sendCodeByEmail($email, $code)) {
                return ['success' => true, 'code' => $code];
            } else {
                // If email fails, delete the code
                $this->deleteCode($code);
                return ['success' => false, 'message' => 'Failed to send email'];
            }
        }
        
        return ['success' => false, 'message' => 'Failed to generate code'];
    }
    
    public function verifyCode($code) {
        $stmt = $this->conn->prepare("SELECT status, expires_at FROM access_codes WHERE code = ?");
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            if ($row['status'] === 'expired' || strtotime($row['expires_at']) < time()) {
                return ['valid' => false, 'message' => 'Code has expired'];
            }
            
            // Code is valid if it's not expired (removed the 'used' status check)
            return ['valid' => true];
        }
        
        return ['valid' => false, 'message' => 'Invalid code'];
    }
    
    private function markCodeAsUsed($code) {
        // This function is no longer needed but kept for compatibility
        // It will be called but won't change the code status
        return;
    }
    
    private function deleteCode($code) {
        $stmt = $this->conn->prepare("DELETE FROM access_codes WHERE code = ?");
        $stmt->bind_param("s", $code);
        $stmt->execute();
    }
    
    private function sendCodeByEmail($email, $code) {
        $mail = new PHPMailer(true);
        
        try {
            // Get email configuration
            $mail_config = require __DIR__ . '/../config/mail_config.php';
            $settings = $mail_config['mail_settings'];
            $mode = $mail_config['mode'];
            
            $mail->isSMTP();
            $mail->Host = $settings['host'];
            $mail->Port = $settings['port'];
            $mail->SMTPAuth = $settings['smtp_auth'];
            $mail->SMTPSecure = $settings['smtp_secure'];
            
            // Use settings based on mode (local or production)
            $mail->Username = $settings[$mode]['username'];
            $mail->Password = $settings[$mode]['password'];
            $mail->setFrom($settings[$mode]['from_email'], $settings[$mode]['from_name']);
            
            $mail->addAddress($email);
            $mail->isHTML(true);
            
            $mail->Subject = 'Your Access Code';
            $mail->Body = "
                <h2>Your Access Code</h2>
                <p>Here is your access code: <strong>{$code}</strong></p>
                <p>This code will expire in 30 days.</p>
                <p>Please use this code to complete your registration.</p>
            ";
            
            $result = $mail->send();
            if (!$result) {
                error_log("Email sending failed: " . $mail->ErrorInfo);
            }
            return $result;
        } catch (Exception $e) {
            error_log("Email sending failed: " . $e->getMessage());
            return false;
        }
    }
    
    public function deactivateExpiredCodes() {
        $current_time = date('Y-m-d H:i:s');
        $stmt = $this->conn->prepare("UPDATE access_codes SET status = 'expired' WHERE expires_at < ?");
        $stmt->bind_param("s", $current_time);
        $stmt->execute();
    }
} 