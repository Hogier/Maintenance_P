// Создаем WebSocket соединение
// const requestWS = new WebSocket("wss://macan.cityhost.com.ua:2346");

// database.js уже создает глобальную переменную db
// const db = new Database();

window.onload = function () {
  // Инициализируем Pusher
  PusherClient.init({
    key: '16f6b338124ef7c54632',
    cluster: 'eu',
    channelName: 'maintenance-channel',
    debug: true
  });
  
  // Подписываемся на события соединения
  PusherClient.on('connection', function(data) {
    if (data.status === 'connected') {
      console.log("Соединение с Pusher установлено");
    } else {
      console.log("Соединение с Pusher разорвано");
    }
  });

  // Подписываемся на события получения задач
  PusherClient.on('taskAdded', function(data) {
    try {
      console.log("Получен ответ:", data);

      if (data.type === "tasks") {
        // Обработка полученных задач
        const tasks = data.data;
        console.log("Получены задачи:", tasks);
        // Здесь можно вызвать функцию для отображения задач
        displayUserTasks(tasks);
      } else if (data.type === "error") {
        console.error("Ошибка сервера:", data.message);
      }
    } catch (error) {
      console.error("Ошибка обработки данных:", error);
      console.log("Полученные данные:", data);
    }
  });

  // Подписываемся на события ошибок
  PusherClient.on('error', function(data) {
    console.error("Pusher ошибка:", data.error);
  });
};

// В начале файла добавим функцию для проверки текущего пользователя
async function checkCurrentUser() {
  try {
    await db.waitForDB();
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (currentUser) {
    } else {
      console.error("Error checking current user:", error);
    }
  } catch (error) {
    console.error("Error checking current user:", error);
  }
}

// Проверяем авторизацию при загрузке страницы
document.addEventListener("DOMContentLoaded", async function () {
  try {
    await db.waitForDB();
    await checkCurrentUser(); // Добавляем проверку пользователя
    //   const users = await db.getAllUsers();
    let currUser = JSON.parse(localStorage.getItem("currentUser"));
    //   if (users && users.length > 0) {
    if (currUser != null) {
      await initializeForm();
    } else {
      console.log("No registered users found");
    }
  } catch (error) {
    console.error("Error initializing page:", error);
    alert("Error loading page. Please try again.");
  }
});

// Функция инициализации формы
async function initializeForm() {
  try {
    // Проверяем существование формы
    const form = document.querySelector("form");
    if (!form) {
      console.error("Форма не найдена на странице");
      return; // Если формы нет, прекращаем выполнение
    }

    const userBuildingSelect = document.getElementById("userBuildingSelect");
    const userRoomSelect = document.getElementById("userRoomSelect");
    const userStaffSelect = document.getElementById("userStaffSelect");
    const staffSelectContainer = document.getElementById(
      "staffSelectContainer"
    );
    const requestForm = document.getElementById("requestForm");

    // Проверяем наличие необходимых элементов
    if (
      !userBuildingSelect ||
      !userRoomSelect ||
      !userStaffSelect ||
      !staffSelectContainer ||
      !requestForm
    ) {
      console.error("Не все необходимые элементы формы найдены на странице");
      console.log("userBuildingSelect:", userBuildingSelect);
      console.log("userRoomSelect:", userRoomSelect);
      console.log("userStaffSelect:", userStaffSelect);
      console.log("staffSelectContainer:", staffSelectContainer);
      console.log("requestForm:", requestForm);
      return;
    }

    let selectedPriority = null;

    // Функция для анимации загрузки
    function startLoadingAnimation(element) {
      if (!element) return null;

      let dots = "";
      const maxDots = 5;
      const interval = setInterval(() => {
        dots += ".";
        if (dots.length > maxDots) {
          dots = "";
        }
        element.value = `${dots}`;
      }, 250);
      return interval;
    }

    // Запускаем анимацию загрузки
    const buildingLoadingInterval = startLoadingAnimation(userBuildingSelect);
    const roomLoadingInterval = startLoadingAnimation(userRoomSelect);
    const staffLoadingInterval = startLoadingAnimation(userStaffSelect);

    try {
      // Получаем местоположение пользователя
      let userLocation = await getUserLocation();

      // Останавливаем анимацию загрузки
      if (buildingLoadingInterval) clearInterval(buildingLoadingInterval);
      if (roomLoadingInterval) clearInterval(roomLoadingInterval);
      if (staffLoadingInterval) clearInterval(staffLoadingInterval);

      // Получаем данные о пользователе
      const currentUser = JSON.parse(localStorage.getItem("currentUser"));
      if (!currentUser) {
        console.error("Пользователь не авторизован");
        window.location.href = "loginUser.html?redirect=request.html";
        return;
      }

      // Устанавливаем полученные значения
      if (userLocation) {
        if (userBuildingSelect)
          userBuildingSelect.value = userLocation.building || "";
        if (userRoomSelect) userRoomSelect.value = userLocation.room || "";
        if (userStaffSelect) userStaffSelect.value = currentUser.fullName || "";
      } else {
        console.warn("Не удалось получить местоположение пользователя");
        // Если не удалось получить местоположение, устанавливаем имя пользователя из хранилища
        if (userStaffSelect) userStaffSelect.value = currentUser.fullName || "";
      }

      // Показываем форму запроса
      if (requestForm) requestForm.style.display = "block";

      // Функция проверки авторизации пользователя
      async function checkUserAuthorization(selectedStaff) {
        try {
          await db.waitForDB(); // Дожидаемся инициализации базы данных
          const user = await db.getUserByNameFromServer(selectedStaff);
          return !!user;
        } catch (error) {
          console.error("Error checking authorization:", error);
          return false;
        }
      }

      // Обработчики кнопок приоритета
      const priorityButtons = document.querySelectorAll(".priority-btn");

      priorityButtons.forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault(); // Предотвращаем отправку формы
          // Убираем выделение со всех кнопок
          priorityButtons.forEach((b) => b.classList.remove("selected"));
          // Добавляем выделение на нажатую кнопку
          this.classList.add("selected");
          selectedPriority = this.dataset.priority;
        });
      });
    } catch (error) {
      console.error("Ошибка при инициализации формы:", error);

      // Останавливаем анимацию загрузки в случае ошибки
      if (buildingLoadingInterval) clearInterval(buildingLoadingInterval);
      if (roomLoadingInterval) clearInterval(roomLoadingInterval);
      if (staffLoadingInterval) clearInterval(staffLoadingInterval);

      // Отображаем форму даже в случае ошибки
      if (requestForm) requestForm.style.display = "block";
    }
  } catch (error) {
    console.error("Критическая ошибка при инициализации формы:", error);
  }
}

// Функция для генерации ID запроса
function generateRequestId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `REQ-${timestamp}-${random}`.toUpperCase();
}

// Функция для показа модального окна
function showConfirmationModal(requestId) {
  try {
    const modal = document.getElementById("confirmationModal");
    if (!modal) {
      console.error("Modal element not found");
      return;
    }

    const requestIdElement = document.getElementById("requestId");
    if (requestIdElement) {
      requestIdElement.textContent = requestId;
    }

    modal.style.display = "flex";
  } catch (error) {
    console.error("Error showing confirmation modal:", error);
    alert("Request saved successfully. Request ID: " + requestId);
  }
}

// Обработчик для закрытия модального окна
document.getElementById("closeModal").addEventListener("click", function () {
  document.getElementById("confirmationModal").style.display = "none";
  // Опционально: очистить форму или перезагрузить страницу
  location.reload();
});

// Закрытие модального окна при клике вне его
document
  .getElementById("confirmationModal")
  .addEventListener("click", function (e) {
    if (e.target === this) {
      this.style.display = "none";
      location.reload();
    }
  });

// Функция для заполнения списка комнат
function populateRoomSelect(building) {
  const roomSelect = document.getElementById("roomSelect");
  roomSelect.innerHTML = '<option value="">Select Room</option>';

  const rooms = buildingRooms[building] || [];
  rooms.forEach((room) => {
    const option = document.createElement("option");
    option.value = room;
    option.textContent = room;
    roomSelect.appendChild(option);
  });
}

// Функция для заполнения списка сотрудников
async function populateStaffSelect(room, staffType) {
  try {
    await db.waitForDB(); // Дожидаемся инициализации базы данных
    const staffSelect = document.getElementById("staffSelect");
    staffSelect.innerHTML = '<option value="">Select Staff Member</option>';

    if (roomTeachers[room]) {
      const staffList =
        staffType === "mainTeacher"
          ? roomTeachers[room].mainTeacher
          : roomTeachers[room].assistant;

      const registeredUsers = await db.getAllUsersFromServer();
      console.log("Registered users:", registeredUsers); // Для отладки
      console.log("staffList users:", staffList);

      const availableStaff = staffList.filter((staff) =>
        registeredUsers.some((user) => user.full_name === staff)
      );
      console.log("Available staff:", availableStaff); // Для отладки

      availableStaff.forEach((staff) => {
        const option = document.createElement("option");
        option.value = staff;
        option.textContent = staff;
        staffSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error populating staff select:", error);
  }
}

/*
// Обновим обработчик для кнопки выхода
document
  .getElementById("logoutButton")
  .addEventListener("click", async function () {
    try {
      localStorage.removeItem("currentUser");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  });
*/
// Обновим функцию отправки запроса
async function submitRequest(formData) {
  try {
    // Добавим текущее время Далласа
    formData.timestamp = getDallasDateTime();

    // ... остальной код отправки ...
  } catch (error) {
    console.error("Error submitting request:", error);
  }
}

function formatDateFromTimestamp(timestamp) {
  try {
    console.log("Форматирование timestamp (из jawa script.js):", timestamp);

    // Проверяем формат
    if (timestamp.includes("-") && timestamp.includes(":")) {
      // Уже в формате YYYY-MM-DD HH:MM:SS
      // Просто извлекаем дату (первые 10 символов)
      return timestamp.substring(0, 10);
    } else if (timestamp.includes("/") && timestamp.includes(",")) {
      // Старый формат MM/DD/YYYY, HH:MM:SS
      const [month, day, year] = timestamp.split(",")[0].split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    } else {
      // Если формат неизвестен, возвращаем текущую дату
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      console.warn("Неизвестный формат даты:", timestamp);
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error("Ошибка при форматировании даты:", error);
    // Возвращаем текущую дату в случае ошибки
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

async function getUserLocation() {
  try {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || !currentUser.email) {
      throw new Error("User not logged in");
    }

    const response = await fetch("database.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getUserLocation",
        email: currentUser.email,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("User location:", data.location);
      return data.location;
    } else {
      throw new Error(data.message || "Failed to get user location");
    }
  } catch (error) {
    console.error("Error getting user location:", error);
    return null;
  }
}

// Функция для получения текущей даты и времени в формате Даллас (Центральное время США)
function getDallasDateTime() {
  const options = {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(new Date());

  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;
  const day = parts.find((part) => part.type === "day").value;
  const hour = parts.find((part) => part.type === "hour").value;
  const minute = parts.find((part) => part.type === "minute").value;
  const second = parts.find((part) => part.type === "second").value;

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

// Обработчик отправки формы
document
  .getElementById("submitRequest")
  .addEventListener("click", async function (e) {
    e.preventDefault();

    const selectedPriority = document.querySelector(".priority-btn.selected")
      ?.dataset.priority;
    if (!selectedPriority) {
      alert("Please select a priority level");
      return;
    }

    const userBuildingSelect = document.getElementById("userBuildingSelect");
    const userRoomSelect = document.getElementById("userRoomSelect");
    const building = userBuildingSelect.value;
    const room = userRoomSelect.value;
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser) {
      window.location.href = "loginUser.html?redirect=request.html";
      return;
    }

    const staff = currentUser.fullName;
    const details = document.getElementById("requestDetails").value;

    if (!details.trim()) {
      alert("Please provide maintenance request details");
      return;
    }

    const mediaFiles = document.getElementById("mediaFiles").files;

    try {
      const requestData = {
        requestId: generateRequestId(),
        building,
        room,
        staff,
        priority: selectedPriority,
        details,
        timestamp: getDallasDateTime(),
        status: "Pending",
        assignedTo: null,
        comments: [],
        media: [],
        submittedBy: currentUser ? currentUser.fullName : "Anonymous",
      };

      console.log("Данные запроса:", requestData);

      // Проверяем, доступен ли метод addTaskWithMedia
      if (typeof db.addTaskWithMedia === "function") {
        // Сохраняем задачу с медиафайлами
        const success = await db.addTaskWithMedia(requestData, mediaFiles);

        if (success) {
          console.log("Task saved successfully");
          console.log("mediaFiles.length: " + mediaFiles.length);
          console.log("Array.from(mediaFiles): " + Array.from(mediaFiles));

          // Отправляем задачу через Pusher без дополнительной сериализации
          await PusherClient.addTask(requestData);

          showConfirmationModal(requestData.requestId);

          // Очищаем форму
          document.querySelector("form").reset();
          document
            .querySelectorAll(".priority-btn")
            .forEach((btn) => btn.classList.remove("selected"));
          document.getElementById("mediaPreview").innerHTML = "";
        } else {
          throw new Error("Failed to save request");
        }
      } else {
        console.error("Метод addTaskWithMedia не найден в объекте db");
        alert(
          "Ошибка: Метод addTaskWithMedia не найден. Пожалуйста, обратитесь к администратору."
        );
      }
    } catch (error) {
      console.error("Error saving request:", error);
      alert("Error saving request. Please try again.");
    }
  });

// Добавим обработчик для предпросмотра медиафайлов
document.getElementById("mediaFiles").addEventListener("change", function (e) {
  const preview = document.getElementById("mediaPreview");
  preview.innerHTML = "";

  if (this.files.length > 0) {
    preview.style.display = "grid";

    Array.from(this.files).forEach((file) => {
      const reader = new FileReader();

      reader.onload = function (e) {
        if (file.type.startsWith("image/")) {
          const img = document.createElement("img");
          img.src = e.target.result;
          preview.appendChild(img);
        } else if (file.type.startsWith("video/")) {
          const video = document.createElement("video");
          video.src = e.target.result;
          video.controls = true;
          preview.appendChild(video);
        }
      };

      reader.readAsDataURL(file);
    });
  } else {
    preview.style.display = "none";
  }
});
