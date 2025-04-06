<?php
// Устанавливаем временную зону для правильной работы с датами
date_default_timezone_set('America/Chicago');

// Включаем отображение ошибок для отладки
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Устанавливаем заголовки для вывода
header('Content-Type: text/html; charset=utf-8');

echo "<h1>Миграция комментариев</h1>";
echo "<p>Перенос комментариев из таблицы tasks в таблицу task_comments</p>";

// Параметры подключения к базе данных
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'maintenancedb';

// Подключение к базе данных
$conn = new mysqli($host, $user, $password, $database);

// Проверка подключения
if ($conn->connect_error) {
    die("<p style='color:red'>Ошибка подключения к базе данных: " . $conn->connect_error . "</p>");
}

echo "<p>Подключение к базе данных установлено.</p>";

// Проверка наличия таблицы task_comments
$tableCheckQuery = "SHOW TABLES LIKE 'task_comments'";
$tableResult = $conn->query($tableCheckQuery);
if ($tableResult->num_rows == 0) {
    echo "<p style='color:red'>Таблица task_comments не найдена. Создаю таблицу...</p>";
    
    // SQL-скрипт создания таблицы
    $createTableSql = "CREATE TABLE IF NOT EXISTS task_comments (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        task_id VARCHAR(50) NOT NULL,
        staff_name VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        photo_url VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_task_id (task_id),
        INDEX idx_staff_name (staff_name),
        INDEX idx_timestamp (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
    
    if ($conn->query($createTableSql)) {
        echo "<p style='color:green'>Таблица task_comments успешно создана.</p>";
    } else {
        die("<p style='color:red'>Ошибка при создании таблицы task_comments: " . $conn->error . "</p>");
    }
} else {
    echo "<p>Таблица task_comments уже существует.</p>";
}

// Получаем задачи с комментариями
$tasksQuery = "SELECT request_id, comments FROM tasks WHERE comments IS NOT NULL AND comments != '[]'";
$tasksResult = $conn->query($tasksQuery);

if ($tasksResult) {
    echo "<p>Найдено задач с комментариями: " . $tasksResult->num_rows . "</p>";
    
    $migratedComments = 0;
    $errorCount = 0;
    
    while ($task = $tasksResult->fetch_assoc()) {
        $taskId = $task['request_id'];
        $commentsJson = $task['comments'];
        
        // Пропускаем задачи без комментариев
        if (empty($commentsJson) || $commentsJson == '[]') {
            continue;
        }
        
        $comments = json_decode($commentsJson, true);
        if (!is_array($comments)) {
            echo "<p style='color:orange'>Ошибка декодирования JSON для задачи $taskId: " . json_last_error_msg() . "</p>";
            $errorCount++;
            continue;
        }
        
        echo "<p>Обработка задачи $taskId: найдено " . count($comments) . " комментариев.</p>";
        
        foreach ($comments as $comment) {
            if (!isset($comment['staffName']) || !isset($comment['text']) || !isset($comment['timestamp'])) {
                echo "<p style='color:orange'>Пропуск некорректного комментария в задаче $taskId.</p>";
                $errorCount++;
                continue;
            }
            
            $staffName = $comment['staffName'];
            $text = $comment['text'];
            $timestamp = $comment['timestamp'];
            
            // Преобразование timestamp в формат MySQL DATETIME
            try {
                $datetime = new DateTime($timestamp);
                $formattedTimestamp = $datetime->format('Y-m-d H:i:s');
            } catch (Exception $e) {
                echo "<p style='color:orange'>Ошибка преобразования даты ($timestamp) для комментария в задаче $taskId: " . $e->getMessage() . "</p>";
                $formattedTimestamp = date('Y-m-d H:i:s'); // Используем текущую дату
                $errorCount++;
            }
            
            // Проверяем, существует ли уже такой комментарий
            $checkStmt = $conn->prepare("SELECT id FROM task_comments WHERE task_id = ? AND staff_name = ? AND text = ? AND timestamp = ?");
            $checkStmt->bind_param("ssss", $taskId, $staffName, $text, $formattedTimestamp);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                echo "<p>Комментарий от $staffName в задаче $taskId уже существует, пропускаем.</p>";
                $checkStmt->close();
                continue;
            }
            $checkStmt->close();
            
            // Добавляем комментарий в новую таблицу
            $insertStmt = $conn->prepare("INSERT INTO task_comments (task_id, staff_name, text, timestamp) VALUES (?, ?, ?, ?)");
            if (!$insertStmt) {
                echo "<p style='color:red'>Ошибка подготовки запроса: " . $conn->error . "</p>";
                $errorCount++;
                continue;
            }
            
            $insertStmt->bind_param("ssss", $taskId, $staffName, $text, $formattedTimestamp);
            
            if ($insertStmt->execute()) {
                $migratedComments++;
                echo "<p style='color:green'>Комментарий от $staffName в задаче $taskId успешно перенесен.</p>";
            } else {
                echo "<p style='color:red'>Ошибка при переносе комментария от $staffName в задаче $taskId: " . $insertStmt->error . "</p>";
                $errorCount++;
            }
            
            $insertStmt->close();
        }
    }
    
    echo "<h2>Итоги миграции</h2>";
    echo "<p>Всего перенесено комментариев: $migratedComments</p>";
    if ($errorCount > 0) {
        echo "<p style='color:orange'>Количество ошибок: $errorCount</p>";
    } else {
        echo "<p style='color:green'>Ошибок не обнаружено</p>";
    }
    
} else {
    echo "<p style='color:red'>Ошибка при получении задач: " . $conn->error . "</p>";
}

// Закрываем соединение с базой данных
$conn->close();

echo "<p>Миграция завершена.</p>";
?> 