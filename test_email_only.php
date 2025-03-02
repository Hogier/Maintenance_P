<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once dirname(__FILE__) . '/vendor/phpmailer/phpmailer/src/Exception.php';
require_once dirname(__FILE__) . '/vendor/phpmailer/phpmailer/src/PHPMailer.php';
require_once dirname(__FILE__) . '/vendor/phpmailer/phpmailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

try {
    $mail = new PHPMailer(true);
    
    // Включаем подробный вывод ошибок
    $mail->SMTPDebug = 2;
    
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
    $mail->addAddress('dmitriy.palchikov@gmail.com');
    
    // Контент
    $mail->isHTML(true);
    $mail->Subject = 'Test Email';
    $mail->Body = 'This is a test email to verify SMTP settings.';
    
    $mail->send();
    echo "Test email sent successfully!";
    
} catch (Exception $e) {
    echo "Error sending email: " . $mail->ErrorInfo;
}
?> 