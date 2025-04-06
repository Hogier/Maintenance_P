-- Обновляем структуру таблицы construction_project_files
-- 1. Проверяем и обновляем поле file_path до 512 символов
ALTER TABLE construction_project_files 
    MODIFY file_path VARCHAR(512) NOT NULL;

-- 2. Проверяем и обновляем mini_path
ALTER TABLE construction_project_files 
    MODIFY mini_path VARCHAR(512) NULL;

-- 3. Проверяем наличие поля категории и унифицируем его
-- В зависимости от того, какое поле существует, выполняем соответствующую команду
-- Если существует category, меняем его на file_category
ALTER TABLE construction_project_files 
    CHANGE COLUMN IF EXISTS category file_category VARCHAR(50) DEFAULT 'document';

-- Если file_category не существует, добавляем его
ALTER TABLE construction_project_files 
    ADD COLUMN IF NOT EXISTS file_category VARCHAR(50) DEFAULT 'document' AFTER file_type;

-- 4. Проверяем наличие поля даты загрузки и унифицируем его
-- Если существует uploaded_at, меняем его на upload_date
ALTER TABLE construction_project_files 
    CHANGE COLUMN IF EXISTS uploaded_at upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Если существует upload_date, не меняем его
-- Если не существует ни одного из полей, добавляем upload_date
ALTER TABLE construction_project_files 
    ADD COLUMN IF NOT EXISTS upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 5. Обновляем ENUM если необходимо
ALTER TABLE construction_project_files 
    MODIFY file_category ENUM('photo', 'document', 'report', 'specification') DEFAULT 'document';

-- 6. Добавляем индексы для улучшения производительности, если они отсутствуют
CREATE INDEX IF NOT EXISTS idx_projects_type ON construction_projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_status ON construction_projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_contractor ON construction_projects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_files_project ON construction_project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_category ON construction_project_files(file_category);

-- 7. Логируем обновление
INSERT INTO system_logs (log_type, message, created_at)
VALUES ('database_update', 'Унифицированы поля таблицы construction_project_files', NOW()); 