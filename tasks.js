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

let currentFilter = "today"; // возможные значения: 'today', 'all', 'custom'
let currentDate = new Date();
let checkDate = currentDate.toISOString().split("T")[0];

let localComments = {};

//////////////////////////////////ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ////////////////////////////

document.addEventListener("DOMContentLoaded", async () => {
  // Создаем индикатор обновления (перемещаем в начало)
  const tasksList = document.getElementById("tasksList");
  updateIndicator = document.createElement("div");
  updateIndicator.className = "update-indicator";
  updateIndicator.style.display = "none";
  updateIndicator.style.opacity = "0";
  updateIndicator.textContent = "Updating tasks...";
  tasksList.parentElement.insertBefore(updateIndicator, tasksList);

  // Получаем задания на сегодня
  const today = new Date(getDallasDate());
  const todayTasks = await getTasksByDate(today);
  await updateTasksList(todayTasks);

  // Добавляем обработчики для кнопок фильтрации
  document.getElementById("todayTasks").addEventListener("click", async (e) => {
    currentFilter = "today";
    checkDate = currentDate.toISOString().split("T")[0];

    document
      .querySelectorAll(".date-filter button")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");

    const todayTasks = await getTasksByDate(today);
    await updateTasksList(todayTasks);
  });

  document.getElementById("allTasks").addEventListener("click", async (e) => {
    currentFilter = "all";
    document
      .querySelectorAll(".date-filter button")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");

    const allTasks = await getTasks(); // Если нужно загрузить все задания
    await updateTasksList(allTasks);
  });

  document
    .getElementById("dateFilter")
    .addEventListener("change", async (e) => {
      currentFilter = "custom";
      currentDate = new Date(e.target.value);
      checkDate = currentDate.toISOString().split("T")[0];
      document
        .querySelectorAll(".date-filter button")
        .forEach((btn) => btn.classList.remove("active"));

      const filteredTasks = await getTasksByDate(currentDate);
      await updateTasksList(filteredTasks);
    });

  // Добавим обработчик выхода
  document.getElementById("logoutBtn").addEventListener("click", logout);
});

//////////////////////////////////ОСНОВНЫЕ ФУНКЦИИ////////////////////////////

async function getTasks() {
  try {
    // await db.waitForDB();
    const tasks = await db.getAllTasksFromServer();
    console.log("Retrieved tasks:", tasks); // Для отладки
    return tasks;
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
}

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

async function createTaskElement(task) {
  const eventElement = document.createElement("div");
  eventElement.className = "task-item";
  eventElement.setAttribute("data-task-id", task.request_id);

  // Получаем отформатированную дату
  const timestamp = formatDallasDate(task.timestamp);

  eventElement.innerHTML = `
    <div class="task-info">
      <div class="task-header">
        <span class="task-id">${task.request_id}</span>
        <span class="task-timestamp">${timestamp}</span>
      </div>
      <div class="task-details">${task.details}</div>
      <div class="task-meta-container">
        <div class="task-location">
          ${task.building} - ${task.room} (Staff: ${task.staff})
        </div>
        <div class="task-priority ${getPriorityClass(task.priority)}">
          Priority: ${task.priority}
        </div>
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
          ? `<div class="assign-container">
             <button class="assign-btn" data-task-id="${task.request_id}">Assign to Me</button>
             <div class="clock">
               <div class="hour-hand"></div>
               <div class="minute-hand"></div>
             </div>
           </div>`
          : `<div class="assigned-to">Assigned to: ${task.assigned_to}</div>`
      }
      <div class="media-section"></div>
      <div class="task-comments">
        <div class="discussion-toggle">
          💬 Discussion 
          <div class="discussion-toggle-clock">
            <div class="hour-hand"></div>
            <div class="minute-hand"></div>
          </div>
        </div>
        <div class="comments-list"></div>
        <div class="comment-input-container">
          <input type="text" class="comment-input" placeholder="Add a comment...">
          <button class="comment-btn" data-task-id="${
            task.request_id
          }">Send</button>
        </div>
      </div>
    </div>
  `;

  // Добавляем медиа-секцию сразу после создания элемента
  const mediaSection = await createMediaSection(task.media);
  if (mediaSection) {
    eventElement.querySelector(".media-section").appendChild(mediaSection);
  }

  // Устанавливаем начальный цвет для task-status
  const statusSelect = eventElement.querySelector(".status-select");
  const taskStatusDiv = eventElement.querySelector(".task-status");
  if (statusSelect.value === "Pending") {
    taskStatusDiv.classList.add("status-pending");
  } else if (statusSelect.value === "In Progress") {
    taskStatusDiv.classList.add("status-in-progress");
  } else if (statusSelect.value === "Completed") {
    taskStatusDiv.classList.add("status-completed");
  }

  const commentsContainer = eventElement.querySelector(".comments-list");
  const commentInputContainer = eventElement.querySelector(
    ".comment-input-container"
  );

  let isFirstLoad = true;
  let openComments = false;
  const discussionToggle = eventElement.querySelector(".discussion-toggle");

  discussionToggle.addEventListener("click", async function () {
    if (!openComments) {
      // Показать часики
      const clock = discussionToggle.querySelector(".discussion-toggle-clock");
      console.log(!!clock);
      clock.style.opacity = "1";

      await updateComments(task, commentsContainer, isFirstLoad);
      console.log(!!clock);
      // Скрыть часики после загрузки
      clock.style.opacity = "0";
    }
    openComments = !openComments;

    // Переключаем классы для анимации раскрытия
    commentsContainer.classList.toggle("expanded", openComments);
    commentInputContainer.classList.toggle("expanded", openComments);

    // Обновляем текст кнопки
    discussionToggle.innerHTML = openComments
      ? "▲"
      : "💬 Discussion <div class='discussion-toggle-clock'><div class='hour-hand'></div><div class='minute-hand'></div></div>";
  });

  /*setInterval(async () => {
    isFirstLoad = false;
    await updateComments(task, commentsContainer, isFirstLoad);
  }, 3500);*/

  // Добавляем обработчики событий
  const assignBtn = eventElement.querySelector(".assign-btn");
  if (assignBtn) {
    assignBtn.addEventListener("click", async function () {
      const taskId = this.dataset.taskId;
      console.log("Assigning task:", taskId);
      const user = JSON.parse(localStorage.getItem("currentUser"));
      if (user && user.role === "maintenance") {
        const clock = this.nextElementSibling;
        clock.classList.add("visible"); // Показываем часы

        // Обработчик для скрытия часов после завершения перехода
        clock.addEventListener("transitionend", async function () {
          if (!clock.classList.contains("visible")) {
            clock.style.display = "none";
          }
        });

        try {
          await db.assignTaskInServer(taskId, user.fullName);
          // Изменяем стиль кнопки после успешного назначения
          this.classList.add("assigned");
          this.textContent = "Assigned to You";

          // Проверяем, существует ли уже кнопка "Refuse"
          if (!this.parentElement.querySelector(".refuse-btn")) {
            // Добавляем кнопку "Refuse"
            const refuseBtn = document.createElement("button");
            refuseBtn.className = "refuse-btn";
            refuseBtn.textContent = "Refuse ";

            // Создаем элемент для таймера
            const timerElement = document.createElement("span");
            timerElement.className = "timer-circle";
            refuseBtn.appendChild(timerElement);

            // Создаем красные часы
            const refuseClock = document.createElement("div");
            refuseClock.className = "refuse-clock";
            refuseClock.innerHTML = `
              <div class="refuse-hour-hand"></div>
              <div class="refuse-minute-hand"></div>
            `;

            let countdown = 30;
            timerElement.textContent = countdown;

            // Запускаем таймер обратного отсчета
            const timerInterval = setInterval(() => {
              countdown -= 1;
              timerElement.textContent = countdown;
              if (countdown <= 0) {
                clearInterval(timerInterval);
                refuseBtn.remove();
                refuseClock.remove(); // Удаляем красные часы
              }
            }, 1000);

            refuseBtn.addEventListener("click", async () => {
              refuseClock.classList.add("visible"); // Показываем красные часы
              if (await refuseTaskInServer(taskId)) {
                // Возвращаем кнопку в изначальное состояние
                this.classList.remove("assigned");
                this.textContent = "Assign to Me";
                clearInterval(timerInterval); // Останавливаем таймер
                refuseBtn.remove();
                refuseClock.remove(); // Удаляем красные часы
              } else {
                refuseClock.classList.remove("visible"); // Скрываем красные часы при ошибке
              }
            });
            this.parentElement.appendChild(refuseBtn);
            this.parentElement.appendChild(refuseClock);
          }
        } catch (error) {
          console.error("Error assigning task:", error);
        } finally {
          clock.classList.remove("visible"); // Скрываем часы после завершения
        }
      }
    });
  }

  const commentBtn = eventElement.querySelector(".comment-btn");
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

          // Используем handleAddComment для добавления комментария
          await handleAddComment(taskId, commentText, user.fullName);

          // Очищаем поле ввода после успешного добавления
          commentInput.value = "";
        } catch (error) {
          console.error("Error adding comment:", error);
          alert(
            "Ошибка при добавлении комментария. Пожалуйста, попробуйте еще раз."
          );
        }
      }
    });
  }

  const commentInput = eventElement.querySelector(".comment-input");
  if (commentInput) {
    commentInput.addEventListener("keydown", async function (event) {
      if (event.key === "Enter") {
        event.preventDefault(); // Предотвращаем добавление новой строки
        const taskId = this.closest(".task-item").dataset.taskId;
        const commentText = this.value.trim();

        if (commentText) {
          try {
            const user = JSON.parse(localStorage.getItem("currentUser"));
            if (!user || user.role !== "maintenance") {
              throw new Error("Unauthorized");
            }

            // Используем handleAddComment для добавления комментария
            await handleAddComment(taskId, commentText, user.fullName);

            // Очищаем поле ввода после успешного добавления
            this.value = "";
          } catch (error) {
            console.error("Error adding comment:", error);
            alert(
              "Ошибка при добавлении комментария. Пожалуйста, попробуйте еще раз."
            );
          }
        }
      }
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener("change", async function () {
      const taskId = this.dataset.taskId;

      // Удаляем все классы статуса
      taskStatusDiv.classList.remove(
        "status-pending",
        "status-in-progress",
        "status-completed"
      );

      // Добавляем соответствующий класс в зависимости от выбранного значения
      if (this.value === "Pending") {
        taskStatusDiv.classList.add("status-pending");
      } else if (this.value === "In Progress") {
        taskStatusDiv.classList.add("status-in-progress");
      } else if (this.value === "Completed") {
        taskStatusDiv.classList.add("status-completed");
      }

      await db.updateTaskStatus(taskId, this.value);
      updateTasksList(await db.getAllTasksFromServer());
    });
  }

  return eventElement;
}

async function createMediaSection(mediaFiles) {
  if (!mediaFiles || !Array.isArray(mediaFiles) || mediaFiles.length === 0) {
    return "";
  }

  const mediaSection = document.createElement("div");
  mediaSection.className = "task-media";

  for (const fileName of mediaFiles) {
    try {
      if (fileName.match(/\.(jpg|jpeg|png|gif)$/i)) {
        const imgContainer = document.createElement("div");
        imgContainer.className = "image-container";

        const img = document.createElement("img");
        img.alt = "Task media";
        img.style.maxWidth = "135px"; // Добавляем явный размер
        img.style.height = "auto";

        // Сначала устанавливаем путь к оригиналу как запасной вариант
        img.src = `/maintenance_P/uploads/${fileName}`;

        // Пытаемся загрузить миниатюру
        const miniPath = await getMiniMediaFileFromServer(fileName);
        if (miniPath) {
          img.src = `/maintenance_P/${miniPath}`;
        }

        // Добавляем обработчик ошибок загрузки
        img.onerror = () => {
          console.log("Failed to load mini image, falling back to original");
          img.src = `/maintenance_P/uploads/${fileName}`;
        };

        img.addEventListener("click", () => {
          showFullImage(`/maintenance_P/uploads/${fileName}`);
        });

        imgContainer.appendChild(img);
        mediaSection.appendChild(imgContainer);
      }
    } catch (error) {
      console.error("Error creating media element:", error, fileName);
      continue;
    }
  }

  return mediaSection;
}

async function updateComments(task, commentsContainer, isFirstLoad) {
  try {
    const serverComments = await db.fetchComments(task.request_id);
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    // Объединяем локальные комментарии с комментариями с сервера
    const allComments = [
      ...serverComments,
      ...(localComments[task.request_id] || []),
    ];

    const isScrolledToBottom =
      Math.abs(
        commentsContainer.scrollHeight -
          commentsContainer.scrollTop -
          commentsContainer.clientHeight
      ) < 1;

    const newCommentsHtml = allComments
      .map((comment) => {
        const isLocal = localComments[task.request_id]?.some(
          (localComment) => localComment.timestamp === comment.timestamp
        );
        const statusClass = isLocal ? "status-local" : "status-server";

        return `
        <div class="comment">
          <div class="comment-header">
            <span class="comment-author">
              <i class="fas fa-user"></i> ${comment.staffName}
              ${comment.staffName === task.assigned_to ? " (Assigned)" : ""}
            </span>
            <span class="comment-time" data-timestamp="${
              comment.timestamp
            }">${formatDate(comment.timestamp)} <span class="${statusClass}">${
          isLocal ? "&#128337;" : "&#10003;"
        }</span></span>
          </div>
          <div class="comment-text">${comment.text}</div>
          ${
            comment.staffName === currentUser.fullName
              ? `
            <div class="comment-delete">
            <i class="fas fa-trash" title="delete" onclick="deleteComment('${task.request_id}', '${comment.timestamp}')"></i>
            </div>
          `
              : ""
          }
        </div>
      `;
      })
      .join("");

    if (newCommentsHtml) {
      commentsContainer.innerHTML = newCommentsHtml;
    }

    if (isFirstLoad || isScrolledToBottom) {
      commentsContainer.scrollTop = commentsContainer.scrollHeight;
    }
  } catch (error) {
    console.error("Error fetching comments:", error);
  }
}

async function handleAddComment(taskId, commentText, userFullName) {
  const timestamp = new Date().toISOString();
  const newComment = { staffName: userFullName, text: commentText, timestamp };

  // Сохраняем новый комментарий в локальном состоянии
  if (!localComments[taskId]) {
    localComments[taskId] = [];
  }
  localComments[taskId].push(newComment);

  // Отображаем новый комментарий сразу
  const commentsContainer = document.querySelector(
    `.task-item[data-task-id="${taskId}"] .comments-list`
  );
  const newCommentElement = document.createElement("div");
  newCommentElement.className = "comment";
  newCommentElement.style.opacity = 0;
  newCommentElement.style.transition = "opacity 350ms";
  console.log("Создание мгновенного комментария");
  newCommentElement.innerHTML = `
    <div class="comment-header">
      <span class="comment-author">
        <i class="fas fa-user"></i> ${userFullName}
      </span>
      <span class="comment-time" data-timestamp="${timestamp}">${formatDate(
    new Date()
  )} <span class="status-local">&#128337;</span></span>
    </div>
    <div class="comment-text">${commentText}</div>
  `;
  commentsContainer.appendChild(newCommentElement);

  setTimeout(() => {
    newCommentElement.style.opacity = 1;
  }, 70);

  // Прокручиваем к новому комментарию
  commentsContainer.scrollTop = commentsContainer.scrollHeight;

  try {
    // Используем существующую функцию для добавления комментария на сервер
    const success = await db.addComment(taskId, commentText, userFullName);
    if (success) {
      // Удаляем комментарий из локального состояния после успешной отправки
      localComments[taskId] = localComments[taskId].filter(
        (comment) => comment.timestamp !== timestamp
      );

      // Обновляем символ статуса на ✓
      const statusSpan = newCommentElement.querySelector(
        ".comment-time .status-local"
      );
      statusSpan.innerHTML = "&#10003;";
      statusSpan.className = "status-server";

      // Добавляем иконку удаления
      const deleteIcon = document.createElement("div");
      deleteIcon.className = "comment-delete";
      deleteIcon.innerHTML = `<i class="fas fa-trash" title="delete" onclick="deleteComment('${taskId}', '${timestamp}')"></i>`;
      newCommentElement.appendChild(deleteIcon);
    } else {
      throw new Error("Failed to add comment");
    }
  } catch (error) {
    console.error("Error adding comment:", error);
    // Создаем плашку с сообщением об ошибке
    const errorBanner = document.createElement("div");
    errorBanner.className = "error-banner";
    errorBanner.innerHTML = `
      <span style="color: red;">&#10060; Ошибка при добавлении комментария</span>
    `;
    commentsContainer.appendChild(errorBanner);

    // Удаляем плашку через 3 секунды
    setTimeout(() => {
      errorBanner.remove();
    }, 3000);

    alert("Ошибка при добавлении комментария. Пожалуйста, попробуйте еще раз.");
  }
}

//Глобальные функции

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

window.deleteComment = async function (requestId, timestamp) {
  if (confirm("Вы уверены, что хотите удалить этот комментарий?")) {
    try {
      // Найдите соответствующий элемент комментария
      const commentElement = document
        .querySelector(
          `.task-item[data-task-id="${requestId}"] .comment-time[data-timestamp="${timestamp}"]`
        )
        .closest(".comment");

      if (commentElement) {
        // Заменяем значок мусорки на значок часов
        const deleteIcon = commentElement.querySelector(".comment-delete i");
        deleteIcon.classList.remove("fa-trash");
        deleteIcon.classList.add("fa-clock");

        const success = await db.deleteCommentFromServer(requestId, timestamp);
        if (success) {
          commentElement.remove(); // Удаляем элемент комментария из DOM
        } else {
          // Восстанавливаем значок мусорки, если удаление не удалось
          deleteIcon.classList.remove("fa-clock");
          deleteIcon.classList.add("fa-trash");
          alert("Ошибка при удалении комментария.");
        }
      } else {
        console.error(`Comment element with timestamp ${timestamp} not found.`);
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Ошибка при удалении комментария. Пожалуйста, попробуйте еще раз.");
    }
  }
};

////////////////////////////////КЛИЕНТСКИЕ ФУНКЦИИ////////////////////////////

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

////////////////////////////////FETCH ФУНКЦИИ////////////////////////////

async function getMediaFileFromServer(fileName) {
  console.log("getMediaFileFromServer: ", fileName);
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
    console.log("resultMedia: ", {
      type: result.type || "unknown",
      url: result.url || "",
      name: fileName,
    });
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

async function getMiniMediaFileFromServer(fileName) {
  try {
    console.log("Requesting mini file:", fileName);

    const response = await fetch("/maintenance_P/task.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getMiniFile",
        fileName: fileName,
      }),
    });

    const responseText = await response.text();
    console.log("Server response for", fileName, ":", responseText);

    try {
      const data = JSON.parse(responseText);
      if (!data.success) {
        throw new Error(data.error || "Unknown error");
      }
      console.log("Mini path for", fileName, ":", data.miniPath);
      return data.miniPath;
    } catch (parseError) {
      console.error(
        "Failed to parse response for",
        fileName,
        ":",
        responseText
      );
      return null;
    }
  } catch (error) {
    console.error("Error getting mini file:", error);
    return null;
  }
}

async function refuseTaskInServer(taskId) {
  try {
    const response = await fetch("task.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "refuseTask",
        requestId: taskId,
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }
    return true;
  } catch (error) {
    console.error("Error refusing task:", error);
    return false;
  }
}

/*
let updateInterval;

async function AJAXUpdateTask() {
  clearInterval(updateInterval); // Останавливаем интервал
  try {
    let tasksFromServer;
    if(currentFilter === "all"){
      tasksFromServer = await db.getAllTasksFromServer();
    } else {
      console.log("checkDate: ",checkDate);
      tasksFromServer = await db.getTasksByDate(checkDate);
    }
    const tasksListElement = document.getElementById('tasksList');
    const existingTaskIds = Array.from(tasksListElement.children).map(taskElement => taskElement.dataset.taskId);
    console.log("existingTaskIds: ",existingTaskIds);
    console.log("tasksFromServer: ",tasksFromServer);

    tasksFromServer.forEach(async task => {
      if (!existingTaskIds.includes(task.request_id)) {
        // Если задание еще не добавлено на страницу, создаем его
        const taskElement = await createTaskElement(task);
        console.log("taskElement: ",taskElement);
        tasksListElement.appendChild(taskElement);

        // Обновляем статистику
        const allTasks = Array.from(tasksListElement.children).map(taskElement => ({
          status: taskElement.querySelector('.status-select').value
        }));
        await updateStatistics(allTasks);
      }
    });
  } catch (error) {
    console.error('Error updating task list:', error);
  } finally {
    updateInterval = setInterval(AJAXUpdateTask, 20000); // Перезапускаем интервал
  }
}
setTimeout(AJAXUpdateTask, 20000);
//document.addEventListener('DOMContentLoaded', AJAXUpdateTask);
*/

async function getTasksByDate(date) {
  try {
    // Форматируем дату в формат YYYY-MM-DD
    const formattedDate =
      typeof date === "string" ? date : date.toISOString().split("T")[0];

    const response = await fetch("/maintenance_P/task.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getTasksByDate",
        date: formattedDate,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseText = await response.text();
    console.log("Raw server response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse server response:", responseText);
      throw new Error("Invalid server response");
    }

    if (data.success) {
      return data.tasks || [];
    } else {
      throw new Error(data.message || "Failed to load tasks");
    }
  } catch (error) {
    console.error("Error fetching tasks by date:", error);
    throw new Error("Unable to load tasks. Please try again later.");
  }
}

// Функция для показа полноразмерного изображения
function showFullImage(imagePath) {
  const modal = document.createElement("div");
  modal.className = "image-modal";

  const img = document.createElement("img");
  img.src = imagePath;

  modal.appendChild(img);
  modal.addEventListener("click", () => {
    modal.remove();
  });

  document.body.appendChild(modal);
}

// Добавляем стили
const styles = `
    .image-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .image-modal img {
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
    }

    .image-container {
        display: inline-block;
        margin: 5px;
        cursor: pointer;
    }

    .image-container img {
        max-width: 135px;
        height: auto;
    }
`;

// Добавляем стили на страницу
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
