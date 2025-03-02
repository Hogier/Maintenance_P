<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'database.php';

// Создаем экземпляр класса Database
$database = new Database();
$conn = $database->getConnection();

echo "<h2>Active Access Codes</h2>";

try {
    // Проверяем все активные коды
    $stmt = $conn->prepare("SELECT * FROM access_codes WHERE status = 'active' AND expires_at > NOW() ORDER BY created_at DESC");
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>ID</th><th>Code</th><th>Status</th><th>Created At</th><th>Expires At</th></tr>";
        
        while ($row = $result->fetch_assoc()) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($row['id']) . "</td>";
            echo "<td>" . htmlspecialchars($row['code']) . "</td>";
            echo "<td>" . htmlspecialchars($row['status']) . "</td>";
            echo "<td>" . htmlspecialchars($row['created_at']) . "</td>";
            echo "<td>" . htmlspecialchars($row['expires_at']) . "</td>";
            echo "</tr>";
        }
        
        echo "</table>";
    } else {
        echo "<p>No active codes found.</p>";
    }
    
    echo "<h2>All Access Codes</h2>";
    
    // Показываем все коды
    $stmt = $conn->prepare("SELECT * FROM access_codes ORDER BY created_at DESC");
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>ID</th><th>Code</th><th>Status</th><th>Created At</th><th>Expires At</th><th>Used At</th></tr>";
        
        while ($row = $result->fetch_assoc()) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($row['id']) . "</td>";
            echo "<td>" . htmlspecialchars($row['code']) . "</td>";
            echo "<td>" . htmlspecialchars($row['status']) . "</td>";
            echo "<td>" . htmlspecialchars($row['created_at']) . "</td>";
            echo "<td>" . htmlspecialchars($row['expires_at']) . "</td>";
            echo "<td>" . htmlspecialchars($row['used_at'] ?? '') . "</td>";
            echo "</tr>";
        }
        
        echo "</table>";
    } else {
        echo "<p>No codes found in the database.</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}
?> 