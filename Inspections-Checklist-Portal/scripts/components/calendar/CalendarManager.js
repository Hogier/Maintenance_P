export default class CalendarManager {
  constructor(container) {
    this.container = container;
    this.currentDate = new Date();
    this.init();
  }

  init() {
    this.bindEvents();
    this.renderCalendar();
  }

  bindEvents() {
    const prevBtn = this.container.querySelector("#prev-month");
    const nextBtn = this.container.querySelector("#next-month");

    if (prevBtn) prevBtn.addEventListener("click", () => this.changeMonth(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => this.changeMonth(1));
  }

  renderCalendar() {
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

    const monthDisplay = this.container.querySelector("#current-month");
    if (monthDisplay) {
      monthDisplay.textContent = `${
        monthNames[this.currentDate.getMonth()]
      } ${this.currentDate.getFullYear()}`;
    }

    // Calendar rendering logic will be here
  }

  changeMonth(delta) {
    this.currentDate.setMonth(this.currentDate.getMonth() + delta);
    this.renderCalendar();
  }
}
