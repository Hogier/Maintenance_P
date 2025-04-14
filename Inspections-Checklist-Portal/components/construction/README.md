# Construction Management Module

Модуль для управления строительными проектами, подрядчиками и загрузкой файлов.

## Структура проекта

```
components/construction/
├── api/                       # API для доступа к данным
│   ├── index.php              # Маршрутизатор API
│   ├── contractors.php        # API для работы с подрядчиками
│   ├── projects.php           # API для работы с проектами
│   ├── files.php              # API для работы с файлами
│   └── .htaccess              # Настройка Apache для API
├── project_upload/            # Директории для загрузки файлов
│   ├── project_files/         # Оригинальные файлы проектов
│   └── project_mini/          # Миниатюры изображений
├── scripts/                   # Скрипты для настройки и тестирования
│   ├── database_init.php      # Инициализация базы данных
│   └── sample_data.php        # Добавление тестовых данных
├── ConstructionManager.js     # JavaScript класс для управления модулем
├── db_connection.php          # Подключение к базе данных
├── db_setup.sql               # SQL для создания таблиц
├── setup_database.php         # Веб-интерфейс для настройки БД
├── upload_handler.php         # Обработчик загрузки файлов
└── README.md                  # Документация
```

## Требования

- PHP 7.4 или выше
- MySQL 5.7 или выше
- Apache с модулем mod_rewrite
- Права на создание директорий и запись файлов

## Настройка

### 1. Настройка базы данных

1. Откройте файл `db_connection.php` и настройте параметры подключения к базе данных:

   ```php
   $host = 'localhost';
   $dbname = 'maintenancedb';
   $user = 'root';
   $password = 'root';
   ```

2. Создайте требуемые таблицы, выполнив скрипт:

   ```bash
   php scripts/database_init.php
   ```

   или через веб-интерфейс, открыв страницу `setup_database.php`.

3. Для добавления тестовых данных выполните:
   ```bash
   php scripts/sample_data.php
   ```
   Для очистки существующих данных перед добавлением:
   ```bash
   php scripts/sample_data.php --clear
   ```

### 2. Настройка директорий для загрузки файлов

Директории для загрузки файлов будут созданы автоматически при выполнении `database_init.php` или при первой загрузке файла. Убедитесь, что веб-сервер имеет права на запись в директорию `project_upload/`.

Вручную можно создать директории и установить права:

```bash
mkdir -p project_upload/project_files project_upload/project_mini
chmod -R 777 project_upload
```

### 3. Интеграция с фронтендом

Frontend использует класс `ConstructionManager.js`, который взаимодействует с бэкендом через API и обработчик загрузки файлов. Примеры использования:

```javascript
// Инициализация менеджера
const constructionManager = new ConstructionManager();

// Загрузка подрядчиков
constructionManager.getContractors().then((contractors) => {
  console.log("Loaded contractors:", contractors);
});

// Загрузка проектов
constructionManager.getProjects("current").then((projects) => {
  console.log("Current projects:", projects);
});

// Загрузка файлов проекта
constructionManager
  .uploadProjectFiles(projectId, fileInputElement)
  .then((results) => {
    console.log("Uploaded files:", results);
  });
```

## API Endpoints

### Подрядчики

- `GET api/?resource=contractors` - Получить всех подрядчиков
- `GET api/?resource=contractors&action=get&id={id}` - Получить подрядчика по ID
- `POST api/?resource=contractors` - Создать нового подрядчика
- `POST api/?resource=contractors&action=update&id={id}` - Обновить подрядчика
- `DELETE api/?resource=contractors&id={id}` - Удалить подрядчика

### Проекты

- `GET api/?resource=projects` - Получить все проекты
- `GET api/?resource=projects&type={current|future}` - Получить проекты по типу
- `GET api/?resource=projects&action=get&id={id}` - Получить проект по ID
- `POST api/?resource=projects` - Создать новый проект
- `POST api/?resource=projects&action=update&id={id}` - Обновить проект
- `DELETE api/?resource=projects&id={id}` - Удалить проект

### Файлы проектов

- `GET api/?resource=files&project_id={id}` - Получить файлы проекта
- `GET api/?resource=files&action=get&id={id}` - Получить файл по ID
- `POST api/?resource=files&project_id={id}` - Загрузить файл для проекта
- `DELETE api/?resource=files&id={id}` - Удалить файл

## Схема базы данных

### construction_contractors

- id - INT, AUTO_INCREMENT, PRIMARY KEY
- company_name - VARCHAR(100)
- business_type - VARCHAR(50)
- location - VARCHAR(100)
- email - VARCHAR(100)
- phone - VARCHAR(20)
- website - VARCHAR(100)
- rating - TINYINT
- notes - TEXT
- created_at - DATETIME
- updated_at - DATETIME

### construction_employees

- id - INT, AUTO_INCREMENT, PRIMARY KEY
- contractor_id - INT, FOREIGN KEY
- name - VARCHAR(100)
- position - VARCHAR(50)
- email - VARCHAR(100)
- phone - VARCHAR(20)
- is_primary_contact - TINYINT(1)
- created_at - DATETIME
- updated_at - DATETIME

### construction_projects

- id - INT, AUTO_INCREMENT, PRIMARY KEY
- project_name - VARCHAR(100)
- location - VARCHAR(100)
- start_date - DATE
- end_date - DATE
- contractor_id - INT, FOREIGN KEY
- contact_person_id - INT, FOREIGN KEY
- business_type - VARCHAR(50)
- project_type - ENUM('current', 'future')
- status - VARCHAR(50)
- current_phase - VARCHAR(50)
- current_progress - TINYINT
- budget - DECIMAL(12,2)
- approvals_status - VARCHAR(50)
- estimated_budget - DECIMAL(12,2)
- proposed_timeline - VARCHAR(50)
- notes - TEXT
- created_at - DATETIME
- updated_at - DATETIME

### construction_project_files

- id - INT, AUTO_INCREMENT, PRIMARY KEY
- project_id - INT, FOREIGN KEY
- file_name - VARCHAR(255)
- original_name - VARCHAR(255)
- file_type - VARCHAR(10)
- file_category - VARCHAR(20)
- mime_type - VARCHAR(100)
- file_path - VARCHAR(255)
- mini_path - VARCHAR(255)
- upload_date - DATETIME

## Устранение неполадок

### Ошибки загрузки файлов

1. Проверьте права доступа для директорий `project_upload/project_files` и `project_upload/project_mini`.
2. Убедитесь, что максимальный размер загружаемых файлов в PHP настроен корректно (php.ini):
   ```
   upload_max_filesize = 20M
   post_max_size = 20M
   ```
3. Проверьте, что модуль GD для PHP включен для создания миниатюр:
   ```php
   if (!extension_loaded('gd')) {
     echo "GD extension is not loaded";
   }
   ```

### Ошибки API

1. Проверьте, что модуль mod_rewrite включен в Apache.
2. Убедитесь, что файл `.htaccess` в папке `api/` имеет правильные настройки.
3. Проверьте логи ошибок Apache и PHP для более детальной информации.
