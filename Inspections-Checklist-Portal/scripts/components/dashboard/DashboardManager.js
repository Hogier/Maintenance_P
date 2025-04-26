export default class DashboardManager {
  constructor(container) {
    this.container = container;
    this.currentDate = new Date();
    this.events = [];
    this.isMobile = window.innerWidth <= 768;
    this.reminderForm = null;
    this.selectedDate = null;
    this.init();
  }

  init() {
    // Устанавливаем ссылку на менеджер для доступа из обработчиков событий
    this.container.__manager = this;

    this.bindEvents();
    this.renderCalendar();
    this.loadEvents();

    // Create and render current day events section
    this.createCurrentDayEventsSection();

    // Отслеживаем изменение размера экрана
    window.addEventListener("resize", this.handleResize.bind(this));
  }

  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;

    // Если состояние мобильного вида изменилось, перерисуем календарь
    if (wasMobile !== this.isMobile) {
      this.renderCalendar();
    }
  }

  bindEvents() {
    const prevBtn = this.container.querySelector("#prev-month");
    const nextBtn = this.container.querySelector("#next-month");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => this.changeMonth(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.changeMonth(1));
    }

    // Добавляем обработчики для модального окна
    const modal = this.container.querySelector("#day-events-modal");
    const closeBtn = this.container.querySelector(".close-modal");
    const addEventBtn = this.container.querySelector("#add-event-btn");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeModal());
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }

    if (addEventBtn) {
      addEventBtn.addEventListener("click", () => this.handleAddEvent());
    }

    // Добавляем поддержку свайпов для смены месяца
    this.setupSwipeSupport();
  }

  setupSwipeSupport() {
    const calendarGrid = this.container.querySelector(".calendar-grid");
    if (!calendarGrid) return;

    let touchStartX = 0;
    let touchEndX = 0;

    calendarGrid.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
      },
      { passive: true }
    );

    calendarGrid.addEventListener(
      "touchend",
      (e) => {
        touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe(touchStartX, touchEndX);
      },
      { passive: true }
    );
  }

  handleSwipe(startX, endX) {
    const threshold = 50; // Минимальное расстояние для определения свайпа

    if (startX - endX > threshold) {
      // Свайп влево - следующий месяц
      this.changeMonth(1);
    } else if (endX - startX > threshold) {
      // Свайп вправо - предыдущий месяц
      this.changeMonth(-1);
    }
  }

  changeMonth(delta) {
    this.currentDate.setMonth(this.currentDate.getMonth() + delta);
    this.renderCalendar();
  }

  renderCalendar() {
    const monthYearElement = this.container.querySelector(
      "#current-month-year"
    );
    const daysContainer = this.container.querySelector("#calendar-days");

    if (!monthYearElement || !daysContainer) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Получаем текущую дату для выделения сегодняшнего дня
    const today = new Date();
    const isCurrentMonth =
      today.getMonth() === month && today.getFullYear() === year;
    const currentDay = today.getDate();

    // Update month and year display
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
    // Для мобильных устройств используем сокращенные названия месяцев
    const shortMonthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    monthYearElement.textContent = this.isMobile
      ? `${shortMonthNames[month]} ${year}`
      : `${monthNames[month]} ${year}`;

    // Clear previous days
    daysContainer.innerHTML = "";

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    const firstDayIndex = firstDay.getDay();

    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDayIndex; i++) {
      this.createDayElement(daysContainer, "", true);
    }

    // Add days of month
    for (let day = 1; day <= totalDays; day++) {
      const isToday = isCurrentMonth && day === currentDay;
      this.createDayElement(daysContainer, day, false, isToday);
    }

    // After rendering the calendar, update the current day events section
    this.renderCurrentDayEvents();
  }

  createDayElement(container, day, isEmpty = false, isToday = false) {
    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";

    if (isToday) {
      dayElement.classList.add("today");
    }

    if (!isEmpty) {
      const dayNumber = document.createElement("div");
      dayNumber.className = "day-number";
      dayNumber.textContent = day;
      dayElement.appendChild(dayNumber);

      // Check if day has events
      const events = this.getEventsForDay(day);
      if (events.length > 0) {
        dayElement.classList.add("has-events");
        this.renderDayEvents(dayElement, events);
      }

      // Добавляем обработчик клика для открытия модального окна
      dayElement.addEventListener("click", () => this.showDayEvents(day));
    }

    container.appendChild(dayElement);
  }

  getEventsForDay(day) {
    // Filter events for the specific day
    return this.events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === this.currentDate.getMonth() &&
        eventDate.getFullYear() === this.currentDate.getFullYear()
      );
    });
  }

  renderDayEvents(dayElement, events) {
    // Sort events by time
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Always show exactly 2 events on mobile, and up to 3 on desktop
    const maxEventsToShow = this.isMobile ? 2 : 3;
    const visibleEvents = events.slice(0, maxEventsToShow);
    const hasMoreEvents = events.length > maxEventsToShow;

    // Create container for event titles
    const eventsContainer = document.createElement("div");
    eventsContainer.className = "calendar-day-events";

    // Add titles for each event
    for (let i = 0; i < visibleEvents.length; i++) {
      const event = visibleEvents[i];
      const eventTitle = document.createElement("div");
      eventTitle.className = "calendar-event-title";

      // Determine if the title is short
      const isShortTitle = event.title.length <= 15;
      if (isShortTitle) {
        eventTitle.classList.add("short-text");
      }

      // Add type-specific class
      if (event.type) {
        eventTitle.classList.add(event.type);
      }
      // Add color class if present
      if (event.color) {
        eventTitle.classList.add(event.color);
      }

      const titleText = document.createElement("div");
      titleText.className = "event-title-text";
      titleText.textContent = event.title;
      eventTitle.appendChild(titleText);

      eventsContainer.appendChild(eventTitle);
    }

    // Add "more events" indicator if there are additional events
    if (hasMoreEvents) {
      const moreEvents = document.createElement("div");
      moreEvents.className = "more-events";
      moreEvents.textContent = `+${events.length - maxEventsToShow} more`;
      eventsContainer.appendChild(moreEvents);
    }

    dayElement.appendChild(eventsContainer);

    // Also add event dots for mobile view
    if (this.isMobile) {
      const dotsContainer = document.createElement("div");
      dotsContainer.className = "event-dots-container";

      // Always show dots for visible events on mobile
      for (let i = 0; i < Math.min(visibleEvents.length, 2); i++) {
        const event = visibleEvents[i];
        const dot = document.createElement("span");
        dot.className = "event-dot";

        if (event.type) {
          dot.classList.add(event.type);
        }
        if (event.color) {
          dot.classList.add(event.color);
        }

        dotsContainer.appendChild(dot);
      }

      // Add "more" indicator if needed
      if (hasMoreEvents) {
        const moreDot = document.createElement("span");
        moreDot.className = "event-dot more";
        moreDot.textContent = "+";
        dotsContainer.appendChild(moreDot);
      }

      dayElement.appendChild(dotsContainer);
    }
  }

  async loadEvents() {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();

      // Формируем даты для запроса событий на текущий месяц
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const formattedStartDate = startDate.toISOString().split("T")[0];
      const formattedEndDate = endDate.toISOString().split("T")[0];

      // Запрос к API
      const response = await fetch(
        `api/calendar/events.php?start_date=${formattedStartDate}&end_date=${formattedEndDate}`
      );

      if (!response.ok) {
        throw new Error("Ошибка при загрузке событий");
      }

      const data = await response.json();

      if (data.records) {
        // Преобразование даты из строки в объект Date
        this.events = data.records.map((event) => {
          // Create a date object that preserves the local timezone
          // by parsing the date parts manually instead of using the Date constructor directly
          let dateObj;

          if (event.date) {
            // Handle different date formats
            if (event.date.includes("T")) {
              // If date includes 'T', it's in ISO format
              dateObj = new Date(event.date);
            } else {
              // If it's in 'YYYY-MM-DD HH:MM:SS' format
              const [datePart, timePart] = event.date.split(" ");
              const [year, month, day] = datePart.split("-").map(Number);

              if (timePart) {
                const [hours, minutes, seconds] = timePart
                  .split(":")
                  .map(Number);
                // Create date object - month is 0-indexed in JavaScript
                dateObj = new Date(
                  year,
                  month - 1,
                  day,
                  hours,
                  minutes,
                  seconds
                );
              } else {
                // No time part
                dateObj = new Date(year, month - 1, day);
              }
            }
          } else {
            // Fallback to current date if no date is provided
            dateObj = new Date();
          }

          return {
            id: event.id,
            title: event.title,
            description: event.description,
            date: dateObj,
            type: event.type,
            color: event.color,
          };
        });
      } else {
        this.events = [];
      }

      // Обновление UI
      this.renderCalendar();
      this.renderCurrentDayEvents();
    } catch (error) {
      console.error("Error loading events:", error);
      this.showActionMessage("Не удалось загрузить события", "error");
    }
  }

  showDayEvents(day) {
    const events = this.getEventsForDay(day);
    const modal = this.container.querySelector("#day-events-modal");
    const modalTitle = this.container.querySelector("#modal-date-title");
    const modalEventsList = this.container.querySelector("#modal-events-list");

    if (!modal || !modalTitle || !modalEventsList) return;

    // Store the selected date for adding new events
    this.selectedDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      day
    );

    // Форматируем дату
    modalTitle.textContent = this.selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Make sure the event list is visible and form is hidden
    modalEventsList.style.display = "block";
    const addEventBtn = this.container.querySelector("#add-event-btn");
    if (addEventBtn) addEventBtn.style.display = "block";

    if (this.reminderForm) {
      this.reminderForm.style.display = "none";
    }

    // Отображаем события
    if (events.length === 0) {
      modalEventsList.innerHTML = `
        <div class="no-events-message">
          <p>No events scheduled for this day</p>
          <p>Click the "Add Event" button to create a new event for ${this.selectedDate.toLocaleDateString(
            "en-US",
            {
              month: "long",
              day: "numeric",
            }
          )}</p>
        </div>
      `;
    } else {
      // Сортируем события по времени
      events.sort((a, b) => new Date(a.date) - new Date(b.date));

      modalEventsList.innerHTML = `
        <div class="modal-events-header">
          <h3>Events for ${this.selectedDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}</h3>
          <p>${events.length} event${
        events.length !== 1 ? "s" : ""
      } scheduled</p>
        </div>
        <div class="modal-events-list-items">
          ${events
            .map((event) => {
              // Определяем цвет события так же, как в календаре
              const eventColor = event.color || event.type;

              return `
                <div class="modal-event-item ${eventColor}">
                  <div class="modal-event-time">
                    ${new Date(event.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div class="modal-event-details">
                    <div class="modal-event-title">${event.title}</div>
                    <div class="modal-event-description">${
                      event.description || ""
                    }</div>
                  </div>
                  <div class="modal-event-actions">
                    <button onclick="event.stopPropagation(); document.querySelector('.dashboard-container').__manager.editEvent(${
                      event.id
                    })">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="event.stopPropagation(); document.querySelector('.dashboard-container').__manager.deleteEvent(${
                      event.id
                    })">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      `;
    }

    // Показываем модальное окно
    modal.classList.add("active");
  }

  closeModal() {
    const modal = this.container.querySelector("#day-events-modal");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  handleAddEvent() {
    if (!this.selectedDate) {
      // Если дата не выбрана, используем текущую дату
      this.selectedDate = new Date();
    }
    this.showReminderForm();
  }

  showReminderForm(reminder = null) {
    const modal = this.container.querySelector("#day-events-modal");
    const modalBody = modal.querySelector(".modal-body");
    const modalEventsList = this.container.querySelector("#modal-events-list");
    const addEventBtn = this.container.querySelector("#add-event-btn");

    // Hide events list and add button
    if (modalEventsList) modalEventsList.style.display = "none";
    if (addEventBtn) addEventBtn.style.display = "none";

    // Create the form if it doesn't exist
    if (!this.reminderForm) {
      this.reminderForm = document.createElement("form");
      this.reminderForm.id = "reminder-form";
      this.reminderForm.className = "reminder-form";
      this.reminderForm.innerHTML = `
        <div class="form-header">
          <h3>${reminder ? "Edit Event" : "Add New Event"}</h3>
          <p class="selected-date-info">For: <span id="selected-date-display"></span></p>
        </div>
        <div class="form-group">
          <label for="reminder-title">Title</label>
          <input type="text" id="reminder-title" name="title" required>
        </div>
        <div class="form-group">
          <label for="reminder-date">Date</label>
          <input type="date" id="reminder-date" name="date" required>
        </div>
        <div class="form-group">
          <label for="reminder-time">Time</label>
          <input type="time" id="reminder-time" name="time">
        </div>
        <div class="form-group">
          <label for="reminder-description">Description</label>
          <textarea id="reminder-description" name="description" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="reminder-color">Color</label>
          <select id="reminder-color" name="color">
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="red">Red</option>
            <option value="orange">Orange</option>
            <option value="purple">Purple</option>
          </select>
        </div>
        <div class="form-group">
          <label for="reminder-type">Event Type</label>
          <select id="reminder-type" name="type">
            <option value="reminder">Reminder</option>
            <option value="inspection">Inspection</option>
            <option value="checklist">Checklist</option>
            <option value="construction">Construction</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" id="cancel-reminder-btn" class="btn-secondary">Cancel</button>
          <button type="submit" id="save-reminder-btn" class="btn-primary">Save</button>
        </div>
      `;

      modalBody.appendChild(this.reminderForm);
    }

    // Reset and show the form
    this.reminderForm.reset();
    this.reminderForm.style.display = "block";

    // Обновим заголовок формы
    const formHeader = this.reminderForm.querySelector(".form-header h3");
    if (formHeader) {
      formHeader.textContent = reminder ? "Edit Event" : "Add New Event";
    }

    // Отображаем выбранную дату
    const dateDisplay = this.reminderForm.querySelector(
      "#selected-date-display"
    );
    if (dateDisplay && this.selectedDate) {
      dateDisplay.textContent = this.selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    // Set form values for edit mode
    if (reminder) {
      const reminderDate = new Date(reminder.date);
      this.reminderForm.querySelector("#reminder-title").value = reminder.title;
      this.reminderForm.querySelector("#reminder-date").value = reminderDate
        .toISOString()
        .split("T")[0];
      this.reminderForm.querySelector("#reminder-time").value = reminderDate
        .toTimeString()
        .substring(0, 5);
      this.reminderForm.querySelector("#reminder-description").value =
        reminder.description || "";
      this.reminderForm.querySelector("#reminder-color").value =
        reminder.color || "blue";

      // Set event type if available
      const typeSelect = this.reminderForm.querySelector("#reminder-type");
      if (typeSelect && reminder.type) {
        typeSelect.value = reminder.type;
      }

      this.reminderForm.dataset.reminderId = reminder.id;
    } else {
      // Set the selected date for new reminder
      if (this.selectedDate) {
        const dateInput = this.reminderForm.querySelector("#reminder-date");
        dateInput.value = this.selectedDate.toISOString().split("T")[0];
      }
      delete this.reminderForm.dataset.reminderId;
    }

    // Setup form event listeners
    this.setupFormListeners();
  }

  setupFormListeners() {
    const cancelBtn = this.reminderForm.querySelector("#cancel-reminder-btn");
    cancelBtn.addEventListener("click", () => this.hideReminderForm());

    // Remove previous event listener if exists
    const oldForm = this.reminderForm.cloneNode(true);
    this.reminderForm.parentNode.replaceChild(oldForm, this.reminderForm);
    this.reminderForm = oldForm;

    const saveBtn = this.reminderForm.querySelector("#save-reminder-btn");
    this.reminderForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveReminder();
    });

    // Re-attach cancel button listener
    const newCancelBtn = this.reminderForm.querySelector(
      "#cancel-reminder-btn"
    );
    newCancelBtn.addEventListener("click", () => this.hideReminderForm());
  }

  hideReminderForm() {
    if (this.reminderForm) {
      this.reminderForm.style.display = "none";
    }

    // Show the events list and "Add Event" button
    const modalEventsList = this.container.querySelector("#modal-events-list");
    const addEventBtn = this.container.querySelector("#add-event-btn");
    if (modalEventsList) modalEventsList.style.display = "block";
    if (addEventBtn) addEventBtn.style.display = "block";
  }

  async saveReminder() {
    const form = this.reminderForm;
    const title = form.querySelector("#reminder-title").value;
    const dateStr = form.querySelector("#reminder-date").value;
    const timeStr = form.querySelector("#reminder-time").value || "00:00";
    const description = form.querySelector("#reminder-description").value;
    const color = form.querySelector("#reminder-color").value;
    const eventType = form.querySelector("#reminder-type").value || "reminder";

    // Combine date and time - use local timezone format to prevent date shifting
    const reminderDate = new Date(`${dateStr}T${timeStr}`);

    // Format date in local timezone using YYYY-MM-DD HH:MM:SS format
    // This prevents timezone shifts when converting to ISO string
    const year = reminderDate.getFullYear();
    const month = String(reminderDate.getMonth() + 1).padStart(2, "0");
    const day = String(reminderDate.getDate()).padStart(2, "0");
    const hours = String(reminderDate.getHours()).padStart(2, "0");
    const minutes = String(reminderDate.getMinutes()).padStart(2, "0");
    const seconds = String(reminderDate.getSeconds()).padStart(2, "0");

    const isoDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    // Check if we're editing an existing reminder
    const reminderId = form.dataset.reminderId;
    let isEditMode = false;
    let apiUrl = "api/calendar/events.php";
    let apiMethod = "POST";

    // Match the exact database field names
    let eventData = {
      title: title,
      description: description,
      event_date: isoDateTime,
      event_type: eventType,
      color: color,
      is_completed: false,
    };

    if (reminderId) {
      // Update existing reminder
      isEditMode = true;
      apiMethod = "PUT";
      eventData.id = reminderId;
    }

    // Debug data being sent
    console.log("Sending data to API:", {
      method: apiMethod,
      url: apiUrl,
      data: eventData,
    });

    try {
      const response = await fetch(apiUrl, {
        method: apiMethod,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      // Check for server response
      const responseText = await response.text();
      console.log("Raw server response:", responseText);

      let result;
      try {
        // Try to parse as JSON
        result = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse server response as JSON:", e);
        throw new Error("Invalid server response: " + responseText);
      }

      console.log("API response:", result);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      // Если это новое событие, добавляем его в локальный массив
      if (!isEditMode && result.id) {
        this.events.push({
          id: result.id,
          title: title,
          date: reminderDate,
          description: description,
          color: color,
          type: eventType,
        });
      } else if (isEditMode) {
        // Обновляем существующее событие в массиве
        const existingEvent = this.events.find((e) => e.id == reminderId);
        if (existingEvent) {
          existingEvent.title = title;
          existingEvent.date = reminderDate;
          existingEvent.description = description;
          existingEvent.color = color;
          existingEvent.type = eventType;
        }
      }

      // Update UI
      this.renderCalendar();
      this.renderCurrentDayEvents();

      // Hide form and show updated events
      this.hideReminderForm();

      // Update the modal with the new events
      if (this.selectedDate) {
        this.showDayEvents(this.selectedDate.getDate());
      } else {
        this.closeModal();
      }

      // Show success message
      this.showActionMessage(
        isEditMode ? "Событие обновлено успешно" : "Событие создано успешно",
        "success"
      );
    } catch (error) {
      console.error("Error saving event:", error);
      this.showActionMessage(
        "Ошибка при сохранении события: " + error.message,
        "error"
      );
    }
  }

  // Helper method to show action messages
  showActionMessage(message, type = "success") {
    const tempMsg = document.createElement("div");
    tempMsg.className = "event-action-message";
    tempMsg.textContent = message;
    tempMsg.style.position = "fixed";
    tempMsg.style.bottom = "20px";
    tempMsg.style.right = "20px";
    tempMsg.style.padding = "10px 20px";
    tempMsg.style.borderRadius = "4px";
    tempMsg.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
    tempMsg.style.zIndex = "9999";

    // Set color based on message type
    if (type === "success") {
      tempMsg.style.backgroundColor = "#2ecc71";
      tempMsg.style.color = "white";
    } else if (type === "error") {
      tempMsg.style.backgroundColor = "#e74c3c";
      tempMsg.style.color = "white";
    } else {
      tempMsg.style.backgroundColor = "#3498db";
      tempMsg.style.color = "white";
    }

    document.body.appendChild(tempMsg);

    // Remove the message after a delay
    setTimeout(() => {
      if (document.body.contains(tempMsg)) {
        document.body.removeChild(tempMsg);
      }
    }, 3000);
  }

  editEvent(eventId) {
    const event = this.events.find((e) => e.id == eventId);
    if (event) {
      // Make sure modal is active when editing
      const modal = this.container.querySelector("#day-events-modal");
      if (modal && !modal.classList.contains("active")) {
        modal.classList.add("active");
      }

      // Update the modal title with the event date
      const modalTitle = this.container.querySelector("#modal-date-title");
      if (modalTitle && event.date) {
        // Set the selected date from the event's date
        this.selectedDate = new Date(event.date);

        // Update the modal title with formatted date
        modalTitle.textContent = this.selectedDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }

      // Show the form with the event data
      this.showReminderForm(event);
    }
  }

  async deleteEvent(eventId) {
    const confirmDelete = confirm(
      "Вы уверены, что хотите удалить это событие?"
    );
    if (!confirmDelete) return;

    try {
      const response = await fetch("api/calendar/events.php", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: eventId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // После успешного удаления на сервере, удаляем из локального массива
      const index = this.events.findIndex((e) => e.id == eventId);
      if (index !== -1) {
        this.events.splice(index, 1);

        // Update UI
        this.renderCalendar();
        this.renderCurrentDayEvents();

        // Update the modal with the remaining events if it's open
        const modal = this.container.querySelector("#day-events-modal");
        if (modal && modal.classList.contains("active") && this.selectedDate) {
          this.showDayEvents(this.selectedDate.getDate());
        } else {
          this.closeModal();
        }

        // Show success message
        this.showActionMessage("Событие удалено успешно");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      this.showActionMessage("Ошибка при удалении события", "error");
    }
  }

  // New method to create a container for current day events
  createCurrentDayEventsSection() {
    // Check if section already exists
    let currentDaySection = this.container.querySelector("#current-day-events");
    if (currentDaySection) return;

    // Create section for today's events
    currentDaySection = document.createElement("div");
    currentDaySection.id = "current-day-events";
    currentDaySection.className = "current-day-events-container";
    currentDaySection.style.marginTop = "15px";
    currentDaySection.style.transition = "all 0.3s ease";
    currentDaySection.style.borderRadius = "8px";
    currentDaySection.style.overflow = "hidden";
    currentDaySection.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)";

    // Create header container with title and toggle button
    const headerContainer = document.createElement("div");
    headerContainer.className = "current-day-header";
    headerContainer.style.display = "flex";
    headerContainer.style.justifyContent = "center";
    headerContainer.style.alignItems = "center";
    headerContainer.style.cursor = "pointer";
    headerContainer.style.position = "relative";
    headerContainer.style.backgroundColor = "#f0f0f0";
    headerContainer.style.padding = "12px 15px";
    headerContainer.style.borderRadius = "8px";
    headerContainer.style.width = "100%";
    headerContainer.style.boxSizing = "border-box";
    headerContainer.style.transition =
      "background-color 0.3s ease, transform 0.2s ease";

    // Add hover effect
    headerContainer.addEventListener("mouseenter", () => {
      headerContainer.style.backgroundColor = "#e8e8e8";
      headerContainer.style.transform = "translateY(-1px)";
    });

    headerContainer.addEventListener("mouseleave", () => {
      headerContainer.style.backgroundColor = "#f0f0f0";
      headerContainer.style.transform = "translateY(0)";
    });

    // Add section title
    const sectionTitle = document.createElement("h3");
    sectionTitle.className = "current-day-title";
    sectionTitle.textContent = "Today's Events";
    sectionTitle.style.margin = "0";
    sectionTitle.style.padding = "0";
    sectionTitle.style.fontWeight = "600";
    sectionTitle.style.color = "#333";
    sectionTitle.style.transition = "transform 0.2s ease";

    // Add toggle button (arrow)
    const toggleButton = document.createElement("button");
    toggleButton.className = "toggle-events-btn";
    toggleButton.innerHTML = '<i class="fas fa-chevron-down"></i>'; // Initially showing down arrow
    toggleButton.style.background = "none";
    toggleButton.style.border = "none";
    toggleButton.style.fontSize = "16px";
    toggleButton.style.cursor = "pointer";
    toggleButton.style.color = "#555";
    toggleButton.style.padding = "5px 10px";
    toggleButton.style.position = "absolute";
    toggleButton.style.right = "10px";
    toggleButton.style.top = "50%";
    toggleButton.style.transform = "translateY(-50%)";
    toggleButton.style.transition = "transform 0.3s ease, color 0.2s ease";
    toggleButton.title = "Collapse/Expand events";

    // Add elements to header
    headerContainer.appendChild(sectionTitle);
    headerContainer.appendChild(toggleButton);
    currentDaySection.appendChild(headerContainer);

    // Create container for events list
    const eventsContainer = document.createElement("div");
    eventsContainer.className = "today-events-list";
    eventsContainer.style.display = "none"; // Initially collapsed
    eventsContainer.style.padding = "0";
    eventsContainer.style.maxHeight = "0";
    eventsContainer.style.overflow = "hidden";
    eventsContainer.style.transition = "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
    eventsContainer.style.backgroundColor = "white";
    currentDaySection.appendChild(eventsContainer);

    // Add to main container (after calendar)
    const calendarContainer = this.container.querySelector(".calendar-grid");
    if (calendarContainer) {
      calendarContainer.parentNode.insertBefore(
        currentDaySection,
        calendarContainer.nextSibling
      );
    } else {
      this.container.appendChild(currentDaySection);
    }

    // Add click event for toggling events visibility with smooth animation
    headerContainer.addEventListener("click", () => {
      // Toggle events container visibility with animation
      if (eventsContainer.style.display === "none") {
        // First make it visible but with 0 height
        eventsContainer.style.display = "block";
        eventsContainer.style.padding = "15px";

        // Trigger a reflow
        void eventsContainer.offsetWidth;

        // Calculate required height for animation
        const targetHeight = eventsContainer.scrollHeight;

        // Set the max-height to animate to
        eventsContainer.style.maxHeight = `${targetHeight}px`;

        // Update the arrow icon with rotation animation
        toggleButton.querySelector("i").className = "fas fa-chevron-up";
        toggleButton.style.transform = "translateY(-50%) rotate(180deg)";
        toggleButton.style.color = "#3498db";

        // Update the header to indicate active state
        headerContainer.style.borderBottomLeftRadius = "0";
        headerContainer.style.borderBottomRightRadius = "0";
        headerContainer.style.borderBottom = "1px solid #e0e0e0";
      } else {
        // Collapse with animation
        eventsContainer.style.maxHeight = "0";
        eventsContainer.style.padding = "0 15px";

        // After animation completes, hide it completely
        setTimeout(() => {
          eventsContainer.style.display = "none";
        }, 400); // Match the transition duration

        // Rotate the arrow back
        toggleButton.querySelector("i").className = "fas fa-chevron-down";
        toggleButton.style.transform = "translateY(-50%) rotate(0deg)";
        toggleButton.style.color = "#555";

        // Reset header radius
        headerContainer.style.borderRadius = "8px";
        headerContainer.style.borderBottom = "none";
      }
    });
  }

  // New method to render events for the current day
  renderCurrentDayEvents() {
    const today = new Date();
    const todayEvents = this.getEventsForDay(today.getDate());

    // Get or create the container
    this.createCurrentDayEventsSection();
    const eventsContainer = this.container.querySelector(".today-events-list");
    if (!eventsContainer) return;

    // Update section title with enhanced styling
    const sectionTitle = this.container.querySelector(".current-day-title");
    if (sectionTitle) {
      // Форматируем дату в красивом виде
      const formattedDate = today.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      // Создаем HTML с иконкой календаря и улучшенным форматированием
      sectionTitle.innerHTML = `
        <div class="title-container" style="display: flex; align-items: center;">
          <span style="font-weight: 500; color: #2c3e50; margin-right: 8px;">Events for</span>
          <div style="width: 1px; height: 20px; background-color: #ccc; margin: 0 10px;"></div>
          <span style="font-weight: 700; color: #3498db;">${formattedDate}</span>
        </div>
      `;

      // Добавляем дополнительные стили к заголовку
      sectionTitle.style.fontSize = "1.2rem";
      sectionTitle.style.letterSpacing = "0.5px";
      sectionTitle.style.display = "flex";
      sectionTitle.style.alignItems = "center";
      sectionTitle.style.justifyContent = "center";
    }

    // Clear previous content
    eventsContainer.innerHTML = "";

    // Display message if no events
    if (todayEvents.length === 0) {
      const noEventsMsg = document.createElement("div");
      noEventsMsg.className = "no-events-message";
      noEventsMsg.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; padding: 30px 0;">
          <i class="fas fa-calendar-day" style="font-size: 32px; color: #d1d8e0; margin-bottom: 15px;"></i>
          <p style="text-align: center; color: #7f8c8d; font-style: italic; margin: 0;">No events scheduled for today</p>
          <button id="add-today-event" style="margin-top: 15px; background-color: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; transition: background-color 0.2s ease;">
            <i class="fas fa-plus" style="margin-right: 5px;"></i> Add Event
          </button>
        </div>
      `;
      eventsContainer.appendChild(noEventsMsg);

      // Add event listener to "Add Event" button
      const addButton = noEventsMsg.querySelector("#add-today-event");
      if (addButton) {
        addButton.addEventListener("mouseenter", () => {
          addButton.style.backgroundColor = "#2980b9";
        });
        addButton.addEventListener("mouseleave", () => {
          addButton.style.backgroundColor = "#3498db";
        });
        addButton.addEventListener("click", () => {
          this.selectedDate = new Date();
          this.handleAddEvent();
        });
      }

      return;
    }

    // Sort events by time
    todayEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Create event items
    todayEvents.forEach((event, index) => {
      const eventElement = document.createElement("div");
      eventElement.className = `today-event-item ${event.color || event.type}`;

      // Set initial state for staggered animation
      eventElement.style.opacity = "0";
      eventElement.style.transform = "translateY(10px)";

      // Get the color for this event type (match with calendar)
      const eventType = event.color || event.type;
      let bgColor, borderColor;

      // Match the colors with calendar-event-title styles from CSS
      switch (eventType) {
        case "inspection":
          bgColor = "rgba(231, 76, 60, 0.15)";
          borderColor = "#e74c3c";
          break;
        case "checklist":
          bgColor = "rgba(46, 204, 113, 0.15)";
          borderColor = "#2ecc71";
          break;
        case "construction":
          bgColor = "rgba(241, 196, 15, 0.15)";
          borderColor = "#f1c40f";
          break;
        case "red":
          bgColor = "rgba(231, 76, 60, 0.15)";
          borderColor = "#e74c3c";
          break;
        case "green":
          bgColor = "rgba(46, 204, 113, 0.15)";
          borderColor = "#2ecc71";
          break;
        case "orange":
          bgColor = "rgba(230, 126, 34, 0.15)";
          borderColor = "#e67e22";
          break;
        case "purple":
          bgColor = "rgba(155, 89, 182, 0.15)";
          borderColor = "#9b59b6";
          break;
        case "blue":
        case "reminder":
        default:
          bgColor = "rgba(52, 152, 219, 0.15)";
          borderColor = "#3498db";
          break;
      }

      // Basic styling
      eventElement.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
      eventElement.style.borderRadius = "8px";
      eventElement.style.margin = "8px 0";
      eventElement.style.padding = "12px 15px";
      eventElement.style.display = "flex";
      eventElement.style.alignItems = "center";
      eventElement.style.position = "relative";
      eventElement.style.overflow = "hidden";
      eventElement.style.transition = "all 0.3s ease";

      // Apply the same styling as in calendar
      eventElement.style.backgroundColor = bgColor;
      eventElement.style.borderLeft = `4px solid ${borderColor}`;
      eventElement.style.color = "#333";

      // Create time element with enhanced styling
      const eventTime = document.createElement("div");
      eventTime.className = "today-event-time";
      eventTime.textContent = new Date(event.date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Стилизация времени
      eventTime.style.fontWeight = "700";
      eventTime.style.color = "#34495e";
      eventTime.style.minWidth = "60px";
      eventTime.style.padding = "5px 10px";
      eventTime.style.backgroundColor = "rgba(236, 240, 241, 0.6)";
      eventTime.style.borderRadius = "4px";
      eventTime.style.textAlign = "center";

      const eventDetails = document.createElement("div");
      eventDetails.className = "today-event-details";
      eventDetails.style.marginLeft = "15px";
      eventDetails.style.flex = "1";

      const eventTitle = document.createElement("div");
      eventTitle.className = "today-event-title";
      eventTitle.textContent = event.title;

      // Стилизация заголовка события
      eventTitle.style.fontSize = "1.05rem";
      eventTitle.style.fontWeight = "600";
      eventTitle.style.marginBottom = "5px";
      eventTitle.style.color = "#2c3e50";

      const eventDescription = document.createElement("div");
      eventDescription.className = "today-event-description";
      eventDescription.textContent = event.description || "";

      // Стилизация описания
      eventDescription.style.fontSize = "0.9rem";
      eventDescription.style.color = "#7f8c8d";

      eventDetails.appendChild(eventTitle);

      if (event.description) {
        eventDetails.appendChild(eventDescription);
      }

      const eventActions = document.createElement("div");
      eventActions.className = "today-event-actions";
      eventActions.style.marginLeft = "10px";
      eventActions.style.display = "flex";
      eventActions.style.opacity = "0";
      eventActions.style.transition = "opacity 0.2s ease";

      // Edit button with improved functionality and styling
      const editBtn = document.createElement("button");
      editBtn.innerHTML = '<i class="fas fa-edit"></i>';
      editBtn.title = "Edit event";
      editBtn.setAttribute("data-event-id", event.id);

      // Стилизация кнопок
      editBtn.style.background = "none";
      editBtn.style.border = "none";
      editBtn.style.color = "#3498db";
      editBtn.style.padding = "8px";
      editBtn.style.borderRadius = "50%";
      editBtn.style.transition = "all 0.2s ease";
      editBtn.style.cursor = "pointer";
      editBtn.style.display = "flex";
      editBtn.style.alignItems = "center";
      editBtn.style.justifyContent = "center";
      editBtn.style.width = "32px";
      editBtn.style.height = "32px";

      editBtn.addEventListener("mouseenter", () => {
        editBtn.style.backgroundColor = "rgba(52, 152, 219, 0.1)";
        editBtn.style.transform = "scale(1.1)";
      });

      editBtn.addEventListener("mouseleave", () => {
        editBtn.style.backgroundColor = "transparent";
        editBtn.style.transform = "scale(1)";
      });

      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        // Don't set selectedDate here, as it will be set in editEvent method
        this.editEvent(event.id);
      });

      // Delete button with improved functionality and styling
      const deleteBtn = document.createElement("button");
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
      deleteBtn.title = "Delete event";
      deleteBtn.setAttribute("data-event-id", event.id);

      // Стилизация кнопки удаления
      deleteBtn.style.background = "none";
      deleteBtn.style.border = "none";
      deleteBtn.style.color = "#e74c3c";
      deleteBtn.style.padding = "8px";
      deleteBtn.style.borderRadius = "50%";
      deleteBtn.style.transition = "all 0.2s ease";
      deleteBtn.style.cursor = "pointer";
      deleteBtn.style.display = "flex";
      deleteBtn.style.alignItems = "center";
      deleteBtn.style.justifyContent = "center";
      deleteBtn.style.width = "32px";
      deleteBtn.style.height = "32px";
      deleteBtn.style.marginLeft = "5px";

      deleteBtn.addEventListener("mouseenter", () => {
        deleteBtn.style.backgroundColor = "rgba(231, 76, 60, 0.1)";
        deleteBtn.style.transform = "scale(1.1)";
      });

      deleteBtn.addEventListener("mouseleave", () => {
        deleteBtn.style.backgroundColor = "transparent";
        deleteBtn.style.transform = "scale(1)";
      });

      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteEvent(event.id);
      });

      eventActions.appendChild(editBtn);
      eventActions.appendChild(deleteBtn);

      eventElement.appendChild(eventTime);
      eventElement.appendChild(eventDetails);
      eventElement.appendChild(eventActions);

      // Show action buttons on hover
      eventElement.addEventListener("mouseenter", () => {
        eventElement.style.transform = "translateY(-2px)";
        eventElement.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
        eventActions.style.opacity = "1";
      });

      eventElement.addEventListener("mouseleave", () => {
        eventElement.style.transform = "translateY(0)";
        eventElement.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
        eventActions.style.opacity = "0";
      });

      // Add click handler to show full details in modal
      eventElement.addEventListener("click", () => {
        this.selectedDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        this.showDayEvents(today.getDate());
      });

      eventsContainer.appendChild(eventElement);

      // Trigger staggered animation after a delay based on index
      setTimeout(() => {
        eventElement.style.opacity = "1";
        eventElement.style.transform = "translateY(0)";
      }, 100 + index * 50); // Stagger effect
    });
  }
}
