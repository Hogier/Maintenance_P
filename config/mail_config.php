<?php
return [
    // Основные настройки почты
    'mail_settings' => [
        'host' => 'smtp.gmail.com',  // SMTP сервер
        'port' => 587,               // Порт SMTP
        'smtp_auth' => true,         // Использовать SMTP аутентификацию
        'smtp_secure' => 'tls',      // Тип шифрования (tls или ssl)
        
        // Локальные настройки (для тестирования)
        'local' => [
            'username' => 'dmitriy.palchikov@gmail.com',     // Ваш Gmail
            'password' => 'rgnj nxtv rqkq fyyp',        // Ваш пароль приложения
            'from_email' => 'dmitriy.palchikov@gmail.com',   // От кого
            'from_name' => 'Local Test',              // Имя отправителя
        ],
        
        // Серверные настройки (для продакшена)
        'production' => [
            'username' => 'your-production-email@gmail.com', // Продакшен email
            'password' => 'your-production-password',        // Продакшен пароль
            'from_email' => 'your-production-email@gmail.com',
            'from_name' => 'Your Company Name',
        ]
    ],
    
    // Настройки администратора (для получения кодов доступа)
    'admin_email' => 'dmitriy.palchikov@gmail.com',
    
    // Режим работы (local или production)
    'mode' => 'local'
]; 