<?php
// Включаем отображение всех ошибок
error_reporting(E_ALL);
ini_set('display_errors', 1);

require 'vendor/autoload.php';
require 'classes/Mailer.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Тестовый код для отправки email
$mail = new PHPMailer(true);

try {
    $mailer = new Mailer();
    
    // Тестовое письмо
    $result = $mailer->sendMail(
        'dmitriy.palchikov@gmail.com',
        'Тест новой системы отправки почты',
        '<h1>Тестовое письмо</h1><p>Это письмо отправлено через новую систему отправки почты.</p>'
    );
    
    echo "<h2>Результат отправки:</h2>";
    echo $result ? 
        "<p style='color: green;'>Письмо успешно отправлено!</p>" : 
        "<p style='color: red;'>Ошибка при отправке письма.</p>";
    
} catch (Exception $e) {
    echo "<h2>Ошибка:</h2>";
    echo "<p style='color: red;'>" . htmlspecialchars($e->getMessage()) . "</p>";
} 