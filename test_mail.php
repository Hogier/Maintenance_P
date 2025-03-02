<?php
// Включаем отображение всех ошибок для диагностики
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>Тестирование отправки почты</h2>";

// Проверяем конфигурацию
echo "<h3>Текущие настройки почты:</h3>";
echo "sendmail_path: " . ini_get('sendmail_path') . "<br>";
echo "SMTP: " . ini_get('SMTP') . "<br>";
echo "smtp_port: " . ini_get('smtp_port') . "<br>";

// Пытаемся отправить тестовое письмо
$to = "dmitriy.palchikov@gmail.com";
$subject = "Тестовое письмо";
$message = "Это тестовое письмо для проверки работы PHP mail().";
$headers = "From: test@localhost\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

echo "<h3>Попытка отправки письма:</h3>";
$result = mail($to, $subject, $message, $headers);

if($result) {
    echo "<p style='color: green;'>Письмо успешно отправлено!</p>";
} else {
    echo "<p style='color: red;'>Ошибка при отправке письма.</p>";
}

// Проверяем лог ошибок
$error_log = error_get_last();
if($error_log) {
    echo "<h3>Последняя ошибка:</h3>";
    echo "<pre>";
    print_r($error_log);
    echo "</pre>";
}

// Проверяем статус Postfix
echo "<h3>Статус Postfix:</h3>";
echo "<pre>";
$postfix_status = shell_exec('ps aux | grep postfix | grep -v grep');
echo htmlspecialchars($postfix_status);
echo "</pre>";
?> 