<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Форма для ввода кода
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Access Code</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .form-container { max-width: 400px; margin: 0 auto; }
            input[type="text"] { padding: 8px; width: 200px; margin: 10px 0; }
            button { padding: 8px 15px; background: #007bff; color: white; border: none; cursor: pointer; }
            .result { margin-top: 20px; padding: 10px; border-radius: 4px; }
            .success { background: #d4edda; color: #155724; }
            .error { background: #f8d7da; color: #721c24; }
        </style>
    </head>
    <body>
        <div class="form-container">
            <h2>Test Access Code Verification</h2>
            <form method="POST" id="verifyForm">
                <div>
                    <label for="code">Enter Access Code:</label><br>
                    <input type="text" id="code" name="code" required placeholder="Enter code here">
                </div>
                <button type="submit">Verify Code</button>
            </form>
            <div id="result"></div>
        </div>

        <script>
        document.getElementById('verifyForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const code = document.getElementById('code').value;
            const resultDiv = document.getElementById('result');
            
            // Показываем, что отправляем
            console.log('Sending data:', {
                action: 'verifyAccessCode',
                code: code
            });
            
            const formData = new FormData();
            formData.append('action', 'verifyAccessCode');
            formData.append('code', code);

            fetch('verify_code.php', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                console.log('Response status:', response.status);
                console.log('Response headers:', response.headers);
                return response.json();
            })
            .then(data => {
                console.log('Response data:', data);
                resultDiv.className = 'result ' + (data.success ? 'success' : 'error');
                resultDiv.textContent = data.message;
            })
            .catch(error => {
                console.error('Error:', error);
                resultDiv.className = 'result error';
                resultDiv.textContent = 'Error: ' + error.message;
            });
        });
        </script>
    </body>
    </html>
    <?php
    exit;
}
?> 