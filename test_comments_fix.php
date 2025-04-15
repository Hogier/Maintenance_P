<?php
// Устанавливаем временную зону
date_default_timezone_set('America/Chicago');

// Включаем вывод ошибок для отладки
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Установка заголовков для вывода в браузер
header('Content-Type: text/html; charset=utf-8');

echo "<h1>Проверка исправлений системы комментариев</h1>";

// Параметры подключения к БД
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'maintenancedb';

// Подключение к БД
$conn = new mysqli($host, $user, $password, $database);

// Проверка подключения
if ($conn->connect_error) {
    die('Ошибка подключения к БД: ' . $conn->connect_error);
}

echo "<p>Подключение к базе данных успешно установлено.</p>";

// Проверяем существование колонки comments в таблице tasks
echo "<h2>Проверка структуры таблицы tasks</h2>";
$checkColumnResult = $conn->query("SHOW COLUMNS FROM tasks LIKE 'comments'");
if ($checkColumnResult->num_rows > 0) {
    echo "<p style='color:red;'>ОШИБКА: Колонка 'comments' все еще присутствует в таблице tasks!</p>";
} else {
    echo "<p style='color:green;'>УСПЕХ: Колонка 'comments' успешно удалена из таблицы tasks.</p>";
}

// Проверяем наличие таблицы task_comments
echo "<h2>Проверка таблицы task_comments</h2>";
$checkTableResult = $conn->query("SHOW TABLES LIKE 'task_comments'");
if ($checkTableResult->num_rows > 0) {
    echo "<p style='color:green;'>УСПЕХ: Таблица task_comments существует.</p>";
    
    // Проверим количество комментариев
    $countResult = $conn->query("SELECT COUNT(*) as count FROM task_comments");
    $countRow = $countResult->fetch_assoc();
    echo "<p>Всего комментариев в таблице task_comments: " . $countRow['count'] . "</p>";
} else {
    echo "<p style='color:red;'>ОШИБКА: Таблица task_comments не существует!</p>";
}

// Создаем тестовую задачу для добавления комментариев
echo "<h2>Тестирование добавления комментариев</h2>";

// Сначала проверим, есть ли у нас тестовая задача
$taskId = "TEST" . date('YmdHis');
$taskCheckResult = $conn->query("SELECT * FROM tasks WHERE request_id = 'TEST123'");

if ($taskCheckResult->num_rows == 0) {
    // Создаем тестовую задачу
    $insertTaskStmt = $conn->prepare("INSERT INTO tasks (request_id, details, status, staff, priority, date, timestamp) VALUES ('TEST123', 'Test task for comment system', 'Pending', 'Test Staff', 'Medium', CURDATE(), NOW())");
    
    if ($insertTaskStmt->execute()) {
        echo "<p>Создана тестовая задача с ID: TEST123</p>";
    } else {
        echo "<p style='color:red;'>Ошибка при создании тестовой задачи: " . $conn->error . "</p>";
    }
    $insertTaskStmt->close();
}

// Добавляем тестовый комментарий через PHP и API
$staffName = "Test User";
$commentText = "Test comment added at " . date('Y-m-d H:i:s');
$timestamp = date('Y-m-d H:i:s');
$photoUrl = "/Maintenance_P/users/img/user.png";

// Имитируем прямой вызов API добавления комментария
echo "<h3>Тест 1: Прямое добавление комментария в таблицу task_comments</h3>";

$insertCommentStmt = $conn->prepare("INSERT INTO task_comments (task_id, staff_name, text, timestamp, photo_url) VALUES (?, ?, ?, ?, ?)");
$insertCommentStmt->bind_param("sssss", $testTaskId, $staffName, $commentText, $timestamp, $photoUrl);

$testTaskId = "TEST123";
if ($insertCommentStmt->execute()) {
    echo "<p style='color:green;'>УСПЕХ: Комментарий успешно добавлен напрямую в таблицу.</p>";
} else {
    echo "<p style='color:red;'>ОШИБКА: Не удалось добавить комментарий напрямую: " . $conn->error . "</p>";
}
$insertCommentStmt->close();

// Имитируем вызов через comments.php
echo "<h3>Тест 2: Эмуляция вызова comments.php (addComment)</h3>";

// Загружаем database.js для тестирования
echo "<script src='database.js'></script>";
?>

<script>
// Тестирование JavaScript функции addComment
async function testAddComment() {
    try {
        const db = new Database();
        const taskId = "TEST123";
        const commentText = "Test comment from JavaScript at " + new Date().toISOString();
        const staffName = "Test JavaScript User";
        
        console.log("Attempting to add comment via JavaScript...");
        const success = await db.addComment(taskId, commentText, staffName);
        
        if (success) {
            document.getElementById('jsResult').innerHTML = 
                "<p style='color:green;'>УСПЕХ: Комментарий успешно добавлен через JavaScript.</p>";
        } else {
            document.getElementById('jsResult').innerHTML = 
                "<p style='color:red;'>ОШИБКА: Не удалось добавить комментарий через JavaScript.</p>";
        }
    } catch (error) {
        console.error("Error in test:", error);
        document.getElementById('jsResult').innerHTML = 
            "<p style='color:red;'>ИСКЛЮЧЕНИЕ: " + error.message + "</p>";
    }
}

// Запускаем тест после загрузки страницы
window.onload = function() {
    testAddComment();
};
</script>

<div id="jsResult">
    <p>Ожидание результатов теста JavaScript...</p>
</div>

<?php
// Проверяем итоговые результаты
echo "<h2>Итоговая проверка комментариев для задачи TEST123</h2>";

$finalCheckStmt = $conn->prepare("SELECT * FROM task_comments WHERE task_id = ?");
$finalCheckStmt->bind_param("s", $testTaskId);
$finalCheckStmt->execute();
$commentResult = $finalCheckStmt->get_result();

if ($commentResult->num_rows > 0) {
    echo "<p>Найдено комментариев: " . $commentResult->num_rows . "</p>";
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>ID</th><th>Task ID</th><th>Staff Name</th><th>Text</th><th>Timestamp</th></tr>";
    
    while ($row = $commentResult->fetch_assoc()) {
        echo "<tr>";
        echo "<td>" . $row['id'] . "</td>";
        echo "<td>" . $row['task_id'] . "</td>";
        echo "<td>" . $row['staff_name'] . "</td>";
        echo "<td>" . $row['text'] . "</td>";
        echo "<td>" . $row['timestamp'] . "</td>";
        echo "</tr>";
    }
    
    echo "</table>";
} else {
    echo "<p>Комментарии для задачи TEST123 не найдены.</p>";
}
$finalCheckStmt->close();

$conn->close();
?> 