<?php
require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Класс для работы с Pusher API для чата и realtime событий
 */
class PusherChat {
    /**
     * Экземпляр класса Pusher
     * @var \Pusher\Pusher
     */
    private $pusher;
    
    /**
     * Имя канала по умолчанию
     * @var string
     */
    private $channelName = 'maintenance-channel';
    
    /**
     * Конструктор класса
     * @param array $config Конфигурация Pusher (опционально)
     */
    public function __construct($config = null) {
        if ($config === null) {
            // Загружаем конфигурацию по умолчанию
            $config = $this->getDefaultConfig();
        }
        
        // Проверяем наличие обязательных параметров
        if (empty($config['app_id']) || empty($config['app_key']) || empty($config['app_secret'])) {
            throw new Exception('Отсутствуют обязательные параметры Pusher: app_id, app_key, app_secret');
        }
        
        // Создаем экземпляр Pusher
        $this->pusher = new \Pusher\Pusher(
            $config['app_key'],
            $config['app_secret'],
            $config['app_id'],
            $config['options'] ?? array()
        );
        
        // Установка имени канала, если оно указано в конфигурации
        if (!empty($config['channel_name'])) {
            $this->channelName = $config['channel_name'];
        }
    }
    
    /**
     * Отправляет сообщение/событие через Pusher
     * 
     * @param string $username Имя пользователя/отправителя
     * @param string $eventType Тип события (например, 'new-message', 'taskAdded', 'sendComments', 'eventCommentAdded')
     * @param mixed $data Данные события
     * @param string $channel Канал (если не указан, используется канал по умолчанию)
     * @return object Результат отправки
     */
    public function sendMessage($username, $eventType, $data = [], $channel = null) {
        // Определяем канал
        $targetChannel = $channel ?: $this->channelName;
        
        try {
            // Отправляем событие через Pusher без модификации данных
            $result = $this->pusher->trigger($targetChannel, $eventType, $data);
            $this->log('info', 'Событие успешно отправлено: ' . $eventType . ' ' . json_encode($data));
            return $result;
        } catch (Exception $e) {
            $this->log('error', 'Ошибка при отправке события: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Отправляет сообщение в чат (устаревший метод для обратной совместимости)
     * 
     * @param string $username Имя пользователя
     * @param string $message Текст сообщения
     * @param array $additional Дополнительная информация
     * @return object Результат отправки
     */
    public function sendChatMessage($username, $message, $additional = []) {
        // Валидация входных данных
        if (empty($username) || empty($message)) {
            throw new Exception('Имя пользователя и сообщение не могут быть пустыми');
        }
        
        // Формируем данные сообщения
        $data = [
            'username' => $username,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s'),
            'id' => uniqid('msg_')
        ];
        
        // Добавляем дополнительные данные
        if (!empty($additional) && is_array($additional)) {
            $data = array_merge($data, $additional);
        }
        
        // Используем новый метод для отправки
        return $this->sendMessage($username, 'new-message', $data, 'maintenance-channel');
    }
    
    /**
     * Возвращает информацию о канале
     * 
     * @param string $channel Канал (если не указан, используется канал по умолчанию)
     * @return object Информация о канале
     */
    public function getChannelInfo($channel = null) {
        $targetChannel = $channel ?: $this->channelName;
        
        try {
            return $this->pusher->getChannelInfo($targetChannel);
        } catch (Exception $e) {
            $this->logError('Ошибка при получении информации о канале: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Возвращает конфигурацию по умолчанию
     * 
     * @return array Конфигурация Pusher
     */
    private function getDefaultConfig() {
        // Загружаем конфигурацию из файла
        if (file_exists(__DIR__ . '/../config/pusher.php')) {
            return require_once __DIR__ . '/../config/pusher.php';
        }
        
        // Конфигурация по умолчанию
        return [
            'app_id' => '1976689',
            'app_key' => '16f6b338124ef7c54632',
            'app_secret' => 'df7e6e1025ee009276fa',
            'options' => [
                'cluster' => 'eu',
                'encrypted' => true
            ],
            'channel_name' => 'maintenance-channel'
        ];
    }
    
    /**
     * Записывает сообщение об успешной операции в лог
     * 
     * @param string $message Сообщение для записи
     */
    private function logSuccess($message) {
        $this->log('INFO', $message);
    }
    
    /**
     * Записывает сообщение об ошибке в лог
     * 
     * @param string $message Сообщение для записи
     */
    private function logError($message) {
        $this->log('ERROR', $message);
    }
    
    /**
     * Записывает сообщение в лог
     * 
     * @param string $level Уровень логирования
     * @param string $message Сообщение для записи
     */
    private function log($level, $message) {
        $date = date('Y-m-d H:i:s');
        $logMessage = "[$date] [$level] [PusherChat] $message" . PHP_EOL;
        
        $logFile = __DIR__ . '/../logs/pusher-chat.log';
        $logDir = dirname($logFile);
        
        // Создаем директорию для логов, если не существует
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        // Записываем в лог-файл
        file_put_contents($logFile, $logMessage, FILE_APPEND);
    }
} 