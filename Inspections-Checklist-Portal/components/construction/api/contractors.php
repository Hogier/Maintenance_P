<?php
// Подключаем файл с базой данных
require_once '../db_connection.php';

// Базовый тест API - запись в лог
file_put_contents('../logs/contractor_debug.log', date('Y-m-d H:i:s') . " - API endpoint accessed. Method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);

// Устанавливаем заголовки для ответа в формате JSON
header('Content-Type: application/json');

// Проверяем метод запроса
$method = $_SERVER['REQUEST_METHOD'];

// Получаем действие из параметра
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Обрабатываем запрос в зависимости от метода и действия
switch ($method) {
    case 'GET':
        // Получение данных
        if ($action === 'get' && isset($_GET['id'])) {
            // Получение конкретного подрядчика по ID
            $id = $_GET['id'];
            getContractor($id);
        } else {
            // Получение списка всех подрядчиков
            getAllContractors();
        }
        break;
        
    case 'POST':
        // Создание нового подрядчика или обновление существующего
        // Получаем данные из тела запроса
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Отладочная информация - записываем полученные данные в файл
        file_put_contents('../logs/contractor_debug.log', date('Y-m-d H:i:s') . " - Received data: " . print_r($data, true) . "\n", FILE_APPEND);
        
        if ($action === 'update' && isset($_GET['id'])) {
            // Обновление существующего подрядчика
            $id = $_GET['id'];
            updateContractor($id, $data);
        } else {
            // Создание нового подрядчика
            createContractor($data);
        }
        break;
        
    case 'DELETE':
        // Удаление подрядчика
        if (isset($_GET['id'])) {
            $id = $_GET['id'];
            deleteContractor($id);
        } else {
            sendResponse(false, 'ID подрядчика не указан');
        }
        break;
        
    default:
        // Метод не поддерживается
        http_response_code(405); // Method Not Allowed
        sendResponse(false, 'Метод не поддерживается');
        break;
}

// Функция для получения всех подрядчиков
function getAllContractors() {
    $sql = "SELECT * FROM construction_contractors ORDER BY company_name";
    $contractors = fetchData($sql);
    
    // Для каждого подрядчика получаем его основное контактное лицо
    foreach ($contractors as &$contractor) {
        $sql = "SELECT * FROM construction_employees WHERE contractor_id = ? AND is_primary_contact = 1 LIMIT 1";
        $contact = fetchOne($sql, [$contractor['id']]);
        
        if ($contact) {
            $contractor['contact_person'] = $contact;
        } else {
            $contractor['contact_person'] = null;
        }
    }
    
    sendResponse(true, 'Список подрядчиков получен', $contractors);
}

// Функция для получения подрядчика по ID
function getContractor($id) {
    $sql = "SELECT * FROM construction_contractors WHERE id = ?";
    $contractor = fetchOne($sql, [$id]);
    
    if ($contractor) {
        // Получаем контактных лиц подрядчика
        $sql = "SELECT * FROM construction_employees WHERE contractor_id = ?";
        $employees = fetchData($sql, [$id]);
        
        $contractor['employees'] = $employees;
        
        // Находим основное контактное лицо
        foreach ($employees as $employee) {
            if ($employee['is_primary_contact']) {
                $contractor['contact_person'] = $employee;
                break;
            }
        }
        
        sendResponse(true, 'Подрядчик найден', $contractor);
    } else {
        http_response_code(404); // Not Found
        sendResponse(false, 'Подрядчик не найден');
    }
}

// Функция для создания нового подрядчика
function createContractor($data) {
    // Проверяем наличие обязательных полей
    if (!isset($data['company_name']) || !isset($data['business_type'])) {
        http_response_code(400); // Bad Request
        file_put_contents('../logs/contractor_debug.log', date('Y-m-d H:i:s') . " - Error: Required fields missing\n", FILE_APPEND);
        sendResponse(false, 'Не указаны обязательные поля');
        return;
    }
    
    $sql = "INSERT INTO construction_contractors (company_name, business_type, location, email, phone, rating, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())";
    
    $params = [
        $data['company_name'],
        $data['business_type'],
        $data['location'] ?? '',
        $data['email'] ?? '',
        $data['phone'] ?? '',
        $data['rating'] ?? 0
    ];
    
    // Отладка - логируем SQL и параметры
    file_put_contents('../logs/contractor_debug.log', date('Y-m-d H:i:s') . " - SQL: $sql\n", FILE_APPEND);
    file_put_contents('../logs/contractor_debug.log', date('Y-m-d H:i:s') . " - Params: " . print_r($params, true) . "\n", FILE_APPEND);
    
    $contractorId = insertData($sql, $params);
    
    // Отладка - результат вставки
    file_put_contents('../logs/contractor_debug.log', date('Y-m-d H:i:s') . " - Insert result: " . ($contractorId ? "ID: $contractorId" : "Failed") . "\n", FILE_APPEND);
    
    if ($contractorId) {
        // Проверяем, есть ли данные контактного лица
        if (isset($data['contact_person']) && !empty($data['contact_person']['name'])) {
            $contact = $data['contact_person'];
            $isPrimary = isset($contact['is_primary_contact']) ? $contact['is_primary_contact'] : 1;
            
            $employeeData = [
                'name' => $contact['name'],
                'position' => $contact['position'] ?? '',
                'email' => $contact['email'] ?? '',
                'phone' => $contact['phone'] ?? '',
                'is_primary_contact' => $isPrimary
            ];
            
            addEmployee($contractorId, $employeeData);
        }
        
        // Если созданы сотрудники, добавляем их
        if (isset($data['employees']) && is_array($data['employees'])) {
            foreach ($data['employees'] as $employee) {
                addEmployee($contractorId, $employee);
            }
        }
        
        // Получаем данные созданного подрядчика
        getContractor($contractorId);
    } else {
        http_response_code(500); // Internal Server Error
        sendResponse(false, 'Ошибка при создании подрядчика');
    }
}

// Функция для обновления подрядчика
function updateContractor($id, $data) {
    // Проверяем существование подрядчика
    $sql = "SELECT id FROM construction_contractors WHERE id = ?";
    $contractor = fetchOne($sql, [$id]);
    
    if (!$contractor) {
        http_response_code(404); // Not Found
        sendResponse(false, 'Подрядчик не найден');
        return;
    }
    
    $sql = "UPDATE construction_contractors 
            SET company_name = ?, 
                business_type = ?, 
                location = ?, 
                email = ?, 
                phone = ?, 
                rating = ? 
            WHERE id = ?";
    
    $params = [
        $data['company_name'] ?? $contractor['company_name'],
        $data['business_type'] ?? $contractor['business_type'],
        $data['location'] ?? $contractor['location'],
        $data['email'] ?? $contractor['email'],
        $data['phone'] ?? $contractor['phone'],
        $data['rating'] ?? $contractor['rating'],
        $id
    ];
    
    $result = updateData($sql, $params);
    
    if ($result !== false) {
        // Проверяем, есть ли данные контактного лица
        if (isset($data['contact_person']) && !empty($data['contact_person']['name'])) {
            // Удаляем старое основное контактное лицо
            $sql = "DELETE FROM construction_employees WHERE contractor_id = ? AND is_primary_contact = 1";
            deleteData($sql, [$id]);
            
            // Добавляем новое
            $contact = $data['contact_person'];
            $isPrimary = isset($contact['is_primary_contact']) ? $contact['is_primary_contact'] : 1;
            
            $employeeData = [
                'name' => $contact['name'],
                'position' => $contact['position'] ?? '',
                'email' => $contact['email'] ?? '',
                'phone' => $contact['phone'] ?? '',
                'is_primary_contact' => $isPrimary
            ];
            
            addEmployee($id, $employeeData);
        }
        
        // Если обновлены сотрудники, обновляем их
        if (isset($data['employees']) && is_array($data['employees'])) {
            // Сначала удаляем существующих сотрудников, кроме основного контактного лица
            $sql = "DELETE FROM construction_employees WHERE contractor_id = ? AND is_primary_contact = 0";
            deleteData($sql, [$id]);
            
            // Затем добавляем новых
            foreach ($data['employees'] as $employee) {
                // Устанавливаем флаг is_primary_contact в 0, чтобы не перезаписать основное контактное лицо
                $employee['is_primary_contact'] = 0;
                addEmployee($id, $employee);
            }
        }
        
        // Получаем обновленные данные подрядчика
        getContractor($id);
    } else {
        http_response_code(500); // Internal Server Error
        sendResponse(false, 'Ошибка при обновлении подрядчика');
    }
}

// Функция для удаления подрядчика
function deleteContractor($id) {
    // Проверяем существование подрядчика
    $sql = "SELECT id FROM construction_contractors WHERE id = ?";
    $contractor = fetchOne($sql, [$id]);
    
    if (!$contractor) {
        http_response_code(404); // Not Found
        sendResponse(false, 'Подрядчик не найден');
        return;
    }
    
    // Удаляем подрядчика (сотрудники будут удалены автоматически благодаря ON DELETE CASCADE)
    $sql = "DELETE FROM construction_contractors WHERE id = ?";
    $result = deleteData($sql, [$id]);
    
    if ($result) {
        sendResponse(true, 'Подрядчик успешно удален');
    } else {
        http_response_code(500); // Internal Server Error
        sendResponse(false, 'Ошибка при удалении подрядчика');
    }
}

// Функция для добавления сотрудника подрядчика
function addEmployee($contractorId, $employee) {
    $sql = "INSERT INTO construction_employees (contractor_id, name, position, email, phone, is_primary_contact, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())";
    
    $params = [
        $contractorId,
        $employee['name'],
        $employee['position'] ?? '',
        $employee['email'] ?? '',
        $employee['phone'] ?? '',
        $employee['is_primary_contact'] ?? 0
    ];
    
    return insertData($sql, $params);
}

// Функция для отправки ответа в формате JSON
function sendResponse($success, $message, $data = null) {
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit;
} 