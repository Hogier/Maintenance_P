<?php
// Подключаем файл с базой данных
require_once '../db_connection.php';

// Создаем необходимые директории для загрузки файлов, если они не существуют
$uploadDirs = [
    '../project_upload/',
    '../project_upload/project_files/',
    '../project_upload/project_mini/'
];

foreach ($uploadDirs as $dir) {
    if (!file_exists($dir)) {
        if (!mkdir($dir, 0777, true)) {
            error_log("Не удалось создать директорию: $dir");
        } else {
            chmod($dir, 0777); // Устанавливаем права доступа
        }
    }
}

// Устанавливаем заголовки для ответа в формате JSON
header('Content-Type: application/json');

// Проверяем метод запроса
$method = $_SERVER['REQUEST_METHOD'];

// Получаем действие из параметра
$action = isset($_GET['action']) ? $_GET['action'] : '';
$type = isset($_GET['type']) ? $_GET['type'] : null; // тип проекта: current или future

// Обрабатываем запрос в зависимости от метода и действия
switch ($method) {
    case 'GET':
        // Получение данных
        if ($action === 'get' && isset($_GET['id'])) {
            // Получение конкретного проекта по ID
            $id = $_GET['id'];
            getProject($id);
        } else {
            // Получение списка проектов с возможной фильтрацией по типу
            getAllProjects($type);
        }
        break;
        
    case 'POST':
        // Создание нового проекта или обновление существующего
        // Получаем данные из тела запроса
        $data = json_decode(file_get_contents('php://input'), true);
        
        if ($action === 'update' && isset($_GET['id'])) {
            // Обновление существующего проекта
            $id = $_GET['id'];
            updateProject($id, $data);
        } else {
            // Создание нового проекта
            createProject($data);
        }
        break;
        
    case 'DELETE':
        // Удаление проекта
        if (isset($_GET['id'])) {
            $id = $_GET['id'];
            deleteProject($id);
        } else {
            sendResponse(false, 'ID проекта не указан');
        }
        break;
        
    default:
        // Метод не поддерживается
        http_response_code(405); // Method Not Allowed
        sendResponse(false, 'Метод не поддерживается');
        break;
}

// Функция для получения всех проектов
function getAllProjects($type = null) {
    $sql = "SELECT p.*, 
               c.company_name as contractor_name,
               e.name as contact_person_name,
               e.position as contact_person_position
           FROM construction_projects p
           LEFT JOIN construction_contractors c ON p.contractor_id = c.id
           LEFT JOIN construction_employees e ON p.contact_person_id = e.id";
    
    $params = [];
    
    // Фильтруем по типу проекта, если указан
    if ($type !== null) {
        $sql .= " WHERE p.project_type = ?";
        $params[] = $type;
    }
    
    $sql .= " ORDER BY p.start_date DESC";
    
    $projects = fetchData($sql, $params);
    
    // Для каждого проекта получаем его файлы
    foreach ($projects as &$project) {
        $projectId = $project['id'];
        $project['files'] = getProjectFiles($projectId);
    }
    
    sendResponse(true, 'Список проектов получен', $projects);
}

// Функция для получения проекта по ID
function getProject($id) {
    $sql = "SELECT p.*, 
               c.company_name as contractor_name,
               e.name as contact_person_name,
               e.position as contact_person_position
           FROM construction_projects p
           LEFT JOIN construction_contractors c ON p.contractor_id = c.id
           LEFT JOIN construction_employees e ON p.contact_person_id = e.id
           WHERE p.id = ?";
    
    $project = fetchOne($sql, [$id]);
    
    if ($project) {
        // Получаем файлы проекта
        $project['files'] = getProjectFiles($id);
        
        sendResponse(true, 'Проект найден', $project);
    } else {
        http_response_code(404); // Not Found
        sendResponse(false, 'Проект не найден');
    }
}

// Функция для получения файлов проекта
function getProjectFiles($projectId) {
    $sql = "SELECT * FROM construction_project_files WHERE project_id = ?";
    return fetchData($sql, [$projectId]);
}

// Функция для создания нового проекта
function createProject($data) {
    // Проверяем наличие обязательных полей
    if (!isset($data['name']) || !isset($data['project_type'])) {
        http_response_code(400); // Bad Request
        sendResponse(false, 'Не указаны обязательные поля');
        return;
    }
    
    global $pdo;
    
    try {
        // Начинаем транзакцию
        $pdo->beginTransaction();
        
        // Вставляем основные данные проекта
        $sql = "INSERT INTO construction_projects (
                    name, location, start_date, end_date, contractor_id, contact_person_id, business_type, 
                    project_type, status, progress, actual_cost, last_update, budget, priority, 
                    description, objectives, risks, migrated_from_future
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $params = [
            $data['name'],
            $data['location'] ?? '',
            $data['start_date'] ?? null,
            $data['end_date'] ?? null,
            $data['contractor_id'] ?? null,
            $data['contact_person_id'] ?? null,
            $data['business_type'] ?? '',
            $data['project_type'],
            $data['status'] ?? 'planned',
            $data['progress'] ?? 0,
            $data['actual_cost'] ?? 0,
            $data['last_update'] ?? null,
            $data['budget'] ?? 0,
            $data['priority'] ?? 'medium',
            $data['description'] ?? '',
            $data['objectives'] ?? '',
            $data['risks'] ?? '',
            $data['migrated_from_future'] ?? 0
        ];
        
        $projectId = insertData($sql, $params);
        
        // Если ID получен, добавляем файлы проекта
        if ($projectId) {
            // Обрабатываем файлы проекта
            if (isset($data['files']) && is_array($data['files'])) {
                foreach ($data['files'] as $file) {
                    addProjectFile($projectId, $file);
                }
            }
            
            // Завершаем транзакцию
            $pdo->commit();
            
            // Получаем данные созданного проекта
            getProject($projectId);
        } else {
            $pdo->rollBack();
            http_response_code(500); // Internal Server Error
            sendResponse(false, 'Ошибка при создании проекта');
        }
    } catch (Exception $e) {
        // В случае ошибки откатываем транзакцию
        $pdo->rollBack();
        http_response_code(500); // Internal Server Error
        sendResponse(false, 'Ошибка при создании проекта: ' . $e->getMessage());
    }
}

// Функция для обновления проекта
function updateProject($id, $data) {
    global $pdo;
    
    // Проверяем существование проекта
    $sql = "SELECT * FROM construction_projects WHERE id = ?";
    $project = fetchOne($sql, [$id]);
    
    if (!$project) {
        http_response_code(404); // Not Found
        sendResponse(false, 'Проект не найден');
        return;
    }
    
    try {
        // Начинаем транзакцию
        $pdo->beginTransaction();
        
        // Обновляем основные данные проекта
        $sql = "UPDATE construction_projects 
                SET name = ?, 
                    location = ?, 
                    start_date = ?, 
                    end_date = ?, 
                    contractor_id = ?, 
                    contact_person_id = ?, 
                    business_type = ?, 
                    project_type = ?, 
                    status = ?, 
                    progress = ?, 
                    actual_cost = ?, 
                    last_update = ?, 
                    budget = ?, 
                    priority = ?, 
                    description = ?, 
                    objectives = ?, 
                    risks = ?, 
                    migrated_from_future = ?
                WHERE id = ?";
        
        $params = [
            $data['name'] ?? $project['name'],
            $data['location'] ?? $project['location'],
            $data['start_date'] ?? $project['start_date'],
            $data['end_date'] ?? $project['end_date'],
            $data['contractor_id'] ?? $project['contractor_id'],
            $data['contact_person_id'] ?? $project['contact_person_id'],
            $data['business_type'] ?? $project['business_type'],
            $data['project_type'] ?? $project['project_type'],
            $data['status'] ?? $project['status'],
            $data['progress'] ?? $project['progress'],
            $data['actual_cost'] ?? $project['actual_cost'],
            $data['last_update'] ?? $project['last_update'],
            $data['budget'] ?? $project['budget'],
            $data['priority'] ?? $project['priority'],
            $data['description'] ?? $project['description'],
            $data['objectives'] ?? $project['objectives'],
            $data['risks'] ?? $project['risks'],
            $data['migrated_from_future'] ?? $project['migrated_from_future'],
            $id
        ];
        
        $result = updateData($sql, $params);
        
        if ($result !== false) {
            // Если обновлены файлы, обновляем их
            if (isset($data['files']) && is_array($data['files'])) {
                // Удаляем существующие файлы, если указано
                if (isset($data['clear_files']) && $data['clear_files']) {
                    $sql = "DELETE FROM construction_project_files WHERE project_id = ?";
                    deleteData($sql, [$id]);
                }
                
                // Добавляем новые файлы
                foreach ($data['files'] as $file) {
                    // Если файл имеет ID, значит он уже существует
                    if (isset($file['id'])) {
                        updateProjectFile($file['id'], $file);
                    } else {
                        addProjectFile($id, $file);
                    }
                }
            }
            
            // Завершаем транзакцию
            $pdo->commit();
            
            // Получаем обновленные данные проекта
            getProject($id);
        } else {
            $pdo->rollBack();
            http_response_code(500); // Internal Server Error
            sendResponse(false, 'Ошибка при обновлении проекта');
        }
    } catch (Exception $e) {
        // В случае ошибки откатываем транзакцию
        $pdo->rollBack();
        http_response_code(500); // Internal Server Error
        sendResponse(false, 'Ошибка при обновлении проекта: ' . $e->getMessage());
    }
}

// Функция для удаления проекта
function deleteProject($id) {
    global $pdo;
    
    // Проверяем существование проекта
    $sql = "SELECT id FROM construction_projects WHERE id = ?";
    $project = fetchOne($sql, [$id]);
    
    if (!$project) {
        http_response_code(404); // Not Found
        sendResponse(false, 'Проект не найден');
        return;
    }
    
    try {
        // Начинаем транзакцию
        $pdo->beginTransaction();
        
        // Удаляем файлы проекта
        $sql = "DELETE FROM construction_project_files WHERE project_id = ?";
        deleteData($sql, [$id]);
        
        // Удаляем сам проект
        $sql = "DELETE FROM construction_projects WHERE id = ?";
        $result = deleteData($sql, [$id]);
        
        if ($result) {
            // Завершаем транзакцию
            $pdo->commit();
            sendResponse(true, 'Проект успешно удален');
        } else {
            $pdo->rollBack();
            http_response_code(500); // Internal Server Error
            sendResponse(false, 'Ошибка при удалении проекта');
        }
    } catch (Exception $e) {
        // В случае ошибки откатываем транзакцию
        $pdo->rollBack();
        http_response_code(500); // Internal Server Error
        sendResponse(false, 'Ошибка при удалении проекта: ' . $e->getMessage());
    }
}

// Функция для добавления файла проекта
function addProjectFile($projectId, $file) {
    global $pdo;
    
    try {
        // Check if we have a File object from JSON or just metadata
        if (isset($file['id']) && isset($file['file_name'])) {
            // This is an existing file with metadata, just add it to the project
            $sql = "INSERT INTO construction_project_files (
                        project_id, file_name, original_name, file_type, file_category, 
                        mime_type, file_path, mini_path, migrated_from_future
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $params = [
                $projectId,
                $file['file_name'],
                $file['original_name'] ?? $file['file_name'],
                $file['file_type'] ?? pathinfo($file['file_name'], PATHINFO_EXTENSION),
                $file['file_category'] ?? 'document',
                $file['mime_type'] ?? 'application/octet-stream',
                $file['file_path'] ?? 'project_upload/project_files/' . $file['file_name'],
                $file['mini_path'] ?? null,
                $file['migrated_from_future'] ?? 0
            ];
            
            return insertData($sql, $params);
        } else {
            // Log received file data for debugging
            error_log("Project file data received: " . print_r($file, true));
            
            // This is a new file that needs to be uploaded
            // We should use the upload_handler.php for actual file upload
            // Here we just register that a file will be associated with this project
            
            // Generate a placeholder filename if not provided
            $fileName = isset($file['file_name']) ? $file['file_name'] : 'file_' . uniqid() . '.tmp';
            $fileCategory = isset($file['category']) ? $file['category'] : 'document';
            
            $sql = "INSERT INTO construction_project_files (
                        project_id, file_name, original_name, file_type, file_category, 
                        mime_type, file_path, mini_path, migrated_from_future
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $params = [
                $projectId,
                $fileName,
                $file['original_name'] ?? ($file['name'] ?? $fileName),
                $file['file_type'] ?? pathinfo($fileName, PATHINFO_EXTENSION),
                $fileCategory,
                $file['mime_type'] ?? 'application/octet-stream',
                $file['file_path'] ?? 'project_upload/project_files/' . $fileName,
                $file['mini_path'] ?? null,
                $file['migrated_from_future'] ?? 0
            ];
            
            return insertData($sql, $params);
        }
    } catch (Exception $e) {
        error_log("Error in addProjectFile: " . $e->getMessage());
        error_log("File data: " . print_r($file, true));
        return false;
    }
}

// Функция для обновления файла проекта
function updateProjectFile($fileId, $file) {
    $sql = "UPDATE construction_project_files 
            SET original_name = ?, 
                file_type = ?, 
                file_category = ?, 
                mime_type = ?, 
                migrated_from_future = ?
            WHERE id = ?";
    
    $params = [
        $file['original_name'] ?? '',
        $file['file_type'] ?? 'document',
        $file['file_category'] ?? 'document',
        $file['mime_type'] ?? 'application/octet-stream',
        $file['migrated_from_future'] ?? 0,
        $fileId
    ];
    
    return updateData($sql, $params);
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