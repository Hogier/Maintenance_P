<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

function debug_log($message) {
    error_log(date('Y-m-d H:i:s') . ' - ' . $message);
}

debug_log('Script started');
debug_log('Request method: ' . $_SERVER['REQUEST_METHOD']);

require_once dirname(__FILE__) . '/database.php';
require_once dirname(__FILE__) . '/verify_code.php';

debug_log('Files included');

$message = '';
$generatedCode = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    debug_log('POST request received');
    try {
        // Создаем подключение к базе данных
        debug_log('Creating database connection');
        $database = new Database();
        $conn = $database->getConnection();
        debug_log('Database connection established');
        
        // Генерируем новый код
        debug_log('Generating new code');
        $newCode = generateAccessCode();
        debug_log('Generated code: ' . $newCode);
        
        // Сохраняем код в базу данных
        $currentDate = date('Y-m-d H:i:s');
        $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
        
        debug_log('Preparing SQL statement');
        $stmt = $conn->prepare("INSERT INTO access_codes (code, status, created_at, expires_at) VALUES (?, 'active', ?, ?)");
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        debug_log('Binding parameters');
        $stmt->bind_param('sss', $newCode, $currentDate, $expiresAt);
        
        debug_log('Executing statement');
        if ($stmt->execute()) {
            $generatedCode = $newCode;
            debug_log('Code saved to database');
            
            // Отправляем email
            debug_log('Sending email');
            if (sendEmailWithCode('dmitriy.palchikov@gmail.com', $newCode)) {
                $message = 'Code generated and email sent successfully';
                debug_log('Email sent successfully');
            } else {
                $message = 'Code generated but email could not be sent';
                debug_log('Failed to send email');
            }
        } else {
            $error = 'Failed to save code to database: ' . $stmt->error;
            debug_log('Failed to execute statement: ' . $stmt->error);
        }
        
    } catch (Exception $e) {
        $error = 'Error: ' . $e->getMessage();
        debug_log('Exception caught: ' . $e->getMessage());
        debug_log('Stack trace: ' . $e->getTraceAsString());
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Generate Access Code</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        .result { margin: 20px 0; padding: 10px; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        button { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
        button:hover { background: #0056b3; }
        .code { font-size: 24px; font-weight: bold; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Access Code Generation</h2>
        
        <form method="post" action="">
            <button type="submit">Generate New Code</button>
        </form>

        <?php if ($error): ?>
            <div class="result error">
                <p><?php echo htmlspecialchars($error); ?></p>
            </div>
        <?php endif; ?>

        <?php if ($message): ?>
            <div class="result success">
                <p><?php echo htmlspecialchars($message); ?></p>
                <?php if ($generatedCode): ?>
                    <div class="code"><?php echo htmlspecialchars($generatedCode); ?></div>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <div style="margin-top: 20px;">
            <p>Current request method: <?php echo htmlspecialchars($_SERVER['REQUEST_METHOD']); ?></p>
        </div>
    </div>
</body>
</html> 