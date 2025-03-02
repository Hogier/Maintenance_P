<?php
// Включаем отображение всех ошибок
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once dirname(__FILE__) . '/verify_code.php';
require_once dirname(__FILE__) . '/database.php';

echo "<h2>Access Code Generator</h2>";

try {
    debug_log("=== Starting code generation process ===");
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['generate'])) {
        debug_log("Generate button pressed");
        $newCode = updateAccessCode();
        if ($newCode) {
            debug_log("New code generated: " . $newCode);
            echo "<div style='color: green; margin: 10px 0;'>✓ New code generated and sent to email!</div>";
        } else {
            debug_log("No new code generated - active code exists");
            echo "<div style='color: orange; margin: 10px 0;'>ℹ A valid code already exists in the system.</div>";
        }
    }
    
    debug_log("Creating database connection");
    $db = new Database();
    $conn = $db->getConnection();
    
    debug_log("Preparing to fetch codes");
    // Check existing codes
    $stmt = $conn->prepare("SELECT * FROM access_codes ORDER BY created_at DESC LIMIT 5");
    $stmt->execute();
    $result = $stmt->get_result();
    debug_log("Codes fetched successfully");
    
    echo "<h3>Last Generated Codes:</h3>";
    echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
    echo "<tr style='background-color: #f0f0f0;'>";
    echo "<th>Code</th>";
    echo "<th>Status</th>";
    echo "<th>Created</th>";
    echo "<th>Used</th>";
    echo "<th>Expires</th>";
    echo "</tr>";
    
    while ($row = $result->fetch_assoc()) {
        echo "<tr>";
        echo "<td><strong>" . htmlspecialchars($row['code']) . "</strong></td>";
        echo "<td>" . htmlspecialchars($row['status']) . "</td>";
        echo "<td>" . htmlspecialchars($row['created_at']) . "</td>";
        echo "<td>" . (empty($row['used_at']) ? 'Not used' : htmlspecialchars($row['used_at'])) . "</td>";
        echo "<td>" . htmlspecialchars($row['expires_at']) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    debug_log("Closing database connection");
    $conn->close();
    
} catch (Exception $e) {
    debug_log("Error occurred: " . $e->getMessage());
    debug_log("Error trace: " . $e->getTraceAsString());
    echo "<div style='color: red; margin: 10px 0;'>Error: " . htmlspecialchars($e->getMessage()) . "</div>";
}

// Generate button
echo "<form method='post' style='margin-top: 20px;'>";
echo "<input type='submit' name='generate' value='Generate New Code' style='padding: 10px 20px;'>";
echo "</form>";

debug_log("=== End of code generation process ===");
?> 