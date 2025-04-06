-- Скрипт для модификации таблицы construction_contractors
-- Удаляем неиспользуемые поля и обновляем под структуру формы

-- 1. Сначала создаем резервную копию существующей таблицы
CREATE TABLE IF NOT EXISTS construction_contractors_backup AS SELECT * FROM construction_contractors;

-- 2. Модифицируем существующую таблицу, удаляя неиспользуемые поля
-- Используем ALTER TABLE вместо DROP и CREATE чтобы сохранить целостность внешних ключей
ALTER TABLE construction_contractors
DROP COLUMN website,
DROP COLUMN notes;

-- 3. Проверяем, что таблица сотрудников существует и имеет правильную структуру
-- Если таблица еще не существует, создаем ее
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

-- 4. Проверяем, есть ли у нас в базе таблица для логов
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Добавление лог-записи об обновлении
INSERT INTO system_logs (log_type, message, created_at)
VALUES ('DB_UPDATE', 'Структура таблицы construction_contractors обновлена', NOW()); 