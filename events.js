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

  // Добавляем обработчики для показа/скрытия дополнительных полей
  document
    .getElementById("tablesNeeded")
    .addEventListener("change", function () {
      const tablesOptions = document.getElementById("tablesOptionsContainer");
      tablesOptions.classList.toggle("hidden", this.value !== "yes");

      // Сбрасываем значения при выборе "No"
      if (this.value !== "yes") {
        document
          .querySelectorAll('.table-type input[type="checkbox"]')
          .forEach((checkbox) => {
            checkbox.checked = false;
            const countInput = checkbox.parentElement.querySelector(
              'input[type="number"]'
            );
            countInput.value = "";
            countInput.disabled = true;
          });
      }
    });

  document
    .getElementById("chairsNeeded")
    .addEventListener("change", function () {
      const chairsInput = document.getElementById("chairsInputContainer");
      chairsInput.classList.toggle("hidden", this.value !== "yes");

      // Сбрасываем значение при выборе "No"
      if (this.value !== "yes") {
        document.getElementById("chairs").value = "";
      }
    });
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

// Функция для загрузки файлов на сервер
async function uploadFiles(files) {
  const uploadedUrls = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append("action", "uploadFile");
    formData.append("file", file);

    try {
      const response = await fetch("events_db.php", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        uploadedUrls.push(result.fileUrl);
      } else {
        console.error("Failed to upload file:", file.name);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }

  return uploadedUrls;
}

// Обновляем функцию handleEventSubmit
async function handleEventSubmit(event) {
  event.preventDefault();

  try {
    const formData = new FormData(event.target);
    const eventData = {};

    // Собираем данные формы
    for (let [key, value] of formData.entries()) {
      eventData[key] = value;
    }

    // Логируем данные перед отправкой
    console.log("Sending event data:", eventData);

    const response = await fetch("events_db.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "createEvent",
        eventData: JSON.stringify(eventData),
      }),
    });

    // Логируем ответ сервера
    const responseText = await response.text();
    console.log("Server response text:", responseText);

    // Пробуем распарсить JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse server response:", responseText);
      throw new Error("Invalid server response");
    }

    if (!result.success) {
      throw new Error(result.message || "Unknown error occurred");
    }

    // Успешное создание события
    alert("Event created successfully!");
    window.location.reload();
  } catch (error) {
    console.error("Error details:", error);
    alert("Failed to create event: " + error.message);
  }
}

// Добавляем обработчики для чекбоксов столов
document
  .querySelectorAll('.table-type input[type="checkbox"]')
  .forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const countInput = this.parentElement.querySelector(
        'input[type="number"]'
      );
      countInput.disabled = !this.checked;
      if (!this.checked) {
        countInput.value = "";
      }
    });
  });

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

// Функция для создания элемента оборудования
function createEquipmentItem(label, value) {
  if (!value || value === "no" || value === "0") return "";

  if (label === "Tables") {
    try {
      const tables = JSON.parse(value);
      let tableInfo = [];

      // Добавляем информацию о каждом типе столов
      if (tables["6ft"] > 0) {
        tableInfo.push(`${tables["6ft"]} 6ft tables`);
      }
      if (tables["8ft"] > 0) {
        tableInfo.push(`${tables["8ft"]} 8ft tables`);
      }
      if (tables.round > 0) {
        tableInfo.push(`${tables.round} round tables`);
      }

      // Добавляем информацию о скатертях
      const tableclothInfo = tables.tablecloth
        ? ` with ${tables.tablecloth} tablecloths`
        : "";

      return tableInfo.length > 0
        ? `
        <div class="equipment-item">
          <span class="equipment-label">Tables:</span>
          <span class="equipment-value">${tableInfo.join(
            ", "
          )}${tableclothInfo}</span>
        </div>
      `
        : "";
    } catch (e) {
      console.error("Error parsing tables data:", e);
      return "";
    }
  }

  if (label === "Chairs") {
    try {
      const chairsCount = parseInt(value);
      if (chairsCount > 0) {
        return `
          <div class="equipment-item">
            <span class="equipment-label">Chairs:</span>
            <span class="equipment-value">${chairsCount} chairs</span>
          </div>
        `;
      }
      return "";
    } catch (e) {
      console.error("Error parsing chairs data:", e);
      return "";
    }
  }

  return `
    <div class="equipment-item">
      <span class="equipment-label">${label}:</span>
      <span class="equipment-value">${value}</span>
    </div>
  `;
}

// Обновляем функцию форматирования даты
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Обновляем функцию проверки статуса
function canChangeStatus(event, newStatus) {
  const eventDate = new Date(event.startDate);
  const eventTime = event.endTime ? event.endTime.split(":") : null;
  if (eventTime) {
    eventDate.setHours(eventTime[0], eventTime[1]);
  }
  const now = new Date();

  switch (newStatus) {
    case "cancelled":
      return true; // Можно отменить в любое время
    case "completed":
      return now > eventDate; // Можно завершить только после окончания
    default:
      return true; // Для других статусов (pending)
  }
}

// Обновляем HTML для select в createEventElement
function createEventElement(event) {
  const eventElement = document.createElement("div");
  eventElement.className = "event-item";

  // Преобразуем строку setupImages в массив
  let setupImages = [];
  try {
    setupImages = event.setupImages ? JSON.parse(event.setupImages) : [];
  } catch (e) {
    console.error("Error parsing setupImages:", e);
    setupImages = [];
  }

  // Базовая информация о событии
  const basicInfo = `
    <div class="event-preview">
      <div class="event-header">
        <h3>${event.name}</h3>
        <div class="event-meta">
          <div class="event-time">
            <span class="event-date">${formatDate(event.startDate)}</span>
          </div>
          <div class="event-status">
            <select class="status-select" 
                    onchange="updateEventStatus(${event.id}, this.value)" 
                    data-event-id="${event.id}"
                    data-status="${event.status || "pending"}">
              <option value="pending" ${
                event.status === "pending" ? "selected" : ""
              }>Pending</option>
              <option value="completed" ${
                event.status === "completed" ? "selected" : ""
              } ${
    canChangeStatus(event, "completed") ? "" : "disabled"
  }>Completed</option>
              <option value="cancelled" ${
                event.status === "cancelled" ? "selected" : ""
              }>Cancelled</option>
            </select>
          </div>
        </div>
      </div>
      <div class="event-main-info">
        <p><strong>Location:</strong> ${event.location}</p>
        <p><strong>Time:</strong> ${event.startTime || "Not set"} - ${
    event.endTime || "Not set"
  }</p>
        <p><strong>Contact:</strong> ${event.contact || "Not specified"}</p>
        <p><strong>Attendees:</strong> ${event.attendees || "Not specified"}</p>
      </div>
      <div class="event-security-info">
        <p><strong>A/V Assistance:</strong> <span class="${
          event.avAssistance === "yes" ? "status-yes" : "status-no"
        }">${event.avAssistance?.toUpperCase() || "NO"}</span></p>
        <p><strong>Security Needed:</strong> <span class="${
          event.security === "yes" ? "status-yes" : "status-no"
        }">${event.security?.toUpperCase() || "NO"}</span></p>
        <p><strong>Building Access:</strong> <span class="${
          event.buildingAccess ? "status-yes" : "status-no"
        }">${event.buildingAccess ? "YES" : "NO"}</span></p>
      </div>
    </div>
  `;

  // Детальная информация о событии
  const detailedInfo = `
    <div class="event-details hidden">
      ${
        setupImages.length > 0
          ? `
        <div class="event-images-section">
          <h4>Event Setup Images</h4>
          <div class="event-images">
            ${setupImages
              .map(
                (url) => `
              <div class="setup-image-container">
                <img src="${url}" alt="Setup image" class="setup-image" onclick="showFullImage('${url}')">
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `
          : ""
      }
      
      <div class="details-section">
        <h5>Setup Details</h5>
        <p><strong>Setup Date:</strong> ${formatDate(event.setupDate)}</p>
        <p><strong>Setup Time:</strong> ${event.setupTime || "Not set"}</p>
      </div>

      <div class="details-section">
        <h5>Equipment Needed</h5>
        <div class="equipment-grid">
          ${
            event.tables_needed === "yes"
              ? createEquipmentItem("Tables", event.tables)
              : ""
          }
          ${
            event.chairs_needed === "yes"
              ? createEquipmentItem("Chairs", event.chairs_count)
              : ""
          }
          ${createEquipmentItem("Podium", event.podium)}
          ${createEquipmentItem("Monitors", event.monitors)}
          ${createEquipmentItem("Laptop", event.laptop)}
          ${createEquipmentItem("iPad", event.ipad)}
          ${createEquipmentItem("Microphones", event.microphones)}
          ${createEquipmentItem("Speaker", event.speaker)}
        </div>
      </div>

      ${
        event.otherConsiderations
          ? `
        <div class="details-section">
          <h5>Additional Considerations</h5>
          <p>${event.otherConsiderations}</p>
        </div>
      `
          : ""
      }

      <div class="event-comments">
        <div class="comments-header">Comments</div>
        <div class="comments-list">
          ${
            event.comments
              ? event.comments
                  .map(
                    (comment) => `
            <div class="comment-item">
              <div class="comment-header">
                <span class="comment-author">${comment.author}</span>
                <span class="comment-date">${formatDate(comment.date)}</span>
              </div>
              <div class="comment-text">${comment.text}</div>
            </div>
          `
                  )
                  .join("")
              : ""
          }
        </div>
        <form class="comment-form" onsubmit="addComment(event, '${event.id}')">
          <input type="text" class="comment-input" placeholder="Add a comment..." required>
          <button type="submit" class="comment-submit">Send</button>
        </form>
      </div>

      <div class="event-actions">
        <button class="print-event-btn" onclick="printEvent(${event.id})">
          <i class="fas fa-print"></i> Print
        </button>
        <button class="edit-event-btn" onclick="editEvent(${event.id})">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="delete-event-btn" onclick="deleteEvent(${event.id})">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    </div>
  `;

  eventElement.innerHTML = basicInfo + detailedInfo;

  // Добавляем кнопку переключения деталей
  const toggleButton = document.createElement("button");
  toggleButton.className = "toggle-details";
  toggleButton.textContent = "Show Details";
  toggleButton.onclick = () => {
    const details = eventElement.querySelector(".event-details");
    details.classList.toggle("hidden");
    toggleButton.textContent = details.classList.contains("hidden")
      ? "Show Details"
      : "Hide Details";
  };

  eventElement.querySelector(".event-preview").appendChild(toggleButton);

  return eventElement;
}

// Функция для показа полноразмерного изображения
function showFullImage(url) {
  const modal = document.createElement("div");
  modal.className = "image-modal";

  const img = document.createElement("img");
  img.src = url;
  img.alt = "Event setup image";

  modal.appendChild(img);
  modal.addEventListener("click", () => modal.remove());

  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add("show"), 10);
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

// Функция добавления комментария
async function addComment(e, eventId) {
  e.preventDefault();
  const form = e.target;
  const input = form.querySelector(".comment-input");
  const text = input.value.trim();

  if (!text) return;

  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) {
    showNotification("Please login to add comments", "error");
    return;
  }

  // Получаем текущую дату в часовом поясе Далласа
  const now = new Date();
  // Конвертируем в часовой пояс Далласа
  const dallasTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Chicago" })
  );

  const formattedDate =
    dallasTime.getFullYear() +
    "-" +
    String(dallasTime.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(dallasTime.getDate()).padStart(2, "0") +
    " " +
    String(dallasTime.getHours()).padStart(2, "0") +
    ":" +
    String(dallasTime.getMinutes()).padStart(2, "0") +
    ":" +
    String(dallasTime.getSeconds()).padStart(2, "0");

  const commentData = {
    eventId: eventId,
    text: text,
    author: user.fullName,
    date: formattedDate,
  };

  try {
    const response = await fetch("events_db.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "addComment",
        commentData: JSON.stringify(commentData),
      }),
    });

    const result = await response.json();
    if (result.success) {
      // Добавляем комментарий в DOM без перезагрузки
      const commentsList = form.previousElementSibling;
      const commentElement = createCommentElement(commentData);
      commentsList.appendChild(commentElement);

      // Очищаем поле ввода
      input.value = "";

      // Плавно прокручиваем к новому комментарию
      commentElement.scrollIntoView({ behavior: "smooth" });
    } else {
      throw new Error(result.message || "Failed to add comment");
    }
  } catch (error) {
    console.error("Error adding comment:", error);
    showNotification("Error adding comment: " + error.message, "error");
  }
}

// Функция создания элемента комментария
function createCommentElement(comment) {
  const div = document.createElement("div");
  div.className = "comment-item";
  div.innerHTML = `
    <div class="comment-header">
      <span class="comment-author">${comment.author}</span>
      <span class="comment-date">${formatDate(comment.date)}</span>
    </div>
    <div class="comment-text">${comment.text}</div>
  `;
  return div;
}

async function createEvent(eventData) {
  try {
    const response = await fetch("events_db.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "createEvent",
        eventData: JSON.stringify(eventData),
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }

    return result.eventId;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

async function getEventsByDate(date) {
  try {
    console.log("Requesting events for date:", date.toISOString());
    const response = await fetch("events_db.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getEventsByDate",
        date: date.toISOString().split("T")[0],
      }),
    });

    const result = await response.json();
    console.log("Server response:", result); // Добавляем для отладки

    if (!result.success) {
      throw new Error(result.message);
    }

    return result.events;
  } catch (error) {
    console.error("Error loading events:", error);
    throw error;
  }
}

async function addEventComment(eventId, comment) {
  try {
    const response = await fetch("events_db.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "addComment",
        eventId: eventId,
        comment: JSON.stringify(comment),
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }

    return result.commentId;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
}

// Функция печати события
function printEvent(eventId) {
  const event = events.find((e) => e.id === eventId);
  if (!event) return;

  // Создаем содержимое для печати
  const printContent = `
        <div class="print-content">
            <h2>${event.name}</h2>
            <div class="event-details">
                <p><strong>Date:</strong> ${formatDate(event.startDate)}</p>
                <p><strong>Time:</strong> ${event.startTime}</p>
                <p><strong>Location:</strong> ${event.location}</p>
                <p><strong>Contact:</strong> ${event.contact}</p>
                <p><strong>Email:</strong> ${event.email}</p>
                <p><strong>Phone:</strong> ${event.phone}</p>
                
                <h3>Setup Details</h3>
                <p><strong>Setup Date:</strong> ${formatDate(
                  event.setupDate
                )}</p>
                <p><strong>Setup Time:</strong> ${event.setupTime}</p>
                
                <h3>Equipment Needed</h3>
                <ul>
                    ${
                      event.tables_needed === "yes"
                        ? `
                        <li>Tables:
                            <ul>
                                ${
                                  event.tables6ftCount > 0
                                    ? `<li>6ft Tables: ${event.tables6ftCount}</li>`
                                    : ""
                                }
                                ${
                                  event.tables8ftCount > 0
                                    ? `<li>8ft Tables: ${event.tables8ftCount}</li>`
                                    : ""
                                }
                                ${
                                  event.tablesRoundCount > 0
                                    ? `<li>Round Tables: ${event.tablesRoundCount}</li>`
                                    : ""
                                }
                            </ul>
                        </li>
                    `
                        : ""
                    }
                    ${
                      event.chairs_needed === "yes"
                        ? `<li>Chairs: ${event.chairs_count}</li>`
                        : ""
                    }
                    ${event.podium === "yes" ? "<li>Podium</li>" : ""}
                    ${event.monitors === "yes" ? "<li>Monitors</li>" : ""}
                    ${event.laptop === "yes" ? "<li>Laptop</li>" : ""}
                    ${event.microphones === "yes" ? "<li>Microphones</li>" : ""}
                </ul>
                
                <h3>Additional Information</h3>
                <p><strong>AV Assistance:</strong> ${event.avAssistance}</p>
                <p><strong>Security Needed:</strong> ${event.security}</p>
                <p><strong>Building Access:</strong> ${event.buildingAccess}</p>
                ${
                  event.otherConsiderations
                    ? `
                    <h3>Other Considerations</h3>
                    <p>${event.otherConsiderations}</p>
                `
                    : ""
                }
            </div>
        </div>
    `;

  // Создаем временное окно для печати
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
        <html>
            <head>
                <title>Print Event - ${event.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                    h2 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
                    h3 { color: #4CAF50; margin-top: 20px; }
                    .event-details { margin-top: 20px; }
                    ul { margin: 10px 0; padding-left: 20px; }
                    li { margin: 5px 0; }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                ${printContent}
                <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">Print</button>
            </body>
        </html>
    `);
  printWindow.document.close();
}

// Обновляем функцию обновления статуса
async function updateEventStatus(eventId, newStatus) {
  try {
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (!canChangeStatus(event, newStatus)) {
      alert("Cannot change to this status at this time");
      // Возвращаем select к предыдущему значению
      const statusSelect = document.querySelector(
        `select[data-event-id="${eventId}"]`
      );
      if (statusSelect) {
        statusSelect.value = event.status;
      }
      return;
    }

    const response = await fetch("events_db.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "updateEventStatus",
        eventId: eventId,
        status: newStatus,
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }

    // Обновляем локальное состояние
    event.status = newStatus;

    // Обновляем UI
    const statusSelect = document.querySelector(
      `select[data-event-id="${eventId}"]`
    );
    if (statusSelect) {
      statusSelect.value = newStatus;
      statusSelect.setAttribute("data-status", newStatus);
    }
  } catch (error) {
    console.error("Error updating event status:", error);
    alert("Failed to update event status");
  }
}

// Продолжение следует...
