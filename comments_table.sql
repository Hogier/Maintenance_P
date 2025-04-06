-- Создание отдельной таблицы для комментариев
CREATE TABLE IF NOT EXISTS task_comments (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL,  -- ID задачи, к которой относится комментарий
    staff_name VARCHAR(255) NOT NULL,  -- Имя сотрудника
    text TEXT NOT NULL,  -- Текст комментария
    timestamp DATETIME NOT NULL,  -- Временная метка
    photo_url VARCHAR(255) DEFAULT NULL,  -- URL фото профиля пользователя
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Время создания записи
    INDEX idx_task_id (task_id),  -- Индекс для быстрого поиска по task_id
    INDEX idx_staff_name (staff_name),  -- Индекс для быстрого поиска по имени сотрудника
    INDEX idx_timestamp (timestamp)  -- Индекс для сортировки по времени
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Миграционный скрипт для переноса существующих комментариев (выполнять вручную после проверки)
-- 
-- INSERT INTO task_comments (task_id, staff_name, text, timestamp)
-- SELECT 
--     t.request_id,
--     c.staffName,
--     c.text,
--     STR_TO_DATE(c.timestamp, '%Y-%m-%dT%H:%i:%s.%fZ')
-- FROM 
--     tasks t,
--     JSON_TABLE(
--         t.comments,
--         '$[*]' COLUMNS (
--             staffName VARCHAR(255) PATH '$.staffName',
--             text TEXT PATH '$.text',
--             timestamp VARCHAR(255) PATH '$.timestamp'
--         )
--     ) AS c
-- WHERE t.comments IS NOT NULL AND t.comments != '[]'; 