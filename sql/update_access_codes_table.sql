-- Изменяем тип поля code на VARCHAR(14), так как код содержит дефисы
ALTER TABLE access_codes MODIFY code VARCHAR(14) NOT NULL;

-- Изменяем тип поля created_at на TIMESTAMP
ALTER TABLE access_codes MODIFY created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Добавляем недостающие поля
ALTER TABLE access_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NOT NULL AFTER created_at;
ALTER TABLE access_codes ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE AFTER expires_at; 