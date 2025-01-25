// Глобальные переменные
let currentDate = new Date();
let selectedDate = new Date();
let events = [];

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", function () {
  // Проверка авторизации
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) {
    window.location.href = "loginUser.html";
    return;
  }

  // Отображение информации о пользователе
  displayUserInfo();

  // Инициализация календаря
  updateCalendar();
  loadEvents();

  // Обработчики событий
  document.getElementById("prevMonth").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
  });

  document
    .getElementById("addEventBtn")
    .addEventListener("click", showEventModal);
  document
    .querySelector(".close-modal")
    .addEventListener("click", hideEventModal);
  document
    .getElementById("eventForm")
    .addEventListener("submit", handleEventSubmit);
  document
    .querySelector(".cancel-btn")
    .addEventListener("click", hideEventModal);

  // Настройка drag and drop для загрузки файлов
  setupFileUpload();
});

// Функция обновления календаря
function updateCalendar() {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Обновляем заголовок с текущим месяцем и годом
  document.getElementById("currentMonth").textContent = `${
    monthNames[currentDate.getMonth()]
  } ${currentDate.getFullYear()}`;

  const calendarGrid = document.querySelector(".calendar-grid");
  calendarGrid.innerHTML = "";

  // Добавляем дни недели
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  weekDays.forEach((day) => {
    const dayElement = document.createElement("div");
    dayElement.className = "calendar-weekday";
    dayElement.textContent = day;
    calendarGrid.appendChild(dayElement);
  });

  // Получаем первый день месяца и количество дней
  const firstDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const lastDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  // Добавляем пустые ячейки в начале
  for (let i = 0; i < firstDay.getDay(); i++) {
    const emptyDay = document.createElement("div");
    emptyDay.className = "calendar-day empty";
    calendarGrid.appendChild(emptyDay);
  }

  // Добавляем дни месяца
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";
    dayElement.textContent = day;

    // Проверяем наличие событий в этот день
    const currentDateStr = `${currentDate.getFullYear()}-${(
      currentDate.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    if (events.some((event) => event.startDate === currentDateStr)) {
      dayElement.classList.add("has-events");
    }

    // Выделяем выбранный день
    if (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentDate.getMonth() &&
      selectedDate.getFullYear() === currentDate.getFullYear()
    ) {
      dayElement.classList.add("selected");
    }

    dayElement.addEventListener("click", () => {
      selectedDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      );
      updateCalendar();
      updateEventsList();
    });

    calendarGrid.appendChild(dayElement);
  }
}

// Функция загрузки событий
async function loadEvents() {
  try {
    const response = await fetch("events_db.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getEvents",
      }),
    });

    // Получаем текст ответа для отладки
    const responseText = await response.text();
    console.log("Raw server response:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse server response:", responseText);
      throw new Error("Invalid server response");
    }

    if (result.success) {
      events = result.events;
      updateCalendar();
      updateEventsList();
    } else {
      throw new Error(result.message || "Unknown error occurred");
    }
  } catch (error) {
    console.error("Error loading events:", error);
    showNotification("Error loading events: " + error.message, "error");
  }
}

// Функция обновления списка событий
function updateEventsList() {
  const eventsList = document.getElementById("eventsList");
  eventsList.innerHTML = "";

  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  const dayEvents = events.filter(
    (event) => event.startDate === selectedDateStr
  );

  if (dayEvents.length === 0) {
    eventsList.innerHTML =
      '<div class="no-events">No events scheduled for this day</div>';
    return;
  }

  dayEvents.forEach((event) => {
    const eventElement = createEventElement(event);
    eventsList.appendChild(eventElement);
  });
}

// Функции управления модальным окном
function showEventModal() {
  const modal = document.getElementById("eventModal");
  modal.style.display = "block";
  // Очищаем форму при открытии
  document.getElementById("eventForm").reset();
  // Устанавливаем минимальные даты для полей
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("eventStartDate").min = today;
  document.getElementById("setupDate").min = today;
  document.getElementById("endDate").min = today;
}

function hideEventModal() {
  const modal = document.getElementById("eventModal");
  modal.style.display = "none";
}

// Обработка отправки формы
async function handleEventSubmit(e) {
  e.preventDefault();

  try {
    const formData = new FormData(e.target);
    console.log("All form data:", Object.fromEntries(formData.entries()));
    const eventData = {
      name: formData.get("eventName"),
      startDate: formData.get("eventStartDate"),
      startTime: formData.get("eventStartTime"),
      setupDate: formData.get("setupDate"),
      setupTime: formData.get("setupTime"),
      endDate: formData.get("endDate"),
      endTime: formData.get("endTime"),
      location: formData.get("eventLocation"),
      contact: formData.get("eventContact"),
      email: formData.get("eventEmail"),
      phone: formData.get("eventPhone"),
      alcuinContact: formData.get("alcuinContact"),
      attendees: formData.get("attendees"),
      tables: formData.get("tablesNeeded"),
      chairs: formData.get("chairsNeeded"),
      podium: formData.get("podiumNeeded"),
      monitors: formData.get("monitorsNeeded"),
      laptop: formData.get("laptopNeeded"),
      ipad: formData.get("ipadNeeded"),
      microphones: formData.get("microphonesNeeded"),
      speaker: formData.get("speakerNeeded"),
      avAssistance: formData.get("avAssistance"),
      security: formData.get("securityNeeded"),
      buildingAccess: formData.get("buildingAccess"),
      otherConsiderations: formData.get("otherConsiderations"),
      status: "pending",
      createdBy: JSON.parse(localStorage.getItem("currentUser")).fullName,
      createdAt: new Date().toISOString(),
      setupImages: [],
    };

    // Проверяем данные перед отправкой
    console.log("Sending event data:", eventData);

    const response = await fetch("events_db.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "addEvent",
        eventData: JSON.stringify(eventData),
      }),
    });

    // Проверяем ответ сервера
    const responseText = await response.text();
    console.log("Raw server response:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse server response:", responseText);
      console.error("Parse error:", e);
      throw new Error("Invalid server response");
    }

    if (result.success) {
      hideEventModal();
      await loadEvents();
      selectedDate = new Date(eventData.startDate);
      updateCalendar();
      updateEventsList();
      showNotification("Event successfully created!");
    } else {
      throw new Error(result.message || "Unknown error occurred");
    }
  } catch (error) {
    console.error("Error submitting event:", error);
    showNotification("Error creating event: " + error.message, "error");
  }
}

// Функция для отображения уведомлений
function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Удаляем уведомление через 3 секунды
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Функция создания элемента события для списка
function createEventElement(event) {
  const eventElement = document.createElement("div");
  eventElement.className = "event-item";

  eventElement.innerHTML = `
    <div class="event-header">
      <h4 class="event-name">${event.name}</h4>
      <span class="event-time">${event.startTime} - ${event.endTime}</span>
    </div>
    <div class="event-details">
      <p><strong>Location:</strong> ${event.location}</p>
      <p><strong>Contact:</strong> ${event.contact}</p>
      <p><strong>Attendees:</strong> ${event.attendees}</p>
      ${
        event.setupImages && event.setupImages.length > 0
          ? `
        <div class="event-images">
          ${event.setupImages
            .map(
              (url) => `
            <img src="${url}" alt="Setup image" class="setup-image">
          `
            )
            .join("")}
        </div>
      `
          : ""
      }
      <div class="event-status ${event.status}">${event.status}</div>
    </div>
    <div class="event-actions">
      <button class="edit-btn" data-event-id="${event.id}">
        <i class="fas fa-edit"></i> Edit
      </button>
      <button class="delete-btn" data-event-id="${event.id}">
        <i class="fas fa-trash"></i> Delete
      </button>
    </div>
  `;

  // Добавляем обработчики для кнопок
  const editBtn = eventElement.querySelector(".edit-btn");
  const deleteBtn = eventElement.querySelector(".delete-btn");

  editBtn.addEventListener("click", () => editEvent(event));
  deleteBtn.addEventListener("click", () => deleteEvent(event.id));

  return eventElement;
}

// Функция настройки drag and drop для загрузки файлов
function setupFileUpload() {
  const fileUploadContainer = document.querySelector(".file-upload-container");
  const fileInput = document.getElementById("setupImage");

  // Добавляем поддержку множественных файлов
  fileInput.setAttribute("multiple", "");

  // Предотвращаем стандартное поведение браузера при перетаскивании
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    fileUploadContainer.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Добавляем визуальный эффект при перетаскивании
  ["dragenter", "dragover"].forEach((eventName) => {
    fileUploadContainer.addEventListener(eventName, () => {
      fileUploadContainer.classList.add("drag-active");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    fileUploadContainer.addEventListener(eventName, () => {
      fileUploadContainer.classList.remove("drag-active");
    });
  });

  // Обработка сброшенных файлов
  fileUploadContainer.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    fileInput.files = files;

    // Показываем имя файла
    if (files.length > 0) {
      const fileName = files[0].name;
      fileUploadContainer.querySelector(".file-upload-text").textContent =
        fileName;
    }
  });

  // Обновляем отображение имен файлов
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      const fileNames = Array.from(e.target.files)
        .map((file) => file.name)
        .join(", ");
      fileUploadContainer.querySelector(".file-upload-text").textContent =
        e.target.files.length > 1
          ? `Selected ${e.target.files.length} files`
          : fileNames;
    }
  });
}

// Функции редактирования и удаления событий
async function editEvent(event) {
  // Заполняем форму данными события
  const form = document.getElementById("eventForm");
  form.eventName.value = event.name;
  form.eventStartDate.value = event.startDate;
  form.eventStartTime.value = event.startTime;
  // ... заполняем остальные поля ...

  // Показываем модальное окно
  showEventModal();
}

async function deleteEvent(eventId) {
  if (confirm("Are you sure you want to delete this event?")) {
    try {
      const response = await fetch("events_db.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "deleteEvent",
          eventId: eventId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        await loadEvents();
        showNotification("Event successfully deleted!");
      } else {
        showNotification("Error deleting event: " + result.message, "error");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      showNotification("Error deleting event. Please try again.", "error");
    }
  }
}

// Функция отображения информации о пользователе
function displayUserInfo() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (user) {
    const userAccount = document.querySelector(".user-account");
    userAccount.innerHTML = `
      <div class="user-info">
        <div class="avatar-container">
          <span id="userAvatar">👤</span>
        </div>
        <div class="user-details">
          <span id="userName">${user.fullName}</span>
          ${
            user.department
              ? `<span class="user-department">${user.department}</span>`
              : ""
          }
        </div>
      </div>
      <button id="logoutButton">
        <span class="logout-icon">↪</span>
        <span class="logout-text">Logout</span>
      </button>
    `;

    // Добавляем обработчик для кнопки выхода
    document.getElementById("logoutButton").addEventListener("click", () => {
      localStorage.removeItem("currentUser");
      window.location.href = "main.html";
    });

    userAccount.style.display = "flex";
  }
}

// Продолжение следует...
