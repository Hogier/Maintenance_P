let isFirstLoadEvents = false;

document.addEventListener("DOMContentLoaded", async function () {
  // Проверяем авторизацию
  const user = JSON.parse(localStorage.getItem("currentUser"));
  const maintenanceStaff = JSON.parse(
    localStorage.getItem("maintenanceStaffAuth")
  );

  // Если пользователь не авторизован, скрываем элементы профиля
  if (!user && !maintenanceStaff) {
    document.querySelector(".user-account").style.display = "none";
    return;
  }

  await loadUserPhoto();
  displayUserInfo();
  displayDashboardUserInfo();
  displayUserTasks();
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("maintenanceStaffAuth");
      window.location.reload();
    });
  }

  const userDashboard = document.querySelector(".user-dashboard");
  const headerContainer = document.querySelector(".header-container");
  const closeButton = document.querySelector(".close-button");
  const changePhotoButton = document.getElementById("changePhotoButton");
  const photoModal = document.getElementById("photoModal");
  const closeModalButton = document.getElementById("closeModalButton");
  const uploadPhotoButton = document.getElementById("uploadPhotoButton");
  const dropArea = document.getElementById("dropArea");
  const photoInput = document.getElementById("photoInput");
  const fileNameDisplay = document.getElementById("fileName");
  const overlay = document.getElementById("overlay");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const loadingOverlay = document.getElementById("loadingOverlay");

  headerContainer.addEventListener("click", function () {
    userDashboard.classList.add("active");
    overlay.style.display = "block";
  });

  closeButton.addEventListener("click", function () {
    userDashboard.classList.remove("active");
    overlay.style.display = "none";
  });

  overlay.addEventListener("click", function () {
    userDashboard.classList.remove("active");
    overlay.style.display = "none";
  });

  changePhotoButton.addEventListener("click", function () {
    photoModal.style.display = "block";
  });

  let activeContainer = "userTasks";
  // Обработчик нажатия на контейнер с id="events"
  document.getElementById("events").addEventListener("click", () => {
    displayEvents();
    document.getElementById("events").style.width = "62%";
    document.getElementById("userTasks").style.width = "33%";
    activeContainer = "events";
  });
  document.getElementById("userTasks").addEventListener("click", () => {
    displayUserTasks();
    document.getElementById("userTasks").style.width = "62%";
    document.getElementById("events").style.width = "33%";
    activeContainer = "userTasks";
  });

  document.getElementById("userTasks").addEventListener("mouseover", () => {
    document.getElementById("userTasks").style.width = "62%";
    document.getElementById("events").style.width = "33%";
  });
  document.getElementById("events").addEventListener("mouseover", () => {
    document.getElementById("userTasks").style.width = "33%";
    document.getElementById("events").style.width = "62%";
  });

  document.getElementById("events").addEventListener("mouseout", () => {
    if (activeContainer === "events") {
      document.getElementById("userTasks").style.width = "33%";
      document.getElementById("events").style.width = "62%";
    } else {
      document.getElementById("userTasks").style.width = "62%";
      document.getElementById("events").style.width = "33%";
    }
  });
  document.getElementById("userTasks").addEventListener("mouseout", () => {
    if (activeContainer === "events") {
      document.getElementById("userTasks").style.width = "33%";
      document.getElementById("events").style.width = "62%";
    } else {
      document.getElementById("userTasks").style.width = "62%";
      document.getElementById("events").style.width = "33%";
    }
  });

  closeModalButton.addEventListener("click", function () {
    photoModal.style.display = "none";
  });

  uploadPhotoButton.addEventListener("click", async function () {
    if (photoInput.files.length > 0) {
      console.log("click addUserPhotoToServer !");
      await addUserPhotoToServer(photoInput.files[0]);
      photoModal.style.display = "none";
      console.log("click loadUserPhoto !");
      await loadUserPhoto();
    } else {
      alert("No image added, please try again.");
    }
  });

  dropArea.addEventListener("click", () => photoInput.click());

  dropArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropArea.style.backgroundColor = "#e0e0e0";
  });

  dropArea.addEventListener("dragleave", () => {
    dropArea.style.backgroundColor = "";
  });

  dropArea.addEventListener("drop", (event) => {
    event.preventDefault();
    dropArea.style.backgroundColor = "";
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      photoInput.files = files;
      const file = files[0];
      fileNameDisplay.textContent = `Selected file: ${file.name}`;
      console.log("File dropped:", file.name);
    }
  });

  // Обработчик для изменения текста при выборе файла
  photoInput.addEventListener("change", function () {
    if (photoInput.files.length > 0) {
      const fileName = photoInput.files[0].name;
      fileNameDisplay.textContent = `File "${fileName}" uploaded`;
    } else {
      fileNameDisplay.textContent = "Drag and drop or click to select a file";
    }
  });
  // Запуск загрузки данных
  loadUserDashboardData();

  const userPhotoContainer = document.querySelector(".user-photo-container");
  const userPhoto = userPhotoContainer.querySelector("img");
  // Убедитесь, что изображение загружено перед изменением размеров
  if (userPhoto.complete) {
    adjustImageSize(userPhoto);
  } else {
    userPhoto.onload = () => adjustImageSize(userPhoto);
  }
});
// Функция для отображения информации о пользователе
function displayUserInfo() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (user) {
    const userNameElement = document.getElementById("userName");
    if (userNameElement) {
      userNameElement.textContent = user.fullName;
    }
    document.querySelector(".user-account").style.display = "flex";
  }
}
// Функция для отображения информации о пользователе в личном кабинете
function displayDashboardUserInfo() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (user) {
    const userNameElement = document.getElementById("dashboardUserName");
    const userEmailElement = document.getElementById("dashboardUserEmail");
    if (userNameElement && userEmailElement) {
      userNameElement.textContent = user.fullName;
      userEmailElement.textContent = user.email;
    }
  }
}

// Функция для получения заданий пользователя
async function getUserTasks() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (user && user.role !== "maintenance") {
    try {
      const formData = new FormData();
      formData.append("action", "getUserTasks");
      formData.append("staff", user.fullName);

      const response = await fetch("database.php", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        data.tasks.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        return data.tasks;
      } else {
        console.error("Ошибка получения заданий:", data.message);
        return [];
      }
    } catch (error) {
      console.error("Ошибка:", error);
      return [];
    }
  }
  return [];
}

// Функция для отображения заданий пользователя
async function displayUserTasks() {
  const infoContent = document.querySelector(".info-content");
  const loadingIndicator = document.querySelector(".loading-indicator");

  if (!infoContent || !loadingIndicator) {
    console.error(
      'Container with class "info-content" or loading indicator not found.'
    );
    return;
  }
  const infoContentOverlay = document.createElement("div");
  infoContentOverlay.classList.add("info-content-overlay");
  // Если это не первый загрузка задач, показываем вуаль и индикатор загрузки
  if (isFirstLoadEvents) {
    infoContent.appendChild(infoContentOverlay);
    loadingIndicator.style.display = "block";
    infoContentOverlay.style.display = "block";
  }

  try {
    // Получаем задачи
    const tasks = await getUserTasks();

    // Очищаем содержимое контейнера
    infoContent.innerHTML = "";

    // Создаем ul-список для задач
    const tasksList = document.createElement("ul");
    tasksList.id = "userTasksList";
    tasksList.classList.add("tasks-list");

    tasks.forEach((task) => {
      const listItem = document.createElement("li");
      listItem.classList.add("task-item");

      // Форматируем данные задачи
      const taskDetails = `
              <div class="task-header">
                <div class="task-header-left">
                  <span class="priority-indicator" style="background-color: ${getPriorityColor(
                    task.priority
                  )};"></span>
                  <span class="task-id">${task.request_id}</span>
                </div>
                <div class="task-header-right">
                  <span class="task-timestamp">${new Date(
                    task.timestamp
                  ).toLocaleString()}</span>
                </div>
              </div>
              <div class="task-status">
                Request <span class="status-container" style="border-color: ${getStatusBorderColor(
                  task.status
                )};">${task.status}</span>
              </div>
              <div class="task-assigned">${getAssignedInfo(task)}</div>
              <div class="task-details-wrapper">
                <div class="task-details">${task.details}</div>
              </div>
            `;

      listItem.innerHTML = taskDetails;
      tasksList.appendChild(listItem);

      // Добавляем обработчик клика для разворачивания деталей задачи
      listItem.addEventListener("click", function () {
        const detailsWrapper = this.querySelector(".task-details-wrapper");
        if (
          detailsWrapper.style.maxHeight === "0px" ||
          !detailsWrapper.style.maxHeight
        ) {
          detailsWrapper.style.maxHeight = detailsWrapper.scrollHeight + "px";
        } else {
          detailsWrapper.style.maxHeight = "0px";
        }
      });
    });

    // Добавляем список задач в контейнер
    infoContent.appendChild(tasksList);
  } catch (error) {
    console.error("Error fetching user tasks:", error);
  } finally {
    // Скрыть индикатор загрузки и вуаль после завершения
    if (isFirstLoadEvents) {
      const infoContentOverlay = document.querySelector(
        ".info-content-overlay"
      );
      if (infoContentOverlay) {
        infoContentOverlay.remove();
      }
      loadingIndicator.style.display = "none";
    }
  }
}

// Вспомогательные функции для получения цвета приоритета и границы статуса
function getPriorityColor(priority) {
  return (
    {
      low: "#12bb1a",
      medium: "#fff000",
      high: "#ff7300",
      urgent: "#ff5445fc",
    }[priority.toLowerCase()] || "#ccc"
  );
}

function getStatusBorderColor(status) {
  return (
    {
      Pending: "#ff5445fc",
      "In Progress": "#e1d400",
      Completed: "#12bb1a",
    }[status] || "#2196f3"
  );
}

function getAssignedInfo(task) {
  return task.assigned_to
    ? `The task was assigned to ${
        task.assigned_to
      } <span style="font-size: 0.8em; color: #666;">at ${new Date(
        task.assigned_at
      ).toLocaleString()}</span>`
    : "No one has been assigned yet";
}

async function addUserPhotoToServer(file) {
  const formData = new FormData();
  formData.append("action", "addUserPhoto");
  formData.append("userPhoto", file);

  const currentUserEmail = JSON.parse(
    localStorage.getItem("currentUser")
  ).email;
  formData.append("email", currentUserEmail);

  return fetch("database.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        console.log("Фото успешно загружено");
      } else {
        console.error("Ошибка загрузки фото:", data.message);
      }
    })
    .catch((error) => console.error("Ошибка:", error));
}

async function getUserPhotoFromServer() {
  const currentUserEmail = JSON.parse(
    localStorage.getItem("currentUser")
  ).email;
  const formData = new FormData();
  formData.append("action", "getUserPhoto");
  formData.append("email", currentUserEmail);
  console.log(currentUserEmail);
  return fetch("database.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        return data.photo === "nophoto" ? "user.png" : data.photo;
      } else {
        console.error("Ошибка получения фото:", data.message);
        return "user.png"; // Возвращаем "user.png" в случае ошибки
      }
    })
    .catch((error) => {
      console.error("Ошибка:", error);
      return "user.png"; // Возвращаем "user.png" в случае ошибки
    });
}

async function loadUserPhoto() {
  try {
    const photoFileName = await getUserPhotoFromServer();
    const userPhotoElement = document.querySelector(".user-photo img");
    const avatarContainer = document.querySelector(".avatar-container");
    console.log("loadUserPhoto!");
    console.log(photoFileName);
    console.log(userPhotoElement);
    console.log(avatarContainer);
    if (photoFileName !== "user.png") {
      avatarContainer.style.backgroundImage = `url(users/img/${photoFileName})`;
      avatarContainer.style.backgroundSize = "cover";
      avatarContainer.style.backgroundPosition = "center";
      avatarContainer.innerHTML = ``;
    }
    userPhotoElement.src = `users/img/${photoFileName}`;
  } catch (error) {
    console.error("Ошибка загрузки фото:", error);
  }
}

// Показать индикатор загрузки и вуаль
function showLoadingIndicator() {
  loadingOverlay.style.display = "block";
  loadingIndicator.style.display = "block";
}

// Скрыть индикатор загрузки и вуаль с плавным исчезновением
function hideLoadingIndicator() {
  loadingOverlay.style.opacity = "0";
  loadingIndicator.style.opacity = "0";
  setTimeout(() => {
    loadingOverlay.style.display = "none";
    loadingIndicator.style.display = "none";
    loadingOverlay.style.opacity = "1"; // Сбросить прозрачность для следующего использования
    loadingIndicator.style.opacity = "1"; // Сбросить прозрачность для следующего использования
  }, 500); // Время должно совпадать с transition в CSS
}

// Пример асинхронной функции
async function loadUserDashboardData() {
  showLoadingIndicator();
  try {
    await displayUserTasks();
    // Здесь можно добавить другие асинхронные операции
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
  } finally {
    hideLoadingIndicator();
  }
}

function adjustImageSize(userPhoto) {
  if (userPhoto.naturalWidth > userPhoto.naturalHeight) {
    userPhoto.style.width = "auto";
    userPhoto.style.height = "100%";
  } else {
    userPhoto.style.width = "100%";
    userPhoto.style.height = "auto";
  }
}

async function getEvents() {
  try {
    // Получаем текущую дату по Далласу
    const currentDate = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Chicago",
    });

    const formData = new FormData();
    formData.append("action", "getEventsByProfile");
    formData.append("date", currentDate);

    const response = await fetch("database.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      console.log("Events:", data.events);
      return data.events.sort(
        (a, b) => new Date(b.startDate) - new Date(a.startDate)
      );
    } else {
      console.error("Error fetching events:", data.message);
      return [];
    }
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

async function displayEvents() {
  const infoContent = document.querySelector(".info-content");
  const loadingIndicator = document.getElementById("loadingIndicator");

  if (!infoContent || !loadingIndicator) {
    console.error(
      'Container with class "info-content" or loading indicator not found.'
    );
    return;
  }

  // Показать индикатор загрузки
  loadingIndicator.style.display = "block";
  isFirstLoadEvents = true;

  // Создаем и добавляем вуаль
  const infoContentOverlay = document.createElement("div");
  infoContentOverlay.classList.add("info-content-overlay");
  infoContent.appendChild(infoContentOverlay);
  infoContentOverlay.style.display = "block";

  try {
    const events = await getEvents();

    // Создаем ul-список для мероприятий
    const eventsList = document.createElement("ul");
    eventsList.id = "EventsList";
    eventsList.classList.add("events-list");

    events.forEach((event) => {
      const listItem = document.createElement("li");
      listItem.classList.add("event-list-item");

      // Форматируем данные мероприятия
      const eventDetails = `
              <div class="event-list-header">
                <div class="event-list-header-left">
                  <span class="event-list-name">${event.name}</span>
                </div>
                <div class="event-list-header-right">
                  <span class="event-list-location">${event.location}</span>
                </div>
              </div>
              <div class="event-list-dates">
                <div class="event-list-date">
                  <span class="event-list-start-date">${event.startDate}</span>
                  <span class="event-list-start-time">${event.startTime}</span>
                </div>
                <div class="event-list-date">
                  <span class="event-list-end-date">${event.endDate}</span>
                  <span class="event-list-end-time">${event.endTime}</span>
                </div>
              </div>
              <div class="event-contact">
                <p>Contact: ${event.contact} (${event.email}, ${event.phone})</p>
              </div>
              <div class="event-status">
                <p>Status: ${event.status}</p>
              </div>
              <div class="event-details">
                <p>Alcuin Contact: ${event.alcuinContact}</p>
                <p>Attendees: ${event.attendees}</p>
                <p>Created By: ${event.createdBy} at ${event.createdAt}</p>
              </div>
            `;

      listItem.innerHTML = eventDetails;
      eventsList.appendChild(listItem);

      // Добавляем обработчик клика для разворачивания деталей мероприятия
      listItem.addEventListener("click", function () {
        const details = this.querySelector(".event-details");
        if (details.style.maxHeight) {
          details.style.maxHeight = null;
        } else {
          details.style.maxHeight = details.scrollHeight + "px";
        }
      });
    });

    // Очищаем предыдущий контент и добавляем новый список
    infoContent.innerHTML = "";
    infoContent.appendChild(eventsList);
  } catch (error) {
    console.error("Error displaying events:", error);
  } finally {
    // Удаляем индикатор загрузки и вуаль
    infoContentOverlay.remove();
    loadingIndicator.style.display = "none";
  }
}
