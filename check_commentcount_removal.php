<?php
// Включаем вывод ошибок для отладки
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Устанавливаем заголовки для HTML-вывода
header('Content-Type: text/html; charset=utf-8');

echo "<h1>Проверка удаления столбца commentCount</h1>";

// Параметры подключения к базе данных
$host = 'localhost';
$user = 'root';
$password = 'root';
$database = 'maintenancedb';

// Подключение к базе данных
$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    die("<p style='color:red'>Ошибка подключения: " . $conn->connect_error . "</p>");
}

echo "<p style='color:green'>Успешное подключение к базе данных.</p>";

// Проверяем структуру таблицы tasks
echo "<h2>Структура таблицы tasks:</h2>";
$tasksStructure = $conn->query("DESCRIBE tasks");
echo "<table border='1'><tr><th>Поле</th><th>Тип</th><th>Null</th><th>Ключ</th><th>По умолчанию</th><th>Дополнительно</th></tr>";

$commentCountExists = false;
while ($row = $tasksStructure->fetch_assoc()) {
    echo "<tr>";
    echo "<td>{$row['Field']}</td>";
    echo "<td>{$row['Type']}</td>";
    echo "<td>{$row['Null']}</td>";
    echo "<td>{$row['Key']}</td>";
    echo "<td>{$row['Default']}</td>";
    echo "<td>{$row['Extra']}</td>";
    echo "</tr>";
    
    if ($row['Field'] === 'commentCount') {
        $commentCountExists = true;
    }
}
echo "</table>";

// Проверяем, существует ли столбец commentCount
echo "<h2>Результат проверки:</h2>";
if ($commentCountExists) {
    echo "<p style='color:red'>Столбец commentCount всё ещё существует в таблице tasks!</p>";
} else {
    echo "<p style='color:green'>Столбец commentCount успешно удалён из таблицы tasks.</p>";
}

// Проверка тестирования комментариев
echo "<h2>Тестирование добавления комментария:</h2>";

// Проверяем, есть ли тестовая задача
$checkTaskStmt = $conn->prepare("SELECT request_id FROM tasks WHERE request_id = 'TEST123'");
$checkTaskStmt->execute();
$checkTaskResult = $checkTaskStmt->get_result();

if ($checkTaskResult->num_rows === 0) {
    // Создаем тестовую задачу без поля commentCount
    $createTaskStmt = $conn->prepare("INSERT INTO tasks (request_id, details, status, staff, priority, date, timestamp) VALUES ('TEST123', 'Test task after commentCount removal', 'Pending', 'Test Staff', 'Medium', CURDATE(), NOW())");
    if ($createTaskStmt->execute()) {
        echo "<p style='color:green'>Создана тестовая задача TEST123 без поля commentCount.</p>";
    } else {
        echo "<p style='color:red'>Ошибка при создании тестовой задачи: " . $conn->error . "</p>";
    }
    $createTaskStmt->close();
} else {
    echo "<p>Тестовая задача TEST123 уже существует.</p>";
}
$checkTaskStmt->close();

// Добавляем тестовый комментарий
$commentText = "Тестовый комментарий после удаления поля commentCount - " . date('Y-m-d H:i:s');
$staffName = "Тестовый пользователь";
$timestamp = date('Y-m-d H:i:s');
$photoUrl = "/Maintenance_P/users/img/user.png";

$addCommentStmt = $conn->prepare("INSERT INTO task_comments (task_id, staff_name, text, timestamp, photo_url) VALUES ('TEST123', ?, ?, ?, ?)");
$addCommentStmt->bind_param("ssss", $staffName, $commentText, $timestamp, $photoUrl);

if ($addCommentStmt->execute()) {
    echo "<p style='color:green'>Комментарий успешно добавлен в таблицу task_comments.</p>";
    
    // Получаем последние комментарии
    $getCommentsStmt = $conn->prepare("SELECT * FROM task_comments WHERE task_id = 'TEST123' ORDER BY id DESC LIMIT 5");
    $getCommentsStmt->execute();
    $comments = $getCommentsStmt->get_result();
    
    if ($comments->num_rows > 0) {
        echo "<h3>Последние 5 комментариев для задачи TEST123:</h3>";
        echo "<table border='1'><tr><th>ID</th><th>Задача</th><th>Автор</th><th>Текст</th><th>Дата</th></tr>";
        
        while ($comment = $comments->fetch_assoc()) {
            echo "<tr>";
            echo "<td>{$comment['id']}</td>";
            echo "<td>{$comment['task_id']}</td>";
            echo "<td>{$comment['staff_name']}</td>";
            echo "<td>" . htmlspecialchars($comment['text']) . "</td>";
            echo "<td>{$comment['timestamp']}</td>";
            echo "</tr>";
        }
        
        echo "</table>";
    } else {
        echo "<p style='color:red'>Комментарии не найдены!</p>";
    }
    $getCommentsStmt->close();
} else {
    echo "<p style='color:red'>Ошибка при добавлении комментария: " . $conn->error . "</p>";
}
$addCommentStmt->close();

// Проверяем резервную копию
echo "<h2>Проверка резервной копии:</h2>";
$backupCheckResult = $conn->query("SHOW TABLES LIKE 'tasks_backup_before_remove_commentcount'");

if ($backupCheckResult->num_rows > 0) {
    echo "<p style='color:green'>Резервная копия таблицы tasks создана успешно.</p>";
    
    // Проверяем наличие столбца commentCount в резервной копии
    $backupColumnResult = $conn->query("SHOW COLUMNS FROM tasks_backup_before_remove_commentcount LIKE 'commentCount'");
    if ($backupColumnResult->num_rows > 0) {
        echo "<p style='color:green'>Столбец commentCount сохранен в резервной копии.</p>";
    } else {
        echo "<p style='color:red'>Столбец commentCount не найден в резервной копии!</p>";
    }
} else {
    echo "<p style='color:red'>Резервная копия таблицы tasks не создана!</p>";
}

$conn->close();
echo "<p>Проверка завершена.</p>";
?> 