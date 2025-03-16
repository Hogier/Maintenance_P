export default class DashboardManager {
  constructor(container) {
    this.container = container;
    this.currentDate = new Date();
    this.events = [];
    this.init();
  }

  init() {
    this.bindEvents();
    this.renderCalendar();
    this.loadEvents();
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
    monthYearElement.textContent = `${monthNames[month]} ${year}`;

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
      this.createDayElement(daysContainer, day);
    }
  }

  createDayElement(container, day, isEmpty = false) {
    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";

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
    events.forEach((event) => {
      const eventDot = document.createElement("div");
      eventDot.className = `event-dot ${event.type}`;
      dayElement.appendChild(eventDot);
    });
  }

  async loadEvents() {
    try {
      // Here will be API call to load events
      // For now, using mock data
      this.events = [
        {
          id: 1,
          title: "Site Inspection",
          date: new Date(2024, 2, 15),
          type: "inspection",
        },
        {
          id: 2,
          title: "Safety Checklist",
          date: new Date(2024, 2, 18),
          type: "checklist",
        },
        {
          id: 3,
          title: "Construction Review",
          date: new Date(2024, 2, 20),
          type: "construction",
        },
      ];
      this.renderCalendar(); // Re-render calendar with events
      this.renderEventsList();
    } catch (error) {
      console.error("Error loading events:", error);
    }
  }

  renderEventsList() {
    const eventsContainer = this.container.querySelector("#calendar-events");
    if (!eventsContainer) return;

    const currentMonthEvents = this.events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getMonth() === this.currentDate.getMonth() &&
        eventDate.getFullYear() === this.currentDate.getFullYear()
      );
    });

    if (currentMonthEvents.length === 0) {
      eventsContainer.innerHTML = "<p>No events scheduled for this month</p>";
      return;
    }

    eventsContainer.innerHTML = currentMonthEvents
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(
        (event) => `
        <div class="event-item">
          <span class="event-time">${new Date(
            event.date
          ).toLocaleDateString()}</span>
          <span class="event-title">${event.title}</span>
          <span class="event-type ${event.type}">${event.type}</span>
        </div>
      `
      )
      .join("");
  }

  showDayEvents(day) {
    const events = this.getEventsForDay(day);
    const modal = this.container.querySelector("#day-events-modal");
    const modalTitle = this.container.querySelector("#modal-date-title");
    const modalEventsList = this.container.querySelector("#modal-events-list");

    if (!modal || !modalTitle || !modalEventsList) return;

    // Форматируем дату
    const date = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      day
    );
    modalTitle.textContent = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Отображаем события
    if (events.length === 0) {
      modalEventsList.innerHTML = `
        <div class="no-events-message">
          <p>No events scheduled for this day</p>
        </div>
      `;
    } else {
      modalEventsList.innerHTML = events
        .map(
          (event) => `
        <div class="modal-event-item ${event.type}">
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
            <button onclick="event.stopPropagation(); this.editEvent(${
              event.id
            })">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="event.stopPropagation(); this.deleteEvent(${
              event.id
            })">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `
        )
        .join("");
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
    // Здесь будет логика добавления нового события
    console.log("Adding new event...");
  }

  editEvent(eventId) {
    // Здесь будет логика редактирования события
    console.log("Editing event:", eventId);
  }

  deleteEvent(eventId) {
    // Здесь будет логика удаления события
    console.log("Deleting event:", eventId);
  }
}
