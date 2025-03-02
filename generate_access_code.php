<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Подключаем необходимые классы PHPMailer
require 'vendor/phpmailer/phpmailer/src/Exception.php';
require 'vendor/phpmailer/phpmailer/src/PHPMailer.php';
require 'vendor/phpmailer/phpmailer/src/SMTP.php';

require 'classes/Mailer.php';
require 'classes/AccessCodeManager.php';

try {
    $manager = new AccessCodeManager();
    
    if ($manager->createNewCode()) {
        echo "<h2>Результат:</h2>";
        echo "<p style='color: green;'>Новый код доступа успешно создан и отправлен на email администратора!</p>";
    }
    
} catch (Exception $e) {
    echo "<h2>Ошибка:</h2>";
    echo "<p style='color: red;'>" . htmlspecialchars($e->getMessage()) . "</p>";
} 