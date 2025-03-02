<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once dirname(__FILE__) . '/code_functions.php';

$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Генерируем код
        $code = generateAccessCode();
        if (!$code) {
            throw new Exception("Failed to generate code");
        }
        
        // Сохраняем код в базу
        if (!saveAccessCode($code)) {
            throw new Exception("Failed to save code");
        }
        
        // Отправляем код на email
        if (!sendEmailWithCode('dmitriy.palchikov@gmail.com', $code)) {
            throw new Exception("Failed to send email");
        }
        
        $message = "Success! Code generated and sent: " . $code;
        $messageType = 'success';
        
    } catch (Exception $e) {
        $message = "Error: " . $e->getMessage();
        $messageType = 'error';
        error_log("Error in generate_code.php: " . $e->getMessage());
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Access Code Generator</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background-color: #f5f5f5;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { 
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .message { 
            margin: 20px 0; 
            padding: 15px; 
            border-radius: 4px; 
        }
        .success { 
            background: #d4edda; 
            color: #155724; 
            border: 1px solid #c3e6cb;
        }
        .error { 
            background: #f8d7da; 
            color: #721c24; 
            border: 1px solid #f5c6cb;
        }
        .button { 
            display: block;
            width: 200px;
            margin: 20px auto;
            padding: 12px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            text-align: center;
        }
        .button:hover { 
            background: #0056b3; 
        }
        .debug-info {
            margin-top: 20px;
            padding: 10px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Access Code Generator</h1>
        
        <form method="post">
            <button type="submit" class="button">Generate New Code</button>
        </form>
        
        <?php if ($message): ?>
            <div class="message <?php echo $messageType; ?>">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>
        
        <div class="debug-info">
            <p>Request Method: <?php echo htmlspecialchars($_SERVER['REQUEST_METHOD']); ?></p>
            <p>PHP Version: <?php echo htmlspecialchars(PHP_VERSION); ?></p>
            <p>Server Time: <?php echo htmlspecialchars(date('Y-m-d H:i:s')); ?></p>
        </div>
    </div>
</body>
</html> 