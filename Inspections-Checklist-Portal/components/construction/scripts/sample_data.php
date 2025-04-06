<?php
/**
 * Скрипт для добавления тестовых данных в базу
 * Запуск: php sample_data.php
 */

// Определяем корневой путь
$rootPath = dirname(dirname(__FILE__));

// Подключаем файл с подключением к базе данных
require_once $rootPath . '/db_connection.php';

// Проверка аргументов командной строки
$clearExisting = in_array('--clear', $argv);

if ($clearExisting) {
    echo "Удаление существующих данных...\n";
    
    try {
        // Удаляем данные в порядке зависимостей
        $pdo->exec("DELETE FROM construction_project_files");
        $pdo->exec("DELETE FROM construction_projects");
        $pdo->exec("DELETE FROM construction_employees");
        $pdo->exec("DELETE FROM construction_contractors");
        
        echo "Существующие данные удалены.\n";
    } catch (PDOException $e) {
        echo "Ошибка при удалении данных: " . $e->getMessage() . "\n";
        exit(1);
    }
}

echo "Добавление тестовых данных...\n";

// Создание тестовых подрядчиков
$contractors = [
    [
        'company_name' => 'ABC Construction',
        'business_type' => 'General Contractor',
        'location' => 'New York, NY',
        'email' => 'info@abcconstruction.com',
        'phone' => '555-123-4567',
        'website' => 'www.abcconstruction.com',
        'rating' => 5,
        'notes' => 'Надежный подрядчик с многолетним опытом'
    ],
    [
        'company_name' => 'Sunrise Builders',
        'business_type' => 'Residential Contractor',
        'location' => 'Los Angeles, CA',
        'email' => 'contact@sunrisebuilders.com',
        'phone' => '555-987-6543',
        'website' => 'www.sunrisebuilders.com',
        'rating' => 4,
        'notes' => 'Специализируется на жилищном строительстве'
    ],
    [
        'company_name' => 'Metro Development',
        'business_type' => 'Commercial Contractor',
        'location' => 'Chicago, IL',
        'email' => 'projects@metrodevelopment.com',
        'phone' => '555-456-7890',
        'website' => 'www.metrodevelopment.com',
        'rating' => 4,
        'notes' => 'Опыт работы с крупными коммерческими проектами'
    ]
];

// Вставка подрядчиков
$contractorIds = [];
foreach ($contractors as $contractor) {
    try {
        $query = "INSERT INTO construction_contractors 
                  (company_name, business_type, location, email, phone, website, rating, notes, created_at, updated_at) 
                  VALUES (:company_name, :business_type, :location, :email, :phone, :website, :rating, :notes, NOW(), NOW())";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($contractor);
        
        $contractorId = $pdo->lastInsertId();
        $contractorIds[] = $contractorId;
        
        echo "Добавлен подрядчик: " . $contractor['company_name'] . " (ID: $contractorId)\n";
    } catch (PDOException $e) {
        echo "Ошибка при добавлении подрядчика: " . $e->getMessage() . "\n";
    }
}

// Создание сотрудников для подрядчиков
$employees = [
    // Сотрудники для ABC Construction
    [
        'contractor_id' => $contractorIds[0] ?? 1,
        'name' => 'John Smith',
        'position' => 'Project Manager',
        'email' => 'jsmith@abcconstruction.com',
        'phone' => '555-111-2222',
        'is_primary_contact' => 1
    ],
    [
        'contractor_id' => $contractorIds[0] ?? 1,
        'name' => 'Mary Johnson',
        'position' => 'Estimator',
        'email' => 'mjohnson@abcconstruction.com',
        'phone' => '555-222-3333',
        'is_primary_contact' => 0
    ],
    
    // Сотрудники для Sunrise Builders
    [
        'contractor_id' => $contractorIds[1] ?? 2,
        'name' => 'Robert Wilson',
        'position' => 'Site Supervisor',
        'email' => 'rwilson@sunrisebuilders.com',
        'phone' => '555-333-4444',
        'is_primary_contact' => 1
    ],
    
    // Сотрудники для Metro Development
    [
        'contractor_id' => $contractorIds[2] ?? 3,
        'name' => 'Sarah Davis',
        'position' => 'Operations Manager',
        'email' => 'sdavis@metrodevelopment.com',
        'phone' => '555-444-5555',
        'is_primary_contact' => 1
    ],
    [
        'contractor_id' => $contractorIds[2] ?? 3,
        'name' => 'Michael Brown',
        'position' => 'Project Engineer',
        'email' => 'mbrown@metrodevelopment.com',
        'phone' => '555-555-6666',
        'is_primary_contact' => 0
    ]
];

// Вставка сотрудников
$employeeIds = [];
foreach ($employees as $employee) {
    try {
        $query = "INSERT INTO construction_employees 
                  (contractor_id, name, position, email, phone, is_primary_contact, created_at, updated_at) 
                  VALUES (:contractor_id, :name, :position, :email, :phone, :is_primary_contact, NOW(), NOW())";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($employee);
        
        $employeeId = $pdo->lastInsertId();
        $employeeIds[] = $employeeId;
        
        echo "Добавлен сотрудник: " . $employee['name'] . " (ID: $employeeId)\n";
    } catch (PDOException $e) {
        echo "Ошибка при добавлении сотрудника: " . $e->getMessage() . "\n";
    }
}

// Создание проектов
$projects = [
    // Текущие проекты
    [
        'name' => 'Downtown Office Building',
        'location' => 'New York City',
        'start_date' => '2023-05-15',
        'end_date' => '2024-03-30',
        'contractor_id' => $contractorIds[0] ?? 1,
        'contact_person_id' => $employeeIds[0] ?? 1,
        'business_type' => 'Commercial',
        'project_type' => 'current',
        'status' => 'In Progress',
        'progress' => 35,
        'budget' => 2500000.00,
        'description' => 'Строительство 10-этажного офисного здания в центре города'
    ],
    [
        'name' => 'Riverfront Apartments',
        'location' => 'Chicago',
        'start_date' => '2023-07-01',
        'end_date' => '2024-06-30',
        'contractor_id' => $contractorIds[2] ?? 3,
        'contact_person_id' => $employeeIds[3] ?? 4,
        'business_type' => 'Residential',
        'project_type' => 'current',
        'status' => 'In Progress',
        'progress' => 45,
        'budget' => 4200000.00,
        'description' => 'Жилой комплекс из 50 квартир на берегу реки'
    ],
    
    // Будущие проекты
    [
        'name' => 'Community Hospital Wing',
        'location' => 'Los Angeles',
        'start_date' => '2024-01-15',
        'end_date' => '2025-06-30',
        'contractor_id' => $contractorIds[1] ?? 2,
        'contact_person_id' => $employeeIds[2] ?? 3,
        'business_type' => 'Healthcare',
        'project_type' => 'future',
        'status' => 'Planning',
        'progress' => 0,
        'budget' => 8500000.00,
        'description' => 'Новое крыло городской больницы'
    ],
    [
        'name' => 'Tech Campus Expansion',
        'location' => 'San Francisco',
        'start_date' => '2024-03-01',
        'end_date' => '2025-12-31',
        'contractor_id' => $contractorIds[0] ?? 1,
        'contact_person_id' => $employeeIds[1] ?? 2,
        'business_type' => 'Technology',
        'project_type' => 'future',
        'status' => 'Design Phase',
        'progress' => 0,
        'budget' => 12000000.00,
        'description' => 'Расширение кампуса для технологической компании'
    ]
];

// Вставка проектов
$projectIds = [];
foreach ($projects as $project) {
    try {
        // Для всех проектов используем общий набор полей, совпадающий со структурой таблицы
        $query = "INSERT INTO construction_projects 
                  (name, location, start_date, end_date, contractor_id, contact_person_id, 
                  business_type, project_type, status, progress, budget, description, created_at, updated_at) 
                  VALUES (:name, :location, :start_date, :end_date, :contractor_id, :contact_person_id, 
                  :business_type, :project_type, :status, :progress, :budget, :description, NOW(), NOW())";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($project);
        
        $projectId = $pdo->lastInsertId();
        $projectIds[] = $projectId;
        
        echo "Добавлен проект: " . $project['name'] . " (ID: $projectId)\n";
    } catch (PDOException $e) {
        echo "Ошибка при добавлении проекта: " . $e->getMessage() . "\n";
    }
}

echo "Тестовые данные добавлены успешно.\n";
exit(0); 