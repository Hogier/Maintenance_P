<?php
// Простой тест API добавления подрядчика

// Создаем директорию для логов, если она еще не существует
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0777, true);
}

// Записываем в лог начало теста
file_put_contents("$logDir/test.log", date('Y-m-d H:i:s') . " - Starting API test\n", FILE_APPEND);

// Данные подрядчика для теста
$data = [
    'company_name' => 'Test Company ' . time(),
    'business_type' => 'Test Business',
    'location' => 'Test Location',
    'email' => 'test@example.com',
    'phone' => '123-456-7890',
    'website' => 'www.test.com',
    'rating' => 5,
    'notes' => 'Test notes'
];

// Конвертируем данные в JSON
$jsonData = json_encode($data);

// Записываем отправляемые данные в лог
file_put_contents("$logDir/test.log", date('Y-m-d H:i:s') . " - Sending data: $jsonData\n", FILE_APPEND);

// Настраиваем cURL для запроса
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost/Maintenance_P/Inspections-Checklist-Portal/components/construction/api/index.php?resource=contractors');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($jsonData)
]);

// Выполняем запрос
$response = curl_exec($ch);
$info = curl_getinfo($ch);
$error = curl_error($ch);
curl_close($ch);

// Записываем результаты в лог
file_put_contents("$logDir/test.log", date('Y-m-d H:i:s') . " - HTTP Status: " . $info['http_code'] . "\n", FILE_APPEND);
if ($error) {
    file_put_contents("$logDir/test.log", date('Y-m-d H:i:s') . " - cURL Error: $error\n", FILE_APPEND);
}
file_put_contents("$logDir/test.log", date('Y-m-d H:i:s') . " - Response: $response\n", FILE_APPEND);

// Выводим результаты на страницу
echo "<h1>API Test Results</h1>";
echo "<h2>Request:</h2>";
echo "<pre>" . htmlspecialchars($jsonData) . "</pre>";
echo "<h2>Response:</h2>";
echo "<pre>" . htmlspecialchars($response) . "</pre>";
echo "<h2>HTTP Status:</h2>";
echo "<p>" . $info['http_code'] . "</p>";
if ($error) {
    echo "<h2>Error:</h2>";
    echo "<p>$error</p>";
} 