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

  /*// Методы для работы с пользователями
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
*/

  ///////////////////////////////////////////////////////////////// USER METHODS /////////////////////////////////////////////////////////////////

  async getUser(email) {
    try {
      const response = await fetch("database.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "getUser",
          email: email,
        }),
      });

      const result = await response.json();
      console.log("(getUser) - Response:", result);

      if (result.success) {
        return result.data; // Will return null if user not found
      } else {
        console.error("(getUser) - Error:", result.message);
        return null;
      }
    } catch (error) {
      console.error("(getUser) - Error:", error);
      return null;
    }
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
  /*
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
*/
  ///////////////////////////////////////////////////////////////// TASK METHODS /////////////////////////////////////////////////////////////////

  // Методы для работы с задачами
  /*async addTask(taskData) {
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
  }*/

  /*
  async getAllTasks() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("tasks", "readonly");
      const store = tx.objectStore("tasks");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
*/

  /*
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
*/

  /////////////////////////////////////////////////////////////// S E R V E R  M E T H O D S /////////////////////////////////////////////////////////////////

  ///////////////////////////////////////////////////////////////// USER METHODS /////////////////////////////////////////////////////////////////

  async addUserToServer(userData) {
    const response = await fetch("database.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "addUser",
        email: userData.email,
        fullName: userData.fullName,
        department: userData.department,
        role: userData.role,
        password: userData.password,
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log("User added successfully:", result.message);
    } else {
      console.error("Error adding user:", result.message);
    }
  }

  async getUserByNameFromServer(fullName) {
    const response = await fetch("database.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getUserByName",
        fullName: fullName,
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log("(getUserByNameFromServer) - User:", result.data);
      return result.data;
    } else {
      console.error(
        "(getUserByNameFromServer) - Error fetching user:",
        result.message
      );
    }
  }

  async getAllUsersFromServer() {
    const response = await fetch("database.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getAllUsers",
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log("Users:", result.data);
      return result.data;
    } else {
      console.error("Error fetching users:", result.message);
    }
  }

  ///////////////////////////////////////////////////////////////// TASK METHODS /////////////////////////////////////////////////////////////////
  // Добавим метод для сохранения медиафайлов
  async addTaskWithMedia(taskData, files) {
    try {
      await this.waitForDB();
      //    taskData.date = new Date(taskData.timestamp).toISOString().split("T")[0];
      taskData.date = formatDateFromTimestamp(taskData.timestamp);
      console.log("addTaskWithMedia timestamp: ", taskData.timestamp);
      console.log("addTaskWithMedia date: ", taskData.date);
      const formData = new FormData();
      formData.append("action", "addTask");

      for (const key in taskData) {
        if (taskData.hasOwnProperty(key)) {
          formData.append(
            key,
            Array.isArray(taskData[key])
              ? JSON.stringify(taskData[key])
              : taskData[key]
          );
        }
      }

      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          formData.append("media[]", files[i]);
        }
      } else {
        console.warn("No files selected for upload.");
      }

      const response = await fetch("task.php", {
        method: "POST",
        body: formData,
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (error) {
        console.error("Failed to parse JSON response:", text);
        return false;
      }

      if (result.success) {
        console.log("Task with media added successfully:", result.message);
        return true;
      } else {
        console.error("Error adding task with media:", result.message);
        return false;
      }
    } catch (error) {
      console.error("Error in addTaskWithMedia:", error);
      return false;
    }
  }

  async getAllTasksFromServer() {
    const response = await fetch("task.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getAllTask",
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log("Tasks:", result.data);
      return result.data;
    } else {
      console.error("Error fetching tasks:", result.message);
    }
  }

  async assignTaskInServer(requestId, maintenanceStaff) {
    try {
      const response = await fetch("task.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "assignTask",
          requestId: requestId,
          assignedTo: maintenanceStaff,
          assignedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log("Task assigned successfully:", result.message);
        return true;
      } else {
        console.error("Error assigning task:", result.message);
        return false;
      }
    } catch (error) {
      console.error("Error in assignTaskInServer:", error);
      return false;
    }
  }

  async updateTaskStatus(requestId, newStatus) {
    const response = await fetch("task.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "updateTaskStatus",
        requestId: requestId,
        newStatus: newStatus,
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log("User added successfully:", result.message);
    } else {
      console.error("Error adding user:", result.message);
    }
  }

  async getTasksByStatus(status) {
    const response = await fetch("task.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "updateTaskStatus",
        status: status,
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log("User added successfully:", result.message);
    } else {
      console.error("Error adding user:", result.message);
    }
  }
  async addComment(requestId, comment, staffName) {
    const response = await fetch("task.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "addComment",
        requestId: requestId,
        comment: comment,
        staffName: staffName,
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      }),
    });

    const text = await response.text();
    try {
      const result = JSON.parse(text);
      if (result.success) {
        console.log("Comment added successfully:", result.message);
        return true;
      } else {
        console.error("Error adding comment:", result.message);
        return false;
      }
    } catch (e) {
      console.error("Invalid JSON response:", text);
      return false;
    }
  }

  async fetchComments(taskId) {
    try {
      const response = await fetch("task.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "getComments",
          requestId: taskId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        return result.comments;
      } else {
        console.error("Error fetching comments:", result.message);
        return [];
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      return [];
    }
  }

  async deleteCommentFromServer(requestId, timestamp) {
    try {
      const response = await fetch("database.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "deleteComment",
          requestId: requestId,
          timestamp: timestamp,
        }),
      });

      const responseText = await response.text();
      console.log("Server response:", responseText); // Логируем ответ сервера

      const result = JSON.parse(responseText);
      if (!result.success) {
        throw new Error(result.message);
      }
      return true;
    } catch (error) {
      console.error("Error deleting comment from server:", error);
      return false;
    }
  }
  /*
async getTasksByDate(date) {
  try {
    const response = await fetch('task.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        action: 'getTasksByDate',
        date: date,
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log('Tasks for date:', date, result.data);
      return result.data;
    } else {
      console.error('Error fetching tasks by date:', result.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching tasks by date:', error);
    return [];
  }
}
*/
}

// Создаем и экспортируем экземпляр базы данных
const db = new Database();

function formatDateFromTimestamp(timestamp) {
  // Разбиваем строку на части
  const [month, day, year] = timestamp.split(",")[0].split("/");

  // Форматируем дату в нужный формат
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
