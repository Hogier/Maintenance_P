<?php
return [
    'environment' => 'local', // 'local' или 'production'
    
    'local' => [
        'admin_email' => 'dmitriy.palchikov@gmail.com',
        'access_code' => [
            'validity_period' => 30, // дней
            'auto_generate' => true,
        ],
        'smtp' => [
            'host' => 'smtp.gmail.com',
            'port' => 587,
            'username' => 'dmitriy.palchikov@gmail.com',
            'password' => 'rgnj nxtv rqkq fyyp',
            'encryption' => 'tls',
            'from_name' => 'Admin (Local)'
        ]
    ],
    
    'production' => [
        'admin_email' => 'your-production-email@domain.com', // Замените на реальный email
        'access_code' => [
            'validity_period' => 30,
            'auto_generate' => true,
        ],
        'smtp' => [
            'host' => 'smtp.your-domain.com', // Замените на реальный SMTP сервер
            'port' => 587,
            'username' => 'your-production-email@domain.com',
            'password' => 'your-production-password',
            'encryption' => 'tls',
            'from_name' => 'Admin (Production)'
        ]
    ]
];
?> 