<?php
require_once dirname(__FILE__) . '/../database.php';
require_once dirname(__FILE__) . '/../vendor/phpmailer/phpmailer/src/Exception.php';
require_once dirname(__FILE__) . '/../vendor/phpmailer/phpmailer/src/PHPMailer.php';
require_once dirname(__FILE__) . '/../vendor/phpmailer/phpmailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Загружаем конфигурацию
$config = require dirname(__FILE__) . '/../config/app_config.php';

// Получаем настройки текущего окружения
$env = $config['environment'];
$settings = $config[$env];

function sendEmailWithCode($settings, $to, $code, $isProduction = false) {
    $mail = new PHPMailer(true);
    
    try {
        // Настройки сервера
        $mail->isSMTP();
        $mail->Host = $settings['smtp']['host'];
        $mail->SMTPAuth = true;
        $mail->Username = $settings['smtp']['username'];
        $mail->Password = $settings['smtp']['password'];
        $mail->SMTPSecure = $settings['smtp']['encryption'];
        $mail->Port = $settings['smtp']['port'];
        
        // Настройки отправителя и получателя
        $mail->setFrom($settings['smtp']['username'], $settings['smtp']['from_name']);
        $mail->addAddress($to);
        
        // Контент
        $mail->isHTML(true);
        $mail->Subject = ($isProduction ? '[PRODUCTION] ' : '[LOCAL] ') . 'Новый код доступа для регистрации';
        $mail->Body = "
            <h2>Код доступа для регистрации" . ($isProduction ? ' (PRODUCTION)' : ' (LOCAL)') . "</h2>
            <p>Был автоматически сгенерирован новый код доступа для регистрации пользователей:</p>
            <h3 style='background: #f0f0f0; padding: 10px; font-family: monospace;'>{$code}</h3>
            <p>Этот код действителен в течение {$settings['access_code']['validity_period']} дней.</p>
            <p>Следующий код будет автоматически сгенерирован через {$settings['access_code']['validity_period']} дней.</p>
            <p style='color: " . ($isProduction ? 'red' : 'green') . ";'><strong>" . 
            ($isProduction ? 'ВНИМАНИЕ: Это производственный код!' : 'Это тестовый код для локальной среды') . 
            "</strong></p>
        ";
        
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Failed to send email: " . $e->getMessage());
        return false;
    }
}

try {
    // Проверяем существующие коды
    $stmt = $conn->prepare("SELECT * FROM access_codes ORDER BY created_at DESC LIMIT 1");
    $stmt->execute();
    $result = $stmt->get_result();
    $existingCode = $result->fetch_assoc();
    
    $shouldGenerateNew = true;
    
    if ($existingCode) {
        // Проверяем, прошло ли указанное количество дней с момента создания
        $lastCreated = strtotime($existingCode['created_at']);
        $validityPeriod = "-{$settings['access_code']['validity_period']} days";
        $cutoffDate = strtotime($validityPeriod);
        
        if ($lastCreated > $cutoffDate) {
            // Код еще действителен
            $shouldGenerateNew = false;
            echo "Существующий код еще действителен. Следующая генерация через " . 
                 ceil(($lastCreated - $cutoffDate) / 86400) . " дней.\n";
        }
    }
    
    if ($shouldGenerateNew) {
        // Генерируем новый код
        $characters = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Исключаем похожие символы
        $code = '';
        
        for ($group = 0; $group < 3; $group++) {
            for ($i = 0; $i < 4; $i++) {
                $code .= $characters[rand(0, strlen($characters) - 1)];
            }
            if ($group < 2) {
                $code .= '-';
            }
        }
        
        $currentDate = date('Y-m-d H:i:s');
        
        // Сохраняем новый код
        $stmt = $conn->prepare("INSERT INTO access_codes (code, created_at, admin_email) VALUES (?, ?, ?)");
        $stmt->bind_param('sss', $code, $currentDate, $settings['admin_email']);
        
        if ($stmt->execute()) {
            // Отправляем код на email для текущего окружения
            $isProduction = ($env === 'production');
            if (sendEmailWithCode($settings, $settings['admin_email'], $code, $isProduction)) {
                echo "Новый код успешно сгенерирован и отправлен на {$settings['admin_email']} (" . ($isProduction ? 'PRODUCTION' : 'LOCAL') . ")\n";
                
                // Если мы в production, также отправляем копию на локальный email для мониторинга
                if ($isProduction && isset($config['local']['admin_email'])) {
                    sendEmailWithCode($settings, $config['local']['admin_email'], $code, $isProduction);
                    echo "Копия кода отправлена на локальный email {$config['local']['admin_email']}\n";
                }
            } else {
                echo "Код сгенерирован, но возникла ошибка при отправке email\n";
            }
        } else {
            echo "Ошибка при сохранении кода в базу данных\n";
        }
    }
    
} catch (Exception $e) {
    echo "Ошибка: " . $e->getMessage() . "\n";
}

// Закрываем соединение
$conn->close();
?> 