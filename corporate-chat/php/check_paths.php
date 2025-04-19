<?php
// Set headers to avoid caching
header('Cache-Control: no-cache, must-revalidate');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
header('Content-Type: text/html; charset=utf-8');

// Function to check directory and list files
function check_directory($path) {
    echo "<h3>Checking path: $path</h3>";
    
    if (file_exists($path)) {
        echo "<p style='color:green'>✓ Path exists!</p>";
        
        if (is_dir($path)) {
            echo "<p>It's a directory. Contents:</p>";
            echo "<ul>";
            
            $files = scandir($path);
            foreach ($files as $file) {
                if ($file != "." && $file != "..") {
                    echo "<li>$file</li>";
                }
            }
            
            echo "</ul>";
        } else {
            echo "<p>It's a file, not a directory.</p>";
        }
    } else {
        echo "<p style='color:red'>✗ Path does not exist</p>";
    }
    echo "<hr>";
}

// Get the document root
$doc_root = $_SERVER['DOCUMENT_ROOT'];
echo "<h2>Document Root: $doc_root</h2>";

// Check various directories
$paths_to_check = [
    $doc_root . '/user',
    $doc_root . '/Maintenance_P/user',
    $doc_root . '/maintenance_p/user',
    dirname($doc_root) . '/user',
    dirname($doc_root, 2) . '/user',
    dirname(__FILE__, 3) . '/user',
    dirname(__FILE__, 4) . '/user',
];

foreach ($paths_to_check as $path) {
    check_directory($path);
}

// Also check for the specific image
$filename = 'IMG_9191.jpeg';
echo "<h2>Looking for file: $filename</h2>";

foreach ($paths_to_check as $base_path) {
    $full_path = $base_path . '/' . $filename;
    echo "<p>Checking: $full_path - " . (file_exists($full_path) ? "<span style='color:green'>Found!</span>" : "<span style='color:red'>Not found</span>") . "</p>";
    
    // Also check in mini subfolder
    $mini_path = $base_path . '/mini/' . $filename;
    echo "<p>Checking: $mini_path - " . (file_exists($mini_path) ? "<span style='color:green'>Found!</span>" : "<span style='color:red'>Not found</span>") . "</p>";
}

// Print server variables for debugging
echo "<h2>Server Information</h2>";
echo "<pre>";
echo "Script path: " . __FILE__ . "\n";
echo "Script directory: " . dirname(__FILE__) . "\n";
echo "Parent directory: " . dirname(__FILE__, 2) . "\n";
echo "REQUEST_URI: " . $_SERVER['REQUEST_URI'] . "\n";
echo "SCRIPT_NAME: " . $_SERVER['SCRIPT_NAME'] . "\n";
echo "PHP_SELF: " . $_SERVER['PHP_SELF'] . "\n";
echo "</pre>";
?> 