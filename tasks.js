// В начале файла добавим проверку авторизации
if (!checkAuth()) {
  window.location.href = "login.html";
}

// Добавим отображение имени авторизованного сотрудника
const user = JSON.parse(localStorage.getItem("maintenanceStaffAuth"));
if (user) {
  document.getElementById("staffName").textContent = `Welcome, ${user.name}`;
}

// Функция для получения задач из базы данных
async function getTasks() {
  try {
    await db.waitForDB();
    const tasks = await db.getAllTasks();
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

// Функция для создания HTML э��емента задачи
function createTaskElement(task) {
  const taskElement = document.createElement("div");
  taskElement.className = "task-item";
  taskElement.innerHTML = `
    <div class="task-info">
      <div class="task-header">
        <span class="task-id">${task.requestId}</span>
        <span class="task-timestamp">${formatDate(task.timestamp)}</span>
      </div>
      <div class="task-details">${task.details}</div>
      <div class="task-location">
        ${task.building} - ${task.room} (Staff: ${task.staff})
      </div>
      <div class="task-assignment">
        ${
          task.assignedTo
            ? `<span class="assigned-to">Assigned to: ${task.assignedTo}</span>`
            : `<button class="assign-btn" data-task-id="${task.requestId}">Take Task</button>`
        }
      </div>
    </div>
    <div class="task-meta">
      <span class="task-priority priority-${task.priority}">${
    task.priority
  }</span>
      <select class="status-select" data-task-id="${task.requestId}" ${
    !task.assignedTo ? "disabled" : ""
  }>
        <option value="In Progress" ${
          task.status === "In Progress" ? "selected" : ""
        }>In Progress</option>
        <option value="Completed" ${
          task.status === "Completed" ? "selected" : ""
        }>Completed</option>
        <option value="Pending" ${
          task.status === "Pending" ? "selected" : ""
        }>Pending</option>
      </select>
    </div>
    <div class="task-comments">
      <div class="comments-list">
        ${
          task.comments
            ? task.comments
                .map(
                  (comment) => `
          <div class="comment">
            <div class="comment-header">
              <span class="comment-author">
                <i class="fas fa-user"></i> ${comment.staffName}
                ${comment.staffName === task.assignedTo ? " (Assigned)" : ""}
              </span>
              <span class="comment-time">${formatDate(comment.timestamp)}</span>
            </div>
            <div class="comment-text">${comment.text}</div>
          </div>
        `
                )
                .join("")
            : ""
        }
      </div>
      <div class="comment-form">
        <textarea class="comment-input" placeholder="Add a comment..."></textarea>
        <button class="comment-btn" data-task-id="${task.requestId}">
          <i class="fas fa-paper-plane"></i> Add Comment
        </button>
      </div>
    </div>
  `;

  // Добавляем обработчики событий
  const assignBtn = taskElement.querySelector(".assign-btn");
  if (assignBtn) {
    assignBtn.addEventListener("click", async function () {
      const taskId = this.dataset.taskId;
      const user = JSON.parse(localStorage.getItem("maintenanceStaffAuth"));
      if (user && user.role === "maintenance") {
        await db.assignTask(taskId, user.name);
        updateTasksList(await db.getAllTasks());
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
          const user = JSON.parse(localStorage.getItem("maintenanceStaffAuth"));
          if (!user || user.role !== "maintenance") {
            throw new Error("Unauthorized");
          }

          const success = await db.addComment(taskId, commentText, user.name);

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
                  <i class="fas fa-user"></i> ${user.name}
                  ${user.name === task.assignedTo ? " (Assigned)" : ""}
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
      updateTasksList(await db.getAllTasks());
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

// Функция для обновления списка задач
async function updateTasksList(tasks) {
  try {
    const tasksList = document.getElementById("tasksList");
    tasksList.innerHTML = "";

    if (tasks.length === 0) {
      tasksList.innerHTML = '<div class="no-tasks">No tasks found</div>';
      return;
    }

    tasks.forEach((task) => {
      tasksList.appendChild(createTaskElement(task));
    });

    // Обновляем статистику
    updateStatistics(tasks);
  } catch (error) {
    console.error("Error updating tasks list:", error);
  }
}

// Функция для фильтрации задач по дате
function filterTasksByDate(tasks, date) {
  return tasks.filter((task) => {
    const taskDate = new Date(task.timestamp);
    return taskDate.toDateString() === date.toDateString();
  });
}

// Инициализация страницы
document.addEventListener("DOMContentLoaded", async () => {
  const tasks = await getTasks();
  const today = new Date();

  // Показываем задачи на сегодня по умолчанию
  const todayTasks = filterTasksByDate(tasks, today);
  await updateTasksList(todayTasks);

  // Обработчик для кнопки "Today"
  document.getElementById("todayTasks").addEventListener("click", async (e) => {
    document
      .querySelectorAll(".date-filter button")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");
    const tasks = await getTasks();
    const todayTasks = filterTasksByDate(tasks, today);
    await updateTasksList(todayTasks);
  });

  // Обработчик для кнопки "All Tasks"
  document.getElementById("allTasks").addEventListener("click", async (e) => {
    document
      .querySelectorAll(".date-filter button")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");
    const tasks = await getTasks();
    await updateTasksList(tasks);
  });

  // Обработчик для выбора даты
  document
    .getElementById("dateFilter")
    .addEventListener("change", async (e) => {
      document
        .querySelectorAll(".date-filter button")
        .forEach((btn) => btn.classList.remove("active"));
      const selectedDate = new Date(e.target.value);
      const tasks = await getTasks();
      const filteredTasks = filterTasksByDate(tasks, selectedDate);
      await updateTasksList(filteredTasks);
    });

  // Добавим обработчик выхода
  document.getElementById("logoutBtn").addEventListener("click", logout);
});
