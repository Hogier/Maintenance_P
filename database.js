// Инициализация базы данных
const dbName = "maintenanceDB";
const dbVersion = 1;

// Создаем класс для работы с базой данных
class Database {
  constructor() {
    this.db = null;
    this.dbReady = this.initDB();
  }

  // Инициализация базы данных
  async initDB() {
    try {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = (event) => {
          reject("Database error: " + event.target.error);
        };

        request.onsuccess = (event) => {
          resolve(event.target.result);
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Создаем хранилище пользователей
          if (!db.objectStoreNames.contains("users")) {
            const usersStore = db.createObjectStore("users", {
              keyPath: "email",
            });
            usersStore.createIndex("fullName", "fullName", { unique: true });
            usersStore.createIndex("department", "department", {
              unique: false,
            });
            usersStore.createIndex("role", "role", { unique: false });
          }

          // Создаем хранилище задач
          if (!db.objectStoreNames.contains("tasks")) {
            const tasksStore = db.createObjectStore("tasks", {
              keyPath: "requestId",
            });
            tasksStore.createIndex("timestamp", "timestamp", { unique: false });
            tasksStore.createIndex("date", "date", { unique: false });
            tasksStore.createIndex("status", "status", { unique: false });
            tasksStore.createIndex("staff", "staff", { unique: false });
            tasksStore.createIndex("assignedTo", "assignedTo", {
              unique: false,
            });
            tasksStore.createIndex("comments", "comments", { unique: false });
            tasksStore.createIndex("media", "media", { unique: false });
          }
        };
      });
      return true;
    } catch (error) {
      console.error("Failed to initialize database:", error);
      return false;
    }
  }

  // Добавим метод для проверки готовности базы данных
  async waitForDB() {
    await this.dbReady;
    if (!this.db) {
      throw new Error("Database is not initialized");
    }
  }

  // Методы для работы с пользователями
  async addUser(userData) {
    await this.waitForDB();
    try {
      const tx = this.db.transaction("users", "readwrite");
      const store = tx.objectStore("users");
      await store.add(userData);
      return true;
    } catch (error) {
      console.error("Error adding user:", error);
      return false;
    }
  }

  async getUser(email) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("users", "readonly");
      const store = tx.objectStore("users");
      const request = store.get(email);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByName(fullName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("users", "readonly");
      const store = tx.objectStore("users");
      const index = store.index("fullName");
      const request = index.get(fullName);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllUsers() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("users", "readonly");
      const store = tx.objectStore("users");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Методы для работы с задачами
  async addTask(taskData) {
    try {
      await this.waitForDB();
      taskData.date = new Date(taskData.timestamp).toISOString().split("T")[0];

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction("tasks", "readwrite");
        const store = tx.objectStore("tasks");
        const request = store.add(taskData);

        request.onsuccess = () => {
          console.log("Task added successfully:", taskData);
          resolve(true);
        };

        request.onerror = () => {
          console.error("Error adding task:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Error in addTask:", error);
      return false;
    }
  }

  async updateTaskStatus(requestId, newStatus) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("tasks", "readwrite");
      const store = tx.objectStore("tasks");
      const request = store.get(requestId);

      request.onsuccess = () => {
        const task = request.result;
        task.status = newStatus;
        store.put(task);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTasks() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("tasks", "readonly");
      const store = tx.objectStore("tasks");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTasksByStatus(status) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("tasks", "readonly");
      const store = tx.objectStore("tasks");
      const index = store.index("status");
      const request = index.getAll(status);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async assignTask(requestId, maintenanceStaff) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("tasks", "readwrite");
      const store = tx.objectStore("tasks");
      const request = store.get(requestId);

      request.onsuccess = () => {
        const task = request.result;
        task.assignedTo = maintenanceStaff;
        task.assignedAt = new Date().toISOString();
        store.put(task);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addComment(requestId, comment, staffName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("tasks", "readwrite");
      const store = tx.objectStore("tasks");
      const request = store.get(requestId);

      request.onsuccess = () => {
        const task = request.result;
        if (!task.comments) task.comments = [];
        task.comments.push({
          text: comment,
          staffName: staffName,
          timestamp: new Date().toISOString(),
        });
        store.put(task);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async userExists(fullName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("users", "readonly");
      const store = tx.objectStore("users");
      const index = store.index("fullName");
      const request = index.count(fullName);

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => reject(request.error);
    });
  }

  // Добавим метод для сохранения медиафайлов
  async addTaskWithMedia(taskData, mediaFiles) {
    try {
      await this.waitForDB();
      taskData.date = new Date(taskData.timestamp).toISOString().split("T")[0];
      taskData.media = [];

      // Конвертируем каждый файл в base64
      for (const file of mediaFiles) {
        const base64Data = await this.convertFileToBase64(file);
        taskData.media.push({
          type: file.type.startsWith("image/") ? "image" : "video",
          data: base64Data,
          name: file.name,
        });
      }

      return new Promise((resolve, reject) => {
        const tx = this.db.transaction("tasks", "readwrite");
        const store = tx.objectStore("tasks");
        const request = store.add(taskData);

        request.onsuccess = () => {
          console.log("Task with media added successfully:", taskData);
          resolve(true);
        };

        request.onerror = () => {
          console.error("Error adding task with media:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Error in addTaskWithMedia:", error);
      return false;
    }
  }

  // Вспомогательный метод для конвертации файла в base64
  convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

// Создаем и экспортируем экземпляр базы данных
const db = new Database();
