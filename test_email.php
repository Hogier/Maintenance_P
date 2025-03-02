<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once dirname(__FILE__) . '/vendor/phpmailer/phpmailer/src/Exception.php';
require_once dirname(__FILE__) . '/vendor/phpmailer/phpmailer/src/PHPMailer.php';
require_once dirname(__FILE__) . '/vendor/phpmailer/phpmailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function testEmailSending($to) {
    $mail = new PHPMailer(true);
    
    try {
        // Настройки сервера
        $mail->SMTPDebug = 2; // Включаем подробный вывод для отладки
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
        $mail->Subject = 'Test Email from Maintenance Portal';
        $mail->Body = "This is a test email from the Maintenance Portal.<br><br>If you received this email, the email sending functionality is working correctly.";
        
        $mail->send();
        echo "<p style='color:green'>✓ Message sent successfully to {$to}</p>";
        return true;
    } catch (Exception $e) {
        echo "<p style='color:red'>✗ Message could not be sent. Mailer Error: {$mail->ErrorInfo}</p>";
        return false;
    }
}

// Тестируем отправку кода
echo "<h2>Testing Email Functionality</h2>";

// Список email-адресов для тестирования
$testEmails = [
    'dmitriy.palchikov@gmail.com'
];

foreach ($testEmails as $email) {
    echo "<h3>Testing email sending to: {$email}</h3>";
    testEmailSending($email);
}
?> 