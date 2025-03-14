<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', dirname(__FILE__) . '/debug.log');

require_once dirname(__FILE__) . '/database.php';

// Function to check access code
function checkAccessCode($code) {
    try {
        $database = new Database();
        $conn = $database->getConnection();
        
        // First, let's see all active codes
        $stmt = $conn->prepare("SELECT * FROM access_codes WHERE status = 'active'");
        $stmt->execute();
        $result = $stmt->get_result();
        
        echo "<h3>All Active Codes:</h3>";
        while ($row = $result->fetch_assoc()) {
            echo "ID: " . $row['id'] . "<br>";
            echo "Code: " . $row['code'] . "<br>";
            echo "Status: " . $row['status'] . "<br>";
            echo "Created: " . $row['created_at'] . "<br>";
            echo "Expires: " . $row['expires_at'] . "<br>";
            echo "Used: " . ($row['used_at'] ? $row['used_at'] : 'Not used') . "<br>";
            echo "<hr>";
        }
        
        // Now check the specific code
        if (!empty($code)) {
            echo "<h3>Checking Specific Code: " . htmlspecialchars($code) . "</h3>";
            
            $stmt = $conn->prepare("SELECT * FROM access_codes WHERE code = ?");
            $stmt->bind_param('s', $code);
            $stmt->execute();
            $result = $stmt->get_result();
            $codeData = $result->fetch_assoc();
            
            if ($codeData) {
                echo "Found code in database:<br>";
                echo "Status: " . $codeData['status'] . "<br>";
                echo "Created: " . $codeData['created_at'] . "<br>";
                echo "Expires: " . $codeData['expires_at'] . "<br>";
                echo "Used: " . ($codeData['used_at'] ? $codeData['used_at'] : 'Not used') . "<br>";
            } else {
                echo "Code not found in database";
            }
        }
        
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage();
    }
}

// Get code from URL parameter
$codeToCheck = isset($_GET['code']) ? $_GET['code'] : '';
?>

<!DOCTYPE html>
<html>
<head>
    <title>Check Access Code</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .code-form { margin-bottom: 20px; }
        hr { margin: 10px 0; border: 1px solid #eee; }
    </style>
</head>
<body>
    <h2>Access Code Checker</h2>
    
    <div class="code-form">
        <form method="get">
            <input type="text" name="code" value="<?php echo htmlspecialchars($codeToCheck); ?>" placeholder="Enter access code">
            <input type="submit" value="Check Code">
        </form>
    </div>
    
    <?php
    if (!empty($codeToCheck)) {
        checkAccessCode($codeToCheck);
    } else {
        checkAccessCode('');  // Show all active codes
    }
    ?>
</body>
</html> 