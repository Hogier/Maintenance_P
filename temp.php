<?php
// Параметры подключения к базе данных
$host = 'macan.cityhost.com.ua';
$user = 'chff6ee508';
$password = '73b6bd56cf';
$database = 'chff6ee508';

try {
    // Подключение к базе данных с использованием PDO
    $pdo = new PDO("mysql:host=$host;dbname=$database;charset=utf8", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Список пользователей
    $users = [
        ['username' => 'maintenance1', 'password' => 'pass1', 'name' => 'John Maintenance', 'role' => 'maintenance'],
        ['username' => 'maintenance2', 'password' => 'pass2', 'name' => 'Sarah Technical', 'role' => 'maintenance'],
    ];

    $stmt = $pdo->prepare("INSERT INTO maintenance_staff (username, password_hash, name, role) VALUES (:username, :password_hash, :name, :role)");

    foreach ($users as $user) {
        // Хэширование пароля
        $hashedPassword = password_hash($user['password'], PASSWORD_DEFAULT);

        // Выполнение запроса с параметрами
        $stmt->execute([
            'username' => $user['username'],
            'password_hash' => $hashedPassword,
            'name' => $user['name'],
            'role' => $user['role'],
        ]);
    }

    echo "Пользователи успешно добавлены в базу данных!";
} catch (PDOException $e) {
    // Обработка ошибок подключения или выполнения запросов
    die(json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]));
}
?>