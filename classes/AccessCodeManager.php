<?php
class AccessCodeManager {
    private $db;
    private $mailer;
    
    public function __construct() {
        try {
            // Подключаемся к базе данных
            $this->db = new PDO(
                "mysql:host=localhost;dbname=maintenancedb;charset=utf8",
                "root",
                "",
                array(
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8"
                )
            );
            
            // Инициализируем отправщик почты
            $this->mailer = new Mailer();
        } catch (PDOException $e) {
            throw new Exception("Ошибка подключения к базе данных: " . $e->getMessage());
        }
    }
    
    // Генерация случайного кода
    private function generateCode() {
        $characters = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Исключаем похожие символы
        $code = '';
        for ($i = 0; $i < 12; $i++) {
            $code .= $characters[rand(0, strlen($characters) - 1)];
            // Добавляем дефис после каждых 4 символов, кроме последней группы
            if ($i < 11 && ($i + 1) % 4 === 0) {
                $code .= '-';
            }
        }
        return $code;
    }
    
    // Создание нового кода доступа
    public function createNewCode() {
        try {
            // Получаем email администратора из конфига
            $config = require __DIR__ . '/../config/mail_config.php';
            $adminEmail = $config['admin_email'];
            
            // Генерируем новый код
            $code = $this->generateCode();
            
            // Устанавливаем срок действия (до конца текущего месяца)
            $expiresAt = date('Y-m-t 23:59:59'); // Последний день текущего месяца
            
            // Сохраняем код в базу данных
            $stmt = $this->db->prepare("
                INSERT INTO access_codes (code, expires_at, admin_email)
                VALUES (:code, :expires_at, :admin_email)
            ");
            
            $stmt->execute([
                ':code' => $code,
                ':expires_at' => $expiresAt,
                ':admin_email' => $adminEmail
            ]);
            
            // Отправляем код на email администратора
            $this->mailer->sendAccessCode($code);
            
            return true;
            
        } catch (Exception $e) {
            error_log("Ошибка при создании кода доступа: " . $e->getMessage());
            throw new Exception("Не удалось создать код доступа: " . $e->getMessage());
        }
    }
    
    // Проверка кода доступа
    public function verifyCode($code) {
        try {
            $stmt = $this->db->prepare("
                SELECT * FROM access_codes 
                WHERE code = :code 
                AND expires_at > NOW() 
                AND is_used = FALSE
                LIMIT 1
            ");
            
            $stmt->execute([':code' => $code]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                // Помечаем код как использованный
                $updateStmt = $this->db->prepare("
                    UPDATE access_codes 
                    SET is_used = TRUE 
                    WHERE id = :id
                ");
                $updateStmt->execute([':id' => $result['id']]);
                
                return true;
            }
            
            return false;
            
        } catch (Exception $e) {
            error_log("Ошибка при проверке кода доступа: " . $e->getMessage());
            throw new Exception("Не удалось проверить код доступа: " . $e->getMessage());
        }
    }
} 