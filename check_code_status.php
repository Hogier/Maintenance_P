<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'database.php';
$config = require 'config/app_config.php';

// Получаем настройки текущего окружения
$env = $config['environment'];
$settings = $config[$env];

try {
    // Получаем последний код
    $stmt = $conn->prepare("SELECT * FROM access_codes ORDER BY created_at DESC LIMIT 1");
    $stmt->execute();
    $result = $stmt->get_result();
    $lastCode = $result->fetch_assoc();
    
    echo "<h2>Статус кода доступа</h2>";
    echo "<p>Текущее окружение: <strong style='color: " . ($env === 'production' ? 'red' : 'green') . ";'>" . 
         strtoupper($env) . "</strong></p>";
    
    if ($lastCode) {
        $created = new DateTime($lastCode['created_at']);
        $now = new DateTime();
        $validity = $settings['access_code']['validity_period'];
        $expiration = (clone $created)->modify("+{$validity} days");
        $daysLeft = $now->diff($expiration)->days;
        
        echo "<p>Текущий код: <strong>{$lastCode['code']}</strong></p>";
        echo "<p>Создан: " . $created->format('Y-m-d H:i:s') . "</p>";
        echo "<p>Истекает: " . $expiration->format('Y-m-d H:i:s') . "</p>";
        
        if ($now < $expiration) {
            echo "<p style='color: green;'>Код действителен еще {$daysLeft} дней</p>";
        } else {
            echo "<p style='color: red;'>Код истек. Новый код будет сгенерирован при следующем запуске cron-скрипта.</p>";
        }
        
        echo "<p>Email администратора: {$lastCode['admin_email']}</p>";
        
        // Показываем настройки SMTP
        echo "<h3>Настройки SMTP</h3>";
        echo "<ul>";
        echo "<li>Сервер: {$settings['smtp']['host']}</li>";
        echo "<li>Порт: {$settings['smtp']['port']}</li>";
        echo "<li>Пользователь: {$settings['smtp']['username']}</li>";
        echo "<li>Шифрование: {$settings['smtp']['encryption']}</li>";
        echo "</ul>";
        
        // Если мы в production, показываем также локальный email для мониторинга
        if ($env === 'production' && isset($config['local']['admin_email'])) {
            echo "<p>Email для мониторинга: {$config['local']['admin_email']}</p>";
        }
    } else {
        echo "<p style='color: orange;'>Коды доступа еще не были сгенерированы</p>";
    }
    
} catch (Exception $e) {
    echo "<h2>Ошибка</h2>";
    echo "<p style='color: red;'>" . htmlspecialchars($e->getMessage()) . "</p>";
}

// Закрываем соединение
$conn->close();
?> 