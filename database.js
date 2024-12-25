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
            tasksStore.createIndex("status", "status", { unique: false });
            tasksStore.createIndex("staff", "staff", { unique: false });
            tasksStore.createIndex("assignedTo", "assignedTo", {
              unique: false,
            });
            tasksStore.createIndex("comments", "comments", { unique: false });
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

        tx.oncomplete = () => {
          console.log("Transaction completed");
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
}

// Создаем и экспортируем экземпляр базы данных
const db = new Database();
