<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'database.php';

function checkCode($code) {
    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        echo "<h2>Step 1: Direct Code Check</h2>";
        $stmt = $conn->prepare("SELECT * FROM access_codes WHERE code = ?");
        $stmt->bind_param('s', $code);
        $stmt->execute();
        $result = $stmt->get_result();
        $codeData = $result->fetch_assoc();
        
        if ($codeData) {
            echo "<pre>";
            print_r($codeData);
            echo "</pre>";
            
            echo "<h2>Step 2: Status Check</h2>";
            echo "Status is: " . $codeData['status'] . "<br>";
            echo "Is Active? " . ($codeData['status'] === 'active' ? 'Yes' : 'No') . "<br>";
            
            echo "<h2>Step 3: Expiration Check</h2>";
            $currentTime = date('Y-m-d H:i:s');
            echo "Current Time: " . $currentTime . "<br>";
            echo "Expires At: " . $codeData['expires_at'] . "<br>";
            echo "Is Expired? " . (strtotime($codeData['expires_at']) <= strtotime($currentTime) ? 'Yes' : 'No') . "<br>";
            
            echo "<h2>Step 4: SQL Query Test</h2>";
            // Test the exact query used in verify_code.php
            $stmt = $conn->prepare("SELECT * FROM access_codes WHERE code = ? FOR UPDATE");
            $stmt->bind_param('s', $code);
            $stmt->execute();
            $result = $stmt->get_result();
            $lockData = $result->fetch_assoc();
            
            echo "<pre>";
            print_r($lockData);
            echo "</pre>";
            
            echo "<h2>Step 5: Update Query Test</h2>";
            // Test if the update would work
            $stmt = $conn->prepare("SELECT * FROM access_codes WHERE code = ? AND status = 'active'");
            $stmt->bind_param('s', $code);
            $stmt->execute();
            $result = $stmt->get_result();
            $activeData = $result->fetch_assoc();
            
            if ($activeData) {
                echo "Code would be updateable (is active)<br>";
            } else {
                echo "Code would not be updateable (not active)<br>";
            }
            
        } else {
            echo "Code not found in database";
        }
        
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage();
    } finally {
        if (isset($conn)) {
            $conn->close();
        }
    }
}

// Test the code
$code = '9H67-QXRK-F1Y4';
echo "<h1>Checking code: " . htmlspecialchars($code) . "</h1>";
checkCode($code);
?> 