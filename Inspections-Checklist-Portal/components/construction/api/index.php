<?php
// Индексный файл API для маршрутизации запросов

// Получаем запрошенный ресурс из URL
$requestUri = $_SERVER['REQUEST_URI'];
$resource = isset($_GET['resource']) ? $_GET['resource'] : '';

// Заголовки для CORS и JSON
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Обработка preflight запроса CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Маршрутизация запросов к соответствующим обработчикам
switch ($resource) {
    case 'contractors':
        // Обработка запросов к подрядчикам
        require_once 'contractors.php';
        break;
        
    case 'projects':
        // Обработка запросов к проектам
        require_once 'projects.php';
        break;
        
    case 'files':
        // Обработка запросов к файлам
        require_once 'files.php';
        break;
        
    default:
        // Если ресурс не указан или неизвестен, возвращаем информацию о доступных API
        $apis = [
            'contractors' => [
                'GET /api/?resource=contractors' => 'Получить список всех подрядчиков',
                'GET /api/?resource=contractors&action=get&id={id}' => 'Получить информацию о конкретном подрядчике',
                'POST /api/?resource=contractors' => 'Создать нового подрядчика',
                'POST /api/?resource=contractors&action=update&id={id}' => 'Обновить существующего подрядчика',
                'DELETE /api/?resource=contractors&id={id}' => 'Удалить подрядчика'
            ],
            'projects' => [
                'GET /api/?resource=projects' => 'Получить список всех проектов',
                'GET /api/?resource=projects&type={current|future}' => 'Получить список проектов определенного типа',
                'GET /api/?resource=projects&action=get&id={id}' => 'Получить информацию о конкретном проекте',
                'POST /api/?resource=projects' => 'Создать новый проект',
                'POST /api/?resource=projects&action=update&id={id}' => 'Обновить существующий проект',
                'DELETE /api/?resource=projects&id={id}' => 'Удалить проект'
            ],
            'files' => [
                'GET /api/?resource=files&project_id={id}' => 'Получить файлы проекта',
                'GET /api/?resource=files&action=get&id={id}' => 'Получить информацию о конкретном файле',
                'POST /api/?resource=files&project_id={id}' => 'Загрузить файл для проекта',
                'DELETE /api/?resource=files&id={id}' => 'Удалить файл'
            ]
        ];
        
        echo json_encode([
            'status' => 'API действует',
            'message' => 'Укажите ресурс для доступа к API',
            'available_apis' => $apis
        ]);
        break;
} 