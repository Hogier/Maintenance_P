<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class Mailer {
    private $config;
    private $mailer;
    
    public function __construct() {
        // Загружаем конфигурацию
        $this->config = require_once __DIR__ . '/../config/mail_config.php';
        
        // Инициализируем PHPMailer
        $this->mailer = new PHPMailer(true);
        $this->setupMailer();
    }
    
    private function setupMailer() {
        try {
            // Основные настройки
            $this->mailer->isSMTP();
            $this->mailer->Host = $this->config['mail_settings']['host'];
            $this->mailer->Port = $this->config['mail_settings']['port'];
            $this->mailer->SMTPAuth = $this->config['mail_settings']['smtp_auth'];
            $this->mailer->SMTPSecure = $this->config['mail_settings']['smtp_secure'];
            
            // Выбираем режим (локальный или продакшен)
            $mode = $this->config['mode'];
            $settings = $this->config['mail_settings'][$mode];
            
            // Устанавливаем учетные данные
            $this->mailer->Username = $settings['username'];
            $this->mailer->Password = $settings['password'];
            
            // Настройки отправителя
            $this->mailer->setFrom($settings['from_email'], $settings['from_name']);
            
            // Дополнительные настройки
            $this->mailer->CharSet = 'UTF-8';
            $this->mailer->isHTML(true);
            
        } catch (Exception $e) {
            throw new Exception('Ошибка настройки почты: ' . $e->getMessage());
        }
    }
    
    public function sendMail($to, $subject, $body, $altBody = '') {
        try {
            $this->mailer->clearAddresses();
            $this->mailer->addAddress($to);
            $this->mailer->Subject = $subject;
            $this->mailer->Body = $body;
            $this->mailer->AltBody = $altBody ?: strip_tags($body);
            
            return $this->mailer->send();
        } catch (Exception $e) {
            throw new Exception('Ошибка отправки письма: ' . $e->getMessage());
        }
    }
    
    public function sendAccessCode($code) {
        $to = $this->config['admin_email'];
        $subject = 'Новый код доступа для регистрации';
        $body = "
            <h2>Код доступа для регистрации</h2>
            <p>Был сгенерирован новый код доступа для регистрации пользователей:</p>
            <h3 style='background: #f0f0f0; padding: 10px; font-family: monospace;'>{$code}</h3>
            <p>Этот код действителен в течение текущего месяца.</p>
        ";
        
        return $this->sendMail($to, $subject, $body);
    }
} 