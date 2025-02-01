// В начале файла добавим проверку авторизации
if (!checkAuth()) {
  window.location.href = "login.html";
}

// Добавим отображение имени авторизованного сотрудника
const user = JSON.parse(localStorage.getItem("currentUser"));
if (user && user.fullName) {
  const staffNameElement = document.getElementById("staffName");
  if (staffNameElement) {
    staffNameElement.textContent = `Welcome, ${user.fullName}`;
  }
}

// Создаем переменную для индикатора обновления
let updateIndicator;

// Добавим переменную для отслеживания текущего фильтра
let currentFilter = "today"; // возможные значения: 'today', 'all', 'custom'
let currentDate = new Date();

// Добавим функцию для определения класса приоритета
function getPriorityClass(priority) {
  switch (priority.toLowerCase()) {
    case "low":
      return "priority-low";
    case "medium":
      return "priority-medium";
    case "high":
      return "priority-high";
    case "urgent":
      return "priority-urgent";
    default:
      return "priority-medium";
  }
}

// Функция для получения задач из базы данных
async function getTasks() {
  try {
    await db.waitForDB();
    const tasks = await db.getAllTasksFromServer();
    console.log("Retrieved tasks:", tasks); // Для отладки
    return tasks;
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
}

// Функция для форматирования даты
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Функция для создания секции с медиафайлами
async function createMediaSection(task) {
  if (!task.media || task.media.length === 0) {
    return ""; // Если нет медиафайлов, возвращаем пустую строку
  }

  let mediaHtml = `
    <div class="task-media">
      <h4>Attached Media:</h4>
      <div class="task-media-grid">
  `;

  // Преобразуем строку media в массив, если это строка
  const mediaArray = typeof task.media === "string" ? [task.media] : task.media;

  for (const fileName of mediaArray) {
    const mediaFile = await getMediaFileFromServer(fileName);
    if (mediaFile) {
      const isImage = mediaFile.type.startsWith("image");
      const isVideo = mediaFile.type.startsWith("video");

      if (isImage) {
        mediaHtml += `
          <div class="media-item" onclick="showMediaFullscreen('${mediaFile.url}', 'image')">
            <img src="${mediaFile.url}" alt="${mediaFile.name}">
            <span class="media-name">${mediaFile.name}</span>
          </div>
        `;
      } else if (isVideo) {
        mediaHtml += `
          <div class="media-item" onclick="showMediaFullscreen('${mediaFile.url}', 'video')">
            <video src="${mediaFile.url}"></video>
            <span class="media-name">${mediaFile.name}</span>
          </div>
        `;
      }
    }
  }

  mediaHtml += `
      </div>
    </div>
  `;

  return mediaHtml;
}

// Функция для создания секции комментариев
async function createCommentsSection(task) {
  if (!task.comments || task.comments.length === 0) {
    return ""; // Если нет комментариев, возвращаем пустую строку
  }

  let commentsHtml = "";

  for (const comment of task.comments) {
    commentsHtml += `
      <div class="comment">
        <div class="comment-header">
          <span class="comment-author">
            <i class="fas fa-user"></i> ${comment.author}
            ${comment.author === task.assigned_to ? " (Assigned)" : ""}
          </span>
          <span class="comment-time">${formatDate(comment.timestamp)}</span>
        </div>
        <div class="comment-text">${comment.text}</div>
      </div>
    `;
  }

  return commentsHtml;
}

// Функция для создания HTML элемента задачи
async function createTaskElement(task) {
  const taskElement = document.createElement("div");
  taskElement.className = "task-item";

  // Получаем отформатированную дату
  const timestamp = formatDallasDate(task.timestamp);

  taskElement.innerHTML = `
    <div class="task-info">
      <div class="task-header">
        <span class="task-id">${task.request_id}</span>
        <span class="task-timestamp">${timestamp}</span>
      </div>
      <div class="task-details">${task.details}</div>
      <div class="task-location">
        ${task.building} - ${task.room} (Staff: ${task.staff})
      </div>
      <div class="task-priority ${getPriorityClass(task.priority)}">
        Priority: ${task.priority}
      </div>
      <div class="task-status">
        Status: 
        <select class="status-select" data-task-id="${task.request_id}">
          <option value="Pending" ${
            task.status === "Pending" ? "selected" : ""
          }>Pending</option>
          <option value="In Progress" ${
            task.status === "In Progress" ? "selected" : ""
          }>In Progress</option>
          <option value="Completed" ${
            task.status === "Completed" ? "selected" : ""
          }>Completed</option>
        </select>
      </div>
      ${
        !task.assigned_to
          ? `<button class="assign-btn" data-task-id="${task.request_id}">Assign to Me</button>`
          : `<div class="assigned-to">Assigned to: ${task.assigned_to}</div>`
      }
      ${await createMediaSection(task)}
      <div class="task-comments">
        <div class="comments-list">
          ${await createCommentsSection(task)}
        </div>
        <div class="comment-input-container">
          <input type="text" class="comment-input" placeholder="Add a comment...">
          <button class="comment-btn" data-task-id="${
            task.request_id
          }">Send</button>
        </div>
      </div>
    </div>
  `;

  // Добавляем обработчики событий
  const assignBtn = taskElement.querySelector(".assign-btn");
  if (assignBtn) {
    assignBtn.addEventListener("click", async function () {
      const taskId = this.dataset.taskId;
      console.log("Assigning task:", taskId);
      const user = JSON.parse(localStorage.getItem("currentUser"));
      if (user && user.role === "maintenance") {
        await db.assignTaskInServer(taskId, user.fullName);
        updateTasksList(await db.getAllTasksFromServer());
      }
    });
  }

  const commentBtn = taskElement.querySelector(".comment-btn");
  if (commentBtn) {
    commentBtn.addEventListener("click", async function () {
      const taskId = this.dataset.taskId;
      const commentInput = this.parentElement.querySelector(".comment-input");
      const commentText = commentInput.value.trim();

      if (commentText) {
        try {
          const user = JSON.parse(localStorage.getItem("currentUser"));
          if (!user || user.role !== "maintenance") {
            throw new Error("Unauthorized");
          }

          const success = await db.addComment(
            taskId,
            commentText,
            user.fullName
          );

          if (success) {
            // Очищаем поле ввода
            commentInput.value = "";

            // Обновляем список комментариев сразу после добавления
            const commentsContainer =
              this.closest(".task-item").querySelector(".comments-list");
            const newComment = document.createElement("div");
            newComment.className = "comment";
            newComment.innerHTML = `
              <div class="comment-header">
                <span class="comment-author">
                  <i class="fas fa-user"></i> ${user.fullName}
                  ${user.fullName === task.assigned_to ? " (Assigned)" : ""}
                </span>
                <span class="comment-time">${formatDate(new Date())}</span>
              </div>
              <div class="comment-text">${commentText}</div>
            `;
            commentsContainer.appendChild(newComment);

            // Прокручиваем к новому комментарию
            commentsContainer.scrollTop = commentsContainer.scrollHeight;
          } else {
            throw new Error("Failed to add comment");
          }
        } catch (error) {
          console.error("Error adding comment:", error);
          alert("Error adding comment. Please try again.");
        }
      }
    });
  }

  const statusSelect = taskElement.querySelector(".status-select");
  if (statusSelect) {
    statusSelect.addEventListener("change", async function () {
      const taskId = this.dataset.taskId;
      await db.updateTaskStatus(taskId, this.value);
      updateTasksList(await db.getAllTasksFromServer());
    });
  }

  return taskElement;
}

// Функция обновления статистики
function updateStatistics(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const pending = tasks.filter((t) => t.status === "Pending").length;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;

  document.getElementById("totalTasks").textContent = total;
  document.getElementById("completedTasks").textContent = completed;
  document.getElementById("pendingTasks").textContent = pending + inProgress;
}

// Определяем функцию updateTasksList
async function updateTasksList(tasks) {
  try {
    if (updateIndicator) {
      updateIndicator.style.display = "block";
      updateIndicator.style.opacity = "1";
    }

    const tasksList = document.getElementById("tasksList");
    const oldTasksContainer = tasksList.cloneNode(true);
    const newTasksContainer = document.createElement("div");
    newTasksContainer.id = "tasksList";
    newTasksContainer.style.opacity = "0";

    if (tasks.length === 0) {
      newTasksContainer.innerHTML =
        '<div class="no-tasks">No tasks found</div>';
    } else {
      const taskElements = await Promise.all(
        tasks.map((task) => createTaskElement(task))
      );
      taskElements.forEach((element) => {
        newTasksContainer.appendChild(element);
      });
    }

    // Добавляем стили для плавного перехода
    tasksList.style.transition = "opacity 0.3s ease-out";
    newTasksContainer.style.transition = "opacity 0.3s ease-in";

    // Плавно скрываем старый контент
    tasksList.style.opacity = "0";

    // Заменяем контент после завершения анимации
    setTimeout(() => {
      tasksList.parentNode.replaceChild(newTasksContainer, tasksList);
      // Плавно показываем новый контент
      setTimeout(() => {
        newTasksContainer.style.opacity = "1";
      }, 50);
    }, 300);

    updateStatistics(tasks);
  } catch (error) {
    console.error("Error updating tasks list:", error);
  } finally {
    if (updateIndicator) {
      updateIndicator.style.opacity = "0";
      setTimeout(() => {
        updateIndicator.style.display = "none";
      }, 300);
    }
  }
}

// Функция для фильтрации задач по дате
function filterTasksByDate(tasks, filterDate) {
  return tasks.filter((task) => {
    const taskDate = new Date(task.timestamp).toLocaleString("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const compareDate = filterDate.toLocaleString("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    return taskDate === compareDate;
  });
}

// Добавим функцию в глобальную область видимости
window.showMediaFullscreen = function (src, type) {
  const fullscreen = document.createElement("div");
  fullscreen.className = "media-fullscreen";

  const media =
    type === "image"
      ? `<img src="${src}" alt="Fullscreen media">`
      : `<video src="${src}" controls autoplay></video>`;

  fullscreen.innerHTML = media;

  fullscreen.onclick = () => fullscreen.remove();
  document.body.appendChild(fullscreen);
};

async function getMediaFileFromServer(fileName) {
  try {
    if (!fileName) {
      console.log("No file name provided");
      return null;
    }

    const response = await fetch("task.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getMediaFile",
        fileName: fileName,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      console.log("Server returned error:", result.message);
      return null;
    }

    return {
      type: result.type || "unknown",
      url: result.url || "",
      name: fileName,
    };
  } catch (error) {
    console.error("Error fetching media file:", error);
    return null;
  }
}

// Инициализация страницы
document.addEventListener("DOMContentLoaded", async () => {
  // Создаем индикатор обновления (перемещаем в начало)
  const tasksList = document.getElementById("tasksList");
  updateIndicator = document.createElement("div");
  updateIndicator.className = "update-indicator";
  updateIndicator.style.display = "none";
  updateIndicator.style.opacity = "0";
  updateIndicator.textContent = "Updating tasks...";
  tasksList.parentElement.insertBefore(updateIndicator, tasksList);

  const tasks = await getTasks();

  const today = new Date(getDallasDate());
  const todayTasks = filterTasksByDate(tasks, today);
  await updateTasksList(todayTasks);

  // Добавляем обработчики для кнопок фильтрации
  document.getElementById("todayTasks").addEventListener("click", async (e) => {
    currentFilter = "today";
    document
      .querySelectorAll(".date-filter button")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");
    const tasks = await getTasks();
    const todayTasks = filterTasksByDate(tasks, today);
    await updateTasksList(todayTasks);
  });

  document.getElementById("allTasks").addEventListener("click", async (e) => {
    currentFilter = "all";
    document
      .querySelectorAll(".date-filter button")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");
    const tasks = await getTasks();
    await updateTasksList(tasks);
  });

  document
    .getElementById("dateFilter")
    .addEventListener("change", async (e) => {
      currentFilter = "custom";
      currentDate = new Date(e.target.value);
      document
        .querySelectorAll(".date-filter button")
        .forEach((btn) => btn.classList.remove("active"));
      const tasks = await getTasks();
      const filteredTasks = filterTasksByDate(tasks, currentDate);
      await updateTasksList(filteredTasks);
    });

  // Добавим обработчик выхода
  document.getElementById("logoutBtn").addEventListener("click", logout);
});
