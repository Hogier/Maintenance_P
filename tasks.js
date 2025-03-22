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

let clientTasks = [];

let currentFilter = "today"; // возможные значения: 'today', 'all', 'custom'
let currentDate = new Date(getDallasDate());
let checkDate = currentDate.toISOString().split("T")[0];

let newCommentsPosition = [];

let localComments = {};
let counterNewTaskNotification = 0;

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
  //const today = new Date();
  const todayTasks = await getTasksByDate(today);
  clientTasks = todayTasks;
  await updateTasksList(todayTasks);
  await displayNotCompletedTasks();

  document
    .querySelector(".alert-tasks-list-header")
    .addEventListener("click", function () {
      const alertTasks = document.querySelector(".alert-tasks");
      const displayNotCompletedTasksButton = document.querySelector(
        "#displayNotCompletedTasksButton"
      );
      const contentHeight = alertTasks.scrollHeight; // Высота содержимого

      if (
        alertTasks.style.height === "80px" ||
        alertTasks.style.height === ""
      ) {
        alertTasks.style.height = "auto"; // Устанавливаем высоту содержимого
        displayNotCompletedTasksButton.style.transform = "rotate(90deg)";
      } else {
        alertTasks.style.height = "80px"; // Возвращаем к исходной высоте
        displayNotCompletedTasksButton.style.transform = "rotate(0deg)";
      }
    });

  // Добавляем обработчики для кнопок фильтрации
  document.getElementById("todayTasks").addEventListener("click", async (e) => {
    currentFilter = "today";
    console.log("today: ", today);
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
      //currentDate = new Date(e.target.value);
      // Преобразуем выбранную дату в дату по времени Далласа
      const selectedDate = luxon.DateTime.fromISO(e.target.value, {
        zone: "America/Chicago",
      });
      currentDate = new Date(selectedDate.toISO());

      console.log(
        "currentDate: ",
        currentDate,
        "e.target.value: ",
        e.target.value
      );
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
    const tasks = await db.getAllTasksFromServer();
    tasks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    clientTasks = tasks;
    return tasks;
  } catch (error) {
    console.error("Ошибка при получении заданий:", error);
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

const newTaskNotification = document.createElement("div");
newTaskNotification.className = "new-task-notification";
newTaskNotification.textContent = "📑";

const alertIcon = document.createElement("div");
alertIcon.className = "alert-icon";
alertIcon.textContent = "!";

newTaskNotification.appendChild(alertIcon);

newTaskNotification.style.display = "none"; // Скрываем по умолчанию
document.body.appendChild(newTaskNotification);

async function createTaskElement(task) {
  const taskElement = document.createElement("div");
  taskElement.className = "task-item";
  taskElement.setAttribute("data-task-id", task.request_id);

  const timestamp = formatDallasDate(task.timestamp);

  taskElement.innerHTML = `
    <div class="task-info">
      <div class="task-header">
        <span class="task-id">${task.request_id}</span>
        <span class="task-timestamp">${timestamp}</span>
      </div>
      <div class="task-details task-details-${task.priority}">${task.details}
      <div class="task-location">
        <div class="task-location-icon">📍</div>
        <div class="task-location-text">${task.building} - ${
    task.room
  } (Staff: ${task.staff})</div>
      </div>
      </div>
      <div class="task-meta-container">
        <div class="task-priority ${getPriorityClass(task.priority)}">
          Priority: ${task.priority}
        </div>
      </div>
      <div class="task-action-container">
        ${
          !task.assigned_to
            ? `<div class="assign-container">

                 <div class="assign-btn" data-task-id="${task.request_id}">Assign to Me
                   <div class="clock">
                      <div class="hour-hand"></div>
                      <div class="minute-hand"></div>
                    </div>
                 </div>
                 <div class="assigned-to-you-btn">
                   Assigned to You
                 </div>
               </div>`
            : `<div class="assigned-to">Assigned to: ${task.assigned_to}</div>`
        }
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
          <div class="status-clock">
            <div class="hour-hand"></div>
            <div class="minute-hand"></div>
            <div class="status-check">✔</div>
          </div>
        </div>
      </div>
      ${await createMediaSection(task)}
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

  // Устанавливаем начальный цвет для task-status
  const statusSelect = taskElement.querySelector(".status-select");
  const taskStatusDiv = taskElement.querySelector(".task-status");
  if (statusSelect.value === "Pending") {
    taskStatusDiv.classList.add("status-pending");
  } else if (statusSelect.value === "In Progress") {
    taskStatusDiv.classList.add("status-in-progress");
  } else if (statusSelect.value === "Completed") {
    taskStatusDiv.classList.add("status-completed");
  }

  const commentsContainer = taskElement.querySelector(".comments-list");
  const commentInputContainer = taskElement.querySelector(
    ".comment-input-container"
  );

  let isFirstLoad = true;
  let openComments = false;
  let commentsUpdateInterval;
  const discussionToggle = taskElement.querySelector(".discussion-toggle");

  // Создаем контейнер для уведомления о новом комментарии
  let showNewCommentNotification = false;
  const newCommentNotification = document.createElement("div");
  newCommentNotification.className = "new-comment-notification";
  newCommentNotification.textContent = "💬";

  // Создаем круглый блок с "!"
  const commentAlertIcon = document.createElement("div");
  commentAlertIcon.className = "alert-icon";
  commentAlertIcon.textContent = "!";

  // Добавляем круглый блок в уведомление о комментариях
  newCommentNotification.appendChild(commentAlertIcon);

  newCommentNotification.style.display = "none"; // Скрываем по умолчанию
  document.body.appendChild(newCommentNotification);

  const counterNewCommentNotification = document.createElement("div");
  counterNewCommentNotification.className = "counterNewCommentNotification";
  counterNewCommentNotification.style.display = "none"; // Скрываем по умолчанию
  document.body.appendChild(counterNewCommentNotification);

  discussionToggle.addEventListener("click", async function () {
    if (!openComments) {
      const clock = discussionToggle.querySelector(".discussion-toggle-clock");
      clock.style.opacity = "1";

      await updateComments(task, commentsContainer, isFirstLoad);
      clock.style.opacity = "0";

      commentsUpdateInterval = setInterval(async () => {
        isFirstLoad = false;

        let deltaComments = await updateComments(
          task,
          commentsContainer,
          isFirstLoad
        );
        let hasNewComments = false;
        if (deltaComments > 0) {
          hasNewComments = true;
        } else {
          hasNewComments = false;
        }

        const commentsRect = commentsContainer.getBoundingClientRect();
        const isCommentsVisible =
          commentsRect.top >= 0 && commentsRect.bottom <= window.innerHeight;

        if (
          !showNewCommentNotification &&
          hasNewComments &&
          !isCommentsVisible
        ) {
          showNewCommentNotification = true;
          newCommentsPosition.push(commentsRect.top + window.scrollY);
        }
        if (showNewCommentNotification) {
          newCommentNotification.style.display = "block";
        }

        const notifications = document.querySelectorAll(
          ".new-comment-notification[style='display: block;']"
        );
        if (notifications.length > 1) {
          console.log(
            "Внутри ИНТЕРВАЛА условие + notifications.length: ",
            notifications.length
          );
          counterNewCommentNotification.textContent = notifications.length;
          counterNewCommentNotification.style.display = "block";
        } else {
          console.log(
            "Внутри ИНТЕРВАЛА условие - notifications.length: ",
            notifications.length
          );
          counterNewCommentNotification.style.display = "none";
        }
      }, 3500);
    } else {
      clearInterval(commentsUpdateInterval);
      newCommentNotification.style.display = "none"; // Скрываем уведомление при закрытии
    }
    openComments = !openComments;
    console.log("openComments: ", openComments);
    commentsContainer.classList.toggle("expanded", openComments);
    commentInputContainer.classList.toggle("expanded", openComments);

    discussionToggle.innerHTML = openComments
      ? "▲"
      : "💬 Discussion <div class='discussion-toggle-clock'><div class='hour-hand'></div><div class='minute-hand'></div></div>";
  });

  // Добавляем обработчик события scroll для скрытия уведомления
  window.addEventListener("scroll", () => {
    if (openComments && showNewCommentNotification) {
      const commentsRect = commentsContainer.getBoundingClientRect();
      if (commentsRect.top >= 0 && commentsRect.bottom <= window.innerHeight) {
        newCommentNotification.style.display = "none";

        const notifications = document.querySelectorAll(
          ".new-comment-notification[style='display: block;']"
        );
        console.log("notifications.length: ", notifications.length);

        if (notifications.length < 2) {
          counterNewCommentNotification.style.display = "none";
        } else {
          counterNewCommentNotification.textContent = notifications.length;
        }

        showNewCommentNotification = false;

        newCommentsPosition = newCommentsPosition.filter(
          (position) =>
            !(
              position > window.scrollY &&
              position < window.scrollY + window.innerHeight
            )
        );
        console.log("newCommentsPosition: ", newCommentsPosition);

        /*const notificationCount = parseInt(counterNewCommentNotification.textContent);
        if (notificationCount > 1) {
          counterNewCommentNotification.textContent = notificationCount - 1;
        } else {
          counterNewCommentNotification.style.display = "none";
        }*/
      }
    }

    const currentDateString = currentDate.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const showedPageWithTodayTasks =
      currentFilter === "today" ||
      currentFilter === "all" ||
      (currentFilter === "custom" && currentDateString === getDallasDate());

    if (showedPageWithTodayTasks && window.scrollY < 100) {
      newTaskNotification.style.display = "none";
      counterNewTaskNotification = 0;
    }
  });

  newCommentNotification.addEventListener("click", () => {
    let currentScrollY = window.scrollY;
    //const commentsRect = commentsContainer.getBoundingClientRect();
    newCommentsPosition.sort((a, b) => a - b);
    console.log("newCommentsPosition: ", newCommentsPosition);
    console.log("window.scrollY: ", window.scrollY);
    if (window.scrollY < newCommentsPosition[0]) {
      window.scrollTo({ top: newCommentsPosition[0], behavior: "smooth" });
      newCommentsPosition.shift();
    } else if (
      window.scrollY > newCommentsPosition[newCommentsPosition.length - 1]
    ) {
      window.scrollTo({
        top: newCommentsPosition[newCommentsPosition.length - 1],
        behavior: "smooth",
      });
      newCommentsPosition.pop();
    } else {
      const index = newCommentsPosition.findIndex(
        (position) => position > window.scrollY
      );
      window.scrollTo({ top: newCommentsPosition[index], behavior: "smooth" });
      newCommentsPosition.splice(index, 1);
    }

    //commentsContainer.scrollIntoView({ behavior: "smooth", block: "start" });

    // Обновление отображения счетчика
    const notifications = document.querySelectorAll(
      ".new-comment-notification[style='display: block;']"
    );
    if (notifications.length < 2) {
      counterNewCommentNotification.style.display = "none";
    } else {
      counterNewCommentNotification.textContent = notifications.length;
    }
  });

  // Добавляем обработчики событий
  const assignBtn = taskElement.querySelector(".assign-btn");
  const assignedToYouBtn = taskElement.querySelector(".assigned-to-you-btn");
  if (assignBtn) {
    assignBtn.addEventListener("click", async function () {
      const taskId = this.dataset.taskId;
      console.log("Assigning task:", taskId);
      const user = JSON.parse(localStorage.getItem("currentUser"));
      if (user && user.role === "maintenance") {
        let clock = this.querySelector(".clock");

        // Если часы не найдены, создаем их заново
        if (!clock) {
          clock = document.createElement("div");
          clock.className = "clock";
          clock.innerHTML = `
            <div class="hour-hand"></div>
            <div class="minute-hand"></div>
          `;
          this.appendChild(clock);
        }

        clock.classList.add("visible"); // Показываем часы

        try {
          await db.assignTaskInServer(taskId, user.fullName);
          assignBtn.style.top = "-40px";
          assignedToYouBtn.style.top = "-40px";

          if (!this.parentElement.parentElement.querySelector(".refuse-btn")) {
            const refuseBtn = document.createElement("button");
            refuseBtn.className = "refuse-btn";
            refuseBtn.textContent = "Refuse ";

            const timerElement = document.createElement("span");
            timerElement.className = "timer-circle";
            refuseBtn.appendChild(timerElement);

            const refuseClock = document.createElement("div");
            refuseClock.className = "refuse-clock";
            refuseClock.innerHTML = `
              <div class="refuse-hour-hand"></div>
              <div class="refuse-minute-hand"></div>
            `;

            let countdown = 30;
            timerElement.textContent = countdown;

            const timerInterval = setInterval(() => {
              countdown -= 1;
              timerElement.textContent = countdown;
              if (countdown <= 0) {
                clearInterval(timerInterval);
                refuseBtn.remove();
                refuseClock.remove();
              }
            }, 1000);

            refuseBtn.addEventListener("click", async () => {
              refuseClock.classList.add("visible");
              if (await refuseTaskInServer(taskId)) {
                assignBtn.style.top = "0px";
                assignedToYouBtn.style.top = "0px";
                clearInterval(timerInterval);
                refuseBtn.remove();
                refuseClock.remove();
                // Восстанавливаем часы в кнопку
                this.appendChild(clock);
              }
            });

            this.parentElement.insertAdjacentElement("afterend", refuseBtn);
            refuseBtn.insertAdjacentElement("afterend", refuseClock);
          }
        } catch (error) {
          console.error("Error assigning task:", error);
        } finally {
          clock.classList.remove("visible");
        }
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

  const commentInput = taskElement.querySelector(".comment-input");
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

        // Проверяем, находится ли задание в блоке notCompletedTasksList
      }

      await changeTaskStatusOnServer(taskId, this.value);
      const taskElement = this.closest(".task-item");
      const parentList = taskElement.closest("#notCompletedTasksList");
      if (parentList && this.value === "Completed") {
        
        setTimeout(() => {
          //askElement.classList.add("collapse");
          setTimeout(() => {
            updateAlertTasksListHeight(taskElement);
            //taskElement.remove();
          }, 800); 
        }, 1000); 
      }
    });
  }

  // Отложенная загрузка медиафайлов
  /*if (task.media && task.media.length > 0) {
    setTimeout(async () => {
      const mediaContainer = taskElement.querySelector(".task-media");
      for (const mediaFile of task.media) {
        const mediaUrl = await getMediaFileFromServer(mediaFile);
        const img = document.createElement('img');
        img.src = mediaUrl;
        mediaContainer.appendChild(img);
      }
    }, 0);
  }*/

  return taskElement;
}

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
    let mediaFile;
    const isImage =
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".png") ||
      fileName.endsWith(".jpeg");
    const isVideo = fileName.endsWith(".mp4") || fileName.endsWith(".avi");
    const isAudio = fileName.endsWith(".mp3") || fileName.endsWith(".wav");

    if (isImage) {
      mediaFile = await getMiniMediaFileFromServer(fileName);
    } else if (isVideo || isAudio) {
      mediaFile = await getMediaFileFromServer(fileName);
    }

    if (mediaFile) {
      if (isImage) {
        mediaHtml += `
          <div class="media-item" onclick="showMediaFullscreen('${mediaFile.url.replace(
            "uploads/mini/mini_",
            "uploads/"
          )}', 'image')">
            <img src="${mediaFile.url}" alt="${mediaFile.name}">
            <span class="media-name">${mediaFile.name}</span>
          </div>
        `;
      } else if (isVideo) {
        mediaHtml += `
          <div class="media-item-video">
            <video src="${mediaFile.url}" controls></video>
            <span class="media-name">${mediaFile.name}</span>
          </div>
        `;
      } else if (isAudio) {
        mediaHtml += `
          <div class="media-item" onclick="showMediaFullscreen('${mediaFile.url}', 'audio')">
            <audio src="${mediaFile.url}" controls></audio>
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

function playNewMessageSound() {
  const audio = new Audio("sound/newMessage.mp3");
  audio.volume = 0.45;
  audio.play().catch((error) => {
    console.error("Ошибка при воспроизведении аудио:", error);
  });
}

function playNewTaskSound() {
  const audio = new Audio("sound/newTask.mp3");
  audio.volume = 0.6;
  audio.play().catch((error) => {
    console.error("Ошибка при воспроизведении аудио:", error);
  });
}

// Вызов функции при получении нового сообщения
async function updateComments(task, commentsContainer, isFirstLoad) {
  try {
    const serverComments = await db.fetchComments(task.request_id);
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const allComments = [
      ...serverComments,
      ...(localComments[task.request_id] || []),
    ];

    let deltaComments = 0;

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
      deltaComments = allComments.length - commentsContainer.children.length;
      commentsContainer.innerHTML = newCommentsHtml;

      if (deltaComments > 0 && !isFirstLoad) {
        playNewMessageSound(); // Воспроизведение звука при новом сообщении

        const newCommentElements =
          commentsContainer.querySelectorAll(".comment");
        const lastComment = newCommentElements[newCommentElements.length - 1]; // Получаем последний комментарий
        lastComment.classList.add("new"); // Добавляем класс для анимации

        // Убираем класс через 0.3 секунды, чтобы анимация сработала
        setTimeout(() => {
          lastComment.classList.remove("new");
        }, 450);
      }
    }

    if (isFirstLoad || isScrolledToBottom) {
      commentsContainer.scrollTop = commentsContainer.scrollHeight;
    }

    return deltaComments;
  } catch (error) {
    console.error("Error fetching comments:", error);
    return false; // Возвращаем false в случае ошибки
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

async function addNewTasksToPage(tasks) {
  if (!Array.isArray(tasks)) return;
  const tasksListElement = document.getElementById("tasksList");
  for (const task of tasks) {
    const taskElement = await createTaskElement(task);
    tasksListElement.insertBefore(taskElement, tasksListElement.firstChild);
  }
}

// Добавляем элемент для уведомления о новых задачах

setInterval(async () => {
  const newTasks = await checkNewTasksInServer();

  const currentDateString = currentDate.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const showedPageWithTodayTasks =
    currentFilter === "today" ||
    currentFilter === "all" ||
    (currentFilter === "custom" && currentDateString === getDallasDate());

  if (newTasks && showedPageWithTodayTasks) {
    await addNewTasksToPage(newTasks);
    clientTasks = [...newTasks, ...clientTasks];
    clientTasks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  if (newTasks && newTasks.length > 0) {
    counterNewTaskNotification = newTasks.length;
    alertIcon.textContent =
      counterNewTaskNotification > 1 ? counterNewTaskNotification : "!";
    newTaskNotification.style.display = "block";
    playNewTaskSound();
  }
}, 7000);

// Добавляем обработчик клика для скрытия уведомления
newTaskNotification.addEventListener("click", async () => {
  const currentDateString = currentDate.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const showedPageWithTodayTasks =
    currentFilter === "today" ||
    currentFilter === "all" ||
    (currentFilter === "custom" && currentDateString === getDallasDate());

  if (!showedPageWithTodayTasks) {
    const todays = new Date(getDallasDate());
    currentFilter = "today";
    checkDate = currentDate.toISOString().split("T")[0];
    document
      .querySelectorAll(".date-filter button")
      .forEach((btn) => btn.classList.remove("active"));
    document.getElementById("todayTasks").classList.add("active");

    const todayTasks = await getTasksByDate(todays);
    clientTasks = todayTasks;
    await updateTasksList(todayTasks);
    counterNewCommentNotification.style.display = "none";
    document
      .querySelectorAll(".new-comment-notification[style='display: block;']")
      .forEach((notification) => {
        notification.style.display = "none";
      });
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  newTaskNotification.style.display = "none";
  counterNewTaskNotification = 0;
});

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

async function displayNotCompletedTasks() {
  const notCompletedTasksList = document.getElementById(
    "notCompletedTasksList"
  );
  const closeAlertTasks = document.getElementById("closeAlertTasks");
  const alertContainer = document.querySelector(".alert-tasks");

  //notCompletedTasksList.innerHTML = "";
  let serverTasks = await getNotCompletedTasksForLastWeek();

  if (serverTasks.length > 0) {
    serverTasks.forEach(async (task) => {
      const taskElement = await createTaskElement(task);
      notCompletedTasksList.appendChild(taskElement);
    });
    alertContainer.classList.add("exist-tasks");
    setTimeout(() => {
      closeAlertTasks.classList.add("exist-tasks");
    }, 600);
  } else {
    //notCompletedTasksList.innerHTML = "<p>No incomplete tasks found for the last week</p>";
    alertContainer.classList.add("no-tasks");
    closeAlertTasks.classList.add("no-tasks");
  }

  closeAlertTasks.addEventListener("click", () => {
    alertContainer.classList.remove("exist-tasks");
    closeAlertTasks.classList.remove("exist-tasks");
    alertContainer.classList.add("no-tasks");
    closeAlertTasks.classList.add("no-tasks");
    const alertTasks = document.querySelector(".alert-tasks");

    setTimeout(() => {
      alertContainer.style.height = "0";
      closeAlertTasks.classList.remove("exist-tasks");
      closeAlertTasks.classList.add("no-tasks");
      setTimeout(() => {
        alertTasks.style.margin = "0";
        setTimeout(() => {
          alertTasks.style.padding = "0";
          setTimeout(() => {
            alertTasks.remove();
            closeAlertTasks.remove();
          }, 650);
        }, 200);
      }, 200);
    }, 200);
  });
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
  console.log("getMiniMediaFileFromServer: ", fileName);
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
        action: "getMINIMediaFile",
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
    const response = await fetch("task.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getTasksByDate",
        date: date.toISOString().split("T")[0],
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }
    result.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (
      getDallasDate() ===
      date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    )
      clientTasks = result.data;
    return result.data;
  } catch (error) {
    console.error("Error fetching tasks by date:", error);
    return [];
  }
}

async function changeTaskStatusOnServer(requestId, newStatus) {
  const statusClock = document.querySelector(
    `.status-select[data-task-id="${requestId}"]`
  ).nextElementSibling;
  const statusCheck = statusClock.querySelector(".status-check");
  const hourHand = statusClock.querySelector(".hour-hand");
  const minuteHand = statusClock.querySelector(".minute-hand");

  // Показываем часики
  statusClock.style.border = "2px solid rgba(255, 255, 255, 1)";
  statusClock.style.opacity = "1";
  hourHand.style.opacity = "1";
  minuteHand.style.opacity = "1";

  try {
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
    if (!result.success) {
      throw new Error(result.message);
    }
    console.log("Task status updated successfully");

    // Скрываем часики
    hourHand.style.opacity = "0";
    minuteHand.style.opacity = "0";
    statusClock.style.border = "2px solid rgba(255, 255, 255, 0)";
    // Показать галочку после исчезновения часиков с задержкой
    setTimeout(() => {
      statusCheck.style.opacity = "1";
      // Плавное появление галочки
    }, 500); // Задержка перед появлением галочки
    setTimeout(() => {
      statusCheck.style.opacity = "0";
      statusClock.style.opacity = "0"; // Плавное исчезновение галочки
    }, 2500); // Время отображения галочки
  } catch (error) {
    console.error("Error updating task status:", error);
  } finally {
  }
}

async function checkNewTasksInServer() {
  try {
    const lastTaskDate =
      clientTasks.length > 0 ? clientTasks[0].timestamp : null;
    console.log(
      "formatDallasDateForServer(getDallasDate()) ",
      formatDallasDateForServer(getDallasDate())
    );
    const response = await fetch("task.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "checkNewTasksI",
        lastTaskDate:
          lastTaskDate || formatDallasDateForServer(getDallasDate()),
      }),
    });

    const text = await response.text();
    try {
      if (text === "false") return false;
      const result = JSON.parse(text);
      // Удаляем проверку на result.success, так как сервер возвращает массив
      return result; // Предполагается, что сервер возвращает массив новых заданий
    } catch (jsonError) {
      console.error("Ошибка при парсинге JSON:", jsonError, "Ответ:", text);
      return false;
    }
  } catch (error) {
    console.error("Ошибка при проверке новых заданий:", error);
    return [];
  }
}

async function getNotCompletedTasksForLastWeek() {
  try {
    const response = await fetch("task.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getNotCompletedTasksForLastWeek",
        currentDate: formatDallasDateForServer(getDallasDate()),
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }
    return result.data;
  } catch (error) {
    console.error("Error fetching not completed tasks for last week:", error);
    return [];
  }
}

let notCompletedTasks = (async () => {
  const tasks = await getNotCompletedTasksForLastWeek();
  console.log("getNotCompletedTasksForLastWeek: ", tasks);
  return tasks;
})();

function updateAlertTasksListHeight(taskElement) {
  const alertTasksList = document.getElementById("notCompletedTasksList");
  const alertTasks = document.querySelector(".alert-tasks");
  const closeAlertTasks = document.getElementById("closeAlertTasks");
  //alertTasks.style.transition = "height 0.15s ease-in-out, opacity 0.5s ease-in-out";
  console.log("alertTasksList.querySelectorAll('.task-item').length: ", alertTasksList.querySelectorAll(".task-item").length);
  if (alertTasksList.querySelectorAll(".task-item").length === 1) {
    alertTasks.style.height = alertTasks.scrollHeight + "px";
    //taskElement.classList.add("collapse");
   setTimeout(() => {
      alertTasks.style.height = "0";
      closeAlertTasks.classList.remove("exist-tasks");
      closeAlertTasks.classList.add("no-tasks");
      setTimeout(() => {
        alertTasks.style.margin = "0";
        setTimeout(() => {
          alertTasks.style.padding = "0";
          setTimeout(() => {
            alertTasks.remove();
            closeAlertTasks.remove();
          }, 550);
        }, 150);
      }, 150);
    }, 150);
  } else {
    taskElement.classList.add("collapse");
    setTimeout(() => {
      taskElement.remove();

    }, 650);

  }
  //alertTasks.style.transition = "height 0.5s ease-in-out, opacity 0.5s ease-in-out";

}
