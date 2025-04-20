<?php
// Устанавливаем временную зону для правильной работы с датами
date_default_timezone_set('America/Chicago');

// Включаем отображение ошибок для отладки
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Устанавливаем заголовки для вывода
header('Content-Type: text/html; charset=utf-8');

echo "<h1>Тестирование системы комментариев</h1>";

// Параметры подключения к базе данных
$host = 'macan.cityhost.com.ua';
$user = 'chff6ee508';
$password = '73b6bd56cf';
$database = 'chff6ee508';

// Подключение к базе данных
$conn = new mysqli($host, $user, $password, $database);

// Проверка подключения
if ($conn->connect_error) {
    die("<p style='color:red'>Ошибка подключения к базе данных: " . $conn->connect_error . "</p>");
}

echo "<p>Подключение к базе данных установлено.</p>";

// Получаем первую задачу из базы данных для тестирования
$taskQuery = "SELECT request_id FROM tasks LIMIT 1";
$taskResult = $conn->query($taskQuery);

if ($taskResult && $taskResult->num_rows > 0) {
    $task = $taskResult->fetch_assoc();
    $taskId = $task['request_id'];
    
    echo "<p>Используем задачу с ID: $taskId для тестирования</p>";
    
    // 1. Проверяем получение комментариев
    $getCommentsQuery = "SELECT id, staff_name, text, timestamp FROM task_comments WHERE task_id = ? ORDER BY timestamp DESC";
    $stmt = $conn->prepare($getCommentsQuery);
    $stmt->bind_param("s", $taskId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    echo "<h2>Существующие комментарии:</h2>";
    if ($result->num_rows > 0) {
        echo "<ul>";
        while ($comment = $result->fetch_assoc()) {
            echo "<li><strong>" . htmlspecialchars($comment['staff_name']) . "</strong> (" . $comment['timestamp'] . "): " . htmlspecialchars($comment['text']) . "</li>";
        }
        echo "</ul>";
    } else {
        echo "<p>Комментарии не найдены.</p>";
    }
    $stmt->close();
    
    // 2. Добавляем тестовый комментарий
    echo "<h2>Добавление тестового комментария:</h2>";
    
    $staffName = "Test User";
    $commentText = "This is a test comment - " . date('Y-m-d H:i:s');
    $timestamp = date('Y-m-d H:i:s');
    
    $insertQuery = "INSERT INTO task_comments (task_id, staff_name, text, timestamp) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($insertQuery);
    $stmt->bind_param("ssss", $taskId, $staffName, $commentText, $timestamp);
    
    if ($stmt->execute()) {
        $newCommentId = $stmt->insert_id;
        echo "<p style='color:green'>Комментарий успешно добавлен, ID: $newCommentId</p>";
        
        // Обновляем счетчик комментариев
        $updateCountQuery = "UPDATE tasks SET commentCount = commentCount + 1 WHERE request_id = ?";
        $updateStmt = $conn->prepare($updateCountQuery);
        $updateStmt->bind_param("s", $taskId);
        $updateStmt->execute();
        $updateStmt->close();
    } else {
        echo "<p style='color:red'>Ошибка при добавлении комментария: " . $stmt->error . "</p>";
    }
    $stmt->close();
    
    // 3. Получаем обновленный список комментариев
    $getCommentsQuery = "SELECT id, staff_name, text, timestamp FROM task_comments WHERE task_id = ? ORDER BY timestamp DESC";
    $stmt = $conn->prepare($getCommentsQuery);
    $stmt->bind_param("s", $taskId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    echo "<h2>Комментарии после добавления:</h2>";
    if ($result->num_rows > 0) {
        echo "<ul>";
        while ($comment = $result->fetch_assoc()) {
            $isNew = ($comment['id'] == $newCommentId) ? " style='color:blue'" : "";
            echo "<li$isNew><strong>" . htmlspecialchars($comment['staff_name']) . "</strong> (" . $comment['timestamp'] . "): " . htmlspecialchars($comment['text']) . "</li>";
        }
        echo "</ul>";
    } else {
        echo "<p>Комментарии не найдены.</p>";
    }
    $stmt->close();
    
    // 4. Удаляем тестовый комментарий
    echo "<h2>Удаление тестового комментария:</h2>";
    
    $deleteQuery = "DELETE FROM task_comments WHERE id = ?";
    $stmt = $conn->prepare($deleteQuery);
    $stmt->bind_param("i", $newCommentId);
    
    if ($stmt->execute()) {
        echo "<p style='color:green'>Комментарий успешно удален.</p>";
        
        // Обновляем счетчик комментариев
        $updateCountQuery = "UPDATE tasks SET commentCount = GREATEST(commentCount - 1, 0) WHERE request_id = ?";
        $updateStmt = $conn->prepare($updateCountQuery);
        $updateStmt->bind_param("s", $taskId);
        $updateStmt->execute();
        $updateStmt->close();
    } else {
        echo "<p style='color:red'>Ошибка при удалении комментария: " . $stmt->error . "</p>";
    }
    $stmt->close();
} else {
    echo "<p style='color:red'>Задачи не найдены в базе данных.</p>";
}

// Закрываем соединение с базой данных
$conn->close();

echo "<h2>Тестирование завершено.</h2>";
echo "<p>Вы можете запустить тест снова, чтобы убедиться, что все работает правильно.</p>";
?> 