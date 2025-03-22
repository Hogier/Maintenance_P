export default class ConstructionManager {
  constructor(container) {
    this.container = container;
    this.contractors = [];
    this.currentProjects = [];
    this.futureProjects = [];
    this.activeTab = "contractors";
    this.handleRating = this.handleRating.bind(this);
    this.filters = {
      contractors: {
        search: "",
        businessType: "all",
        rating: "all",
      },
      currentProjects: {
        search: "",
        location: "",
        status: "all",
        date: "all",
      },
      futureProjects: {
        search: "",
        location: "",
        priority: "all",
        date: "all",
      },
    };
    this.init();
  }

  init() {
    // Initialize navigation
    this.initNavigation();

    // Initialize event listeners
    this.initEventListeners();

    // Initialize datepickers for forms
    this.initDatepickers();

    // Load initial data
    this.loadData();

    // Call section specific initialization based on the current active section
    this.onSectionChange();
  }

  // Метод инициализации календарей для полей даты
  initDatepickers() {
    // Проверяем, доступен ли flatpickr
    if (typeof flatpickr === "undefined") {
      // Загружаем CSS без вывода предупреждения
      const linkElem = document.createElement("link");
      linkElem.rel = "stylesheet";
      linkElem.href =
        "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css";
      document.head.appendChild(linkElem);

      // Загружаем JavaScript
      const scriptElem = document.createElement("script");
      scriptElem.src = "https://cdn.jsdelivr.net/npm/flatpickr";
      scriptElem.onload = () => {
        console.log("Flatpickr loaded successfully");
        // После загрузки библиотеки инициализируем календари для открытых форм
        const currentProjectModal = this.container.querySelector(
          "#current-project-modal"
        );
        const futureProjectModal = this.container.querySelector(
          "#future-project-modal"
        );

        if (
          currentProjectModal &&
          currentProjectModal.classList.contains("active")
        ) {
          const form = currentProjectModal.querySelector("form");
          this.initFormDatepickers(form);
        }

        if (
          futureProjectModal &&
          futureProjectModal.classList.contains("active")
        ) {
          const form = futureProjectModal.querySelector("form");
          this.initFormDatepickers(form);
        }
      };
      scriptElem.onerror = (err) => {
        console.error("Failed to load Flatpickr:", err);
      };
      document.head.appendChild(scriptElem);
      return;
    }

    // Настройки для календаря
    const dateConfig = {
      dateFormat: "m-d-y", // Формат MM-DD-YY
      allowInput: true, // Позволяет ручной ввод даты
      disableMobile: false, // Использовать нативный календарь на мобильных устройствах
      static: true, // Предотвращает исчезновение календаря при клике вне его
      onChange: (selectedDates, dateStr) => {
        // При изменении даты можно добавить дополнительную логику
        console.log("Выбрана дата:", dateStr);
      },
    };

    // При первичной инициализации календари не нужны,
    // они будут инициализированы при открытии модальных окон
  }

  // Инициализация календарей для конкретной формы
  initFormDatepickers(form) {
    // Находим все поля для ввода даты
    const dateInputs = form.querySelectorAll(
      'input[name="startDate"], input[name="endDate"], input[name="lastUpdate"]'
    );
    if (dateInputs.length === 0) return;

    // Проверяем, что flatpickr доступен
    if (typeof flatpickr === "undefined") {
      // Если библиотека еще не загружена, пробуем еще раз через небольшую задержку
      setTimeout(() => this.initFormDatepickers(form), 500);
      return;
    }

    // Настройки для календаря
    const dateConfig = {
      dateFormat: "m-d-y", // Формат MM-DD-YY
      allowInput: true, // Позволяет ручной ввод даты
      disableMobile: false, // Использовать нативный календарь на мобильных устройствах
      static: true, // Предотвращает исчезновение календаря при клике вне его
    };

    // Инициализируем календарь для каждого поля
    dateInputs.forEach((input) => {
      // Удаляем существующий экземпляр flatpickr, если он уже был инициализирован
      if (input._flatpickr) {
        input._flatpickr.destroy();
      }

      // Создаем новый экземпляр
      flatpickr(input, dateConfig);
    });

    console.log(`Initialized ${dateInputs.length} date pickers in form`);
  }

  initNavigation() {
    // Находим все навигационные вкладки
    const navItems = this.container.querySelectorAll(".tab");

    // Добавляем обработчики событий для каждой вкладки
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const targetSection = e.currentTarget.dataset.section;

        // Удаляем активный класс со всех вкладок и секций
        this.container.querySelectorAll(".tab").forEach((tab) => {
          tab.classList.remove("active");
        });
        this.container
          .querySelectorAll(".construction-section")
          .forEach((section) => {
            section.classList.remove("active");
          });

        // Добавляем активный класс к выбранной вкладке и секции
        e.currentTarget.classList.add("active");
        this.container
          .querySelector(`#${targetSection}`)
          .classList.add("active");

        // Обновляем заголовок в зависимости от выбранной секции
        const sectionTitle = this.container.querySelector("#section-title");
        if (sectionTitle) {
          sectionTitle.textContent =
            targetSection === "contractors-section"
              ? "Contractors"
              : targetSection === "current-projects-section"
              ? "Current Projects"
              : "Future Projects";
        }

        // Показываем соответствующие фильтры
        this.container.querySelectorAll(".filter-group").forEach((group) => {
          group.style.display = "none";
        });

        // Показываем фильтры для активной секции
        const filterGroup = this.container.querySelector(
          `#${targetSection.replace("-section", "-filters")}`
        );
        if (filterGroup) {
          filterGroup.style.display = "flex";
        }

        // Вызываем обработчик изменения секции
        this.onSectionChange(targetSection);
      });
    });

    // Устанавливаем начальную активную секцию
    const activeTab =
      this.container.querySelector(".tab.active") ||
      this.container.querySelector(".tab");
    if (activeTab) {
      activeTab.click();
    }
  }

  initEventListeners() {
    // Обработчики для контракторов
    this.container
      .querySelector("#add-contractor")
      ?.addEventListener("click", () => {
        this.showContractorModal();
      });

    // Обработчики для проектов
    this.container
      .querySelector("#add-current-project")
      ?.addEventListener("click", () => {
        this.showProjectModal("current");
      });

    this.container
      .querySelector("#add-future-project")
      ?.addEventListener("click", () => {
        this.showProjectModal("future");
      });

    // Обработчики закрытия модальных окон
    this.container
      .querySelectorAll(".close-modal, .btn-secondary.close-modal")
      .forEach((button) => {
        button.addEventListener("click", () => {
          this.closeModals();
        });
      });

    // Обработчики форм
    this.container
      .querySelector("#contractor-form")
      ?.addEventListener("submit", (e) => {
        this.handleContractorSubmit(e);
      });

    this.container
      .querySelector("#current-project-form")
      ?.addEventListener("submit", (e) => {
        this.handleProjectSubmit(e);
      });

    this.container
      .querySelector("#future-project-form")
      ?.addEventListener("submit", (e) => {
        this.handleProjectSubmit(e);
      });

    // Обработчики для фильтров
    this.setupSearchFilters();

    // Обработчики для рейтинга
    this.setupRatingHandlers();
  }

  onSectionChange(sectionId) {
    // Если секция не указана, используем активную
    if (!sectionId) {
      const activeSection = this.container.querySelector(
        ".construction-section.active"
      );
      if (activeSection) {
        sectionId = activeSection.id;
      } else {
        return;
      }
    }

    // Вызываем специфические действия для каждой секции
    if (sectionId === "contractors-section") {
      this.renderContractors();
    } else if (sectionId === "current-projects-section") {
      this.renderProjects("current");
    } else if (sectionId === "future-projects-section") {
      this.renderProjects("future");
    }

    // Update statistics for the active section
    if (sectionId === "current-projects-section") {
      this.updateProjectStatistics("current");
    } else if (sectionId === "future-projects-section") {
      this.updateProjectStatistics("future");
    }
  }

  async loadData() {
    try {
      // Here will be API calls to load data
      // For now using mock data
      await this.loadContractors();
      this.updateBusinessTypeFilter(); // Обновляем список типов бизнеса после загрузки
      await this.loadCurrentProjects();
      await this.loadFutureProjects();
      this.renderActiveSection();

      // Update statistics for both sections after loading data
      this.updateProjectStatistics("current");
      this.updateProjectStatistics("future");
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  switchTab(tab) {
    this.container
      .querySelectorAll(".construction-section")
      .forEach((s) => s.classList.remove("active"));

    // Update section title
    const sectionTitle = this.container.querySelector("#section-title");
    if (sectionTitle) {
      sectionTitle.textContent =
        tab === "contractors"
          ? "Contractors"
          : tab === "current-projects"
          ? "Current Projects"
          : "Future Projects";
    }

    // Show appropriate section
    this.container.querySelector(`#${tab}-section`).classList.add("active");

    // Update filters visibility
    const contractorsFilters = this.container.querySelector(
      "#contractors-filters"
    );
    const currentProjectsFilters = this.container.querySelector(
      "#current-projects-filters"
    );
    const futureProjectsFilters = this.container.querySelector(
      "#future-projects-filters"
    );

    if (contractorsFilters) {
      contractorsFilters.style.display =
        tab === "contractors" ? "flex" : "none";
    }
    if (currentProjectsFilters) {
      currentProjectsFilters.style.display =
        tab === "current-projects" ? "flex" : "none";
    }
    if (futureProjectsFilters) {
      futureProjectsFilters.style.display =
        tab === "future-projects" ? "flex" : "none";
    }

    // Update add buttons visibility
    const addContractorBtn = this.container.querySelector("#add-contractor");
    const addCurrentProjectBtn = this.container.querySelector(
      "#add-current-project"
    );
    const addFutureProjectBtn = this.container.querySelector(
      "#add-future-project"
    );

    if (addContractorBtn) {
      addContractorBtn.style.display = tab === "contractors" ? "block" : "none";
    }
    if (addCurrentProjectBtn) {
      addCurrentProjectBtn.style.display =
        tab === "current-projects" ? "block" : "none";
    }
    if (addFutureProjectBtn) {
      addFutureProjectBtn.style.display =
        tab === "future-projects" ? "block" : "none";
    }

    this.activeTab = tab;
    this.renderActiveSection();

    // Update project statistics when switching to project tabs
    if (tab === "current-projects") {
      this.updateProjectStatistics("current");
    } else if (tab === "future-projects") {
      this.updateProjectStatistics("future");
    }
  }

  renderActiveSection() {
    switch (this.activeTab) {
      case "contractors":
        this.renderContractors();
        break;
      case "current-projects":
        this.renderProjects("current");
        break;
      case "future-projects":
        this.renderProjects("future");
        break;
    }
  }

  // Методы для работы с подрядчиками
  async loadContractors() {
    // Здесь будет API запрос
    this.contractors = [
      {
        id: 1,
        companyName: "ABC Construction",
        businessType: "General Construction",
        location: "New York",
        email: "contact@abc.com",
        phone: "+1234567890",
        rating: 4,
        contactPerson: {
          name: "John Doe",
          position: "Project Manager",
          phone: "+1234567891",
          email: "john.doe@example.com",
        },
        employees: [
          {
            id: 1,
            fullName: "John Doe",
            position: "Project Manager",
            phone: "+1234567891",
          },
        ],
      },
    ];
  }

  renderContractors() {
    const container = this.container.querySelector("#contractors-list");
    if (!container) return;

    if (this.contractors.length === 0) {
      container.innerHTML = `
            <div class="no-contractors">
                <i class="fas fa-building"></i>
                <h3>No Contractors Yet</h3>
                <p>Click the "Add Contractor" button to add your first contractor</p>
            </div>
        `;
      return;
    }

    container.innerHTML = this.contractors
      .map(
        (contractor) => `
      <div class="contractor-card" data-id="${contractor.id}">
        <div class="contractor-header">
          <h3>${contractor.companyName}</h3>
          <div class="contractor-rating">
            ${this.generateRatingStars(contractor.rating)}
          </div>
        </div>
        <div class="contractor-info">
          <div class="info-item">
            <i class="fas fa-briefcase"></i>
            <span>${contractor.businessType}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-location-dot"></i>
            <span>${contractor.location}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-envelope"></i>
            <span>${contractor.email}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-phone"></i>
            <span>${contractor.phone}</span>
          </div>
        </div>
        <div class="contact-person-info">
          <h4>Contact Person</h4>
          <div class="info-item">
            <i class="fas fa-user"></i>
            <span>${contractor.contactPerson.name}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-id-badge"></i>
            <span>${contractor.contactPerson.position}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-phone"></i>
            <span>${contractor.contactPerson.phone}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-envelope"></i>
            <span>${contractor.contactPerson.email}</span>
          </div>
        </div>
        <div class="contractor-employees">
          <h4>Employees (${contractor.employees.length})</h4>
          <div class="employees-list">
            ${this.renderEmployeesList(contractor.employees)}
          </div>
          <button class="btn-secondary add-employee" data-contractor-id="${
            contractor.id
          }">
            <i class="fas fa-user-plus"></i> Add Employee
          </button>
        </div>
        <div class="contractor-actions">
          <button class="btn-action edit" data-contractor-id="${contractor.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-action delete" data-contractor-id="${
            contractor.id
          }">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `
      )
      .join("");

    // Добавляем обработчики событий после рендеринга
    this.bindEmployeeEvents();

    // Add event handlers for contractor edit and delete buttons
    this.container
      .querySelectorAll(".contractor-actions .btn-action.edit")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          const contractorId = parseInt(button.dataset.contractorId);
          const contractor = this.contractors.find(
            (c) => c.id === contractorId
          );
          if (contractor) {
            this.showContractorModal(contractor);
          }
        });
      });

    this.container
      .querySelectorAll(".contractor-actions .btn-action.delete")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          const contractorId = parseInt(button.dataset.contractorId);
          this.deleteContractor(contractorId);
        });
      });
  }

  renderEmployeesList(employees) {
    return employees
      .map(
        (employee) => `
        <div class="employee-item">
            <div class="employee-info">
                <strong>${employee.fullName}</strong>
                <span>${employee.position}</span>
                <span>${employee.phone}</span>
            </div>
            <div class="employee-actions">
                <button class="btn-action edit" data-employee-id="${employee.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action delete" data-employee-id="${employee.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `
      )
      .join("");
  }

  bindEmployeeEvents() {
    // Обработчики для кнопок редактирования сотрудников
    this.container
      .querySelectorAll(".employee-actions .btn-action.edit")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          const employeeId = parseInt(button.dataset.employeeId);
          const contractorId = parseInt(
            button.closest(".contractor-card").dataset.id
          );
          this.editEmployee(contractorId, employeeId);
        });
      });

    // Обработчики для кнопок удаления сотрудников
    this.container
      .querySelectorAll(".employee-actions .btn-action.delete")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          const employeeId = parseInt(button.dataset.employeeId);
          const contractorId = parseInt(
            button.closest(".contractor-card").dataset.id
          );
          this.deleteEmployee(contractorId, employeeId);
        });
      });

    // Обработчики для кнопок добавления сотрудников
    this.container.querySelectorAll(".add-employee").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const contractorId = parseInt(button.dataset.contractorId);
        this.showEmployeeModal(contractorId);
      });
    });
  }

  showEmployeeModal(contractorId, employee = null) {
    const modal = this.container.querySelector("#employee-modal");
    const form = modal.querySelector("#employee-form");
    const title = modal.querySelector("#employee-modal-title");

    title.textContent = employee ? "Edit Employee" : "Add Employee";

    form.elements.contractorId.value = contractorId;

    if (employee) {
      form.elements.fullName.value = employee.fullName;
      form.elements.position.value = employee.position;
      form.elements.phone.value = employee.phone;
      form.dataset.employeeId = employee.id;
    } else {
      form.reset();
      form.elements.contractorId.value = contractorId;
      delete form.dataset.employeeId;
    }

    modal.classList.add("active");
  }

  editEmployee(contractorId, employeeId) {
    const contractor = this.contractors.find((c) => c.id === contractorId);
    if (contractor) {
      const employee = contractor.employees.find((e) => e.id === employeeId);
      if (employee) {
        this.showEmployeeModal(contractorId, employee);
      }
    }
  }

  deleteEmployee(contractorId, employeeId) {
    if (confirm("Are you sure you want to delete this employee?")) {
      const contractor = this.contractors.find((c) => c.id === contractorId);
      if (contractor) {
        contractor.employees = contractor.employees.filter(
          (e) => e.id !== employeeId
        );
        this.renderContractors();
      }
    }
  }

  handleEmployeeSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const contractorId = parseInt(form.elements.contractorId.value);
    const employeeData = {
      fullName: form.elements.fullName.value,
      position: form.elements.position.value,
      phone: form.elements.phone.value,
    };

    if (form.dataset.employeeId) {
      // Редактирование существующего сотрудника
      const employeeId = parseInt(form.dataset.employeeId);
      this.updateEmployee(contractorId, employeeId, employeeData);
    } else {
      // Добавление нового сотрудника
      this.addEmployeeToContractor(contractorId, employeeData);
    }

    this.closeModals();
  }

  addEmployeeToContractor(contractorId, data) {
    const contractor = this.contractors.find((c) => c.id === contractorId);
    if (contractor) {
      data.id = Date.now();
      contractor.employees.push(data);
      this.renderContractors();
    }
  }

  updateEmployee(contractorId, employeeId, data) {
    const contractor = this.contractors.find((c) => c.id === contractorId);
    if (contractor) {
      const index = contractor.employees.findIndex((e) => e.id === employeeId);
      if (index !== -1) {
        contractor.employees[index] = {
          ...contractor.employees[index],
          ...data,
        };
        this.renderContractors();
      }
    }
  }

  // Методы для работы с проектами
  async loadCurrentProjects() {
    // Здесь будет API запрос
    this.currentProjects = [
      {
        id: 1,
        name: "Office Renovation",
        location: "Manhattan",
        startDate: "2024-03-01",
        endDate: "2024-06-30",
        contractorId: 1,
        contactPersonId: 1,
        status: "in-progress",
      },
    ];
  }

  async loadFutureProjects() {
    // Здесь будет API запрос
    this.futureProjects = [
      {
        id: 1,
        name: "New Building Complex",
        location: "Brooklyn",
        startDate: "2024-07-01",
        endDate: "2025-12-31",
        contractorId: 1,
        contactPersonId: 1,
        status: "planned",
        budget: 1000000,
        files: [],
      },
    ];
  }

  renderProjects(type, projectsToRender = null) {
    const projects =
      projectsToRender ||
      (type === "current" ? this.currentProjects : this.futureProjects);
    const container = this.container.querySelector(`#${type}-projects-list`);

    if (!container) return;

    container.innerHTML = "";

    if (!projects || projects.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <p>No projects found</p>
        </div>
      `;

      // Update statistics even if no projects are found
      this.updateProjectStatistics(type);
      return;
    }

    projects.forEach((project) => {
      const contractor = this.contractors.find(
        (c) => c.id === project.contractorId
      );
      const template = this.container.querySelector(
        `#${type}-project-card-template`
      );
      const card = template.content.cloneNode(true);

      // Set project ID
      card.querySelector(".project-card").dataset.id = project.id;

      // Set project name and status
      card.querySelector(".project-name").textContent = project.name;
      const statusSelect = card.querySelector(".status-select");
      statusSelect.value = project.status;
      statusSelect.dataset.projectId = project.id;

      // Обновляем классы статуса
      this.updateStatusClasses(statusSelect, project.status);

      // Set project details
      card.querySelector(".location").textContent = project.location;

      // Форматируем даты для отображения
      const startDateFormatted = this.formatDateForDisplay(project.startDate);
      const endDateFormatted = this.formatDateForDisplay(project.endDate);
      card.querySelector(
        ".dates"
      ).textContent = `${startDateFormatted} - ${endDateFormatted}`;

      if (type === "current") {
        this.renderCurrentProjectDetails(card, project, contractor);
      } else {
        this.renderFutureProjectDetails(card, project, contractor);
      }

      // Добавляем карточку в контейнер
      container.appendChild(card);
    });

    // After rendering all projects, update the statistics
    this.updateProjectStatistics(type);

    // Bind events to project cards
    this.bindProjectCardEvents(type);

    // Привязываем события к предпросмотрам файлов для всех открытых проектов
    const detailSections = container.querySelectorAll(
      '.project-details[style*="display: block"]'
    );
    detailSections.forEach((section) => {
      this.bindFilePreviewEvents(section);
    });
  }

  updateStatusClasses(statusSelect, status) {
    // Удаляем все существующие классы статуса
    statusSelect.classList.remove(
      "planned",
      "in-progress",
      "completed",
      "on-hold",
      "move-to-current",
      "delayed"
    );

    // Добавляем новый класс статуса
    statusSelect.classList.add(status);

    // Сбрасываем inline стили, которые могли быть установлены ранее
    statusSelect.style.backgroundColor = "";
    statusSelect.style.color = "";
    statusSelect.style.borderColor = "";

    // Определяем цвета в зависимости от статуса
    let colors = {
      planned: {
        bg: "#e3f2fd",
        color: "#1976d2",
        border: "#90caf9",
      },
      "in-progress": {
        bg: "#fff3e0",
        color: "#f57c00",
        border: "#ffcc80",
      },
      completed: {
        bg: "#e8f5e9",
        color: "#388e3c",
        border: "#a5d6a7",
      },
      "on-hold": {
        bg: "#ffebee",
        color: "#d32f2f",
        border: "#ef9a9a",
      },
      "move-to-current": {
        bg: "#f3e5f5",
        color: "#7b1fa2",
        border: "#ce93d8",
      },
      delayed: {
        bg: "#ffebee",
        color: "#d32f2f",
        border: "#ef9a9a",
      },
    };

    // Применяем стили, если статус найден в нашем объекте
    if (colors[status]) {
      statusSelect.style.backgroundColor = colors[status].bg;
      statusSelect.style.color = colors[status].color;
      statusSelect.style.borderColor = colors[status].border;
      statusSelect.style.borderWidth = "1px";
      statusSelect.style.borderStyle = "solid";
    }
  }

  renderCurrentProjectDetails(card, project, contractor) {
    // Set current project specific details
    card.querySelector(".progress").textContent = project.progress
      ? `${project.progress}%`
      : "Not started";
    card.querySelector(".actual-cost").textContent = project.actualCost
      ? `$${project.actualCost.toLocaleString()}`
      : "Not specified";
    card.querySelector(".contractor").textContent = contractor
      ? contractor.companyName
      : "Not assigned";
    card.querySelector(".project-manager").textContent =
      contractor && contractor.contactPerson
        ? `${contractor.contactPerson.name} (${contractor.contactPerson.position})`
        : "Not assigned";

    // Форматируем дату последнего обновления
    const lastUpdateFormatted = project.lastUpdate
      ? this.formatDateForDisplay(project.lastUpdate)
      : "Not updated";
    card.querySelector(".last-update").textContent = lastUpdateFormatted;

    // Set file previews
    if (project.photos && project.photos.length > 0) {
      card.querySelector(".photos-preview").innerHTML = this.renderFilePreviews(
        project.photos,
        "photo"
      );
    }
    if (project.documents && project.documents.length > 0) {
      card.querySelector(".documents-preview").innerHTML =
        this.renderFilePreviews(project.documents, "document");
    }
    if (project.reports && project.reports.length > 0) {
      card.querySelector(".reports-preview").innerHTML =
        this.renderFilePreviews(project.reports, "report");
    }
  }

  renderFutureProjectDetails(card, project, contractor) {
    // Future project specific details
    card.querySelector(".budget").textContent = project.budget
      ? `$${project.budget.toLocaleString()}`
      : "Not specified";
    card.querySelector(".priority").textContent = project.priority
      ? project.priority.charAt(0).toUpperCase() + project.priority.slice(1)
      : "Not specified";
    card.querySelector(".preferred-contractor").textContent = contractor
      ? contractor.companyName
      : "Not assigned";
    card.querySelector(".project-manager").textContent =
      contractor && contractor.contactPerson
        ? `${contractor.contactPerson.name} (${contractor.contactPerson.position})`
        : "Not assigned";

    // Set planning details
    card.querySelector(".description").textContent =
      project.description || "No description available";
    card.querySelector(".objectives").textContent =
      project.objectives || "No objectives defined";
    card.querySelector(".risks").textContent =
      project.risks || "No risks identified";

    // Set file previews
    if (project.documents && project.documents.length > 0) {
      card.querySelector(".documents-preview").innerHTML =
        this.renderFilePreviews(project.documents, "document");
    }
    if (project.specifications && project.specifications.length > 0) {
      card.querySelector(".specifications-preview").innerHTML =
        this.renderFilePreviews(project.specifications, "specification");
    }
    if (project.budgetDocs && project.budgetDocs.length > 0) {
      card.querySelector(".budget-docs-preview").innerHTML =
        this.renderFilePreviews(project.budgetDocs, "budgetDoc");
    }
  }

  renderFilePreviews(files, type) {
    return files
      .map((file, index) => {
        const isImage =
          file.type?.startsWith("image/") ||
          (file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i));
        const fileIcon = this.getFileIcon(
          file.type || "application/octet-stream"
        );
        const previewUrl =
          isImage && file.src
            ? file.src
            : isImage && URL.createObjectURL
            ? URL.createObjectURL(file)
            : null;
        const fileName = file.name || `File ${index + 1}`;

        return `
        <div class="file-preview-item" 
            data-file-index="${index}" 
            data-file-type="${type}" 
            data-file-name="${fileName}"
            data-mime-type="${file.type || "application/octet-stream"}">
          ${
            isImage && previewUrl
              ? `
            <img src="${previewUrl}" alt="${fileName}">
          `
              : `
            <div class="file-type-icon">
              <i class="${fileIcon}"></i>
            </div>
          `
          }
          <div class="file-name">${fileName}</div>
        </div>
      `;
      })
      .join("");
  }

  getFileIcon(fileType) {
    if (fileType.startsWith("image/")) return "fas fa-image";
    if (fileType.includes("pdf")) return "fas fa-file-pdf";
    if (fileType.includes("word")) return "fas fa-file-word";
    if (fileType.includes("excel") || fileType.includes("spreadsheet"))
      return "fas fa-file-excel";
    return "fas fa-file";
  }

  addFilePreview(file, container, type) {
    if (!container) return;

    const previewItem = document.createElement("div");
    previewItem.className = "file-preview-item";
    previewItem.dataset.fileType = type;
    previewItem.dataset.fileName = file.name;

    // Сохраняем тип файла для определения способа открытия
    previewItem.dataset.mimeType = file.type || "application/octet-stream";

    if (file.type.startsWith("image/")) {
      const img = document.createElement("img");
      const imgUrl = URL.createObjectURL(file);
      img.src = imgUrl;
      img.alt = file.name;
      // Сохраняем URL изображения для освобождения ресурсов позже
      previewItem.dataset.imgUrl = imgUrl;
      previewItem.appendChild(img);
    } else {
      const icon = document.createElement("div");
      icon.className = "file-type-icon";
      icon.innerHTML = `<i class="${this.getFileIcon(file.type)}"></i>`;
      previewItem.appendChild(icon);
    }

    const fileName = document.createElement("div");
    fileName.className = "file-name";
    fileName.textContent = file.name;
    previewItem.appendChild(fileName);

    // Добавляем кнопку удаления
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-file";
    removeBtn.innerHTML = "×";
    removeBtn.title = "Remove file";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Предотвращаем всплытие клика
      // Если есть URL изображения, освобождаем его
      if (previewItem.dataset.imgUrl) {
        URL.revokeObjectURL(previewItem.dataset.imgUrl);
      }
      container.removeChild(previewItem);
    });
    previewItem.appendChild(removeBtn);

    container.appendChild(previewItem);
  }

  bindProjectCardEvents(type) {
    // Status change handler
    const statusSelects = document.querySelectorAll(".status-select");
    statusSelects.forEach((select) => {
      select.addEventListener("change", (e) => {
        e.stopPropagation();
        const projectId = parseInt(select.dataset.projectId);
        const newStatus = e.target.value;
        this.updateProjectStatus(projectId, newStatus, type);
      });
    });

    // Toggle details button handler
    const toggleButtons = document.querySelectorAll(".btn-toggle-details");
    toggleButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const projectCard = e.target.closest(".project-card");
        if (projectCard) {
          const detailsSection = projectCard.querySelector(".project-details");
          if (detailsSection) {
            button.classList.toggle("active");
            detailsSection.classList.toggle("active");
            const icon = button.querySelector("i");
            if (icon) {
              icon.style.transform = button.classList.contains("active")
                ? "rotate(180deg)"
                : "rotate(0)";
            }

            // Если детали были открыты, добавляем обработчики для файловых превью
            if (detailsSection.classList.contains("active")) {
              this.bindFilePreviewEvents(detailsSection);
            }
          }
        }
      });
    });

    // Edit project handler
    this.container.querySelectorAll(".edit-project").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const projectCard = button.closest(".project-card");
        const projectId = parseInt(projectCard.dataset.id);
        const projectsList = projectCard.closest(".projects-grid");
        const projectType =
          projectsList.id === "current-projects-list" ? "current" : "future";
        const project = this.getProjectById(projectId, projectType);
        if (project) {
          this.showProjectModal(projectType, project);
        }
      });
    });

    // Delete project handler
    this.container.querySelectorAll(".delete-project").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const projectCard = button.closest(".project-card");
        const projectId = parseInt(projectCard.dataset.id);
        const projectsList = projectCard.closest(".projects-grid");
        const projectType =
          projectsList.id === "current-projects-list" ? "current" : "future";
        if (confirm("Are you sure you want to delete this project?")) {
          this.deleteProject(projectId, projectType);
        }
      });
    });
  }

  // Добавляем новый метод для привязки обработчиков к превью файлов
  bindFilePreviewEvents(container) {
    // Находим все превью файлов в контейнере
    const filePreviewItems = container.querySelectorAll(".file-preview-item");

    filePreviewItems.forEach((previewItem) => {
      // Клонируем элемент, чтобы удалить предыдущие обработчики
      const newPreviewItem = previewItem.cloneNode(true);
      previewItem.parentNode.replaceChild(newPreviewItem, previewItem);

      // Добавляем обработчик клика
      newPreviewItem.addEventListener("click", () => {
        const img = newPreviewItem.querySelector("img");
        if (img) {
          // Для изображений открываем модальное окно
          this.showFilePreviewModal(img.src);
        } else {
          // Для других файлов отображаем сообщение (позже можно заменить на реальное открытие файла)
          const fileName = newPreviewItem.dataset.fileName || "файл";
          alert(`Opening file: ${fileName}`);
        }
      });
    });
  }

  handleProjectAction(projectId, action) {
    const projectCard = document.querySelector(
      `.project-card[data-project-id="${projectId}"]`
    );
    if (!projectCard) return;

    const projectsList = projectCard.closest(".projects-grid");
    const projectType =
      projectsList.id === "current-projects-list" ? "current" : "future";
    const project = this.getProjectById(projectId, projectType);

    if (!project) return;

    switch (action) {
      case "edit":
        this.showProjectModal(projectType, project);
        break;
      case "delete":
        if (confirm("Are you sure you want to delete this project?")) {
          this.deleteProject(projectId, projectType);
        }
        break;
      default:
        console.warn("Unknown project action:", action);
    }
  }

  showFilePreview(file) {
    const modal = this.container.querySelector(".preview-modal");
    const previewContent = modal.querySelector(".preview-content img");

    if (file.type.startsWith("image/")) {
      previewContent.src = URL.createObjectURL(file);
      modal.classList.add("active");
    } else {
      // For non-image files, you might want to show a different preview or download option
      window.open(URL.createObjectURL(file), "_blank");
    }
  }

  closeFilePreview() {
    const modal = this.container.querySelector(".preview-modal");
    const previewContent = modal.querySelector(".preview-content img");

    if (previewContent.src) {
      URL.revokeObjectURL(previewContent.src);
    }

    modal.classList.remove("active");
  }

  getProjectById(id, type) {
    // Убедимся, что id - это число
    id = parseInt(id);

    if (isNaN(id)) {
      console.error("Invalid project ID:", id);
      return null;
    }

    const projects =
      type === "current" ? this.currentProjects : this.futureProjects;
    return projects.find((p) => p.id === id) || null;
  }

  updateProjectStatus(projectId, newStatus, type) {
    const project = this.getProjectById(parseInt(projectId), type);
    if (!project) return;

    if (type === "future" && newStatus === "move-to-current") {
      // Перемещаем проект из future в current
      this.futureProjects = this.futureProjects.filter(
        (p) => p.id !== projectId
      );

      // Устанавливаем начальный статус для текущего проекта
      project.status = "in-progress";

      // Копируем значение Budget из будущего проекта в Actual Cost текущего проекта
      if (project.budget) {
        console.log(
          `Moving project: Budget value ${project.budget} transferred to Actual Cost`
        );
        project.actualCost = project.budget;
      } else {
        console.log(`Moving project: No budget value found to transfer`);
      }

      // Устанавливаем начальный прогресс
      if (!project.progress) {
        project.progress = 0;
      }

      this.currentProjects.push(project);

      // Update both sections' stats when moving a project between sections
      this.renderProjects("future");
      this.renderProjects("current");
      this.updateProjectStatistics("future");
      this.updateProjectStatistics("current");
    } else {
      // Обновляем статус в текущем разделе
      project.status = newStatus;

      // Обновляем классы статуса для элемента select
      const statusSelect = this.container.querySelector(
        `.status-select[data-project-id="${projectId}"]`
      );
      if (statusSelect) {
        this.updateStatusClasses(statusSelect, newStatus);
      }

      this.renderProjects(type);
      this.updateProjectStatistics(type);
    }
  }

  // Модальные окна
  showContractorModal(contractor = null) {
    const modal = this.container.querySelector("#contractor-modal");
    const form = modal.querySelector("#contractor-form");
    const title = modal.querySelector("#contractor-modal-title");

    title.textContent = contractor ? "Edit Contractor" : "Add Contractor";

    if (contractor) {
      form.elements.companyName.value = contractor.companyName;
      form.elements.businessType.value = contractor.businessType;
      form.elements.location.value = contractor.location;
      form.elements.email.value = contractor.email;
      form.elements.phone.value = contractor.phone;
      form.elements.contactName.value = contractor.contactPerson.name;
      form.elements.position.value = contractor.contactPerson.position;
      form.elements.contactPhone.value = contractor.contactPerson.phone;
      form.elements.contactEmail.value = contractor.contactPerson.email;
      this.setRating(contractor.rating);
      form.dataset.contractorId = contractor.id;
    } else {
      form.reset();
      this.setRating(0);
      delete form.dataset.contractorId;
    }

    modal.classList.add("active");
    setTimeout(() => this.setupRatingHandlers(), 0);
  }

  showProjectModal(type, project = null) {
    const modal = this.container.querySelector(
      `#${type === "current" ? "current" : "future"}-project-modal`
    );
    const form = modal.querySelector("form");
    const titleElement = modal.querySelector("h3");

    // Обновляем заголовок модального окна в зависимости от действия
    titleElement.textContent = project
      ? `Edit ${type === "current" ? "Current" : "Future"} Project`
      : `Add ${type === "current" ? "Current" : "Future"} Project`;

    // Устанавливаем тип проекта и ID, если редактируем существующий проект
    form.elements.projectType.value = type;

    // Добавляем обработчик выбора типа бизнеса для обновления списка подрядчиков
    const businessTypeSelect = form.elements.businessType;
    businessTypeSelect.onchange = () => {
      this.updateContractorSelectByBusinessType(
        businessTypeSelect.value,
        form.elements.contractorId
      );
    };

    // Заполняем список подрядчиков
    this.populateContractorSelect(form.elements.contractorId);

    // Добавляем обработчик выбора подрядчика для обновления списка контактных лиц
    const contractorSelect = form.elements.contractorId;
    contractorSelect.onchange = () => {
      this.updateContactPersonSelect(contractorSelect.value);
    };

    if (project) {
      form.dataset.projectId = project.id;

      // Заполняем форму данными проекта
      form.elements.projectName.value = project.name;
      form.elements.location.value = project.location;

      // Форматируем даты из YYYY-MM-DD в MM-DD-YY
      form.elements.startDate.value = this.formatDateForDisplay(
        project.startDate
      );
      form.elements.endDate.value = this.formatDateForDisplay(project.endDate);

      // Если у проекта уже есть businessType, устанавливаем его
      if (project.businessType) {
        form.elements.businessType.value = project.businessType;
        // После установки значения типа бизнеса, обновляем список подрядчиков
        this.updateContractorSelectByBusinessType(
          project.businessType,
          form.elements.contractorId
        );
      }

      // Устанавливаем значение подрядчика
      if (project.contractorId) {
        form.elements.contractorId.value = project.contractorId;
        // После установки значения подрядчика, обновляем список контактных лиц
        this.updateContactPersonSelect(project.contractorId);
      }

      // Поля, специфичные для текущих проектов
      if (type === "current") {
        form.elements.progress.value = project.progress || 0;
        form.elements.actualCost.value = project.actualCost || "";
        form.elements.status.value = project.status || "in-progress";
        form.elements.lastUpdate.value = project.lastUpdate
          ? this.formatDateForDisplay(project.lastUpdate)
          : "";
      }
      // Поля, специфичные для будущих проектов
      else {
        form.elements.budget.value = project.budget || "";
        form.elements.priority.value = project.priority || "medium";
        form.elements.description.value = project.description || "";
        form.elements.objectives.value = project.objectives || "";
        form.elements.risks.value = project.risks || "";
      }

      // Обновляем список контактных лиц после выбора подрядчика
      if (project.contactPersonId) {
        form.elements.contactPersonId.value = project.contactPersonId;
      }

      // Отображаем существующие файлы
      this.displayExistingFiles(project, type);
    } else {
      // Сбрасываем форму, если создаем новый проект
      form.reset();
      form.dataset.projectId = "";
      form.elements.projectType.value = type;
      this.clearFilePreviews(type);

      // Обновляем список контактных лиц на пустой
      const contactPersonSelect = form.elements.contactPersonId;
      contactPersonSelect.innerHTML =
        '<option value="">Select Contact Person</option>';
      contactPersonSelect.disabled = true;
    }

    // Настраиваем обработчики файлов
    this.setupFileUploadHandlers(type);

    // Инициализируем календари для формы
    this.initFormDatepickers(form);

    modal.classList.add("active");
  }

  displayExistingFiles(project, type) {
    const previewContainers = {
      current: {
        photos: this.container.querySelector("#current-photos-preview"),
        documents: this.container.querySelector("#current-documents-preview"),
        reports: this.container.querySelector("#current-reports-preview"),
      },
      future: {
        documents: this.container.querySelector("#future-documents-preview"),
        specifications: this.container.querySelector(
          "#future-specifications-preview"
        ),
        budgetDocs: this.container.querySelector("#future-budget-preview"),
      },
    };

    // Очищаем существующие превью
    Object.values(previewContainers[type]).forEach((container) => {
      if (container) container.innerHTML = "";
    });

    // Проверяем наличие проекта и его файлов перед отображением
    if (!project) return;

    // Отображаем файлы в соответствующие контейнеры
    if (type === "current") {
      if (project.photos && project.photos.length > 0) {
        project.photos.forEach((photo) => {
          this.addFilePreview(photo, previewContainers[type].photos, "photo");
        });
      }
      if (project.documents && project.documents.length > 0) {
        project.documents.forEach((doc) => {
          this.addFilePreview(
            doc,
            previewContainers[type].documents,
            "document"
          );
        });
      }
      if (project.reports && project.reports.length > 0) {
        project.reports.forEach((report) => {
          this.addFilePreview(
            report,
            previewContainers[type].reports,
            "report"
          );
        });
      }
    } else if (type === "future") {
      if (project.documents && project.documents.length > 0) {
        project.documents.forEach((doc) => {
          this.addFilePreview(
            doc,
            previewContainers[type].documents,
            "document"
          );
        });
      }
      if (project.specifications && project.specifications.length > 0) {
        project.specifications.forEach((spec) => {
          this.addFilePreview(
            spec,
            previewContainers[type].specifications,
            "specification"
          );
        });
      }
      if (project.budgetDocs && project.budgetDocs.length > 0) {
        project.budgetDocs.forEach((doc) => {
          this.addFilePreview(
            doc,
            previewContainers[type].budgetDocs,
            "budgetDoc"
          );
        });
      }
    }

    // Добавляем обработчики событий к файловым превью
    Object.values(previewContainers[type]).forEach((container) => {
      if (container) {
        this.bindFilePreviewEvents(container);
      }
    });
  }

  clearFilePreviews(type) {
    const previewContainers = {
      current: {
        photos: this.container.querySelector("#current-photos-preview"),
        documents: this.container.querySelector("#current-documents-preview"),
        reports: this.container.querySelector("#current-reports-preview"),
      },
      future: {
        documents: this.container.querySelector("#future-documents-preview"),
        specifications: this.container.querySelector(
          "#future-specifications-preview"
        ),
        budgetDocs: this.container.querySelector("#future-budget-preview"),
      },
    };

    Object.values(previewContainers[type]).forEach((container) => {
      if (container) container.innerHTML = "";
    });
  }

  setupFileUploadHandlers(type) {
    const fileInputs = {
      current: {
        photos: this.container.querySelector("#current-photos"),
        documents: this.container.querySelector("#current-documents"),
        reports: this.container.querySelector("#current-reports"),
      },
      future: {
        documents: this.container.querySelector("#future-documents"),
        specifications: this.container.querySelector("#future-specifications"),
        budgetDocs: this.container.querySelector("#future-budget"),
      },
    };

    // Удаляем предыдущие обработчики, чтобы избежать дублирования
    Object.entries(fileInputs[type]).forEach(([key, input]) => {
      if (input) {
        // Клонируем элемент, чтобы удалить все обработчики событий
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        newInput.addEventListener("change", (e) => {
          const previewContainer = this.container.querySelector(
            `#${type}-${key}-preview`
          );
          if (previewContainer) {
            // Очищаем контейнер перед добавлением новых файлов
            previewContainer.innerHTML = "";

            Array.from(e.target.files).forEach((file) => {
              this.addFilePreview(
                file,
                previewContainer,
                key === "photos" ? "photo" : "document"
              );
            });

            // Привязываем обработчики событий к новым файловым превью
            this.bindFilePreviewEvents(previewContainer);
          }
        });
      }
    });
  }

  // Обновленный метод для отображения превью изображений в модальном окне
  showFilePreviewModal(imageSrc) {
    const modal = this.container.querySelector(".preview-modal");
    const previewImage = modal.querySelector(".preview-content img");

    // Устанавливаем изображение и показываем модальное окно
    previewImage.src = imageSrc;
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";

    // Добавляем обработчик для закрытия модального окна по клику на кнопку закрытия
    const closeButton = modal.querySelector(".close-preview");

    // Функция закрытия модального окна
    const closePreviewHandler = () => {
      modal.style.display = "none";
      document.removeEventListener("keydown", escapeKeyHandler);
      closeButton.removeEventListener("click", closePreviewHandler);
      modal.removeEventListener("click", modalClickHandler);
    };

    // Закрытие по клику на кнопку закрытия
    closeButton.addEventListener("click", closePreviewHandler);

    // Закрытие по клику на фон (но не на само изображение)
    const modalClickHandler = (e) => {
      if (e.target === modal) {
        closePreviewHandler();
      }
    };
    modal.addEventListener("click", modalClickHandler);

    // Закрытие по нажатию клавиши Escape
    const escapeKeyHandler = (e) => {
      if (e.key === "Escape") {
        closePreviewHandler();
      }
    };
    document.addEventListener("keydown", escapeKeyHandler);
  }

  handleProjectSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const projectType = form.elements.projectType.value;
    const projectId = form.dataset.projectId;

    // Собираем основные данные проекта
    const projectData = {
      name: form.elements.projectName.value,
      location: form.elements.location.value,
      startDate: this.formatDateForStorage(form.elements.startDate.value),
      endDate: this.formatDateForStorage(form.elements.endDate.value),
      businessType: form.elements.businessType.value,
      contractorId: form.elements.contractorId.value,
      contactPersonId: form.elements.contactPersonId.value,
    };

    // Собираем файлы в зависимости от типа проекта
    if (projectType === "current") {
      // Current project specific fields
      projectData.progress = parseInt(form.elements.progress.value, 10);
      projectData.actualCost = parseFloat(form.elements.actualCost.value);
      projectData.status = form.elements.status.value;
      projectData.lastUpdate = form.elements.lastUpdate.value;

      // Сбор файлов из input элементов
      projectData.photos = Array.from(form.elements.photos?.files || []);
      projectData.documents = Array.from(form.elements.documents?.files || []);
      projectData.reports = Array.from(form.elements.reports?.files || []);

      // Если редактируем существующий проект, сохраняем ранее загруженные файлы
      if (projectId) {
        const existingProject = this.getProjectById(projectId, projectType);
        if (existingProject) {
          console.log(
            `Found existing project: ${JSON.stringify(existingProject)}`
          );
          // Объединяем существующие файлы с новыми
          if (projectData.photos.length === 0 && existingProject.photos) {
            projectData.photos = existingProject.photos;
          }
          if (projectData.documents.length === 0 && existingProject.documents) {
            projectData.documents = existingProject.documents;
          }
          if (projectData.reports.length === 0 && existingProject.reports) {
            projectData.reports = existingProject.reports;
          }
        }
      }
    } else {
      // Future project
      projectData.budget = parseFloat(form.elements.budget.value);
      projectData.priority = form.elements.priority.value;
      projectData.description = form.elements.description.value;
      projectData.objectives = form.elements.objectives.value;
      projectData.risks = form.elements.risks.value;

      // Сбор файлов из input элементов
      projectData.documents = Array.from(form.elements.documents?.files || []);
      projectData.specifications = Array.from(
        form.elements.specifications?.files || []
      );
      projectData.budgetDocs = Array.from(
        form.elements.budgetDocs?.files || []
      );

      // Если редактируем существующий проект, сохраняем ранее загруженные файлы
      if (projectId) {
        const existingProject = this.getProjectById(projectId, projectType);
        if (existingProject) {
          console.log(
            `Found existing project: ${JSON.stringify(existingProject)}`
          );
          // Объединяем существующие файлы с новыми
          if (projectData.documents.length === 0 && existingProject.documents) {
            projectData.documents = existingProject.documents;
          }
          if (
            projectData.specifications.length === 0 &&
            existingProject.specifications
          ) {
            projectData.specifications = existingProject.specifications;
          }
          if (
            projectData.budgetDocs.length === 0 &&
            existingProject.budgetDocs
          ) {
            projectData.budgetDocs = existingProject.budgetDocs;
          }
        }
      }
    }

    // Сохраняем или обновляем проект
    if (projectId) {
      this.updateProject(projectId, projectData, projectType);
    } else {
      this.createProject(projectData, projectType);
    }

    // Закрываем модальное окно
    const modal = this.container.querySelector(
      `#${projectType === "current" ? "current" : "future"}-project-modal`
    );
    modal.classList.remove("active");
  }

  // CRUD операции
  createContractor(data) {
    data.id = Date.now();
    this.contractors.push(data);
    this.updateBusinessTypeFilter(); // Обновляем список типов бизнеса
    this.renderContractors();
  }

  updateContractor(id, data) {
    const index = this.contractors.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.contractors[index] = { ...this.contractors[index], ...data };
      this.renderContractors();
    }
  }

  deleteContractor(id) {
    if (confirm("Are you sure you want to delete this contractor?")) {
      this.contractors = this.contractors.filter((c) => c.id !== id);
      this.renderContractors();
    }
  }

  createProject(data, type) {
    data.id = Date.now();
    data.status = type === "current" ? "in-progress" : "planned";

    if (type === "current") {
      data.progress = data.progress || 0;
      data.actualCost = data.actualCost || 0;
      data.lastUpdate = data.lastUpdate || new Date().toISOString();
      data.photos = data.photos || [];
      data.documents = data.documents || [];
      data.reports = data.reports || [];
    } else {
      data.budget = data.budget || 0;
      data.priority = data.priority || "medium";
      data.description = data.description || "";
      data.objectives = data.objectives || "";
      data.risks = data.risks || "";
      data.documents = data.documents || [];
      data.specifications = data.specifications || [];
      data.budgetDocs = data.budgetDocs || [];
    }

    if (type === "current") {
      this.currentProjects.push(data);
    } else {
      this.futureProjects.push(data);
    }

    this.renderProjects(type);
    this.updateProjectStatistics(type);
  }

  updateProject(id, data, type) {
    const projects =
      type === "current" ? this.currentProjects : this.futureProjects;
    const index = projects.findIndex((p) => p.id === id);

    if (index !== -1) {
      // Сохраняем старые данные проекта
      const oldProject = projects[index];

      // Создаем обновленный проект с сохранением ID и данных, которые не пришли в data
      projects[index] = {
        ...oldProject,
        ...data,
        id: oldProject.id, // Гарантируем, что ID не изменится
      };

      this.renderProjects(type);
      this.updateProjectStatistics(type);
    }
  }

  deleteProject(id, type) {
    if (confirm("Are you sure you want to delete this project?")) {
      if (type === "current") {
        this.currentProjects = this.currentProjects.filter((p) => p.id !== id);
      } else {
        this.futureProjects = this.futureProjects.filter((p) => p.id !== id);
      }
      this.renderProjects(type);
      this.updateProjectStatistics(type);
    }
  }

  handleRating(starElement) {
    const rating = parseInt(starElement.dataset.rating);
    const stars = starElement.parentElement.querySelectorAll("i");
    const ratingInput = this.container.querySelector('input[name="rating"]');

    // Обновляем отображение звезд
    stars.forEach((star, index) => {
      if (index < rating) {
        star.className = "fas fa-star";
      } else {
        star.className = "far fa-star";
      }
    });

    // Обновляем значение в скрытом поле
    if (ratingInput) {
      ratingInput.value = rating;
    }
  }

  // Метод для обновления списка типов бизнеса в фильтре
  updateBusinessTypeFilter() {
    const businessTypeFilter = this.container.querySelector(
      "#business-type-filter"
    );
    if (!businessTypeFilter) return;

    // Получаем уникальные типы бизнеса
    const businessTypes = [
      ...new Set(this.contractors.map((c) => c.businessType)),
    ];

    businessTypeFilter.innerHTML = `
        <option value="all">All Types</option>
        ${businessTypes
          .map(
            (type) => `
            <option value="${type}">${type}</option>
        `
          )
          .join("")}
    `;
  }

  // Метод для применения фильтров
  applyFilters() {
    const filteredContractors = this.contractors.filter((contractor) => {
      // Фильтр по названию компании
      const matchesSearch =
        contractor.companyName
          .toLowerCase()
          .includes(this.filters.contractors.search) ||
        contractor.businessType
          .toLowerCase()
          .includes(this.filters.contractors.search);

      // Фильтр по типу бизнеса
      const matchesBusinessType =
        this.filters.contractors.businessType === "all" ||
        contractor.businessType === this.filters.contractors.businessType;

      // Фильтр по рейтингу
      const matchesRating =
        this.filters.contractors.rating === "all" ||
        contractor.rating >= parseInt(this.filters.contractors.rating);

      return matchesSearch && matchesBusinessType && matchesRating;
    });

    this.renderFilteredContractors(filteredContractors);
  }

  // Метод для отображения отфильтрованных подрядчиков
  renderFilteredContractors(filteredContractors) {
    const container = this.container.querySelector("#contractors-list");
    if (!container) return;

    if (filteredContractors.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <h3>No contractors found</h3>
          <p>Try adjusting your search criteria</p>
        </div>
      `;
      return;
    }

    // Используем существующий метод рендеринга
    container.innerHTML = filteredContractors
      .map(
        (contractor) => `
      <div class="contractor-card" data-id="${contractor.id}">
        <div class="contractor-header">
          <h3>${contractor.companyName}</h3>
          <div class="contractor-rating">
            ${this.generateRatingStars(contractor.rating)}
          </div>
        </div>
        <div class="contractor-info">
          <div class="info-item">
            <i class="fas fa-briefcase"></i>
            <span>${contractor.businessType}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-location-dot"></i>
            <span>${contractor.location}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-envelope"></i>
            <span>${contractor.email}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-phone"></i>
            <span>${contractor.phone}</span>
          </div>
        </div>
        <div class="contact-person-info">
          <h4>Contact Person</h4>
          <div class="info-item">
            <i class="fas fa-user"></i>
            <span>${contractor.contactPerson.name}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-id-badge"></i>
            <span>${contractor.contactPerson.position}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-phone"></i>
            <span>${contractor.contactPerson.phone}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-envelope"></i>
            <span>${contractor.contactPerson.email}</span>
          </div>
        </div>
        <div class="contractor-employees">
          <h4>Employees (${contractor.employees.length})</h4>
          <div class="employees-list">
            ${this.renderEmployeesList(contractor.employees)}
          </div>
          <button class="btn-secondary add-employee" data-contractor-id="${
            contractor.id
          }">
            <i class="fas fa-user-plus"></i> Add Employee
          </button>
        </div>
        <div class="contractor-actions">
          <button class="btn-action edit" data-contractor-id="${contractor.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-action delete" data-contractor-id="${
            contractor.id
          }">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `
      )
      .join("");
  }

  // Метод для сброса фильтров
  resetFilters() {
    this.filters.contractors = {
      search: "",
      businessType: "all",
      rating: "all",
    };

    // Сбрасываем значения в форме
    const searchInput = this.container.querySelector("#contractor-search");
    const businessTypeFilter = this.container.querySelector(
      "#business-type-filter"
    );
    const ratingFilter = this.container.querySelector("#rating-filter");

    if (searchInput) searchInput.value = "";
    if (businessTypeFilter) businessTypeFilter.value = "all";
    if (ratingFilter) ratingFilter.value = "all";

    // Перерендериваем список
    this.renderContractors();
  }

  // Метод для заполнения списка подрядчиков
  populateContractorSelect(select) {
    // Очищаем текущий список
    select.innerHTML = '<option value="">Select Contractor</option>';

    // Заполняем список подрядчиками
    this.contractors.forEach((contractor) => {
      const option = document.createElement("option");
      option.value = contractor.id;
      option.textContent = `${contractor.companyName} (${contractor.businessType})`;
      select.appendChild(option);
    });
  }

  // Метод для обновления списка контактных лиц при выборе подрядчика
  updateContactPersonSelect(contractorId) {
    // Находим форму, в которой обновляем список контактных лиц
    const currentForm = this.container.querySelector("#current-project-form");
    const futureForm = this.container.querySelector("#future-project-form");

    const forms = [currentForm, futureForm].filter((form) => form);

    forms.forEach((form) => {
      const contactPersonSelect = form.elements.contactPersonId;
      if (!contactPersonSelect) return;

      // Очищаем список и делаем его неактивным, если не выбран подрядчик
      contactPersonSelect.innerHTML =
        '<option value="">Select Contact Person</option>';

      if (!contractorId) {
        contactPersonSelect.disabled = true;
        return;
      }

      // Находим выбранного подрядчика
      const contractor = this.contractors.find((c) => c.id == contractorId);
      if (!contractor) {
        contactPersonSelect.disabled = true;
        return;
      }

      // Делаем список активным
      contactPersonSelect.disabled = false;

      // Добавляем основное контактное лицо подрядчика
      if (contractor.contactPerson) {
        const option = document.createElement("option");
        option.value = contractorId; // Используем ID подрядчика для основного контактного лица
        option.textContent = `${contractor.contactPerson.name} (${contractor.contactPerson.position})`;
        contactPersonSelect.appendChild(option);
      }

      // Добавляем сотрудников подрядчика
      if (contractor.employees && contractor.employees.length > 0) {
        contractor.employees.forEach((employee) => {
          const option = document.createElement("option");
          option.value = employee.id;
          option.textContent = `${employee.fullName} (${employee.position})`;
          contactPersonSelect.appendChild(option);
        });
      }
    });
  }

  // Вспомогательные методы
  generateRatingStars(rating) {
    return Array(5)
      .fill(0)
      .map(
        (_, index) => `
      <i class="fa${index < rating ? "s" : "r"} fa-star"></i>
    `
      )
      .join("");
  }

  getContractorName(id) {
    const contractor = this.contractors.find((c) => c.id === id);
    return contractor ? contractor.companyName : "Unknown";
  }

  getContactPersonName(id) {
    for (const contractor of this.contractors) {
      const employee = contractor.employees.find((e) => e.id === id);
      if (employee) return employee.fullName;
    }
    return "Unknown";
  }

  updateContactPersons(contractorId) {
    const select = this.container.querySelector(
      'select[name="contactPersonId"]'
    );
    const contractor = this.contractors.find(
      (c) => c.id === parseInt(contractorId)
    );

    if (contractor && select) {
      select.innerHTML = contractor.employees
        .map(
          (employee) => `
        <option value="${employee.id}">${employee.fullName}</option>
      `
        )
        .join("");
    }
  }

  closeModals() {
    this.container.querySelectorAll(".modal").forEach((modal) => {
      modal.classList.remove("active");
    });
  }

  // Обработчики событий форм
  handleContractorSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const contractorData = {
      companyName: form.elements.companyName.value,
      businessType: form.elements.businessType.value,
      location: form.elements.location.value,
      email: form.elements.email.value,
      phone: form.elements.phone.value,
      rating: parseInt(form.elements.rating.value),
      contactPerson: {
        name: form.elements.contactName.value,
        position: form.elements.position.value,
        phone: form.elements.contactPhone.value,
        email: form.elements.contactEmail.value,
      },
      employees: [],
    };

    if (form.dataset.contractorId) {
      this.updateContractor(
        parseInt(form.dataset.contractorId),
        contractorData
      );
    } else {
      this.createContractor(contractorData);
    }

    this.closeModals();
  }

  setupSearchFilters() {
    // Фильтры для контракторов
    const contractorSearch = this.container.querySelector("#contractor-search");
    const businessTypeFilter = this.container.querySelector(
      "#business-type-filter"
    );
    const ratingFilter = this.container.querySelector("#rating-filter");
    const resetContractorFilters =
      this.container.querySelector("#reset-filters");

    if (contractorSearch) {
      contractorSearch.addEventListener("input", () => {
        this.filterContractors();
      });
    }

    if (businessTypeFilter) {
      businessTypeFilter.addEventListener("change", () => {
        this.filterContractors();
      });
    }

    if (ratingFilter) {
      ratingFilter.addEventListener("change", () => {
        this.filterContractors();
      });
    }

    if (resetContractorFilters) {
      resetContractorFilters.addEventListener("click", () => {
        this.resetContractorFilters();
      });
    }

    // Фильтры для текущих проектов
    const currentProjectSearch = this.container.querySelector(
      "#current-project-search"
    );
    const currentLocationSearch = this.container.querySelector(
      "#current-location-search"
    );
    const currentStatusFilter = this.container.querySelector(
      "#current-status-filter"
    );
    const currentDateFilter = this.container.querySelector(
      "#current-date-filter"
    );
    const resetCurrentFilters = this.container.querySelector(
      "#reset-current-filters"
    );

    if (currentProjectSearch) {
      currentProjectSearch.addEventListener("input", () => {
        this.filterProjects("current");
      });
    }

    if (currentLocationSearch) {
      currentLocationSearch.addEventListener("input", () => {
        this.filterProjects("current");
      });
    }

    if (currentStatusFilter) {
      currentStatusFilter.addEventListener("change", () => {
        this.filterProjects("current");
      });
    }

    if (currentDateFilter) {
      currentDateFilter.addEventListener("change", () => {
        this.filterProjects("current");
      });
    }

    if (resetCurrentFilters) {
      resetCurrentFilters.addEventListener("click", () => {
        this.resetProjectFilters("current");
      });
    }

    // Фильтры для будущих проектов
    const futureProjectSearch = this.container.querySelector(
      "#future-project-search"
    );
    const futureLocationSearch = this.container.querySelector(
      "#future-location-search"
    );
    const futurePriorityFilter = this.container.querySelector(
      "#future-priority-filter"
    );
    const futureDateFilter = this.container.querySelector(
      "#future-date-filter"
    );
    const resetFutureFilters = this.container.querySelector(
      "#reset-future-filters"
    );

    if (futureProjectSearch) {
      futureProjectSearch.addEventListener("input", () => {
        this.filterProjects("future");
      });
    }

    if (futureLocationSearch) {
      futureLocationSearch.addEventListener("input", () => {
        this.filterProjects("future");
      });
    }

    if (futurePriorityFilter) {
      futurePriorityFilter.addEventListener("change", () => {
        this.filterProjects("future");
      });
    }

    if (futureDateFilter) {
      futureDateFilter.addEventListener("change", () => {
        this.filterProjects("future");
      });
    }

    if (resetFutureFilters) {
      resetFutureFilters.addEventListener("click", () => {
        this.resetProjectFilters("future");
      });
    }
  }

  filterProjects(type) {
    // Get filter elements based on type
    const searchInput = this.container.querySelector(`#${type}-project-search`);
    const locationInput = this.container.querySelector(
      `#${type}-location-search`
    );
    const dateFilter = this.container.querySelector(`#${type}-date-filter`);

    // Get the status or priority filter depending on type
    const statusFilter =
      type === "current"
        ? this.container.querySelector("#current-status-filter")
        : this.container.querySelector("#future-status-filter");

    const priorityFilter =
      type === "future"
        ? this.container.querySelector("#future-priority-filter")
        : null;

    // Get filter values
    const searchValue = searchInput ? searchInput.value.toLowerCase() : "";
    const locationValue = locationInput
      ? locationInput.value.toLowerCase()
      : "";
    const dateValue = dateFilter ? dateFilter.value : "all";
    const statusValue = statusFilter ? statusFilter.value : "all";
    const priorityValue = priorityFilter ? priorityFilter.value : "all";

    // Determine which projects array to filter
    const projects =
      type === "current" ? this.currentProjects : this.futureProjects;

    if (!projects) return;

    // Apply filters
    const filteredProjects = projects.filter((project) => {
      // Search filter
      const nameMatch = project.name.toLowerCase().includes(searchValue);

      // Location filter
      const locationMatch = project.location
        .toLowerCase()
        .includes(locationValue);

      // Status filter
      const statusMatch =
        statusValue === "all" || project.status === statusValue;

      // Priority filter (only for future projects)
      const priorityMatch =
        type !== "future" ||
        priorityValue === "all" ||
        project.priority === priorityValue;

      // Date filter
      let dateMatch = true;
      if (dateValue !== "all") {
        const today = new Date();
        const projectStartDate = new Date(project.startDate);
        const projectEndDate = new Date(project.endDate);

        if (type === "current") {
          // Current projects date filtering
          switch (dateValue) {
            case "week":
              const lastWeek = new Date(today);
              lastWeek.setDate(today.getDate() - 7);
              dateMatch = projectStartDate >= lastWeek;
              break;
            case "month":
              const lastMonth = new Date(today);
              lastMonth.setMonth(today.getMonth() - 1);
              dateMatch = projectStartDate >= lastMonth;
              break;
            case "year":
              const lastYear = new Date(today);
              lastYear.setFullYear(today.getFullYear() - 1);
              dateMatch = projectStartDate >= lastYear;
              break;
          }
        } else {
          // Future projects date filtering
          switch (dateValue) {
            case "week":
              const nextWeek = new Date(today);
              nextWeek.setDate(today.getDate() + 7);
              dateMatch = projectStartDate <= nextWeek;
              break;
            case "month":
              const nextMonth = new Date(today);
              nextMonth.setMonth(today.getMonth() + 1);
              dateMatch = projectStartDate <= nextMonth;
              break;
            case "halfyear":
              const nextHalfYear = new Date(today);
              nextHalfYear.setMonth(today.getMonth() + 6);
              dateMatch = projectStartDate <= nextHalfYear;
              break;
            case "year":
              const nextYear = new Date(today);
              nextYear.setFullYear(today.getFullYear() + 1);
              dateMatch = projectStartDate <= nextYear;
              break;
          }
        }
      }

      return (
        nameMatch && locationMatch && statusMatch && priorityMatch && dateMatch
      );
    });

    // Render filtered projects
    this.renderProjects(type, filteredProjects);
  }

  resetProjectFilters(type) {
    const filterType =
      type === "current" ? "currentProjects" : "futureProjects";
    this.filters[filterType] = {
      search: "",
      location: "",
      status: "all",
      date: "all",
    };

    const projectSearch = this.container.querySelector(
      `#${type}-project-search`
    );
    const locationSearch = this.container.querySelector(
      `#${type}-location-search`
    );
    const statusFilter = this.container.querySelector(`#${type}-status-filter`);
    const dateFilter = this.container.querySelector(`#${type}-date-filter`);

    if (projectSearch) projectSearch.value = "";
    if (locationSearch) locationSearch.value = "";
    if (statusFilter) statusFilter.value = "all";
    if (dateFilter) dateFilter.value = "all";

    this.renderProjects(type);
  }

  filterContractors() {
    const searchInput = this.container.querySelector("#contractor-search");
    const businessTypeFilter = this.container.querySelector(
      "#business-type-filter"
    );
    const ratingFilter = this.container.querySelector("#rating-filter");

    if (searchInput) {
      this.filters.contractors.search = searchInput.value.toLowerCase();
    }
    if (businessTypeFilter) {
      this.filters.contractors.businessType = businessTypeFilter.value;
    }
    if (ratingFilter) {
      this.filters.contractors.rating = ratingFilter.value;
    }

    const filteredContractors = this.contractors.filter((contractor) => {
      const matchesSearch =
        contractor.companyName
          .toLowerCase()
          .includes(this.filters.contractors.search) ||
        contractor.businessType
          .toLowerCase()
          .includes(this.filters.contractors.search);
      const matchesBusinessType =
        this.filters.contractors.businessType === "all" ||
        contractor.businessType === this.filters.contractors.businessType;
      const matchesRating =
        this.filters.contractors.rating === "all" ||
        contractor.rating >= parseInt(this.filters.contractors.rating);

      return matchesSearch && matchesBusinessType && matchesRating;
    });

    this.renderFilteredContractors(filteredContractors);
  }

  resetContractorFilters() {
    this.filters.contractors = {
      search: "",
      businessType: "all",
      rating: "all",
    };

    const searchInput = this.container.querySelector("#contractor-search");
    const businessTypeFilter = this.container.querySelector(
      "#business-type-filter"
    );
    const ratingFilter = this.container.querySelector("#rating-filter");

    if (searchInput) searchInput.value = "";
    if (businessTypeFilter) businessTypeFilter.value = "all";
    if (ratingFilter) ratingFilter.value = "all";

    this.renderContractors();
  }

  // Метод для форматирования даты из YYYY-MM-DD в MM-DD-YY для отображения
  formatDateForDisplay(dateStr) {
    if (!dateStr) return "";

    // Проверка, если дата уже в формате MM-DD-YY
    if (/^\d{2}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr; // Возвращаем исходную строку, если не удалось преобразовать
      }

      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      // Берем последние 2 цифры года
      const year = String(date.getFullYear()).slice(-2);

      return `${month}-${day}-${year}`;
    } catch (e) {
      console.error("Error formatting date for display:", e);
      return dateStr;
    }
  }

  // Метод для форматирования даты из MM-DD-YY в YYYY-MM-DD для хранения
  formatDateForStorage(dateStr) {
    if (!dateStr) return "";

    // Проверка, если дата уже в формате YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    try {
      // Разбиваем строку даты в формате MM-DD-YY
      const [month, day, shortYear] = dateStr.split("-");

      // Преобразуем двузначный год в четырехзначный
      let fullYear;
      const twoDigitYear = parseInt(shortYear, 10);
      if (twoDigitYear < 50) {
        // Предполагаем, что годы меньше 50 относятся к 21 веку
        fullYear = 2000 + twoDigitYear;
      } else {
        // А больше или равные 50 - к 20 веку
        fullYear = 1900 + twoDigitYear;
      }

      // Формируем дату в формате YYYY-MM-DD
      return `${fullYear}-${month}-${day}`;
    } catch (e) {
      console.error("Error formatting date for storage:", e);
      return dateStr;
    }
  }

  setupRatingHandlers() {
    // Находим контейнер с рейтингом
    const ratingContainer = this.container.querySelector(".rating");
    if (!ratingContainer) return;

    // Получаем все звезды
    const stars = ratingContainer.querySelectorAll("i");

    // Добавляем обработчики для каждой звезды
    stars.forEach((star) => {
      // Обработчик клика - устанавливает рейтинг
      star.addEventListener("click", (e) => {
        const rating = parseInt(e.target.dataset.rating);
        this.setRating(rating);
      });

      // Обработчик наведения - показывает временный рейтинг
      star.addEventListener("mouseover", (e) => {
        const rating = parseInt(e.target.dataset.rating);
        this.showTemporaryRating(rating);
      });
    });

    // Восстанавливаем оригинальный рейтинг при уходе мыши
    ratingContainer.addEventListener("mouseleave", () => {
      const ratingInput = this.container.querySelector('input[name="rating"]');
      if (ratingInput) {
        const currentRating = parseInt(ratingInput.value) || 0;
        this.setRating(currentRating);
      }
    });
  }

  showTemporaryRating(rating) {
    const stars = this.container.querySelectorAll(".rating i");
    stars.forEach((star, index) => {
      if (index < rating) {
        star.className = "fas fa-star";
      } else {
        star.className = "far fa-star";
      }
    });
  }

  setRating(rating) {
    const stars = this.container.querySelectorAll(".rating i");
    const ratingInput = this.container.querySelector('input[name="rating"]');

    // Обновляем отображение звезд
    stars.forEach((star, index) => {
      if (index < rating) {
        star.className = "fas fa-star";
      } else {
        star.className = "far fa-star";
      }
    });

    // Обновляем значение в скрытом поле
    if (ratingInput) {
      ratingInput.value = rating;
    }
  }

  // Метод для обновления списка подрядчиков на основе выбранного типа бизнеса
  updateContractorSelectByBusinessType(businessType, select) {
    // Очищаем текущий список
    select.innerHTML = '<option value="">Select Contractor</option>';

    if (!businessType) {
      // Если тип бизнеса не выбран, показываем всех подрядчиков
      this.populateContractorSelect(select);
      return;
    }

    // Фильтруем подрядчиков по выбранному типу бизнеса
    const filteredContractors = this.contractors.filter(
      (c) => c.businessType === businessType
    );

    // Заполняем список отфильтрованными подрядчиками
    filteredContractors.forEach((contractor) => {
      const option = document.createElement("option");
      option.value = contractor.id;
      option.textContent = contractor.companyName;
      select.appendChild(option);
    });

    // Сбрасываем список контактных лиц, так как подрядчик изменился
    const form = select.closest("form");
    if (form) {
      const contactPersonSelect = form.elements.contactPersonId;
      if (contactPersonSelect) {
        contactPersonSelect.innerHTML =
          '<option value="">Select Contact Person</option>';
        contactPersonSelect.disabled = true;
      }
    }
  }

  // Add new method to update project statistics
  updateProjectStatistics(type) {
    if (type === "current") {
      this.updateCurrentProjectStatistics();
    } else if (type === "future") {
      this.updateFutureProjectStatistics();
    }
  }

  // Method to update current project statistics
  updateCurrentProjectStatistics() {
    // Get all stats elements
    const totalElement = this.container.querySelector(
      "#current-projects-total"
    );
    const completedElement = this.container.querySelector(
      "#current-projects-completed"
    );
    const inProgressElement = this.container.querySelector(
      "#current-projects-in-progress"
    );
    const onHoldElement = this.container.querySelector(
      "#current-projects-on-hold"
    );

    // Calculate stats
    const total = this.currentProjects.length;
    const completed = this.currentProjects.filter(
      (p) => p.status === "completed"
    ).length;
    const inProgress = this.currentProjects.filter(
      (p) => p.status === "in-progress"
    ).length;
    const onHold = this.currentProjects.filter(
      (p) => p.status === "on-hold"
    ).length;

    // Update DOM
    if (totalElement) totalElement.textContent = total;
    if (completedElement) completedElement.textContent = completed;
    if (inProgressElement) inProgressElement.textContent = inProgress;
    if (onHoldElement) onHoldElement.textContent = onHold;
  }

  // Method to update future project statistics
  updateFutureProjectStatistics() {
    // Get all stats elements
    const totalElement = this.container.querySelector("#future-projects-total");
    const highElement = this.container.querySelector("#future-projects-high");
    const mediumElement = this.container.querySelector(
      "#future-projects-medium"
    );
    const lowElement = this.container.querySelector("#future-projects-low");
    const delayedElement = this.container.querySelector(
      "#future-projects-delayed"
    );

    // Calculate stats
    const total = this.futureProjects.length;
    const highPriority = this.futureProjects.filter(
      (p) => p.priority === "high"
    ).length;
    const mediumPriority = this.futureProjects.filter(
      (p) => p.priority === "medium"
    ).length;
    const lowPriority = this.futureProjects.filter(
      (p) => p.priority === "low"
    ).length;
    const delayed = this.futureProjects.filter(
      (p) => p.status === "delayed"
    ).length;

    // Update DOM
    if (totalElement) totalElement.textContent = total;
    if (highElement) highElement.textContent = highPriority;
    if (mediumElement) mediumElement.textContent = mediumPriority;
    if (lowElement) lowElement.textContent = lowPriority;
    if (delayedElement) delayedElement.textContent = delayed;
  }

  // ... rest of the existing methods ...
}
