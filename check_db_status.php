<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once dirname(__FILE__) . '/database.php';

// Create database connection
$db = new Database();
$conn = $db->getConnection();

$code = '9H67-QXRK-F1Y4';
$currentTime = date('Y-m-d H:i:s');

// Get all information about the code
$stmt = $conn->prepare("
    SELECT id, code, status, created_at, used_at, expires_at 
    FROM access_codes 
    WHERE code = ?
");
$stmt->bind_param('s', $code);
$stmt->execute();
$result = $stmt->get_result();
$codeData = $result->fetch_assoc();

echo "<h2>Access Code Status Check</h2>";
echo "<pre>";
if ($codeData) {
    echo "Code Found:\n";
    echo "ID: " . $codeData['id'] . "\n";
    echo "Code: " . $codeData['code'] . "\n";
    echo "Status: " . $codeData['status'] . "\n";
    echo "Created At: " . $codeData['created_at'] . "\n";
    echo "Used At: " . ($codeData['used_at'] ? $codeData['used_at'] : 'Not used') . "\n";
    echo "Expires At: " . $codeData['expires_at'] . "\n";
    echo "\nCurrent Server Time: " . $currentTime . "\n";
    
    // Check if code should be active
    if ($codeData['status'] === 'active' && $codeData['expires_at'] > $currentTime) {
        echo "\nCode should be valid and active!";
    } else {
        echo "\nCode validation issues:";
        if ($codeData['status'] !== 'active') echo "\n- Status is not active";
        if ($codeData['expires_at'] <= $currentTime) echo "\n- Code has expired";
    }
} else {
    echo "No code found with value: $code";
}
echo "</pre>";

// Show the actual query that verify_code.php uses
$stmt = $conn->prepare("
    SELECT * FROM access_codes 
    WHERE code = ? 
    AND status = 'active' 
    AND expires_at > ?
");
$stmt->bind_param('ss', $code, $currentTime);
$stmt->execute();
$result = $stmt->get_result();
$verifyData = $result->fetch_assoc();

echo "<h3>Verification Query Result:</h3>";
echo "<pre>";
echo "Would this code pass verification? " . ($verifyData ? "YES" : "NO") . "\n";
if ($verifyData) {
    echo "Verification data found:\n";
    print_r($verifyData);
}
echo "</pre>";

$conn->close();
?> 