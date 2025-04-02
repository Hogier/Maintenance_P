-- Таблица подрядчиков (contractors)
CREATE TABLE IF NOT EXISTS construction_contractors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    rating INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Таблица сотрудников подрядчиков (employees)
CREATE TABLE IF NOT EXISTS construction_employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contractor_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    is_primary_contact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contractor_id) REFERENCES construction_contractors(id) ON DELETE CASCADE
);

-- Таблица проектов (projects)
CREATE TABLE IF NOT EXISTS construction_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    start_date DATE,
    end_date DATE,
    contractor_id INT,
    contact_person_id INT,
    business_type VARCHAR(100),
    project_type ENUM('current', 'future') NOT NULL,
    status VARCHAR(50) DEFAULT 'planned',
    
    -- Поля для текущих проектов
    progress INT DEFAULT 0,
    actual_cost DECIMAL(15, 2) DEFAULT 0,
    last_update DATE,
    
    -- Поля для будущих проектов
    budget DECIMAL(15, 2) DEFAULT 0,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    description TEXT,
    objectives TEXT,
    risks TEXT,
    
    -- Флаг для проектов, перенесенных из Future в Current
    migrated_from_future BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contractor_id) REFERENCES construction_contractors(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_person_id) REFERENCES construction_employees(id) ON DELETE SET NULL
);

-- Таблица файлов проектов (project_files)
CREATE TABLE IF NOT EXISTS construction_project_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_type VARCHAR(100) NOT NULL,
    file_category ENUM('photo', 'document', 'report', 'specification') NOT NULL,
    mime_type VARCHAR(100),
    file_path VARCHAR(255) NOT NULL,
    mini_path VARCHAR(255),
    migrated_from_future BOOLEAN DEFAULT FALSE,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES construction_projects(id) ON DELETE CASCADE
);

-- Индексы для улучшения производительности
CREATE INDEX idx_projects_type ON construction_projects(project_type);
CREATE INDEX idx_projects_status ON construction_projects(status);
CREATE INDEX idx_projects_contractor ON construction_projects(contractor_id);
CREATE INDEX idx_files_project ON construction_project_files(project_id);
CREATE INDEX idx_files_category ON construction_project_files(file_category); 