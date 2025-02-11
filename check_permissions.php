<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$baseDir = __DIR__;
$uploadsDir = $baseDir . '/uploads';
$miniDir = $uploadsDir . '/mini';

// Функция для проверки и создания директорий
function ensureDirectory($path) {
    if (!file_exists($path)) {
        if (!mkdir($path, 0777, true)) {
            die("Failed to create directory: " . $path);
        }
        echo "Created directory: $path\n";
    }
    
    if (!is_writable($path)) {
        echo "Warning: Directory is not writable: $path\n";
        echo "Please run these commands in terminal:\n";
        echo "sudo chmod -R 777 " . escapeshellarg($path) . "\n";
    } else {
        echo "Directory $path is writable\n";
    }
}

// Проверяем директории
ensureDirectory($uploadsDir);
ensureDirectory($miniDir);

echo "\nPlease run these commands in terminal to set permissions:\n";
echo "cd " . escapeshellarg($baseDir) . "\n";
echo "sudo chmod -R 777 uploads\n"; 