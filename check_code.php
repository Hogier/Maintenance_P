<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'database.php';

$code = 'LUTJ-K5JG-UXXG';

$stmt = $conn->prepare("SELECT * FROM access_codes WHERE code = ?");
$stmt->bind_param('s', $code);
$stmt->execute();
$result = $stmt->get_result();

echo "<h2>Проверка кода доступа</h2>";
echo "<p>Проверяемый код: " . htmlspecialchars($code) . "</p>";

if ($row = $result->fetch_assoc()) {
    echo "<p style='color: green;'>Код найден в базе данных!</p>";
    echo "<pre>";
    print_r($row);
    echo "</pre>";
} else {
    echo "<p style='color: red;'>Код не найден в базе данных.</p>";
    
    // Показать последний сгенерированный код
    $stmt = $conn->prepare("SELECT * FROM access_codes ORDER BY created_at DESC LIMIT 1");
    $stmt->execute();
    $result = $stmt->get_result();
    if ($lastCode = $result->fetch_assoc()) {
        echo "<p>Последний сгенерированный код: " . htmlspecialchars($lastCode['code']) . "</p>";
        echo "<p>Создан: " . $lastCode['created_at'] . "</p>";
    }
}
?> 