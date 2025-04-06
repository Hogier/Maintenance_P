<?php
// Скрипт для проверки и создания необходимых директорий для загрузки файлов проектов

// Определяем необходимые директории
$uploadDir = __DIR__ . '/project_upload/project_files/';
$miniDir = __DIR__ . '/project_upload/project_mini/';

echo "<h2>Проверка директорий для загрузки файлов</h2>";

// Проверка и создание основной директории для загрузки
if (!file_exists(__DIR__ . '/project_upload')) {
    if (mkdir(__DIR__ . '/project_upload', 0777, true)) {
        echo "<p style='color: green;'>Директория project_upload успешно создана</p>";
    } else {
        echo "<p style='color: red;'>Не удалось создать директорию project_upload</p>";
    }
} else {
    echo "<p>Директория project_upload уже существует</p>";
}

// Проверка и создание директории для файлов
if (!file_exists($uploadDir)) {
    if (mkdir($uploadDir, 0777, true)) {
        echo "<p style='color: green;'>Директория для файлов project_files успешно создана</p>";
    } else {
        echo "<p style='color: red;'>Не удалось создать директорию для файлов project_files</p>";
    }
} else {
    echo "<p>Директория для файлов project_files уже существует</p>";
}

// Проверка и создание директории для миниатюр
if (!file_exists($miniDir)) {
    if (mkdir($miniDir, 0777, true)) {
        echo "<p style='color: green;'>Директория для миниатюр project_mini успешно создана</p>";
    } else {
        echo "<p style='color: red;'>Не удалось создать директорию для миниатюр project_mini</p>";
    }
} else {
    echo "<p>Директория для миниатюр project_mini уже существует</p>";
}

// Проверка прав доступа
echo "<h3>Проверка прав доступа:</h3>";

function checkPermissions($dir) {
    if (is_writable($dir)) {
        echo "<p>Директория $dir доступна для записи ✅</p>";
    } else {
        echo "<p style='color: red;'>Директория $dir НЕ доступна для записи ❌</p>";
        // Попытка исправить права доступа
        if (chmod($dir, 0777)) {
            echo "<p style='color: green;'>Права доступа для $dir успешно изменены на 0777</p>";
        } else {
            echo "<p style='color: red;'>Не удалось изменить права доступа для $dir</p>";
        }
    }
}

checkPermissions(__DIR__ . '/project_upload');
checkPermissions($uploadDir);
checkPermissions($miniDir);

echo "<h3>Информация о путях:</h3>";
echo "<p>Путь до директории скрипта: " . __DIR__ . "</p>";
echo "<p>Полный путь до директории файлов: " . realpath($uploadDir) . "</p>";
echo "<p>Полный путь до директории миниатюр: " . realpath($miniDir) . "</p>";

// Проверка пути, который используется в JavaScript
echo "<h3>Ожидаемые URL пути в браузере:</h3>";
$basePath = "/Maintenance_P/Inspections-Checklist-Portal/components/construction";
echo "<p>Путь до файлов: $basePath/project_upload/project_files/</p>";
echo "<p>Путь до миниатюр: $basePath/project_upload/project_mini/</p>";

// Информация о том, как используются файлы в API
echo "<h3>Информация о том, как работает API:</h3>";
echo "<p>В файле files.php директории указаны как: '../project_upload/project_files/' и '../project_upload/project_mini/'</p>";
echo "<p>Это относительные пути от директории API, поэтому в JavaScript при отображении файлов необходимо корректировать эти пути.</p>"; 