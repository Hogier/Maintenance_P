<?php
/**
 * Конфигурация для интеграции с сервисом Pusher
 */
return [
    'app_id'     => '1976689',         // ID вашего приложения в Pusher
    'app_key'    => '16f6b338124ef7c54632',   // Публичный ключ API
    'app_secret' => 'df7e6e1025ee009276fa',    // Секретный ключ
    'options'    => [
        'cluster'   => 'eu',           // Кластер (регион) серверов
        'encrypted' => true            // Использовать SSL шифрование
    ],
    'channel_name' => 'maintenance-channel'    // Канал для чата по умолчанию
]; 