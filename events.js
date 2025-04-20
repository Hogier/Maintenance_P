// Глобальные переменные
let currentDate = new Date();
let selectedDate = new Date();
let events = [];

///////////////////////////////////////////////////////

const eventsWS = new WebSocket("ws://localhost:2346");

window.onload = function () {
  eventsWS.onopen = function () {
    console.log("Подключено к WebSocket серверу");
  };

  eventsWS.onerror = function (e) {
    console.error("WebSocket ошибка: " + e.message);
  };

  eventsWS.onclose = function () {
    console.log("Соединение закрыто");
  };
};

function showCommentNotification(comment) {
  const notificationElement = document.getElementById("newCommentNotification");
  const headerElement = notificationElement.querySelector("h3");
  const textElement = notificationElement.querySelector("p");

  // Добавляем фото пользователя, если оно есть
  let authorContent = comment.author;
  if (comment.userPhotoUrl) {
    // Создаем структуру с фото и именем пользователя
    headerElement.innerHTML = `
      <img class="notification-user-photo" src="${comment.userPhotoUrl}" alt="${comment.author}" onerror="this.src='/Maintenance_P/users/img/user.png';">
      <span>${comment.author}</span>
    `;
  } else {
    // Если нет фото, просто устанавливаем текст
    headerElement.innerHTML = `<span>${comment.author}</span>`;
  }

  textElement.textContent = comment.text;
  const eventDate = comment.eventDate;

  // Проверяем, отображается ли уже уведомление
  const isShowing = notificationElement.classList.contains("show");

  // Показываем уведомление, если оно не отображается
  if (!isShowing) {
    notificationElement.classList.add("show");
  }

  // Воспроизведем звук нового сообщения
  playNewMessageSound();

  // Устанавливаем таймер для автоматического закрытия
  setTimeout(() => {
    notificationElement.classList.remove("show");
  }, 6000); // Уведомление исчезнет через 6 секунд
}

eventsWS.onmessage = function (e) {
  try {
    const data = JSON.parse(e.data);
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const currentUserName = currentUser.fullName
      ? currentUser.fullName
      : currentUser.username;
    if (data.action === "eventCommentAdded") {
      const comment = data.message;
      console.log("comment.author: ", comment.author);
      console.log("currentUser.username: ", currentUser.username);
      console.log(
        "comment.author != currentUser.username: ",
        comment.author != currentUser.username
      );
      if (comment.author != currentUserName) {
        showCommentNotification(comment);
        // Если комментарий адресован текущему открытому событию, добавляем его в список
        const openedEventElement = document.querySelector(
          '.event-item[style*="display: block"]'
        );
        if (openedEventElement) {
          const eventId = openedEventElement.getAttribute("data-event-id");
          if (eventId === comment.eventId) {
            addEventComment(eventId, comment);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing WebSocket message:", error);
  }
};

// Добавляем обработчик для кнопки закрытия
document
  .getElementById("closeNotificationButton")
  .addEventListener("click", function () {
    document.getElementById("newCommentNotification").classList.remove("show");
  });

///////////////////////////////////////////////////////

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", function () {
  // Проверка авторизации
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) {
    window.location.href = "loginUser.html";
    return;
  }

  // Отображение информации о пользователе
  //displayUserInfo();

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
    .addEventListener("click", () => showEventModal(null));
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

  // Обработчик для столов
  const tablesSelect = document.getElementById("tablesNeeded");
  const tablesOptions = document.querySelector(".tables-options");

  if (tablesSelect && tablesOptions) {
    // Устанавливаем начальное состояние
    tablesOptions.classList.add("hidden");

    tablesSelect.addEventListener("change", function () {
      console.log("Tables select changed:", this.value);
      if (this.value === "yes") {
        tablesOptions.classList.remove("hidden");
      } else {
        tablesOptions.classList.add("hidden");
        // Сбрасываем значения
        document
          .querySelectorAll('.table-type input[type="number"]')
          .forEach((input) => {
            input.value = "";
            input.disabled = true;
          });
        document
          .querySelectorAll('.table-type input[type="checkbox"]')
          .forEach((checkbox) => {
            checkbox.checked = false;
          });
        document.getElementById("tableclothColor").value = "";
      }
    });

    // Обработчики для чекбоксов столов
    document
      .querySelectorAll('.table-type input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.addEventListener("change", function () {
          const numberInput = this.parentElement.querySelector(
            'input[type="number"]'
          );
          if (numberInput) {
            numberInput.disabled = !this.checked;
            if (!this.checked) {
              numberInput.value = "";
            }
          }
        });
      });

    // Обработчик для выбора цвета скатерти
    const tableclothColorSelect = document.getElementById("tableclothColor");
    if (tableclothColorSelect) {
      tableclothColorSelect.addEventListener("change", function () {
        const selectedColor = this.value;
        if (selectedColor) {
          if (selectedColor === "white") {
            // Для белого цвета используем серый фон и темный текст
            this.style.color = "#333";
            this.style.backgroundColor = "#e6e6e6";
          } else {
            // Для других цветов используем цвет текста и фона с прозрачностью
            this.style.color = selectedColor;
            this.style.backgroundColor = selectedColor + "20";
          }
          this.style.fontWeight = "bold";
        } else {
          this.style.color = "";
          this.style.backgroundColor = "";
          this.style.fontWeight = "";
        }
      });

      // Применяем стиль сразу, если цвет уже выбран
      if (tableclothColorSelect.value) {
        const selectedColor = tableclothColorSelect.value;
        tableclothColorSelect.style.color = selectedColor;
        tableclothColorSelect.style.backgroundColor = selectedColor + "20";
        tableclothColorSelect.style.fontWeight = "bold";
      }
    }
  }

  // Обработчик для стульев
  const chairsSelect = document.getElementById("chairsNeeded");
  const chairsInput = document.querySelector(".chairs-input");

  if (chairsSelect && chairsInput) {
    // Устанавливаем начальное состояние
    chairsInput.classList.add("hidden");

    chairsSelect.addEventListener("change", function () {
      console.log("Chairs select changed:", this.value);
      if (this.value === "yes") {
        chairsInput.classList.remove("hidden");
        chairsInput.querySelector('input[type="number"]').disabled = false;
      } else {
        chairsInput.classList.add("hidden");
        const numberInput = chairsInput.querySelector('input[type="number"]');
        if (numberInput) {
          numberInput.disabled = true;
          numberInput.value = "";
        }
      }
    });
  }
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

    // Проверяем, является ли этот день текущим
    const today = new Date();
    if (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    ) {
      dayElement.classList.add("current-day");
    }

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
    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem("currentUser")) || {};

    // Create the request with user information
    const response = await fetch("php/events.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getEvents",
        userId: currentUser.id || "",
        userFullName: currentUser.fullName || "",
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
function showEventModal(event) {
  const modal = document.getElementById("eventModal");
  modal.style.display = "block";

  // Get the form
  const form = document.getElementById("eventForm");
  const isEditing = !!event && typeof event === "object";

  if (isEditing) {
    // We're editing an existing event
    // Update the modal title
    const modalTitle = modal.querySelector("h2");
    if (modalTitle) {
      modalTitle.textContent = "Edit Event";
    }

    // Update the submit button text
    const submitButton = form.querySelector(".submit-btn");
    if (submitButton) {
      submitButton.textContent = "Save Changes";
    }

    // Set the event ID in the form dataset
    form.dataset.eventId = event.id;

    // Fill in the form fields with the event data
    form.querySelector("#eventName").value = event.name || "";
    form.querySelector("#eventStartDate").value = event.startDate || "";
    form.querySelector("#eventStartTime").value = event.startTime || "";
    form.querySelector("#setupDate").value = event.setupDate || "";
    form.querySelector("#setupTime").value = event.setupTime || "";
    form.querySelector("#endDate").value = event.endDate || "";
    form.querySelector("#endTime").value = event.endTime || "";
    form.querySelector("#eventLocation").value = event.location || "";
    form.querySelector("#eventContact").value = event.contact || "";
    form.querySelector("#eventEmail").value = event.email || "";
    form.querySelector("#eventPhone").value = event.phone || "";
    form.querySelector("#alcuinContact").value = event.alcuinContact || "";
    form.querySelector("#attendees").value = event.attendees || "";

    // Handle tables
    form.querySelector("#tablesNeeded").value = event.tables_needed || "no";
    if (event.tables_needed === "yes") {
      document.querySelector(".tables-options").classList.remove("hidden");

      // 6ft tables
      const tables6ftCheckbox = form.querySelector(
        '[name="tables6ft_enabled"]'
      );
      const tables6ftInput = form.querySelector('[name="tables6ft"]');
      if (event.tables6ft === "yes") {
        tables6ftCheckbox.checked = true;
        tables6ftInput.disabled = false;
        tables6ftInput.value = event.tables6ftCount || 0;
      }

      // 8ft tables
      const tables8ftCheckbox = form.querySelector(
        '[name="tables8ft_enabled"]'
      );
      const tables8ftInput = form.querySelector('[name="tables8ft"]');
      if (event.tables8ft === "yes") {
        tables8ftCheckbox.checked = true;
        tables8ftInput.disabled = false;
        tables8ftInput.value = event.tables8ftCount || 0;
      }

      // Round tables
      const tablesRoundCheckbox = form.querySelector(
        '[name="tablesRound_enabled"]'
      );
      const tablesRoundInput = form.querySelector('[name="tablesRound"]');
      if (event.tablesRound === "yes") {
        tablesRoundCheckbox.checked = true;
        tablesRoundInput.disabled = false;
        tablesRoundInput.value = event.tablesRoundCount || 0;
      }

      // Tablecloth color
      const tableclothColorSelect = form.querySelector("#tableclothColor");
      tableclothColorSelect.value = event.tablecloth_color || "";

      // Применяем стиль к выбранному цвету скатерти
      if (event.tablecloth_color) {
        if (event.tablecloth_color === "white") {
          // Для белого цвета используем серый фон и темный текст
          tableclothColorSelect.style.color = "#333";
          tableclothColorSelect.style.backgroundColor = "#e6e6e6";
        } else {
          // Для других цветов используем цвет текста и фона с прозрачностью
          tableclothColorSelect.style.color = event.tablecloth_color;
          tableclothColorSelect.style.backgroundColor =
            event.tablecloth_color + "20";
        }
        tableclothColorSelect.style.fontWeight = "bold";
      }
    }

    // Handle chairs
    form.querySelector("#chairsNeeded").value = event.chairs_needed || "no";
    if (event.chairs_needed === "yes") {
      document.querySelector(".chairs-input").classList.remove("hidden");
      const chairsInput = form.querySelector("#chairs");
      chairsInput.disabled = false;
      chairsInput.value = event.chairs_count || 0;
    }

    // Equipment
    form.querySelector("#podiumNeeded").value = event.podium || "no";
    form.querySelector("#monitorsNeeded").value = event.monitors || "no";
    form.querySelector("#laptopNeeded").value = event.laptop || "no";
    form.querySelector("#ipadNeeded").value = event.ipad || "no";
    form.querySelector("#microphonesNeeded").value = event.microphones || "no";
    form.querySelector("#speakerNeeded").value = event.speaker || "no";
    form.querySelector("#avAssistance").value = event.avAssistance || "no";
    form.querySelector("#securityNeeded").value = event.security || "no";
    form.querySelector("#buildingAccess").value = event.buildingAccess
      ? "yes"
      : "no";
    form.querySelector("#otherConsiderations").value =
      event.otherConsiderations || "";

    // If there are uploaded images, display them
    if (event.setupImages && event.setupImages !== "[]") {
      try {
        const setupImages = JSON.parse(event.setupImages);
        if (Array.isArray(setupImages) && setupImages.length > 0) {
          const fileUploadBox = document.querySelector(".file-upload-box");
          if (fileUploadBox) {
            // Create or get existing container for previews
            let previewContainer = fileUploadBox.querySelector(
              ".image-preview-container"
            );
            if (!previewContainer) {
              previewContainer = document.createElement("div");
              previewContainer.className = "image-preview-container";
              fileUploadBox.appendChild(previewContainer);
            }

            // Add existing images as previews
            setupImages.forEach((image) => {
              if (typeof image === "string") {
                const preview = document.createElement("div");
                preview.className = "image-preview";
                preview.innerHTML = `
                  <img src="uploads/mini/${image}" alt="Preview">
                  <span class="file-name">${image}</span>
                  <button type="button" class="remove-image" onclick="removePreview(this)">×</button>
                  <input type="hidden" name="existing_images[]" value="${image}">
                `;
                previewContainer.appendChild(preview);
              }
            });

            // Update the text
            updateUploadText(previewContainer);
          }
        }
      } catch (e) {
        console.error("Error displaying existing images:", e);
      }
    }
  } else {
    // We're creating a new event
    form.reset();

    // Update the modal title
    const modalTitle = modal.querySelector("h2");
    if (modalTitle) {
      modalTitle.textContent = "Add New Event";
    }

    // Update the submit button text
    const submitButton = form.querySelector(".submit-btn");
    if (submitButton) {
      submitButton.textContent = "Submit Event Request";
    }

    // Clear any existing file previews
    clearFileUpload();
  }

  // Set minimum dates for date inputs
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("eventStartDate").min = today;
  document.getElementById("setupDate").min = today;
  document.getElementById("endDate").min = today;
}

function hideEventModal() {
  const modal = document.getElementById("eventModal");
  modal.style.display = "none";

  // Reset the form and clear the event ID
  const form = document.getElementById("eventForm");
  form.reset();
  delete form.dataset.eventId;

  // Clear any existing file previews
  clearFileUpload();

  // Сбрасываем дополнительные поля и скрываем зависимые секции
  document.querySelector(".tables-options")?.classList.add("hidden");
  document.querySelector(".chairs-input")?.classList.add("hidden");
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
async function handleEventSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData();

  // Check if we're editing or creating
  const eventId = form.dataset.eventId;
  const isEditing = !!eventId;

  // Set the appropriate action
  formData.append("action", isEditing ? "updateEvent" : "createEvent");
  if (isEditing) {
    formData.append("eventId", eventId);
  }

  // Базовые данные события
  formData.append("eventName", form.querySelector("#eventName").value);
  formData.append(
    "eventStartDate",
    form.querySelector("#eventStartDate").value
  );
  formData.append(
    "eventStartTime",
    form.querySelector("#eventStartTime").value
  );
  formData.append("setupDate", form.querySelector("#setupDate").value);
  formData.append("setupTime", form.querySelector("#setupTime").value);
  formData.append("endDate", form.querySelector("#endDate").value);
  formData.append("endTime", form.querySelector("#endTime").value);
  formData.append("eventLocation", form.querySelector("#eventLocation").value);
  formData.append("eventContact", form.querySelector("#eventContact").value);
  formData.append("eventEmail", form.querySelector("#eventEmail").value);
  formData.append("eventPhone", form.querySelector("#eventPhone").value);
  formData.append("alcuinContact", form.querySelector("#alcuinContact").value);
  formData.append("attendees", form.querySelector("#attendees").value);

  // Данные о создателе события
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  formData.append("createdBy", currentUser?.fullName || "Unknown");

  // Данные о столах
  formData.append("tablesNeeded", form.querySelector("#tablesNeeded").value);
  if (form.querySelector("#tablesNeeded").value === "yes") {
    // Проверяем каждый тип стола отдельно
    const tables6ftCheckbox = form.querySelector('[name="tables6ft_enabled"]');
    const tables8ftCheckbox = form.querySelector('[name="tables8ft_enabled"]');
    const tablesRoundCheckbox = form.querySelector(
      '[name="tablesRound_enabled"]'
    );

    const tables6ftInput = form.querySelector('[name="tables6ft"]');
    const tables8ftInput = form.querySelector('[name="tables8ft"]');
    const tablesRoundInput = form.querySelector('[name="tablesRound"]');

    // Отправляем "yes" если чекбокс отмечен
    formData.append("tables6ft", tables6ftCheckbox.checked ? "yes" : "no");
    formData.append("tables8ft", tables8ftCheckbox.checked ? "yes" : "no");
    formData.append("tablesRound", tablesRoundCheckbox.checked ? "yes" : "no");

    // Отправляем количество только если чекбокс отмечен
    formData.append(
      "tables6ftCount",
      tables6ftCheckbox.checked ? tables6ftInput.value || "0" : "0"
    );
    formData.append(
      "tables8ftCount",
      tables8ftCheckbox.checked ? tables8ftInput.value || "0" : "0"
    );
    formData.append(
      "tablesRoundCount",
      tablesRoundCheckbox.checked ? tablesRoundInput.value || "0" : "0"
    );
    formData.append(
      "tableclothColor",
      form.querySelector("#tableclothColor").value
    );
  } else {
    formData.append("tables6ft", "no");
    formData.append("tables8ft", "no");
    formData.append("tablesRound", "no");
    formData.append("tables6ftCount", "0");
    formData.append("tables8ftCount", "0");
    formData.append("tablesRoundCount", "0");
    formData.append("tableclothColor", "");
  }

  // Данные о стульях
  formData.append("chairsNeeded", form.querySelector("#chairsNeeded").value);
  if (form.querySelector("#chairsNeeded").value === "yes") {
    const chairsInput = form.querySelector("#chairs");
    formData.append("chairs_count", chairsInput.value || "0");
  } else {
    formData.append("chairs_count", "0");
  }

  // Оборудование
  formData.append("podiumNeeded", form.querySelector("#podiumNeeded").value);
  formData.append(
    "monitorsNeeded",
    form.querySelector("#monitorsNeeded").value
  );
  formData.append("laptopNeeded", form.querySelector("#laptopNeeded").value);
  formData.append("ipadNeeded", form.querySelector("#ipadNeeded").value);
  formData.append(
    "microphonesNeeded",
    form.querySelector("#microphonesNeeded").value
  );
  formData.append("speakerNeeded", form.querySelector("#speakerNeeded").value);
  formData.append("avAssistance", form.querySelector("#avAssistance").value);
  formData.append(
    "securityNeeded",
    form.querySelector("#securityNeeded").value
  );
  formData.append(
    "buildingAccess",
    form.querySelector("#buildingAccess").value
  );
  formData.append(
    "otherConsiderations",
    form.querySelector("#otherConsiderations").value
  );

  // Collect existing images that weren't removed
  const existingImagesInputs = form.querySelectorAll(
    'input[name="existing_images[]"]'
  );
  if (existingImagesInputs.length > 0) {
    const existingImages = Array.from(existingImagesInputs).map(
      (input) => input.value
    );
    formData.append("existingImages", JSON.stringify(existingImages));
  }

  // Обработка новых файлов
  const setupImageFiles = form.querySelector("#setupImage").files;
  if (setupImageFiles.length > 0) {
    for (let i = 0; i < setupImageFiles.length; i++) {
      formData.append("setupImages[]", setupImageFiles[i]);
    }
  }

  try {
    const response = await fetch("events_db.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      clearFileUpload();
      form.reset();
      delete form.dataset.eventId; // Remove event ID from form
      hideEventModal();
      await loadEvents();
      showNotification(
        isEditing ? "Event updated successfully" : "Event created successfully"
      );
    } else {
      throw new Error(data.message || "Failed to process event");
    }
  } catch (error) {
    console.error(
      isEditing ? "Error updating event:" : "Error creating event:",
      error
    );
    showNotification(
      isEditing
        ? "Failed to update event: "
        : "Failed to create event: " + error.message,
      "error"
    );
  }
}

// Функция для отображения уведомлений
function showNotification(message, type = "success", duration = 3000) {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, duration);
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

  try {
    // Используем стандартную функцию из dateUtils для более надежной работы
    if (dateString.includes(":")) {
      // Если строка содержит время (HH:MM:SS), применяем полное форматирование
      // const date = new Date(dateString.replace(/-/g, "/")); // OLD
      // Treat the incoming string as UTC by adding 'Z'
      const date = new Date(dateString.replace(" ", "T") + "Z");
      // return formatDallasDate(date); // Assuming formatDallasDate handles a Date object correctly
      // Replacing formatDallasDate call with explicit formatting for clarity
      return date.toLocaleString("en-US", {
        timeZone: "America/Chicago",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } else {
      // Если строка содержит только дату (YYYY-MM-DD), форматируем только дату
      // Assuming date-only strings are not UTC and should be treated as local/Chicago?
      // If they might represent UTC dates, this part might also need adjustment.
      const date = new Date(dateString.replace(/-/g, "/")); // Keep as is for now, assuming date-only is fine
      return date.toLocaleDateString("en-US", {
        timeZone: "America/Chicago",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  } catch (e) {
    console.error("Error formatting date:", e, dateString);
    return "Date error";
  }
}

// Функция воспроизведения звука при добавлении нового сообщения
function playNewMessageSound() {
  const audio = new Audio("sound/newMessage.mp3");
  audio.volume = 0.45;
  audio.play().catch((error) => {
    console.error("Ошибка при воспроизведении аудио:", error);
  });
}

// Функция для получения URL фото пользователя
async function getUserPhotoUrl(username) {
  try {
    // Пытаемся получить информацию о пользователе из localStorage
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    // Создаем FormData для запроса
    const formData = new FormData();
    formData.append("action", "getUserPhoto");

    // Если запрашиваем фото текущего пользователя
    if (
      !username ||
      (currentUser &&
        (username === currentUser.fullName ||
          username === currentUser.username))
    ) {
      formData.append("role", currentUser.role);

      if (
        currentUser.role === "user" ||
        currentUser.role === "admin" ||
        currentUser.role === "support"
      ) {
        formData.append("email", currentUser.email);
      }
    } else {
      // Если запрашиваем фото другого пользователя, используем имя пользователя
      // По умолчанию считаем, что это обычный пользователь, если не удалось определить
      formData.append("role", "user");
      formData.append("username", username);
    }

    const response = await fetch("php/user-profile.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      const photoFileName = data.photo === "nophoto" ? "user.png" : data.photo;
      // Определяем путь к фото в зависимости от роли
      let photoPath;

      if (
        formData.get("role") === "user" ||
        formData.get("role") === "admin" ||
        formData.get("role") === "support"
      ) {
        photoPath = `/Maintenance_P/users/img/${photoFileName}`;
      } else {
        photoPath = `/Maintenance_P/maintenance_staff/img/${photoFileName}`;
      }

      return photoPath;
    } else {
      console.error("Ошибка получения фото:", data.message);
      return `/Maintenance_P/users/img/user.png`;
    }
  } catch (error) {
    console.error("Ошибка получения фото:", error);
    return `/Maintenance_P/users/img/user.png`;
  }
}

// Функция форматирования даты создания события
function formatCreationDate(dateTimeString) {
  if (!dateTimeString) return "Unknown date";

  try {
    // Используем стандартную функцию из dateUtils для более надежной работы
    return formatDallasDate(new Date(dateTimeString.replace(/-/g, "/")));
  } catch (e) {
    console.error("Error formatting creation date:", e, dateTimeString);
    return "Date error";
  }
}

// Обновляем функцию проверки статуса
function canChangeStatus(event, newStatus) {
  // Правила зависимостей между статусами:
  // 1. Approved approval → можно выбрать Pending или Cancelled
  // 2. После завершения события можно выбрать Completed (только если approval = Approved)

  // Если статус одобрения "rejected", разрешаем установить только статус "cancelled"
  if (event.approved === "rejected") {
    return newStatus === "cancelled";
  }

  // Если статус не одобрен, нельзя менять статус события
  if (event.approved !== "approved") {
    return false;
  }

  // Для "completed" статуса проверяем дату окончания события
  if (newStatus === "completed") {
    try {
      // Используем форматирование для ввода из dateUtils
      const dateStr = event.endDate;
      const timeStr = event.endTime || "23:59";

      // Создаем ISO строку в формате YYYY-MM-DDTHH:MM
      const endDateTimeStr = `${dateStr}T${timeStr}`;

      // Создаем объект Date
      const endDate = new Date(endDateTimeStr);

      // Убедимся, что дата валидная
      if (isNaN(endDate.getTime())) {
        console.error("Invalid end date or time:", endDateTimeStr);
        return false;
      }

      const now = new Date();
      console.log("Event end date check:", {
        eventName: event.name,
        endDate: endDate.toISOString(),
        now: now.toISOString(),
        canComplete: now >= endDate,
      });

      // Разрешаем установку статуса "completed" если текущее время после времени окончания
      return now >= endDate;
    } catch (error) {
      console.error("Error checking end date:", error);
      return false; // При ошибке парсинга не разрешаем изменение
    }
  }

  // Для других статусов (pending, cancelled) при approval = approved
  return true;
}

// Обновляем функцию создания галереи изображений
function createImageGallery(images) {
  if (!images || images === "[]") return "";

  try {
    const imageUrls = JSON.parse(images);
    console.log("Creating image gallery:", {
      rawImages: images,
      parsedUrls: imageUrls,
    });

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      console.log("No valid images found");
      return "";
    }

    const flatImageUrls = imageUrls
      .flat()
      .filter((url) => url && typeof url === "string");

    if (flatImageUrls.length === 0) {
      console.log("No valid image URLs after flattening");
      return "";
    }

    return `
      <div class="event-images">
        ${flatImageUrls
          .map((image) => {
            // Используем относительные пути к изображениям
            const miniPath = `uploads/mini/${image}`;
            const fullPath = `uploads/${image}`;

            console.log("Processing image:", {
              original: image,
              miniPath,
              fullPath,
            });

            return `
            <div class="image-thumbnail">
              <img src="${miniPath}" 
                data-full="${fullPath}"
                onerror="handleImageError(this)"
                onclick="showFullImage(this)"
                alt="Event setup"
                loading="lazy"
                class="event-image">
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  } catch (e) {
    console.error("Error creating image gallery:", e);
    return "";
  }
}

// Обновленная функция обработки ошибок загрузки
function handleImageError(img) {
  const originalSrc = img.src;
  const fullSrc = img.dataset.full;

  console.log("Image load error:", {
    originalSrc,
    fullSrc,
    isMiniature: originalSrc.includes("/mini/"),
  });

  if (originalSrc.includes("/mini/")) {
    img.src = fullSrc;
    img.classList.add("fallback-image");

    // Добавляем обработчик для проверки загрузки оригинального изображения
    img.onload = () => {
      console.log("Original image loaded successfully:", fullSrc);
      img.classList.remove("loading");
    };

    img.onerror = () => {
      console.error("Failed to load both miniature and original image");
      img.classList.add("error");
    };

    img.classList.add("loading");
  } else {
    img.classList.add("error");
  }
}

// Обновляем функцию для показа полноразмерного изображения
function showFullImage(imgElement) {
  // Создаем модальное окно
  const modal = document.createElement("div");
  modal.className = "image-modal";

  // Создаем изображение
  const img = document.createElement("img");
  img.src = imgElement.dataset.full;
  img.alt = "Full size image";

  // Добавляем обработчик для закрытия по клику вне изображения
  modal.onclick = function (e) {
    if (e.target === modal) {
      modal.style.opacity = "0";
      setTimeout(() => modal.remove(), 300);
    }
  };

  // Добавляем кнопку закрытия
  const closeButton = document.createElement("button");
  closeButton.className = "modal-close";
  closeButton.innerHTML = "×";
  closeButton.onclick = () => {
    modal.style.opacity = "0";
    setTimeout(() => modal.remove(), 300);
  };

  // Добавляем информацию об изображении
  const imageCaption = document.createElement("div");
  const filename = imgElement.dataset.full.split("/").pop();
  imageCaption.className = "image-caption";
  imageCaption.textContent = filename;

  // Собираем модальное окно
  modal.appendChild(img);
  modal.appendChild(closeButton);
  modal.appendChild(imageCaption);
  document.body.appendChild(modal);

  // Добавляем класс для анимации появления
  setTimeout(() => modal.classList.add("show"), 10);

  // Предотвращаем прокрутку страницы при открытом модальном окне
  document.body.style.overflow = "hidden";

  // Восстанавливаем прокрутку при закрытии
  const restoreScroll = () => {
    document.body.style.overflow = "";
  };

  closeButton.addEventListener("click", restoreScroll);
  modal.addEventListener("transitionend", function (e) {
    if (e.propertyName === "opacity" && modal.style.opacity === "0") {
      restoreScroll();
    }
  });
}

// Обновляем функцию createEventElement, убирая секцию Event Setup Images из детальной информации
function createEventElement(event) {
  const eventElement = document.createElement("div");
  eventElement.className = "event-item";
  eventElement.setAttribute("data-event-id", event.id);

  // Преобразуем строку setupImages в массив
  let setupImages = [];
  try {
    setupImages = event.setupImages ? JSON.parse(event.setupImages) : [];
  } catch (e) {
    console.error("Error parsing setupImages:", e);
    setupImages = [];
  }

  // Базовая информация о событии
  const imageGallery = createImageGallery(event.setupImages);

  // Формируем информацию о столах и стульях
  let tablesAndChairsHtml = "";

  // Информация о столах
  if (event.tables_needed === "yes") {
    let tablesInfo = [];

    if (event.tables6ft === "yes" && parseInt(event.tables6ftCount) > 0) {
      tablesInfo.push(
        `<div>6ft Tables: <span class="count-value">${event.tables6ftCount}</span></div>`
      );
    }
    if (event.tables8ft === "yes" && parseInt(event.tables8ftCount) > 0) {
      tablesInfo.push(
        `<div>8ft Tables: <span class="count-value">${event.tables8ftCount}</span></div>`
      );
    }
    if (event.tablesRound === "yes" && parseInt(event.tablesRoundCount) > 0) {
      tablesInfo.push(
        `<div>Round Tables: <span class="count-value">${event.tablesRoundCount}</span></div>`
      );
    }

    if (tablesInfo.length > 0) {
      tablesAndChairsHtml += `
            <div class="equipment-item">
                <div class="equipment-label">Tables:</div>
                <div class="equipment-value tables-list">
                    ${tablesInfo.join("")}
                </div>
            </div>`;
    }

    // Добавляем информацию о скатерти, если она указана
    if (event.tablecloth_color) {
      const colorStyle =
        event.tablecloth_color === "white"
          ? `color: #333; background-color: #e6e6e6;`
          : `color: ${event.tablecloth_color}; background-color: ${event.tablecloth_color}20;`;

      tablesAndChairsHtml += `
            <div class="equipment-item">
                <span class="equipment-label">Tablecloth:</span>
                <span class="equipment-value color-value" style="${colorStyle}">${event.tablecloth_color}</span>
            </div>`;
    }
  }

  // Информация о стульях
  if (event.chairs_needed === "yes" && parseInt(event.chairs_count) > 0) {
    tablesAndChairsHtml += `
        <div class="equipment-item">
            <span class="equipment-label">Chairs:</span>
            <span class="equipment-value">${event.chairs_count}</span>
        </div>`;
  }

  // Добавляем отладочную информацию
  console.log("Event data:", {
    tables_needed: event.tables_needed,
    tables6ft: event.tables6ft,
    tables8ft: event.tables8ft,
    tablesRound: event.tablesRound,
    tables6ftCount: event.tables6ftCount,
    tables8ftCount: event.tables8ftCount,
    tablesRoundCount: event.tablesRoundCount,
    tablecloth_color: event.tablecloth_color,
    chairs_needed: event.chairs_needed,
    chairs_count: event.chairs_count,
  });

  const basicInfo = `
    <div class="event-preview">
      <div class="event-header">
        <h3>${event.name}</h3>
        <div class="event-meta-container">
          <div class="event-date">${formatDate(event.startDate)}</div>
          <div class="event-status">
            <select class="status-select" 
                    onchange="updateEventStatus(${event.id}, this.value)" 
                    data-event-id="${event.id}"
                    data-status="${event.status || "pending"}"
                    ${event.approved !== "approved" ? "disabled" : ""}>
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
      <div class="event-approval">
        <div class="approval-label">Approval Status:</div>
        <div class="approval-control">
          <select class="approval-select" 
                  onchange="updateEventApproval(${event.id}, this.value)"
                  data-approval-id="${event.id}"
                  data-approved="${event.approved || "pending"}">
            <option value="pending" ${
              event.approved === "pending" || !event.approved ? "selected" : ""
            }>Pending</option>
            <option value="approved" ${
              event.approved === "approved" ? "selected" : ""
            }>Approved</option>
            <option value="rejected" ${
              event.approved === "rejected" ? "selected" : ""
            }>Rejected</option>
          </select>
        </div>
        ${
          event.approvedBy && event.approved === "approved"
            ? `<div class="approval-info">Approved by ${event.approvedBy}</div>`
            : ""
        }
        ${
          event.approvedBy && event.approved === "rejected"
            ? `<div class="approval-info">Rejected by ${event.approvedBy}</div>`
            : ""
        }
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
      ${imageGallery}
    </div>
  `;

  // Детальная информация о событии (убираем секцию с изображениями)
  const detailedInfo = `
    <div class="event-details hidden">
        <div class="details-section">
            <h5>Setup Details</h5>
            <p><strong>Setup Date:</strong> ${formatDate(event.setupDate)}</p>
            <p><strong>Setup Time:</strong> ${event.setupTime || "Not set"}</p>
            <p><strong>Created by:</strong> ${event.createdBy || "Unknown"}</p>
            <p><strong>Creation date:</strong> ${formatCreationDate(
              event.createdAt
            )}</p>
        </div>

        <div class="details-section">
            <h5>Equipment Needed</h5>
            <div class="equipment-grid">
                ${tablesAndChairsHtml}
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
                        .map((comment) => {
                          // Получаем текущего пользователя
                          const currentUser = JSON.parse(
                            localStorage.getItem("currentUser")
                          );
                          // Проверяем, является ли автор комментария текущим пользователем
                          const isAuthor =
                            currentUser &&
                            currentUser.fullName === comment.author;

                          // Используем userPhotoUrl из комментария, если доступно
                          const userPhotoUrl =
                            comment.userPhotoUrl ||
                            `/Maintenance_P/users/img/user.png`;

                          return `
                            <div class="comment-item" data-comment-id="${
                              comment.id
                            }">
                                <div class="comment-header">
                                    <div class="comment-author-container">
                                        <img class="comment-user-photo" src="${userPhotoUrl}" alt="${
                            comment.author
                          }" onerror="this.src='/Maintenance_P/users/img/user.png';">
                                        <span class="comment-author">${
                                          comment.author
                                        }</span>
                                    </div>
                                    <span class="comment-date">${formatDate(
                                      comment.date
                                    )}</span>
                                    ${
                                      isAuthor
                                        ? `
                                    <div class="comment-actions">
                                        <button class="comment-edit" onclick="editComment(event, '${event.id}', '${comment.id}')">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="comment-delete" onclick="deleteComment(event, '${event.id}', '${comment.id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                    `
                                        : ""
                                    }
                                </div>
                                <div class="comment-text">${comment.text}</div>
                            </div>
                        `;
                        })
                        .join("")
                    : ""
                }
            </div>
            <form class="comment-form" onsubmit="addComment(event, '${
              event.id
            }'); return false;">
                <input type="text" class="comment-input" placeholder="Add a comment..." required>
                <button type="submit" class="comment-submit">Send</button>
            </form>
        </div>

        <div class="event-actions">
            <button class="event-btn print-btn" onclick="printEvent(${
              event.id
            })">
                <i class="fas fa-print"></i> Print
            </button>
            <button class="event-btn email-btn" onclick="emailEvent(${
              event.id
            })">
                <i class="fas fa-envelope"></i> Email
            </button>
            <button class="event-btn edit-btn" onclick="editEvent(${event.id})">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="event-btn delete-btn" onclick="deleteEvent(${
              event.id
            })">
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

  // Находим контейнер деталей
  const details = eventElement.querySelector(".event-details");

  // Добавляем обработчик клика
  toggleButton.onclick = () => {
    details.classList.toggle("hidden");
    toggleButton.textContent = details.classList.contains("hidden")
      ? "Show Details"
      : "Hide Details";
    toggleButton.classList.toggle("active");
  };

  // Добавляем кнопку в превью события
  eventElement.querySelector(".event-preview").appendChild(toggleButton);

  // Set the correct data attribute on the approval select
  const approvalSelect = eventElement.querySelector(".approval-select");
  if (approvalSelect) {
    approvalSelect.setAttribute("data-approved", event.approved || "pending");

    // Hide the approval dropdown for non-admin users
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || currentUser.role !== "admin") {
      const approvalControl = eventElement.querySelector(".approval-control");
      const approvalLabel = eventElement.querySelector(".approval-label");

      if (approvalControl) {
        // Create a status badge instead of dropdown
        const approvalBadge = document.createElement("div");
        approvalBadge.className = `approval-badge ${
          event.approved || "pending"
        }`;
        approvalBadge.textContent = event.approved
          ? event.approved.charAt(0).toUpperCase() + event.approved.slice(1)
          : "Pending";

        // Replace the select with the badge
        approvalControl.innerHTML = "";
        approvalControl.appendChild(approvalBadge);

        // Update label
        if (approvalLabel) {
          approvalLabel.textContent = "Status:";
        }
      }
    }
  }

  // Disable status options if not approved
  if (event.approved !== "approved") {
    const statusSelect = eventElement.querySelector(".status-select");
    if (statusSelect) {
      const options = statusSelect.querySelectorAll("option");
      options.forEach((option) => {
        if (option.value !== event.status) {
          option.disabled = true;
        }
      });
    }
  }

  return eventElement;
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
async function addComment(event, eventId) {
  event.preventDefault();
  const form = event.target;
  const commentInput = form.querySelector(".comment-input");
  const commentText = commentInput.value.trim();

  if (!commentText) return;

  try {
    // Получаем текущего пользователя
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) {
      showNotification("You need to be logged in to add comments", "error");
      return;
    }

    const author = currentUser.fullName
      ? currentUser.fullName
      : currentUser.username;

    // Форматируем дату для передачи на сервер
    const now = new Date();
    // Используем формат MySQL для сервера
    const serverDateStr = now.toISOString().slice(0, 19).replace("T", " ");
    // Сохраняем исходную дату для локального форматирования
    const localDate = now;

    // Получаем URL фотографии пользователя
    const userPhotoUrl = await getUserPhotoUrl(author);

    // Создаем объект с данными комментария
    const commentData = {
      eventId: eventId,
      text: commentText,
      author: author,
      date: serverDateStr,
      userPhotoUrl: userPhotoUrl, // Добавляем URL фото
    };

    // Отправляем запрос на сервер
    const formData = new FormData();
    formData.append("action", "addComment");
    formData.append("commentData", JSON.stringify(commentData));

    const response = await fetch("events_db.php", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Failed to add comment");
    }
    console.log("Comment added successfully");
    console.log(commentData);
    commentData.action = "addEventComment";
    commentData.eventDate = document.querySelector(".event-date").textContent;
    eventsWS.send(JSON.stringify(commentData));

    // Находим событие в массиве
    const currentEvent = events.find((e) => String(e.id) === String(eventId));
    if (!currentEvent) throw new Error("Event not found");

    // Добавляем комментарий в массив комментариев события
    if (!currentEvent.comments) {
      currentEvent.comments = [];
    }

    const newComment = {
      id: result.commentId,
      text: commentText,
      author: author,
      date: serverDateStr,
      userPhotoUrl: userPhotoUrl,
    };

    currentEvent.comments.push(newComment);

    // Очищаем поле ввода
    commentInput.value = "";

    // Обновляем отображение комментариев в DOM
    const eventElement = document.querySelector(
      `.event-item[data-event-id="${eventId}"]`
    );

    if (eventElement) {
      const commentsList = eventElement.querySelector(".comments-list");

      if (commentsList) {
        // Используем форматированную дату напрямую, а не через formatDate
        const formattedDate = localDate.toLocaleString("en-US", {
          timeZone: "America/Chicago",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        // Создаем элемент нового комментария
        const commentElement = document.createElement("div");
        commentElement.className = "comment-item";
        commentElement.setAttribute("data-comment-id", result.commentId);
        commentElement.innerHTML = `
          <div class="comment-header">
            <div class="comment-author-container">
              <img class="comment-user-photo" src="${userPhotoUrl}" alt="${author}" onerror="this.src='/Maintenance_P/users/img/user.png';">
              <span class="comment-author">${author}</span>
            </div>
            <span class="comment-date">${formattedDate}</span>
            <div class="comment-actions">
              <button class="comment-edit" onclick="editComment(event, '${eventId}', '${result.commentId}')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="comment-delete" onclick="deleteComment(event, '${eventId}', '${result.commentId}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="comment-text">${commentText}</div>
        `;

        // Добавляем комментарий в список
        commentsList.appendChild(commentElement);

        // Прокручиваем к новому комментарию
        commentsList.scrollTop = commentsList.scrollHeight;

        // Воспроизведем звук нового сообщения, если есть функция
        if (typeof playNewMessageSound === "function") {
          playNewMessageSound();
        }
      }
    }

    showNotification("Comment added successfully");
  } catch (error) {
    console.error("Error adding comment:", error);
    showNotification("Failed to add comment: " + error.message, "error");
  }
}

function setupFileUpload() {
  const fileUploadBox = document.querySelector(".file-upload-box");
  const fileInput = document.querySelector("#setupImage");

  if (!fileUploadBox || !fileInput) {
    console.warn("File upload elements not found");
    return;
  }

  // Делаем элемент кликабельным только для области текста
  const uploadText = fileUploadBox.querySelector(".file-upload-text");
  const uploadHint = fileUploadBox.querySelector(".file-upload-hint");

  if (uploadText && uploadHint) {
    uploadText.addEventListener("click", () => {
      fileInput.click();
    });
    uploadHint.addEventListener("click", () => {
      fileInput.click();
    });
  }

  // Обработка drag & drop
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    fileUploadBox.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Визуальная обратная связь при перетаскивании
  ["dragenter", "dragover"].forEach((eventName) => {
    fileUploadBox.addEventListener(eventName, () => {
      fileUploadBox.classList.add("highlight");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    fileUploadBox.addEventListener(eventName, () => {
      fileUploadBox.classList.remove("highlight");
    });
  });

  // Обработка сброса файлов
  fileUploadBox.addEventListener("drop", handleDrop);
  fileInput.addEventListener("change", handleFiles);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles({ target: { files } });
  }

  function handleFiles(e) {
    const files = [...e.target.files];
    console.log("Selected files:", files);

    // Проверяем, что это изображения
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length !== files.length) {
      alert("Please upload only image files");
      return;
    }

    // Создаем или получаем существующий контейнер для превью
    let previewContainer = fileUploadBox.querySelector(
      ".image-preview-container"
    );
    if (!previewContainer) {
      previewContainer = document.createElement("div");
      previewContainer.className = "image-preview-container";
      fileUploadBox.appendChild(previewContainer);
    }

    // Добавляем новые превью к существующим
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        const preview = document.createElement("div");
        preview.className = "image-preview";
        preview.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <span class="file-name">${file.name}</span>
          <button type="button" class="remove-image" onclick="removePreview(this)">×</button>
        `;
        previewContainer.appendChild(preview);
      };
      reader.readAsDataURL(file);
    });

    // Обновляем текст
    updateUploadText(previewContainer);
  }
}

// Функция обновления текста загрузки
function updateUploadText(container) {
  const fileUploadText = document.querySelector(".file-upload-text");
  if (fileUploadText) {
    const count = container.querySelectorAll(".image-preview").length;
    fileUploadText.textContent =
      count > 0 ? `${count} file(s) selected` : "Select files...";
  }
}

// Функция удаления превью
function removePreview(button) {
  const preview = button.parentElement;
  const container = preview.parentElement;
  preview.remove();
  updateUploadText(container);
}

// Добавляем новую функцию для очистки загруженных файлов
function clearFileUpload() {
  // Очищаем input file
  const fileInput = document.querySelector("#setupImage");
  if (fileInput) {
    fileInput.value = "";
  }

  // Очищаем контейнер превью
  const previewContainer = document.querySelector(".image-preview-container");
  if (previewContainer) {
    previewContainer.innerHTML = "";
  }

  // Сбрасываем текст
  const fileUploadText = document.querySelector(".file-upload-text");
  if (fileUploadText) {
    fileUploadText.textContent = "Select files...";
  }
}

// Функция для обновления статуса события на сервере
async function updateEventStatus(eventId, newStatus, skipCheck = false) {
  try {
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Проверяем разрешение на изменение статуса, если не установлен skipCheck
    if (!skipCheck && !canChangeStatus(event, newStatus)) {
      alert(
        "You cannot change the status for this event based on current approval status."
      );
      // Сбрасываем выбор к предыдущему значению
      const statusSelect = document.querySelector(
        `select[data-event-id="${eventId}"]`
      );
      if (statusSelect) {
        statusSelect.value = event.status || "pending";
      }
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) {
      window.location.href = "loginUser.html";
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
        updatedBy: currentUser.fullName,
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }

    // Обновляем локальное состояние
    event.status = newStatus;
    event.updatedBy = currentUser.fullName;
    event.updatedAt = new Date().toISOString();

    // Обновляем UI
    const statusSelect = document.querySelector(
      `select[data-event-id="${eventId}"]`
    );
    if (statusSelect) {
      statusSelect.value = newStatus;
      statusSelect.setAttribute("data-status", newStatus);

      // При смене на "completed", проверяем доступность
      if (newStatus === "completed") {
        // Для completed должен быть approval = approved
        if (event.approved !== "approved") {
          alert("Event must be approved to mark as completed.");
          // Сбрасываем выбор к предыдущему значению
          statusSelect.value = "pending";
          event.status = "pending";
          return;
        }
      }
    }

    showNotification(`Event status updated to ${newStatus}`);

    // Перезагружаем события с сервера для обновления всего UI
    if (!skipCheck) {
      await loadEvents();
    }
  } catch (error) {
    console.error("Error updating event status:", error);
    alert("Failed to update event status");

    // Сбрасываем выбор к предыдущему значению
    const statusSelect = document.querySelector(
      `select[data-event-id="${eventId}"]`
    );
    if (statusSelect && event) {
      statusSelect.value = event.status || "pending";
    }
  }
}

async function updateEventApproval(eventId, approvalStatus) {
  try {
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if the current user is authorized to change approval status
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) {
      window.location.href = "loginUser.html";
      return;
    }

    // Only Jana Haigood can change approval status
    if (currentUser.fullName !== "Jana Haigood") {
      alert("Only Jana Haigood can change approval status");

      // Reset approval select to previous value
      const approvalSelect = document.querySelector(
        `select[data-approval-id="${eventId}"]`
      );
      if (approvalSelect) {
        approvalSelect.value = event.approved || "pending";
      }
      return;
    }

    const response = await fetch("events_db.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "updateEventApproval",
        eventId: eventId,
        approved: approvalStatus,
        approvedBy: currentUser.fullName,
        isAdmin: true,
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }

    // Обновляем локальное состояние
    event.approved = approvalStatus;
    event.approvedBy = currentUser.fullName;
    event.approvedAt = new Date().toISOString();

    // Обновляем UI
    const approvalSelect = document.querySelector(
      `select[data-approval-id="${eventId}"]`
    );
    if (approvalSelect) {
      approvalSelect.value = approvalStatus;
      approvalSelect.setAttribute("data-approved", approvalStatus);
    }

    // Update status selects to reflect approval status
    const statusSelect = document.querySelector(
      `select[data-event-id="${eventId}"]`
    );
    if (statusSelect) {
      const options = statusSelect.querySelectorAll("option");

      // Зависимости между статусами:
      let updateStatus = true;
      if (approvalStatus === "pending") {
        // Pending approval → Pending status
        await updateEventStatus(eventId, "pending", true);
      } else if (approvalStatus === "rejected") {
        // Rejected approval → Cancelled status
        await updateEventStatus(eventId, "cancelled", true);
      } else if (approvalStatus === "approved") {
        // Approved approval → Pending status (с возможностью выбрать Cancelled)
        // При изменении статуса на "approved", устанавливаем статус события "pending"
        await updateEventStatus(eventId, "pending", true);

        // Включаем возможность выбора других статусов
        options.forEach((option) => {
          // Для completed проверим доступность на основе времени окончания
          if (option.value === "completed") {
            option.disabled = !canChangeStatus(event, "completed");
          } else {
            option.disabled = false;
          }
        });
      }
    }

    showNotification(`Event approval status updated to ${approvalStatus}`);

    // Перезагружаем события с сервера для обновления всего UI
    await loadEvents();
  } catch (error) {
    console.error("Error updating event approval:", error);
    alert("Failed to update event approval status");
  }
}

async function addEventComment(eventId, comment) {
  try {
    // Находим событие в массиве
    const currentEvent = events.find((e) => String(e.id) === String(eventId));
    if (!currentEvent) throw new Error("Event not found");

    // Добавляем комментарий в массив комментариев события
    if (!currentEvent.comments) {
      currentEvent.comments = [];
    }

    const commentText = comment.text;
    const author = comment.author;
    const serverDateStr = comment.date;
    const userPhotoUrl =
      comment.userPhotoUrl || "/Maintenance_P/users/img/user.png";

    // Создаем объект нового комментария
    const newComment = {
      id: comment.id,
      text: commentText,
      author: author,
      date: serverDateStr,
      userPhotoUrl: userPhotoUrl,
    };

    currentEvent.comments.push(newComment);

    // Обновляем отображение комментариев в DOM
    const eventElement = document.querySelector(
      `.event-item[data-event-id="${eventId}"]`
    );

    if (eventElement) {
      const commentsList = eventElement.querySelector(".comments-list");

      if (commentsList) {
        // Преобразуем серверную дату в локальную
        const localDate = new Date(serverDateStr.replace(" ", "T"));
        // Форматируем дату
        const formattedDate = localDate.toLocaleString("en-US", {
          timeZone: "America/Chicago",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        // Создаем элемент нового комментария
        const commentElement = document.createElement("div");
        commentElement.className = "comment-item";
        commentElement.setAttribute("data-comment-id", comment.id);
        commentElement.innerHTML = `
          <div class="comment-header">
            <div class="comment-author-container">
              <img class="comment-user-photo" src="${userPhotoUrl}" alt="${author}" onerror="this.src='/Maintenance_P/users/img/user.png';">
              <span class="comment-author">${author}</span>
            </div>
            <span class="comment-date">${formattedDate}</span>
            <div class="comment-actions">
              <button class="comment-edit" onclick="editComment(event, '${eventId}', '${comment.id}')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="comment-delete" onclick="deleteComment(event, '${eventId}', '${comment.id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="comment-text">${commentText}</div>
        `;

        // Добавляем комментарий в список
        commentsList.appendChild(commentElement);

        // Прокручиваем к новому комментарию
        commentsList.scrollTop = commentsList.scrollHeight;

        // Воспроизведем звук нового сообщения, если есть функция
        if (typeof playNewMessageSound === "function") {
          playNewMessageSound();
        }
      }
    }
  } catch (error) {
    console.error("Error adding event comment:", error);
  }
}

function editEvent(eventId) {
  const event = events.find((e) => e.id === eventId);
  if (!event) {
    console.error("Event not found:", eventId);
    showNotification("Event not found", "error");
    return;
  }

  // Show modal
  showEventModal(event);
}

async function deleteEvent(eventId) {
  if (!confirm("Are you sure you want to delete this event?")) {
    return;
  }

  try {
    const formData = new FormData();
    formData.append("action", "deleteEvent");
    formData.append("eventId", eventId);

    const response = await fetch("events_db.php", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      await loadEvents(); // Reload events after deletion
      showNotification("Event deleted successfully");
    } else {
      throw new Error(result.message || "Failed to delete event");
    }
  } catch (error) {
    console.error("Error deleting event:", error);
    showNotification("Failed to delete event: " + error.message, "error");
  }
}

function printEvent(eventId) {
  const event = events.find((e) => e.id === eventId);

  if (!event) {
    showNotification("Event not found", "error");
    return;
  }

  // Create a printable version of the event
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Please allow popups for this site to print events");
    return;
  }

  // Parse setup images if available
  let setupImages = [];
  try {
    setupImages = event.setupImages ? JSON.parse(event.setupImages) : [];
    // Flatten the array if necessary
    if (Array.isArray(setupImages)) {
      setupImages = setupImages
        .flat()
        .filter((img) => img && typeof img === "string");
    }
  } catch (e) {
    console.error("Error parsing setup images:", e);
    setupImages = [];
  }

  // Generate tables and chairs information
  let tablesAndChairsInfo = "";
  if (event.tables_needed === "yes") {
    let tablesList = [];
    if (event.tables6ft === "yes" && parseInt(event.tables6ftCount) > 0) {
      tablesList.push(`<li>6ft Tables: ${event.tables6ftCount}</li>`);
    }
    if (event.tables8ft === "yes" && parseInt(event.tables8ftCount) > 0) {
      tablesList.push(`<li>8ft Tables: ${event.tables8ftCount}</li>`);
    }
    if (event.tablesRound === "yes" && parseInt(event.tablesRoundCount) > 0) {
      tablesList.push(`<li>Round Tables: ${event.tablesRoundCount}</li>`);
    }
    if (event.tablecloth_color) {
      tablesList.push(`<li>Tablecloth color: ${event.tablecloth_color}</li>`);
    }

    if (tablesList.length > 0) {
      tablesAndChairsInfo = `
        <div class="equipment-item">
          <h3>Tables:</h3>
          <ul>${tablesList.join("")}</ul>
        </div>
      `;
    }
  }

  // Add chairs to the same section as tables
  if (event.chairs_needed === "yes" && parseInt(event.chairs_count) > 0) {
    tablesAndChairsInfo += `
      <div class="equipment-item">
        <h3>Chairs:</h3>
        <p>${event.chairs_count}</p>
      </div>
    `;
  }

  // Generate equipment information
  let equipmentInfo = "";
  const equipmentItems = [];

  if (event.podium === "yes") equipmentItems.push("<li>Podium</li>");
  if (event.monitors === "yes") equipmentItems.push("<li>Monitors</li>");
  if (event.laptop === "yes") equipmentItems.push("<li>Laptop</li>");
  if (event.ipad === "yes") equipmentItems.push("<li>iPad</li>");
  if (event.microphones === "yes") equipmentItems.push("<li>Microphones</li>");
  if (event.speaker === "yes") equipmentItems.push("<li>Speaker</li>");

  if (equipmentItems.length > 0) {
    equipmentInfo = `
      <div class="equipment-item">
        <h3>Equipment:</h3>
        <ul>${equipmentItems.join("")}</ul>
      </div>
    `;
  }

  // Generate services information
  let servicesInfo = "";
  const servicesItems = [];

  if (event.avAssistance === "yes")
    servicesItems.push("<li>A/V Assistance</li>");
  if (event.security === "yes") servicesItems.push("<li>Security</li>");
  if (event.buildingAccess) servicesItems.push("<li>Building Access</li>");

  if (servicesItems.length > 0) {
    servicesInfo = `
      <div class="equipment-item">
        <h3>Services Required:</h3>
        <ul>${servicesItems.join("")}</ul>
      </div>
    `;
  }

  // Если есть комментарии, форматируем их
  let commentsSection = "";
  if (event.comments && event.comments.length > 0) {
    const commentsHtml = event.comments
      .map(
        (comment) => `
        <div class="comment">
          <div class="comment-header">
            <span class="comment-author">${comment.author}</span>
            <span class="comment-date">${formatDate(comment.date)}</span>
          </div>
          <div class="comment-text">${comment.text}</div>
        </div>
      `
      )
      .join("");

    commentsSection = `
      <div class="section comments">
        <h2>Comments</h2>
        <div class="comments-container">
          ${commentsHtml}
        </div>
      </div>
    `;
  }

  // Generate images section if there are any
  let imagesSection = "";
  if (setupImages.length > 0) {
    imagesSection = `
      <div class="page-break"></div>
      <div class="image-page">
        <h1>Event Setup Images</h1>
        <div class="images-container">
          ${setupImages
            .map(
              (image, index) => `
            <div class="image-item">
              <img src="uploads/${image}" alt="Event setup image ${index + 1}">
              <p class="image-caption">Setup reference: ${image}</p>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  // Generate print content with improved layout
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Event: ${event.name}</title>
      <meta charset="UTF-8">
      <style>
        @media print {
          body { margin: 0; padding: 0; }
          .page-break { page-break-before: always; }
          .no-print { display: none; }
          @page {
            size: A4;
            margin: 0.4cm;
          }
          .image-page {
            page-break-before: always;
            height: 100vh;
            width: 100%;
            box-sizing: border-box;
          }
          .image-item {
            page-break-after: always;
            height: 90vh;
            display: flex;
            flex-direction: column;
          }
          .image-item img {
            max-height: 82vh;
            object-fit: contain;
          }
        }
        
        * {
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          margin: 0; 
          padding: 0;
          line-height: 1.4;
          color: #333;
          background-color: #f9f9f9;
          font-size: 11pt;
        }
        
        .main-container {
          max-width: 210mm;
          margin: 0 auto;
          background-color: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          padding: 0.8rem;
          border-radius: 5px;
        }
        
        h1 { 
          color: #1a4dbe; 
          font-size: 20px;
          border-bottom: 2px solid #1a4dbe;
          padding-bottom: 6px;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        h2 { 
          color: #2563eb; 
          font-size: 15px;
          margin: 6px 0 4px 0;
          padding-left: 6px;
          border-left: 4px solid #2563eb;
        }
        
        h3 {
          font-size: 13px;
          margin: 0 0 4px 0;
          color: #1e3a8a;
        }
        
        .event-banner {
          background: linear-gradient(135deg, #1a4dbe, #4e81f4);
          color: white;
          padding: 8px;
          margin-bottom: 5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .event-title {
          font-size: 20px;
          font-weight: bold;
          margin: 0;
        }
        
        .event-date-time {
          text-align: right;
          font-size: 14px;
        }
        
        .status-badges {
          display: flex;
          gap: 8px;
          margin-top: 6px;
        }
        
        .grid-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 5px;
          margin-bottom: 5px;
        }
        
        .section { 
          background-color: white;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          padding: 6px;
          margin-bottom: 5px;
          border: 1px solid #eaeaea;
        }
        
        .info-box {
          background-color: #f8fafc;
          padding: 8px;
          border-radius: 6px;
          margin-bottom: 4px;
          border-left: 3px solid #2563eb;
        }
        
        .label { 
          font-weight: bold; 
          color: #475569;
          min-width: 100px;
        }
        
        .value {
          display: inline-block;
        }
        
        .status-box {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 10px;
          text-transform: uppercase;
        }
        
        .status-yes { 
          background-color: #dcfce7;
          color: #166534; 
        }
        
        .status-no { 
          background-color: #fee2e2;
          color: #991b1b; 
        }
        
        .status-pending {
          background-color: #fef3c7;
          color: #92400e;
        }
        
        .status-completed {
          background-color: #dbeafe;
          color: #1e40af;
        }
        
        .status-cancelled {
          background-color: #fecaca;
          color: #b91c1c;
        }
        
        .status-approved {
          background-color: #d1fae5;
          color: #065f46;
        }
        
        .status-rejected {
          background-color: #fee2e2;
          color: #991b1b;
        }
        
        .equipment-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .equipment-item {
          background-color: #f8fafc;
          padding: 8px;
          border-radius: 6px;
          border-left: 3px solid #2563eb;
          flex: 1 1 auto;
          min-width: 120px;
          max-width: 32%;
        }
        
        .equipment-item h3 {
          margin-top: 0;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 3px;
        }
        
        .equipment-item ul {
          margin: 4px 0;
          padding-left: 16px;
        }
        
        .equipment-item li {
          margin-bottom: 3px;
        }
        
        .comments-container { 
          max-height: 200px;
          overflow-y: auto;
        }
        
        .comment { 
          padding: 8px; 
          background: #f8fafc; 
          margin-bottom: 6px; 
          border-radius: 6px;
          border-left: 3px solid #64748b;
        }
        
        .comment-header { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 3px;
          color: #64748b;
          font-size: 11px;
        }
        
        .comment-author { 
          font-weight: bold;
          color: #334155;
        }
        
        .comment-text {
          white-space: pre-line;
          font-size: 11px;
        }
        
        .images-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .image-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .image-item img {
          max-width: 100%;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .image-caption {
          font-size: 12px;
          color: #64748b;
          margin-top: 8px;
          text-align: center;
        }
        
        .print-footer {
          margin-top: 15px;
          text-align: center;
          font-size: 10px;
          color: #64748b;
          border-top: 1px solid #ddd;
          padding-top: 6px;
        }
        
        .print-button {
          padding: 8px 12px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
        }
        
        .print-button:hover {
          background: #1d4ed8;
        }
        
        .info-row {
          display: flex;
          margin-bottom: 4px;
        }
        
        .additional-info {
          background-color: #eff6ff;
          padding: 8px;
          border-radius: 6px;
          margin-top: 6px;
          border: 1px solid #dbeafe;
          font-size: 11px;
        }
        
        .qr-code {
          text-align: center;
          padding: 8px;
          background: white;
          border-radius: 6px;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: auto;
        }
        
        .qr-code-content {
          font-size: 9px;
          color: #888;
        }

        .compact-layout {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .compact-layout .info-row {
          width: 45%;
          min-width: 200px;
        }
      </style>
    </head>
    <body>
      <div class="main-container">
        <button onclick="window.print();" class="print-button no-print">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Print Event
        </button>
        
        <div class="event-banner">
          <div>
            <div class="event-title">${event.name}</div>
            <div class="status-badges">
              <span class="status-box status-${event.status || "pending"}">${(
    event.status || "Pending"
  ).toUpperCase()}</span>
              <span class="status-box status-${event.approved || "pending"}">${(
    event.approved || "Pending"
  ).toUpperCase()}</span>
            </div>
          </div>
          <div class="event-date-time">
            <div>${formatDate(event.startDate)}</div>
            <div>${event.startTime || "Not set"} - ${
    event.endTime || "Not set"
  }</div>
          </div>
        </div>
        
        <div class="grid-container">
          <div class="section">
            <h2>Event Details</h2>
            <div class="info-box">
              <div class="info-row"><span class="label">Location:</span> <span class="value">${
                event.location
              }</span></div>
              <div class="info-row"><span class="label">Attendees:</span> <span class="value">${
                event.attendees || "Not specified"
              }</span></div>
              <div class="info-row"><span class="label">Created by:</span> <span class="value">${
                event.createdBy || "Unknown"
              }</span></div>
              <div class="info-row"><span class="label">Creation date:</span> <span class="value">${formatCreationDate(
                event.createdAt
              )}</span></div>
              ${
                event.approvedBy
                  ? `<div class="info-row"><span class="label">Approved by:</span> <span class="value">${event.approvedBy}</span></div>`
                  : ""
              }
              ${
                event.approvedAt
                  ? `<div class="info-row"><span class="label">Approval date:</span> <span class="value">${formatCreationDate(
                      event.approvedAt
                    )}</span></div>`
                  : ""
              }
            </div>
          </div>
          
          <div class="section">
            <h2>Contact Information</h2>
            <div class="info-box">
              <div class="info-row"><span class="label">Contact:</span> <span class="value">${
                event.contact || "Not specified"
              }</span></div>
              <div class="info-row"><span class="label">Phone:</span> <span class="value">${
                event.phone || "Not specified"
              }</span></div>
              <div class="info-row"><span class="label">Email:</span> <span class="value">${
                event.email || "Not specified"
              }</span></div>
              <div class="info-row"><span class="label">Alcuin Contact:</span> <span class="value">${
                event.alcuinContact || "Not specified"
              }</span></div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>Setup & Timeline</h2>
          <div class="compact-layout">
            <div class="info-row"><span class="label">Setup Date:</span> <span class="value">${formatDate(
              event.setupDate
            )}</span></div>
            <div class="info-row"><span class="label">Setup Time:</span> <span class="value">${
              event.setupTime || "Not set"
            }</span></div>
            <div class="info-row"><span class="label">End Date:</span> <span class="value">${formatDate(
              event.endDate
            )}</span></div>
            <div class="info-row"><span class="label">End Time:</span> <span class="value">${
              event.endTime || "Not set"
            }</span></div>
          </div>
        </div>
        
        <div class="section">
          <h2>Equipment & Resources</h2>
          <div class="equipment-grid">
            ${tablesAndChairsInfo}
            ${equipmentInfo}
            ${servicesInfo}
          </div>
        </div>
        
        ${commentsSection}
        
        ${
          event.otherConsiderations
            ? `
        <div class="section">
          <h2>Additional Considerations</h2>
          <div class="info-box">
            <p>${event.otherConsiderations}</p>
            <div class="qr-code" style="margin-left: auto; margin-top: 8px;">
              <div class="qr-code-content">Event #${event.id}</div>
            </div>
          </div>
        </div>
        `
            : `
        <div class="section">
          <div class="info-box" style="display: flex; justify-content: flex-end;">
            <div class="qr-code">
              <div class="qr-code-content">Event #${event.id}</div>
            </div>
          </div>
        </div>
        `
        }
        
        <div class="print-footer">
          Alcuin School Event Management System • Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
        </div>
      </div>
      
      ${imagesSection}
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printContent);
  printWindow.document.close();
}

// Функция для редактирования комментария
function editComment(event, eventId, commentId) {
  event.stopPropagation(); // Предотвращаем всплытие события

  // Находим комментарий в DOM
  const commentItem = document.querySelector(
    `.comment-item[data-comment-id="${commentId}"]`
  );
  if (!commentItem) return;

  // Проверяем, есть ли уже открытая форма редактирования
  const existingForm = commentItem.querySelector(".comment-edit-form");
  if (existingForm) return; // Если форма уже открыта, ничего не делаем

  const commentTextElement = commentItem.querySelector(".comment-text");
  const originalText = commentTextElement.textContent;

  // Создаем форму редактирования
  const editForm = document.createElement("form");
  editForm.className = "comment-edit-form";
  editForm.innerHTML = `
    <textarea class="comment-edit-input">${originalText}</textarea>
    <div class="comment-edit-actions">
      <button type="submit" class="comment-save">Save</button>
      <button type="button" class="comment-cancel">Cancel</button>
    </div>
  `;

  // Заменяем текстовое содержимое формой редактирования
  commentTextElement.style.display = "none";
  commentItem.appendChild(editForm);

  // Устанавливаем фокус в текстовое поле и помещаем курсор в конец текста
  const textarea = editForm.querySelector("textarea");
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);

  // Обработчик отмены редактирования
  editForm.querySelector(".comment-cancel").addEventListener("click", () => {
    commentTextElement.style.display = "";
    editForm.remove();
  });

  // Обработчик сохранения изменений
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newText = textarea.value.trim();
    if (!newText) return;

    try {
      // Находим событие в массиве
      const currentEvent = events.find((e) => String(e.id) === String(eventId));
      if (!currentEvent) throw new Error("Event not found");

      // Находим комментарий в событии
      const comment = currentEvent.comments.find(
        (c) => String(c.id) === String(commentId)
      );
      if (!comment) throw new Error("Comment not found");

      // Проверяем, что пользователь является автором комментария
      const currentUser = JSON.parse(localStorage.getItem("currentUser"));
      if (!currentUser || currentUser.fullName !== comment.author) {
        throw new Error("You are not authorized to edit this comment");
      }

      // Отправляем запрос на сервер
      const formData = new FormData();
      formData.append("action", "updateComment");
      formData.append("commentId", commentId);
      formData.append("eventId", eventId);
      formData.append("text", newText);

      const response = await fetch("events_db.php", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to update comment");
      }

      // Обновляем комментарий в локальном состоянии
      comment.text = newText;

      // Обновляем отображение в DOM
      commentTextElement.textContent = newText;
      commentTextElement.style.display = "";
      editForm.remove();

      showNotification("Comment updated successfully");
    } catch (error) {
      console.error("Error updating comment:", error);
      showNotification("Failed to update comment: " + error.message, "error");

      // Восстанавливаем первоначальное состояние
      commentTextElement.style.display = "";
      editForm.remove();
    }
  });
}

// Функция для удаления комментария
async function deleteComment(event, eventId, commentId) {
  event.stopPropagation(); // Предотвращаем всплытие события

  // Запрашиваем подтверждение у пользователя
  if (!confirm("Are you sure you want to delete this comment?")) {
    return;
  }

  try {
    // Находим событие в массиве
    const currentEvent = events.find((e) => String(e.id) === String(eventId));
    if (!currentEvent) throw new Error("Event not found");

    // Находим комментарий в событии
    const commentIndex = currentEvent.comments.findIndex(
      (c) => String(c.id) === String(commentId)
    );
    if (commentIndex === -1) throw new Error("Comment not found");

    const comment = currentEvent.comments[commentIndex];

    // Проверяем, что пользователь является автором комментария
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || currentUser.fullName !== comment.author) {
      throw new Error("You are not authorized to delete this comment");
    }

    // Отправляем запрос на сервер
    const formData = new FormData();
    formData.append("action", "deleteComment");
    formData.append("commentId", commentId);
    formData.append("eventId", eventId);

    const response = await fetch("events_db.php", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Failed to delete comment");
    }

    // Удаляем комментарий из локального состояния
    currentEvent.comments.splice(commentIndex, 1);

    // Удаляем комментарий из DOM
    const commentItem = document.querySelector(
      `.comment-item[data-comment-id="${commentId}"]`
    );
    if (commentItem) {
      commentItem.remove();
    }

    showNotification("Comment deleted successfully");
  } catch (error) {
    console.error("Error deleting comment:", error);
    showNotification("Failed to delete comment: " + error.message, "error");
  }
}

function emailEvent(eventId) {
  // Находим информацию о событии по ID
  const event = events.find((e) => e.id === eventId);

  if (!event) {
    showNotification("Event not found", "error");
    return;
  }

  // Создаем основные детали события
  const startDate = formatDate(event.startDate);
  const endDate = formatDate(event.endDate);
  const timeInfo = `${event.startTime || "Not set"} - ${
    event.endTime || "Not set"
  }`;

  // Генерируем тему письма
  const subject = `Event: ${event.name}`;

  // Формируем список оборудования, если доступно
  let equipmentList = "";
  if (event.podium === "yes") equipmentList += "- Podium\n";
  if (event.monitors === "yes") equipmentList += "- Monitors\n";
  if (event.laptop === "yes") equipmentList += "- Laptop\n";
  if (event.ipad === "yes") equipmentList += "- iPad\n";
  if (event.microphones === "yes") equipmentList += "- Microphones\n";
  if (event.speaker === "yes") equipmentList += "- Speaker\n";

  // Формируем список услуг, если доступно
  let servicesList = "";
  if (event.avAssistance === "yes") servicesList += "- A/V Assistance\n";
  if (event.security === "yes") servicesList += "- Security\n";
  if (event.buildingAccess) servicesList += "- Building Access\n";

  // Формируем информацию о столах, если доступно
  let tablesInfo = "";
  if (event.tables_needed === "yes") {
    if (event.tables6ft === "yes" && parseInt(event.tables6ftCount) > 0) {
      tablesInfo += `- 6ft Tables: ${event.tables6ftCount}\n`;
    }
    if (event.tables8ft === "yes" && parseInt(event.tables8ftCount) > 0) {
      tablesInfo += `- 8ft Tables: ${event.tables8ftCount}\n`;
    }
    if (event.tablesRound === "yes" && parseInt(event.tablesRoundCount) > 0) {
      tablesInfo += `- Round Tables: ${event.tablesRoundCount}\n`;
    }
    if (event.tablecloth_color) {
      const colorStyle =
        event.tablecloth_color === "white"
          ? `color: #333; font-weight: bold; background-color: #e6e6e6; padding: 2px 5px; border-radius: 3px;`
          : `color: ${event.tablecloth_color}; font-weight: bold;`;

      tablesInfo += `- Tablecloth color: <span style="${colorStyle}">${event.tablecloth_color}</span>\n`;
    }
  }

  // Формируем информацию о стульях, если доступно
  let chairsInfo = "";
  if (event.chairs_needed === "yes" && parseInt(event.chairs_count) > 0) {
    chairsInfo = `- Chairs: ${event.chairs_count}\n`;
  }

  // Создаем хорошо форматированный текстовый контент для письма, который работает во всех почтовых клиентах
  const plainTextBody = `=========================================
EVENT: ${event.name.toUpperCase()}
=========================================
Date: ${startDate}
Time: ${timeInfo}
Location: ${event.location}
Status: ${event.status || "Pending"}
${event.attendees ? `Attendees: ${event.attendees}` : ""}

-----------------------------------------
CONTACT INFORMATION
-----------------------------------------
Contact: ${event.contact || "Not specified"}
Phone: ${event.phone || "Not specified"}
Email: ${event.email || "Not specified"}
${event.alcuinContact ? `Alcuin Contact: ${event.alcuinContact}` : ""}

${
  tablesInfo || chairsInfo
    ? `-----------------------------------------
TABLES & CHAIRS
-----------------------------------------
${tablesInfo}${chairsInfo}`
    : ""
}

${
  equipmentList
    ? `-----------------------------------------
EQUIPMENT
-----------------------------------------
${equipmentList}`
    : ""
}

${
  servicesList
    ? `-----------------------------------------
SERVICES
-----------------------------------------
${servicesList}`
    : ""
}

${
  event.otherConsiderations
    ? `-----------------------------------------
ADDITIONAL CONSIDERATIONS
-----------------------------------------
${event.otherConsiderations}
`
    : ""
}

-----------------------------------------
Event #${
    event.id
  } • Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
To see complete event details, please visit the Event Management System.
-----------------------------------------`;

  try {
    // Проверяем, используется ли Microsoft Outlook
    const isOutlook =
      navigator.userAgent.indexOf("MSOutlook") > -1 ||
      navigator.userAgent.indexOf("Microsoft Outlook") > -1 ||
      window.navigator.msSaveOrOpenBlob; // Характерно для IE/Outlook

    // Кодируем содержимое письма и тему
    const encodedBody = encodeURIComponent(plainTextBody);
    const encodedSubject = encodeURIComponent(subject);

    // Создаем ссылку mailto, которая откроет почтовый клиент
    const mailtoLink = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;

    // Показываем уведомление пользователю
    if (isOutlook) {
      showNotification(
        "Открывается Microsoft Outlook для отправки информации о событии",
        "success",
        3000
      );
    } else {
      showNotification(
        "Открывается почтовый клиент для отправки информации о событии",
        "success",
        3000
      );
    }

    // Открываем почтовый клиент по умолчанию
    window.location.href = mailtoLink;
  } catch (error) {
    console.error("Ошибка при открытии почтового клиента:", error);
    showNotification(
      "Ошибка при открытии почтового клиента. Пожалуйста, попробуйте снова.",
      "error"
    );
  }
}

// Sidebar Navigation Functionality
document.addEventListener("DOMContentLoaded", function () {
  // Sidebar menu items functionality
  const sidebarItems = document.querySelectorAll(".sidebar-menu-item");

  sidebarItems.forEach((item) => {
    item.addEventListener("click", function () {
      // Remove active class from all items
      sidebarItems.forEach((i) => i.classList.remove("active"));

      // Add active class to clicked item
      this.classList.add("active");

      // Get data-section attribute value
      const section = this.getAttribute("data-section");

      // Handle section switching
      if (section === "events") {
        document.querySelector(".events-container").style.display = "grid";

        // If room scheduler content exists, hide it
        const roomScheduler = document.querySelector(
          ".room-scheduler-container"
        );
        if (roomScheduler) {
          roomScheduler.style.display = "none";
        }
      } else if (section === "room-scheduler") {
        document.querySelector(".events-container").style.display = "none";

        // Check if room scheduler content exists
        let roomScheduler = document.querySelector(".room-scheduler-container");

        // If room scheduler doesn't exist yet, create message
        if (!roomScheduler) {
          roomScheduler = document.createElement("div");
          roomScheduler.className = "room-scheduler-container";
          roomScheduler.innerHTML = `
                        <div class="coming-soon">
                            <h2>Room Scheduler</h2>
                            <p>This feature is coming soon!</p>
                        </div>
                    `;
          document.querySelector(".events-container").after(roomScheduler);

          // Apply similar margin as events-container
          roomScheduler.style.marginLeft = "250px";
        }

        roomScheduler.style.display = "block";
      }
    });
  });

  // Responsive sidebar toggle for mobile
  const addToggleButton = function () {
    if (
      window.innerWidth <= 768 &&
      !document.querySelector(".sidebar-toggle")
    ) {
      const toggleButton = document.createElement("button");
      toggleButton.className = "sidebar-toggle";
      toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
      document.body.appendChild(toggleButton);

      toggleButton.addEventListener("click", function () {
        document
          .querySelector(".sidebar-navigation")
          .classList.toggle("active");
      });
    } else if (
      window.innerWidth > 768 &&
      document.querySelector(".sidebar-toggle")
    ) {
      document.querySelector(".sidebar-toggle").remove();
    }
  };

  // Add toggle button on load if needed
  addToggleButton();

  // Handle window resize
  window.addEventListener("resize", addToggleButton);
});

// Sidebar Mobile Toggle Functionality
document.addEventListener("DOMContentLoaded", function () {
  // Add mobile toggle button for sidebar
  const addToggleButton = function () {
    if (!document.querySelector(".sidebar-toggle")) {
      const toggleButton = document.createElement("button");
      toggleButton.className = "sidebar-toggle";
      toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
      document.body.appendChild(toggleButton);

      toggleButton.addEventListener("click", function () {
        document
          .querySelector(".sidebar-navigation")
          .classList.toggle("active");
      });

      // Close sidebar when clicking outside on mobile
      document.addEventListener("click", function (e) {
        const sidebar = document.querySelector(".sidebar-navigation");
        const toggle = document.querySelector(".sidebar-toggle");

        if (
          window.innerWidth <= 768 &&
          sidebar.classList.contains("active") &&
          !sidebar.contains(e.target) &&
          e.target !== toggle &&
          !toggle.contains(e.target)
        ) {
          sidebar.classList.remove("active");
        }
      });
    }
  };

  // Add toggle button on load
  addToggleButton();

  // Existing sidebar menu items functionality
  const sidebarItems = document.querySelectorAll(".sidebar-menu-item");

  sidebarItems.forEach((item) => {
    item.addEventListener("click", function () {
      // Remove active class from all items
      sidebarItems.forEach((i) => i.classList.remove("active"));

      // Add active class to clicked item
      this.classList.add("active");

      // Get data-section attribute value
      const section = this.getAttribute("data-section");

      // Handle section switching
      if (section === "events") {
        document.querySelector(".events-container").style.display = "grid";

        // If room scheduler content exists, hide it
        const roomScheduler = document.querySelector(
          ".room-scheduler-container"
        );
        if (roomScheduler) {
          roomScheduler.style.display = "none";
        }
      } else if (section === "room-scheduler") {
        document.querySelector(".events-container").style.display = "none";

        // Check if room scheduler content exists
        let roomScheduler = document.querySelector(".room-scheduler-container");

        // If room scheduler doesn't exist yet, create message
        if (!roomScheduler) {
          roomScheduler = document.createElement("div");
          roomScheduler.className = "room-scheduler-container";
          roomScheduler.innerHTML = `
                        <div class="coming-soon">
                            <h2>Room Scheduler</h2>
                            <p>This feature is coming soon!</p>
                        </div>
                    `;
          document.querySelector(".events-container").after(roomScheduler);

          // Apply similar margin/padding as events-container
          roomScheduler.style.marginLeft = "280px";
          roomScheduler.style.marginTop = "60px";
          roomScheduler.style.padding = "20px";

          // Adjust for mobile
          if (window.innerWidth <= 768) {
            roomScheduler.style.marginLeft = "0";
            roomScheduler.style.marginTop = "120px";
          }
        }

        roomScheduler.style.display = "block";

        // Close sidebar on mobile after selection
        if (window.innerWidth <= 768) {
          document
            .querySelector(".sidebar-navigation")
            .classList.remove("active");
        }
      }
    });
  });
});
