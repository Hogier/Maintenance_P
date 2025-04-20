<?php
// Database configuration
require_once __DIR__ . '/database_config.php';

// Email configuration
define('SMTP_HOST', 'localhost');
define('SMTP_PORT', 25);
define('SMTP_FROM', 'noreply@maintenance.local');
define('SMTP_FROM_NAME', 'Access Code System');

// Application settings
define('CODE_EXPIRATION_DAYS', 30);
define('REGISTRATION_URL', '/register.html'); 