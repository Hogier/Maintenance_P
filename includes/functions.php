<?php
/**
 * Функции, используемые в API для модуля Construction
 */

/**
 * Логирование ошибок и отправка HTTP-ответа
 *
 * @param string $message Сообщение об ошибке
 * @param int $status HTTP-код статуса
 * @param Exception|null $exception Объект исключения для логирования
 * @return void
 */
function responseWithError($message, $status = 500, $exception = null) {
    if ($exception !== null) {
        error_log("Error in Construction API: " . $exception->getMessage());
    }
    
    http_response_code($status);
    echo json_encode([
        "success" => false,
        "message" => $message
    ]);
    exit;
}

/**
 * Проверяет существование и создает директорию, если ее нет
 *
 * @param string $dir Путь к директории
 * @param int $permissions Права доступа (по умолчанию 0755)
 * @return bool Успешность создания директории
 */
function ensureDirectoryExists($dir, $permissions = 0755) {
    if (!file_exists($dir)) {
        return mkdir($dir, $permissions, true);
    }
    return is_dir($dir) && is_writable($dir);
}

/**
 * Генерация уникального имени файла
 *
 * @param string $fileName Оригинальное имя файла
 * @param int $projectId ID проекта
 * @return string Уникальное имя файла
 */
function generateUniqueFileName($fileName, $projectId) {
    $extension = pathinfo($fileName, PATHINFO_EXTENSION);
    $baseName = pathinfo($fileName, PATHINFO_FILENAME);
    $safeBaseName = preg_replace("/[^a-zA-Z0-9_-]/", "_", $baseName);
    $uniqueName = uniqid("proj{$projectId}_", true) . "_{$safeBaseName}.{$extension}";
    return $uniqueName;
}

/**
 * Проверяет тип файла на допустимость
 *
 * @param string $mimeType MIME-тип файла
 * @param array $allowedTypes Массив разрешенных типов
 * @return bool
 */
function isAllowedFileType($mimeType, $allowedTypes = null) {
    if ($allowedTypes === null) {
        $allowedTypes = [
            'image/jpeg', 
            'image/png', 
            'application/pdf', 
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
    }
    
    return in_array($mimeType, $allowedTypes);
}

/**
 * Форматирует дату из строки в формат базы данных
 *
 * @param string $dateStr Строка с датой
 * @return string Дата в формате Y-m-d
 */
function formatDateForDB($dateStr) {
    if (empty($dateStr)) return null;
    
    $timestamp = strtotime($dateStr);
    if ($timestamp === false) return null;
    
    return date('Y-m-d', $timestamp);
}
?> 