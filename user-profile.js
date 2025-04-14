let isFirstLoadEvents = false;

let displayedTasks = [];
let displayedEvents = [];
let searchValue = "";

let currentFilter = {
  data: "lastWeek",
  status: "All",
  priority: "All",
  assignedTo: "All",
};

let currentSort = { sortBy: "Date", sortOrder: "dec" };

// Определение структуры зданий и комнат
const buildingRooms = {
  westWing: ["Room 101", "Room 102", "Room 103"],
  southWing: ["Room 201", "Room 202", "Room 203"],
  northWing: ["Room 301", "Room 302", "Room 303"],
  upperSchool: ["Class 401", "Class 402", "Class 403"],
  GFB: ["Lab 1", "Lab 2", "Lab 3"],
  WLFA: ["Studio 1", "Studio 2", "Studio 3"],
  Administration: ["Office 1", "Office 2", "Office 3"],
};


document.addEventListener("DOMContentLoaded", async function () {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  const maintenanceStaff = JSON.parse(
    localStorage.getItem("maintenanceStaffAuth")
  );

  if (!user && !maintenanceStaff) {
    document.querySelector(".user-profile-account").style.display = "none";
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
  const actionContainer = document.getElementById("actionContainer");
  const filterButton = document.getElementById("filterButton");
  const sortButton = document.getElementById("sortButton");
  const searchButton = document.getElementById("searchButton");
  const actionButtons = [filterButton, sortButton, searchButton];
  let isOpenButtons = [false, false, false];
  const TasksListHeader = document.getElementById("TasksListHeader");

  const titleForTasksList =
    JSON.parse(localStorage.getItem("currentUser")).role === "user"
      ? "Your requests"
      : "Your tasks";
  TasksListHeader.textContent = titleForTasksList;

  headerContainer.addEventListener("click", function () {
    userDashboard.classList.add("active");
    console.log("userDashboard.offsetWidth", userDashboard.offsetWidth);
    actionContainer.style.right = `${userDashboard.offsetWidth + 10}px`;
    overlay.style.display = "block";
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "auto";
  });

  closeButton.addEventListener("click", function () {
    userDashboard.classList.remove("active");
    actionContainer.style.right = "-100px";
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.display = "none";
    actionButtons.forEach((button, index) => {
      button.style.height = "50px";
      button.style.width = "50px";
      isOpenButtons[index] = false;
    });
  });

  actionButtons.forEach((button, index) => {
    const img = button.querySelector("img");
    img.addEventListener("click", () => {
      isOpenButtons[index] = !isOpenButtons[index];
      if (index === 0) {
        button.style.width = isOpenButtons[index] ? "372px" : "50px";
        button.style.height = isOpenButtons[index] ? "217px" : "50px";
      } else {
        button.style.width = isOpenButtons[index] ? "372px" : "50px";
      }
    });
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

  //ФИЛЬТРЫ

  document
    .getElementById("filter-date")
    .addEventListener("change", function () {
      currentFilter.data = this.value;
      displayUserTasks();
    });

  document
    .getElementById("filter-status")
    .addEventListener("change", function () {
      currentFilter.status = this.value;
      displayUserTasks();
    });

  document
    .getElementById("filter-priority")
    .addEventListener("change", function () {
      currentFilter.priority = this.value;
      displayUserTasks();
    });

  document
    .getElementById("filter-assigned")
    .addEventListener("change", function () {
      currentFilter.assignedTo = this.value;
      displayUserTasks();
    });

  // Сортировка

  document.getElementById("sort-date").addEventListener("change", function () {
    console.log("sort chack" + this.value);
    currentSort.sortBy = this.value;
    console.log("currentSort.sortBy", currentSort.sortBy);
    displayUserTasks();
  });

  document.getElementById("orderButton").addEventListener("click", function () {
    currentSort.sortOrder = currentSort.sortOrder === "dec" ? "inc" : "dec";
    displayUserTasks();
  });

  //Поиск

  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      searchValue = searchInput.value.trim().toUpperCase();
      if (searchValue != "") {
        displayUserTasks();
      }
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

  document.addEventListener("click", function (event) {
    // Проверяем, был ли клик вне .status-container-wrapper
    const isClickInside = event.target.closest(".status-container-wrapper");
    if (!isClickInside) {
      // Удаляем класс .show у всех .status-edit
      document.querySelectorAll(".status-edit.show").forEach((edit) => {
        edit.classList.remove("show");
      });

      document.querySelectorAll(".profile-task-item").forEach((taskItem) => {
        if (taskItem) {
          taskItem.classList.remove("expanded-margin");
        }
      });

      // Удаляем класс -active у всех span
      document
        .querySelectorAll(".profile-task-status .status-container-wrapper span")
        .forEach((span) => {
          const activeClass = span.className
            .split(" ")
            .find((cls) => cls.endsWith("-active"));
          if (activeClass) {
            span.classList.remove(activeClass);
          }
        });
    }
  });
});

// Функция для отображения информации о пользователе
function displayUserInfo() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (user) {
    const userNameElement = document.getElementById("userName");
    if (userNameElement) {
      userNameElement.textContent = user.fullName;
    }
    document.querySelector(".user-profile-account").style.display = "flex";
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

// Функция для отображения заданий пользователя
async function displayUserTasks() {
  const infoContent = document.querySelector(".info-content");
  const loadingIndicator = document.querySelector(".loading-indicator");
  const user = JSON.parse(localStorage.getItem("currentUser"));

  if (!infoContent || !loadingIndicator) {
    console.error(
      'Container with class "info-content" or loading indicator not found.'
    );
    return;
  }
  const infoContentOverlay = document.createElement("div");
  infoContentOverlay.classList.add("info-content-overlay");
  // Если это не первый загрузка задач, показываем вуаль и индикатор загрузки

  infoContent.appendChild(infoContentOverlay);
  loadingIndicator.style.display = "block";
  infoContentOverlay.style.display = "block";

  try {
    let tasks = [];

    // Получаем задачи
    switch (currentFilter.data) {
      case "lastWeek":
        tasks = await getUserTasksForLastWeek();
        break;
      case "lastMonth":
        tasks = await getUserTasksForLastMonth();
        break;
      case "last3Months":
        tasks = await getUserTasksForLast3Months();
        break;
      case "lastYear":
        tasks = await getUserTasksForLastYear();
        break;
    }

    if (searchValue != "") {
      tasks = tasks.filter((task) => task.request_id.includes(searchValue));
      searchValue = "";
    }

    if (currentFilter.status !== "All") {
      console.log("filter status", currentFilter.status);
      tasks = tasks.filter((task) => task.status === currentFilter.status);
    }

    if (currentFilter.priority !== "All") {
      console.log("filter priority", currentFilter.priority);
      tasks = tasks.filter((task) => task.priority === currentFilter.priority);
    }

    if (currentFilter.assignedTo !== "All") {
      console.log("filter assignedTo", currentFilter.assignedTo);

      tasks = tasks.filter((task) => {
        let assignedTo = task.assigned_to != null ? "yes" : "no";
        return assignedTo === currentFilter.assignedTo;
      });
    }

    if (currentSort.sortOrder === "dec") {
      if (currentSort.sortBy === "Date") {
        tasks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      } else if (currentSort.sortBy === "Priority") {
        const priorityOrder = {
          low: 1,
          medium: 2,
          high: 3,
          urgent: 4,
        };
        tasks.sort(
          (a, b) =>
            priorityOrder[a.priority.toLowerCase()] -
            priorityOrder[b.priority.toLowerCase()]
        );
      } else if (currentSort.sortBy === "Status") {
        console.log("sort by status");
        tasks.sort((a, b) => a.status.localeCompare(b.status));
      } else if (currentSort.sortBy === "Assigned") {
        console.log("sort by assigned");

        tasks.sort((a, b) => {
          let aAssigned = a.assigned_to != null ? "yes" : "no";
          let bAssigned = b.assigned_to != null ? "yes" : "no";
          return aAssigned.localeCompare(bAssigned);
        });
      }
    } else if (currentSort.sortOrder === "inc") {
      if (currentSort.sortBy === "Date") {
        console.log("sort by date");
        tasks.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      } else if (currentSort.sortBy === "Priority") {
        console.log("sort by priority");
        const priorityOrder = {
          low: 1,
          medium: 2,
          high: 3,
          urgent: 4,
        };
        tasks.sort(
          (a, b) =>
            priorityOrder[b.priority.toLowerCase()] -
            priorityOrder[a.priority.toLowerCase()]
        );
      } else if (currentSort.sortBy === "Status") {
        console.log("sort by status");
        tasks.sort((a, b) => b.status.localeCompare(a.status));
      } else if (currentSort.sortBy === "Assigned") {
        console.log("sort by assigned");

        tasks.sort((a, b) => {
          let aAssigned = a.assigned_to != null ? "yes" : "no";
          let bAssigned = b.assigned_to != null ? "yes" : "no";
          return bAssigned.localeCompare(aAssigned);
        });
      }
    }
    // Очищаем содержимое контейнера
    infoContent.innerHTML = "";

    // Создаем ul-список для задач
    const tasksList = document.createElement("ul");
    tasksList.id = "userTasksList";
    tasksList.classList.add("tasks-list");

    tasks.forEach((task) => {
      const listItem = document.createElement("li");
      listItem.classList.add("profile-task-item");

      // Форматируем данные задачи
      const taskDetails = `
              <div class="profile-task-header">
                <div class="profile-task-header-left">
                  <span class="priority-indicator" style="background-color: ${getPriorityColor(
                    task.priority
                  )};"></span>
                  <span class="task-id">${task.request_id}</span>
                </div>
                <div class="profile-task-header-right">
                  <span class="profile-task-timestamp">${new Date(
                    task.timestamp
                  ).toLocaleString()}</span>
                </div>
              </div>
              <div class="profile-task-status">
                <span class="profile-task-status-text">Request</span> <div class="status-container-wrapper" data-task-id="${
                  task.request_id
                }"><span class="${
        user.role === "support"
          ? "status-container-maintenance"
          : "status-container"
      } ${task.status
        .toLowerCase()
        .replace(/\s+/g, "-")}" style="border-color: ${getStatusBorderColor(
        task.status
      )};">${task.status}</span>
                ${
                  user.role === "support"
                    ? generateStatusEditMarkup(task.status)
                    : ""
                }
                </div>
                <div class="profile-status-clock">
                  <div class="profile-hour-hand"></div>
                  <div class="profile-minute-hand"></div>
                </div>
                </div>
              <div class="task-assigned">${getAssignedInfo(task)}</div>
              <div class="task-details-wrapper">
                <div class="profile-task-details">${task.details}</div>
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

      const spanStatus = listItem.querySelector(
        ".profile-task-status .status-container-wrapper span"
      );
      spanStatus.addEventListener("click", function (e) {
        if (user.role === "support") {
          e.stopPropagation();
          this.classList.toggle(
            `${this.textContent.toLowerCase().replace(/\s+/g, "-")}-active`
          );

          const taskItem = this.closest(".profile-task-item");
          if (
            this.classList.contains("pending-active") ||
            this.classList.contains("in-progress-active") ||
            this.classList.contains("completed-active")
          ) {
            taskItem.classList.add("expanded-margin");
          } else {
            taskItem.classList.remove("expanded-margin");
          }
        }
        const statusEdits = this.parentElement.querySelectorAll(".status-edit");
        statusEdits.forEach((edit) => {
          edit.classList.toggle("show");
        });
      });

      const statusContainer = listItem.querySelectorAll(
        ".status-container-wrapper div"
      );
      changeStatus(statusContainer, spanStatus);
      function changeStatus(statusContainer, spanStatus) {
        statusContainer.forEach((wrapper) => {
          console.log(
            wrapper
              .closest(".status-container-wrapper")
              .getAttribute("data-task-id"),
            wrapper.textContent,
            wrapper.isEventListener
          );
          if (!wrapper.isEventListener) {
            wrapper.isEventListener = true;
            wrapper.addEventListener("click", async function (e) {
              e.stopPropagation();
              const anotherStatusContainer = Array.from(
                wrapper.closest(".status-container-wrapper").children
              ).filter((child) => child !== wrapper);
              const taskId = listItem
                .querySelector(".status-container-wrapper")
                .getAttribute("data-task-id");
              const statusClock = listItem.querySelector(
                ".profile-status-clock"
              );
              const taskItem = this.closest(".profile-task-item");
              const statusContainerWrapper = taskItem.querySelector(
                ".status-container-wrapper"
              );
              await changeTaskStatusInProfile(
                taskId,
                wrapper.textContent,
                statusClock
              );
              anotherStatusContainer.forEach((child) => {
                child.classList.remove("show");
              });
              setTimeout(() => {
                wrapper.style.top = "0px";
                taskItem.classList.remove("expanded-margin");
                setTimeout(() => {
                  //const spanStatus = taskItem.querySelector('.status-container-wrapper span');
                  const statusText = spanStatus.textContent;
                  const isFirstWrapper = wrapper.classList.contains("first");

                  const newDivInStatusContainer = document.createElement("div");
                  newDivInStatusContainer.textContent = statusText;
                  newDivInStatusContainer.classList.add(
                    "status-edit",
                    `${statusText.toLowerCase().replace(/\s+/g, "-")}`,
                    isFirstWrapper ? "first" : "second"
                  );
                  statusContainerWrapper.appendChild(newDivInStatusContainer);

                  spanStatus.textContent = wrapper.textContent;
                  spanStatus.style.borderColor = getStatusBorderColor(
                    wrapper.textContent
                  );
                  spanStatus.classList.remove(
                    `${statusText.toLowerCase().replace(/\s+/g, "-")}`
                  );
                  spanStatus.classList.remove(
                    `${statusText.toLowerCase().replace(/\s+/g, "-")}-active`
                  );
                  spanStatus.classList.add(
                    `${wrapper.textContent.toLowerCase().replace(/\s+/g, "-")}`
                  );

                  setTimeout(() => {
                    wrapper.remove();
                    const statusContainer = listItem.querySelectorAll(
                      ".status-container-wrapper div"
                    );
                    console.log(statusContainer);
                    console.log(spanStatus);
                    changeStatus(statusContainer, spanStatus);
                  }, 300);
                }, 500);
              }, 150);
            });
          }
        });
      }
    });

    // Добавляем список задач в контейнер
    infoContent.appendChild(tasksList);
  } catch (error) {
    console.error("Error fetching user tasks:", error);
  } finally {
    // Скрыть индикатор загрузки и вуаль после завершения

    const infoContentOverlay = document.querySelector(".info-content-overlay");
    if (infoContentOverlay) {
      infoContentOverlay.remove();
    }
    loadingIndicator.style.display = "none";
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

function generateStatusEditMarkup(status) {
  const statuses = ["Pending", "In Progress", "Completed"];
  return statuses
    .filter((s) => s !== status)
    .map((s, index) => {
      return `<div class="status-edit ${s.toLowerCase().replace(/\s+/g, "-")} ${
        index === 0 ? "first" : "second"
      }">${s}</div>`;
    })
    .join("");
}

async function addUserPhotoToServer(file) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const formData = new FormData();
  formData.append("action", "addUserPhoto");
  formData.append("userPhoto", file);
  formData.append("role", currentUser.role);

  if (
    currentUser.role === "user" ||
    currentUser.role === "admin" ||
    currentUser.role === "support"
  ) {
    formData.append("email", currentUser.email);
  }

  try {
    console.log("Начало загрузки файла:", file.name);
    console.log("Тип файла:", file.type);
    console.log("Размер файла:", file.size);

    const response = await fetch("php/user-profile.php", {
      method: "POST",
      body: formData,
    });

    console.log("Статус ответа:", response.status);
    console.log("Заголовки ответа:", Object.fromEntries(response.headers));

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Ответ сервера:", data);

    if (data.success) {
      console.log("Фото успешно загружено");
      return true;
    } else {
      console.error("Ошибка загрузки фото:", data.message);
      alert("Ошибка при загрузке фото: " + data.message);
      return false;
    }
  } catch (error) {
    console.error("Подробная информация об ошибке:", {
      message: error.message,
      stack: error.stack,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
    });
    alert("Ошибка при загрузке фото: " + error.message);
    return false;
  }
}

async function getUserPhotoFromServer() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const formData = new FormData();
  formData.append("action", "getUserPhoto");
  formData.append("role", currentUser.role);
  if (
    currentUser.role === "user" ||
    currentUser.role === "admin" ||
    currentUser.role === "support"
  ) {
    formData.append("email", currentUser.email);
  }

  return fetch("php/user-profile.php", {
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
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (photoFileName !== "user.png") {
      avatarContainer.style.backgroundImage =
        currentUser.role === "user" ||
        currentUser.role === "admin" ||
        currentUser.role === "support"
          ? `url("/Maintenance_P/users/img/${photoFileName}")`
          : `url("/Maintenance_P/maintenance_staff/img/${photoFileName}")`;
      avatarContainer.style.backgroundSize = "cover";
      avatarContainer.style.backgroundPosition = "center";
      avatarContainer.innerHTML = ``;
    }
    userPhotoElement.src =
      currentUser.role === "user" ||
      currentUser.role === "admin" ||
      currentUser.role === "support"
        ? `/Maintenance_P/users/img/${photoFileName}`
        : `/Maintenance_P/maintenance_staff/img/${photoFileName}`;
    // Добавляем проверку и выводим значение backgroundImage
    if (avatarContainer) {
    } else {
      console.error("avatarContainer не найден");
    }
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

    const response = await fetch("php/user-profile.php", {
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
      listItem.classList.add("profile-event-list-item");

      // Форматируем данные мероприятия
      const eventDetails = `
              <div class="profile-event-list-header">
                <div class="profile-event-list-header-left">
                  <span class="profile-event-list-name">${event.name}</span>
                </div>
                <div class="profile-event-list-header-right">
                  <span class="profile-event-list-location">${event.location}</span>
                </div>
              </div>
              <div class="profile-event-list-dates">
                <div class="profile-event-list-date">
                  <span class="profile-event-list-start-date">${event.startDate}</span>
                  <span class="profile-event-list-start-time">${event.startTime}</span>
                </div>
                <div class="profile-event-list-date">
                  <span class="profile-event-list-end-date">${event.endDate}</span>
                  <span class="profile-event-list-end-time">${event.endTime}</span>
                </div>
              </div>
              <div class="profile-event-contact">
                <p>Contact: ${event.contact} (${event.email}, ${event.phone})</p>
              </div>
              <div class="profile-event-status">
                <p>Status: ${event.status}</p>
              </div>
              <div class="profile-event-details">
                <p>Alcuin Contact: ${event.alcuinContact}</p>
                <p>Attendees: ${event.attendees}</p>
                <p>Created By: ${event.createdBy} at ${event.createdAt}</p>
              </div>
            `;

      listItem.innerHTML = eventDetails;
      eventsList.appendChild(listItem);

      // Добавляем обработчик клика для разворачивания деталей мероприятия
      listItem.addEventListener("click", function () {
        const details = this.querySelector(".profile-event-details");
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

async function getUserTasksForLastWeek() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  const formData = new FormData();
  const currentDate = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Chicago",
  });
  try {
    if (user) {
      formData.append("action", "getUserTasksForLastWeek");
      formData.append("role", user.role);
      formData.append("staff", user.fullName);
      formData.append("currentDate", currentDate);

      const response = await fetch("php/user-profile.php", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        data.tasks.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        displayedTasks = data.tasks;
        return data.tasks;
      } else {
        console.error(
          "Ошибка получения заданий за последнюю неделю:",
          data.message
        );
        return [];
      }
    }
  } catch (error) {
    console.error("Ошибка:", error);
    return [];
  }

  return [];
}

async function getUserTasksForLastMonth() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (user) {
    try {
      const formData = new FormData();
      formData.append("action", "getUserTasksForLastMonth");
      formData.append("role", user.role);
      formData.append("staff", user.fullName);
      formData.append("email", user.email);

      const currentDate = new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Chicago",
      });
      formData.append("currentDate", currentDate);

      const response = await fetch("php/user-profile.php", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        data.tasks.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        displayedTasks = data.tasks;
        return data.tasks;
      } else {
        console.error(
          "Ошибка получения заданий за последний месяц:",
          data.message
        );
        return [];
      }
    } catch (error) {
      console.error("Ошибка:", error);
      return [];
    }
  }
  return [];
}

async function getUserTasksForLast3Months() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (user) {
    try {
      const formData = new FormData();
      formData.append("action", "getUserTasksForLast3Months");
      formData.append("role", user.role);
      formData.append("staff", user.fullName);
      formData.append("email", user.email);

      const currentDate = new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Chicago",
      });
      formData.append("currentDate", currentDate);

      const response = await fetch("php/user-profile.php", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        data.tasks.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        displayedTasks = data.tasks;
        return data.tasks;
      } else {
        console.error(
          "Ошибка получения заданий за последние 3 месяца:",
          data.message
        );
        return [];
      }
    } catch (error) {
      console.error("Ошибка:", error);
      return [];
    }
  }
  return [];
}

async function getUserTasksForLastYear() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (user) {
    try {
      const formData = new FormData();
      formData.append("action", "getUserTasksForLastYear");
      formData.append("role", user.role);
      formData.append("staff", user.fullName);
      formData.append("email", user.email);

      const currentDate = new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Chicago",
      });
      formData.append("currentDate", currentDate);

      const response = await fetch("php/user-profile.php", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        data.tasks.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        displayedTasks = data.tasks;
        return data.tasks;
      } else {
        console.error(
          "Ошибка получения заданий за последний год:",
          data.message
        );
        return [];
      }
    } catch (error) {
      console.error("Ошибка:", error);
      return [];
    }
  }
  return [];
}

async function chengeTaskStatusInServer(taskId, newStatus) {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (user) {
    try {
      const formData = new FormData();
      formData.append("action", "updateTaskStatus");
      formData.append("requestId", taskId);
      formData.append("newStatus", newStatus);

      const response = await fetch("task.php", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        return data.message;
      } else {
        console.error("Ошибка изменения статуса задания:", data.message);
        return null;
      }
    } catch (error) {
      console.error("Ошибка:", error);
      return null;
    }
  }
  return null;
}

// Функция для получения информации о пользователе
async function getUserSettingsInfo(email) {
  try {
    const response = await fetch("database.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getUserLocation",
        email: email,
      }),
    });

    const result = await response.json();
    if (result.success && result.location) {
      const userInfo = result.location;
      document.getElementById("settingsBuilding").value = userInfo.building;
      populateSettingsRoomSelect(userInfo.building);
      document.getElementById("settingsRoom").value = userInfo.room;
    }
  } catch (error) {
    console.error("Error getting user settings:", error);
  }
}

// Функция для заполнения списка комнат в модальном окне
function populateSettingsRoomSelect(building) {
  const roomSelect = document.getElementById("settingsRoom");
  roomSelect.innerHTML = "";

  const rooms = buildingRooms[building] || [];
  rooms.forEach((room) => {
    const option = document.createElement("option");
    option.value = room;
    option.textContent = room;
    roomSelect.appendChild(option);
  });
}

// Обработчик для модального окна настроек
document.addEventListener("DOMContentLoaded", function () {
  const settingsIcon = document.getElementById("settingsIcon");
  const settingsModal = document.getElementById("settingsModal");
  const settingsClose = document.querySelector(".settings-close");
  const settingsBuilding = document.getElementById("settingsBuilding");

  // Открытие модального окна
  settingsIcon.addEventListener("click", async function () {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (currentUser && currentUser.email) {
      const userInfo = await getUserSettingsInfo(currentUser.email);
      if (userInfo) {
        document.getElementById("settingsEmail").value = userInfo.email;
        document.getElementById("settingsFullName").value = userInfo.full_name;
        document.getElementById("settingsDepartment").value =
          userInfo.department;
        document.getElementById("settingsBuilding").value = userInfo.building;
        populateSettingsRoomSelect(userInfo.building);
        document.getElementById("settingsRoom").value = userInfo.room;

        settingsModal.style.display = "block";
      }
    }
  });

  // Закрытие модального окна
  settingsClose.addEventListener("click", function () {
    settingsModal.style.display = "none";
  });

  // Закрытие при клике вне модального окна
  window.addEventListener("click", function (event) {
    if (event.target === settingsModal) {
      settingsModal.style.display = "none";
    }
  });

  // Обновление списка комнат при изменении здания
  settingsBuilding.addEventListener("change", function () {
    populateSettingsRoomSelect(this.value);
  });
});

////// ФУНКЦИИ ЗАПРОСОВ НА СЕРВЕР ДЛЯ РОЛИ "МАINTENANCE" //////
/*
async function getMaintenanceSettingsInfo(username) {
  try {
    const formData = new FormData();
    formData.append("action", "getMaintenanceSettingsInfo");
    formData.append("username", username);

    const response = await fetch("php/user-profile.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      return data.maintenanceInfo;
    } else {
      console.error("Ошибка получения информации:", data.message);
      return null;
    }
  } catch (error) {
    console.error("Ошибка:", error);
    return null;
  }
}
*/
/*
- Подключить   getMaintenanceSettingsInfo(username) 


*/

async function changeTaskStatusInProfile(requestId, newStatus, statusClock) {
  const hourHand = statusClock.querySelector(".profile-hour-hand");
  const minuteHand = statusClock.querySelector(".profile-minute-hand");

  console.log(requestId, newStatus);

  // Устанавливаем таймер для показа часов через 2 секунды
  const clockTimeout = setTimeout(() => {
    statusClock.style.border = "3px solid rgb(150, 167, 180)";
    statusClock.style.opacity = "1";
    hourHand.style.opacity = "1";
    minuteHand.style.opacity = "1";
  }, 700);

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

    // Если асинхронная операция завершилась до истечения 2 секунд, отменяем таймер
    clearTimeout(clockTimeout);

    // Скрываем часики, если они были показаны
    hourHand.style.opacity = "0";
    minuteHand.style.opacity = "0";
    statusClock.style.opacity = "0";
    statusClock.style.border = "3px solid rgba(255, 255, 255, 0)";
  } catch (error) {
    console.error("Error updating task status:", error);
  }
}
