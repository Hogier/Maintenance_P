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
    // Добавляем стили для перенесенных проектов
    this.addMigratedProjectStyles();

    // Load data first
    this.loadData().then(() => {
      // Initialize the UI
      this.initNavigation();
      this.initEventListeners();

      // Initialize datepickers
      this.initDatepickers();

      // Отображаем подрядчиков
      this.renderActiveSection();
    });
  }

  // Добавляем стили для перенесенных проектов
  addMigratedProjectStyles() {
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .migrated-project-info {
        margin-bottom: 20px;
        padding: 12px;
        background-color: #e1f5fe;
        border-left: 4px solid #03a9f4;
        border-radius: 4px;
        display: flex;
        align-items: center;
      }
      
      .migrated-project-info i {
        color: #03a9f4;
        font-size: 18px;
        margin-right: 10px;
      }
      
      .migrated-project-info span {
        font-size: 14px;
        color: #01579b;
      }
      
      .info-message {
        display: flex;
        align-items: center;
        margin: 15px 0;
        padding: 12px 15px;
        background-color: #e1f5fe;
        border-radius: 4px;
        border-left: 4px solid #03a9f4;
        color: #01579b;
        font-size: 14px;
      }
      
      .info-message i {
        color: #03a9f4;
        font-size: 16px;
        margin-right: 10px;
      }
      
      .migrated-files {
        position: relative;
        border-left: 4px solid #03a9f4;
        padding-left: 15px;
        margin-bottom: 25px;
      }
      
      .migrated-fields {
        margin-top: 20px;
        padding: 15px;
        border-radius: 4px;
        background-color: #f8f9fa;
        border-left: 4px solid #03a9f4;
      }
      
      .migrated-fields h3 {
        color: #01579b;
        margin-top: 0;
        margin-bottom: 15px;
        font-size: 16px;
      }
      
      .migrated-fields .form-group {
        margin-bottom: 15px;
      }
      
      .migrated-fields label {
        color: #01579b;
        font-weight: 500;
      }
      
      .migrated-files:before {
        content: "From Future Project";
        position: absolute;
        top: -20px;
        left: 0;
        font-size: 12px;
        color: #03a9f4;
      }
      
      #current-project-modal .planning-info {
        border-left: 4px solid #03a9f4;
        padding-left: 15px;
      }
      
      .migrated-badge {
        display: inline-block;
        font-size: 12px;
        background-color: #03a9f4;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: 8px;
        vertical-align: middle;
      }
      
      .migrated-section {
        border-left: 4px solid #03a9f4;
        padding-left: 15px;
        margin-bottom: 25px;
      }
      
      .file-preview-item {
        position: relative;
        display: inline-block;
        width: 100px;
        height: 120px;
        margin: 5px;
        vertical-align: top;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 5px;
        text-align: center;
        background-color: #f9f9f9;
        overflow: hidden;
      }
      
      .file-preview-item img {
        max-width: 100%;
        max-height: 60px;
        object-fit: contain;
        margin-bottom: 5px;
      }
      
      .file-type-icon {
        font-size: 30px;
        color: #757575;
        margin: 10px 0;
      }
      
      .file-name {
        font-size: 12px;
        color: #333;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 100%;
      }
      
      .remove-file {
        position: absolute;
        top: 0;
        right: 0;
        background: rgba(255, 0, 0, 0.7);
        color: white;
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        line-height: 18px;
        text-align: center;
        cursor: pointer;
      }
    `;
    document.head.appendChild(styleElement);
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

    // Определяем, является ли проект перенесенным из Future в Current
    const isMigratedProject =
      project.description ||
      project.objectives ||
      project.risks ||
      project.priority ||
      (project.specifications && project.specifications.length > 0) ||
      (project.budgetDocs && project.budgetDocs.length > 0);

    const detailsSection = card.querySelector(".project-details");

    // Make Project Documents header collapsible
    const documentsSection = detailsSection.querySelector(
      ".details-section:last-child"
    );
    const docHeader = documentsSection.querySelector("h4");

    // Make header collapsible
    docHeader.classList.add("collapsible-header");
    const documentsGrid = documentsSection.querySelector(".documents-grid");
    documentsGrid.classList.add("collapsible-content");

    // Add click event to toggle
    docHeader.addEventListener("click", (e) => {
      e.preventDefault();
      docHeader.classList.toggle("collapsed");
      documentsGrid.classList.toggle("collapsed");
    });

    // Добавляем информацию о планировании, если она есть (для перемещенных из Future Projects)
    if (isMigratedProject && !detailsSection.querySelector(".planning-info")) {
      // Создаем раздел Project Planning
      const planningSection = document.createElement("div");
      planningSection.className = "details-section migrated-section";
      planningSection.innerHTML = `
        <h4>Project Planning <span class="migrated-badge">Migrated</span></h4>
        <div class="planning-info">
          <div class="info-group">
            <h5>Description</h5>
            <p class="description">${
              project.description || "No description available"
            }</p>
          </div>
          <div class="info-group">
            <h5>Key Objectives</h5>
            <p class="objectives">${
              project.objectives || "No objectives defined"
            }</p>
          </div>
          <div class="info-group">
            <h5>Risk Assessment</h5>
            <p class="risks">${project.risks || "No risks identified"}</p>
          </div>
        </div>
      `;

      // Добавляем раздел перед Project Documents
      if (documentsSection) {
        detailsSection.insertBefore(planningSection, documentsSection);
      } else {
        detailsSection.appendChild(planningSection);
      }
    }

    // Reorganize documents grid - group migrated files at the top
    if (
      isMigratedProject &&
      ((project.specifications && project.specifications.length > 0) ||
        (project.budgetDocs && project.budgetDocs.length > 0))
    ) {
      // Clear existing content
      const oldGrid = documentsGrid.innerHTML;
      documentsGrid.innerHTML = "";

      // Create migrated files group
      const migratedFilesGroup = document.createElement("div");
      migratedFilesGroup.className = "migrated-files-group";
      documentsGrid.appendChild(migratedFilesGroup);

      // Add specifications if they exist
      if (project.specifications && project.specifications.length > 0) {
        const specificationsGroup = document.createElement("div");
        specificationsGroup.className = "documents-group migrated-files";
        specificationsGroup.innerHTML = `
          <h5>Specifications</h5>
          <div class="specifications-preview file-preview-container">
            ${this.renderFilePreviews(project.specifications, "specification")}
          </div>
        `;
        migratedFilesGroup.appendChild(specificationsGroup);
      }

      // Add budget documents if they exist
      if (project.budgetDocs && project.budgetDocs.length > 0) {
        const budgetDocsGroup = document.createElement("div");
        budgetDocsGroup.className = "documents-group migrated-files";
        budgetDocsGroup.innerHTML = `
          <h5>Budget Documents</h5>
          <div class="budget-docs-preview file-preview-container">
            ${this.renderFilePreviews(project.budgetDocs, "budgetDoc")}
          </div>
        `;
        migratedFilesGroup.appendChild(budgetDocsGroup);
      }

      // Create current files group
      const currentFilesGroup = document.createElement("div");
      currentFilesGroup.className = "current-files-group";
      documentsGrid.appendChild(currentFilesGroup);

      // Add current files (Photos, Documents, Reports)
      if (project.photos && project.photos.length > 0) {
        const photosGroup = document.createElement("div");
        photosGroup.className = "documents-group";
        photosGroup.innerHTML = `
          <h5>Photos</h5>
          <div class="photos-preview file-preview-container">
            ${this.renderFilePreviews(project.photos, "photo")}
          </div>
        `;
        currentFilesGroup.appendChild(photosGroup);
      } else {
        const photosGroup = document.createElement("div");
        photosGroup.className = "documents-group";
        photosGroup.innerHTML = `
          <h5>Photos</h5>
          <div class="photos-preview file-preview-container"></div>
        `;
        currentFilesGroup.appendChild(photosGroup);
      }

      if (project.documents && project.documents.length > 0) {
        const documentsGroup = document.createElement("div");
        documentsGroup.className = "documents-group";
        documentsGroup.innerHTML = `
          <h5>Documents</h5>
          <div class="documents-preview file-preview-container">
            ${this.renderFilePreviews(project.documents, "document")}
          </div>
        `;
        currentFilesGroup.appendChild(documentsGroup);
      } else {
        const documentsGroup = document.createElement("div");
        documentsGroup.className = "documents-group";
        documentsGroup.innerHTML = `
          <h5>Documents</h5>
          <div class="documents-preview file-preview-container"></div>
        `;
        currentFilesGroup.appendChild(documentsGroup);
      }

      if (project.reports && project.reports.length > 0) {
        const reportsGroup = document.createElement("div");
        reportsGroup.className = "documents-group";
        reportsGroup.innerHTML = `
          <h5>Reports</h5>
          <div class="reports-preview file-preview-container">
            ${this.renderFilePreviews(project.reports, "report")}
          </div>
        `;
        currentFilesGroup.appendChild(reportsGroup);
      } else {
        const reportsGroup = document.createElement("div");
        reportsGroup.className = "documents-group";
        reportsGroup.innerHTML = `
          <h5>Reports</h5>
          <div class="reports-preview file-preview-container"></div>
        `;
        currentFilesGroup.appendChild(reportsGroup);
      }
    } else {
      // Just set file previews without reorganization
      if (project.photos && project.photos.length > 0) {
        card.querySelector(".photos-preview").innerHTML =
          this.renderFilePreviews(project.photos, "photo");
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

    // Make Project Documents header collapsible
    const detailsSection = card.querySelector(".project-details");
    const documentsSection = detailsSection.querySelector(
      ".details-section:last-child"
    );
    const docHeader = documentsSection.querySelector("h4");

    // Make header collapsible
    docHeader.classList.add("collapsible-header");
    const documentsGrid = documentsSection.querySelector(".documents-grid");
    documentsGrid.classList.add("collapsible-content");

    // Add click event to toggle
    docHeader.addEventListener("click", (e) => {
      e.preventDefault();
      docHeader.classList.toggle("collapsed");
      documentsGrid.classList.toggle("collapsed");
    });

    // Set file previews
    if (project.documents && project.documents.length > 0) {
      card.querySelector(".documents-preview").innerHTML =
        this.renderFilePreviews(project.documents, "document");
    }
    if (project.specifications && project.specifications.length > 0) {
      card.querySelector(".specifications-preview").innerHTML =
        this.renderFilePreviews(project.specifications, "specification");
    }
  }

  renderFilePreviews(files, type) {
    return files
      .map((file, index) => {
        if (!file) return ""; // Пропускаем undefined или null объекты

        // Убедимся, что имя файла определено и корректно отображается
        const fileName =
          file.name && file.name.trim() !== ""
            ? file.name
            : file.originalName && file.originalName.trim() !== ""
            ? file.originalName
            : `${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}`;

        const isImage =
          file.type?.startsWith("image/") ||
          (file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i));
        const fileIcon = this.getFileIcon(
          file.type || "application/octet-stream"
        );

        let previewUrl = null;

        // Проверяем, имеет ли файл src (для сохраненных изображений)
        if (isImage && file.src) {
          previewUrl = file.src;
        }
        // Проверяем, является ли файл объектом File или Blob для createObjectURL
        else if (
          isImage &&
          (file instanceof Blob || file instanceof File) &&
          URL.createObjectURL
        ) {
          try {
            previewUrl = URL.createObjectURL(file);
          } catch (error) {
            console.error("Error creating object URL:", error);
          }
        }

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
    // Проверяем, существует ли файл
    if (!file) return;

    // Получаем имя файла, используя свойства originalName или name
    const fileName =
      file.originalName && file.originalName.trim() !== ""
        ? file.originalName
        : file.name && file.name.trim() !== ""
        ? file.name
        : `${type.charAt(0).toUpperCase() + type.slice(1)} File`;

    // Создаем элемент для превью файла
    const previewItem = document.createElement("div");
    previewItem.className = "file-preview-item";
    previewItem.dataset.fileType = type;
    previewItem.dataset.fileName = fileName;
    previewItem.dataset.mimeType = file.type || "application/octet-stream";

    // Проверяем, является ли файл изображением
    const isImage =
      file.type?.startsWith("image/") ||
      (fileName && fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i));

    // Если это изображение, создаем превью
    if (isImage) {
      const img = document.createElement("img");
      try {
        // Используем существующий URL или создаем новый
        if (file.src) {
          img.src = file.src;
        } else if (file instanceof Blob || file instanceof File) {
          const imgUrl = URL.createObjectURL(file);
          img.src = imgUrl;
          previewItem.dataset.imgUrl = imgUrl; // Сохраняем URL для последующего освобождения
        }
        previewItem.appendChild(img);
      } catch (error) {
        console.error("Ошибка создания превью изображения:", error);
        // Если не удалось создать превью, используем иконку
        const iconDiv = document.createElement("div");
        iconDiv.className = "file-type-icon";
        iconDiv.innerHTML = `<i class="fas fa-image"></i>`;
        previewItem.appendChild(iconDiv);
      }
    } else {
      // Для не-изображений показываем иконку типа файла
      const iconDiv = document.createElement("div");
      iconDiv.className = "file-type-icon";
      const fileIcon = this.getFileIcon(
        file.type || "application/octet-stream"
      );
      iconDiv.innerHTML = `<i class="${fileIcon}"></i>`;
      previewItem.appendChild(iconDiv);
    }

    // Добавляем имя файла
    const nameElement = document.createElement("div");
    nameElement.className = "file-name";
    nameElement.textContent = fileName;
    previewItem.appendChild(nameElement);

    // Добавляем скрытое поле для хранения оригинального имени, если оно есть
    if (file.originalName && file.originalName !== fileName) {
      previewItem.dataset.originalFileName = file.originalName;
    }

    // Кнопку удаления добавим отдельно через bindFilePreviewEvents
    // чтобы избежать дублирования обработчиков

    // Добавляем превью в контейнер
    container.appendChild(previewItem);

    // Привязываем события к новому превью
    this.bindFilePreviewEvents(container);
  }

  bindProjectCardEvents(type) {
    // Status change handler
    const statusSelects = document.querySelectorAll(`.status-select`);
    statusSelects.forEach((select) => {
      select.addEventListener("change", (e) => {
        e.stopPropagation();
        // Получаем ID проекта из ближайшей карточки
        const projectCard = e.target.closest(".project-card");
        const projectId = parseInt(projectCard.dataset.id);
        const newStatus = e.target.value;

        // Определяем тип проекта на основе родительского контейнера
        const projectsList = projectCard.closest(".projects-grid");
        const projectType =
          projectsList.id === "current-projects-list" ? "current" : "future";

        this.updateProjectStatus(projectId, newStatus, projectType);
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
      // Проверяем, есть ли уже кнопка удаления
      let removeBtn = previewItem.querySelector(".remove-file");

      // Если кнопка удаления уже существует, удаляем ее перед добавлением новой
      if (removeBtn) {
        removeBtn.remove();
      }

      // Добавляем новую кнопку удаления
      removeBtn = document.createElement("button");
      removeBtn.className = "remove-file";
      removeBtn.innerHTML = "×";
      removeBtn.title = "Remove file";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Предотвращаем всплытие клика

        // Если есть URL изображения, освобождаем его
        const img = previewItem.querySelector("img");
        if (img && img.src.startsWith("blob:")) {
          URL.revokeObjectURL(img.src);
        }

        // Удаляем элемент из DOM
        if (previewItem.parentNode) {
          previewItem.parentNode.removeChild(previewItem);
        }
      });

      // Добавляем кнопку к элементу превью
      previewItem.appendChild(removeBtn);

      // Удаляем существующий обработчик клика и добавляем новый
      const newPreviewItem = previewItem.cloneNode(true);
      previewItem.parentNode.replaceChild(newPreviewItem, previewItem);

      // Восстанавливаем кнопку удаления, так как она была потеряна при клонировании
      const newRemoveBtn = newPreviewItem.querySelector(".remove-file");
      if (newRemoveBtn) {
        newRemoveBtn.addEventListener("click", (e) => {
          e.stopPropagation(); // Предотвращаем всплытие клика

          // Если есть URL изображения, освобождаем его
          const img = newPreviewItem.querySelector("img");
          if (img && img.src.startsWith("blob:")) {
            URL.revokeObjectURL(img.src);
          }

          // Удаляем элемент из DOM
          if (newPreviewItem.parentNode) {
            newPreviewItem.parentNode.removeChild(newPreviewItem);
          }
        });
      }

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

  // Метод для синхронизации удаленных файлов в перенесенном проекте
  syncDeletedFiles(sourceProject, targetProject) {
    if (!sourceProject || !targetProject) return targetProject;

    // Синхронизируем Specifications
    if (sourceProject.specifications && targetProject.specifications) {
      const sourceFileMap = {};
      sourceProject.specifications.forEach((file) => {
        const key = `${file.name}-${file.type}`;
        sourceFileMap[key] = true;
      });

      targetProject.specifications = targetProject.specifications.filter(
        (file) => {
          const key = `${file.name}-${file.type}`;
          return sourceFileMap[key];
        }
      );
    }

    // Синхронизируем Documents - копируем документы из исходного проекта в целевой
    if (sourceProject.documents && targetProject.documents) {
      const sourceFileMap = {};
      sourceProject.documents.forEach((file) => {
        const key = `${file.name}-${file.type}`;
        sourceFileMap[key] = true;
      });

      // Проверяем только существующие документы из Future Projects
      const existingDocs = targetProject.documents.filter((file) => {
        const key = `${file.name}-${file.type}`;
        return sourceFileMap[key];
      });

      // Объединяем существующие документы с документами из source
      targetProject.documents = [
        ...existingDocs,
        ...sourceProject.documents.filter((file) => {
          // Добавляем только те документы, которых еще нет в targetProject
          return !existingDocs.some(
            (existingFile) =>
              existingFile.name === file.name && existingFile.type === file.type
          );
        }),
      ];
    }

    return targetProject;
  }

  updateProjectStatus(projectId, newStatus, type) {
    const project = this.getProjectById(parseInt(projectId), type);
    if (!project) return;

    if (type === "future" && newStatus === "move-to-current") {
      // Создаем копию исходного проекта для последующей синхронизации файлов
      const originalProject = JSON.parse(JSON.stringify(project));

      // Сохраняем копию проекта, а не ссылку на объект
      let projectCopy = JSON.parse(JSON.stringify(project));

      // Удаляем проект из Future Projects
      this.futureProjects = this.futureProjects.filter(
        (p) => p.id !== projectId
      );

      // Устанавливаем начальный статус для текущего проекта
      projectCopy.status = "in-progress";

      // Копируем значение Budget из будущего проекта в Actual Cost текущего проекта
      if (projectCopy.budget) {
        console.log(
          `Moving project: Budget value ${projectCopy.budget} transferred to Actual Cost`
        );
        projectCopy.actualCost = projectCopy.budget;
      } else {
        console.log(`Moving project: No budget value found to transfer`);
        projectCopy.actualCost = 0;
      }

      // Устанавливаем начальный прогресс
      if (!projectCopy.progress) {
        projectCopy.progress = 0;
      }

      // Создаем новые поля, необходимые для Current Projects, если они отсутствуют
      projectCopy.lastUpdate = new Date().toISOString();
      if (!projectCopy.photos) projectCopy.photos = [];
      if (!projectCopy.documents) projectCopy.documents = []; // Сохраняем существующие документы
      if (!projectCopy.reports) projectCopy.reports = [];

      // Синхронизируем удаленные файлы
      projectCopy = this.syncDeletedFiles(originalProject, projectCopy);

      // Добавляем проект в Current Projects
      this.currentProjects.push(projectCopy);

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
    // Определяем, какое модальное окно нужно показать
    const modal = this.container.querySelector(
      `#${type === "current" ? "current" : "future"}-project-modal`
    );
    const form = modal.querySelector("form");
    const titleElement = modal.querySelector("h3");

    // Сначала очищаем форму от предыдущих данных
    form.reset();

    // Удаляем все существующие info-message и migrated-fields элементы
    const existingInfoMessages = form.querySelectorAll(".info-message");
    existingInfoMessages.forEach((msg) => msg.remove());

    const existingMigratedFields = form.querySelectorAll(".migrated-fields");
    existingMigratedFields.forEach((field) => field.remove());

    // Обновляем заголовок модального окна в зависимости от действия
    if (titleElement) {
      titleElement.textContent = project
        ? `Edit ${type === "current" ? "Current" : "Future"} Project`
        : `Add ${type === "current" ? "Current" : "Future"} Project`;
    }

    // Проверяем, является ли проект перенесенным из Future в Current
    const isMigratedProject =
      type === "current" &&
      project &&
      (project.specifications ||
        project.budgetDocs ||
        project.description ||
        project.objectives ||
        project.risks ||
        project.priority);

    // Очищаем предыдущие предпросмотры файлов
    this.clearFilePreviews(type);

    // Настраиваем обработчики загрузки файлов
    this.setupFileUploadHandlers(type);

    // Указываем тип проекта
    form.elements.projectType.value = type;

    // Заполняем список подрядчиков
    this.populateContractorSelect(form.elements.contractorId);

    // Добавляем обработчик выбора типа бизнеса для обновления списка подрядчиков
    const businessTypeSelect = form.elements.businessType;
    businessTypeSelect.onchange = () => {
      this.updateContractorSelectByBusinessType(
        businessTypeSelect.value,
        form.elements.contractorId
      );
    };

    // Добавляем обработчик выбора подрядчика для обновления списка контактных лиц
    const contractorSelect = form.elements.contractorId;
    contractorSelect.onchange = () => {
      this.updateContactPersonSelect(contractorSelect.value);
    };

    // Если редактируем существующий проект
    if (project) {
      // Устанавливаем id проекта для формы
      form.dataset.projectId = project.id;

      // Заполняем форму данными проекта, общие для обоих типов
      form.elements.projectName.value = project.name || "";
      form.elements.location.value = project.location || "";
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

      if (project.contactPersonId) {
        form.elements.contactPersonId.value = project.contactPersonId;
      }

      // Обрабатываем специфичные для типа проекта поля
      if (type === "current") {
        form.elements.progress.value = project.progress || 0;
        form.elements.actualCost.value = project.actualCost || "";
        form.elements.status.value = project.status || "not_started";
        form.elements.lastUpdate.value = this.formatDateForDisplay(
          project.lastUpdate
        );

        // Для перенесенных проектов показываем дополнительную информацию
        if (isMigratedProject) {
          // Создаем единое информационное сообщение с иконкой
          const infoMessage = document.createElement("div");
          infoMessage.className = "info-message";
          infoMessage.innerHTML =
            '<i class="fas fa-info-circle"></i> This project was moved from Future Projects.';

          // Находим место для вставки сообщения
          const actionButtons = form.querySelector(".action-buttons");
          if (actionButtons) {
            actionButtons.insertAdjacentElement("beforebegin", infoMessage);
          } else {
            // Если не найдена секция с кнопками, добавляем в конец формы
            form.appendChild(infoMessage);
          }

          // Создаем дополнительные поля для данных из Future Projects
          const currentProjectSection =
            form.querySelector(".project-main-info");
          if (currentProjectSection) {
            // Создаем раздел для планирования проекта
            const planningSection = document.createElement("div");
            planningSection.className = "form-section migrated-fields";
            planningSection.innerHTML = `
                <h3>Project Planning</h3>
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" name="description" rows="3" readonly>${
                      project.description || ""
                    }</textarea>
                </div>
                <div class="form-group">
                    <label for="objectives">Key Objectives</label>
                    <textarea id="objectives" name="objectives" rows="3" readonly>${
                      project.objectives || ""
                    }</textarea>
                </div>
                <div class="form-group">
                    <label for="risks">Risk Assessment</label>
                    <textarea id="risks" name="risks" rows="3" readonly>${
                      project.risks || ""
                    }</textarea>
                </div>
                <div class="form-group">
                    <label for="priority">Priority Level</label>
                    <select id="priority" name="priority" disabled>
                        <option value="low" ${
                          project.priority === "low" ? "selected" : ""
                        }>Low</option>
                        <option value="medium" ${
                          project.priority === "medium" ? "selected" : ""
                        }>Medium</option>
                        <option value="high" ${
                          project.priority === "high" ? "selected" : ""
                        }>High</option>
                    </select>
                </div>
            `;
            currentProjectSection.insertAdjacentElement(
              "afterend",
              planningSection
            );
          }
        }
      } else {
        // Future project
        form.elements.budget.value = project.budget || "";
        form.elements.priority.value = project.priority || "medium";
        form.elements.description.value = project.description || "";
        form.elements.objectives.value = project.objectives || "";
        form.elements.risks.value = project.risks || "";
      }

      // Проверяем и приводим структуру файлов к правильному формату
      project = this.ensureFileStructures(project, type);

      // Отображаем существующие файлы проекта
      this.displayExistingFiles(project, type);
    } else {
      // Для нового проекта
      form.dataset.projectId = "";

      // Обновляем список контактных лиц на пустой
      const contactPersonSelect = form.elements.contactPersonId;
      contactPersonSelect.innerHTML =
        '<option value="">Select Contact Person</option>';
      contactPersonSelect.disabled = true;

      // Устанавливаем текущую дату для поля lastUpdate
      if (type === "current") {
        form.elements.lastUpdate.value = this.formatDateForDisplay(new Date());
      }
    }

    // Инициализируем календари для формы
    this.initFormDatepickers(form);

    modal.classList.add("active");
  }

  displayExistingFiles(project, type) {
    // Если проект отсутствует или не имеет структуры файлов, нечего отображать
    if (!project) return;

    // Предварительно проверяем и корректируем структуру файлов проекта
    project = this.ensureFileStructures(project, type);

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
      },
    };

    // Очищаем существующие превью
    Object.values(previewContainers[type]).forEach((container) => {
      if (container) container.innerHTML = "";
    });

    // Определяем, является ли проект перенесенным из Future в Current
    const isMigratedProject =
      type === "current" &&
      (project.specifications ||
        project.budgetDocs ||
        project.description ||
        project.objectives ||
        project.risks ||
        project.priority);

    // Отображаем файлы в соответствующие контейнеры
    if (type === "current") {
      // Отображаем файлы фотографий
      if (
        project.photos &&
        Array.isArray(project.photos) &&
        project.photos.length > 0
      ) {
        const photoContainer = previewContainers[type].photos;
        if (photoContainer) {
          project.photos.forEach((photo) => {
            if (photo) {
              this.addFilePreview(photo, photoContainer, "photo");
            }
          });
        }
      }

      // Отображаем документы
      if (
        project.documents &&
        Array.isArray(project.documents) &&
        project.documents.length > 0
      ) {
        const docsContainer = previewContainers[type].documents;
        if (docsContainer) {
          project.documents.forEach((doc) => {
            if (doc) {
              this.addFilePreview(doc, docsContainer, "document");
            }
          });
        }
      }

      // Отображаем отчеты
      if (
        project.reports &&
        Array.isArray(project.reports) &&
        project.reports.length > 0
      ) {
        const reportsContainer = previewContainers[type].reports;
        if (reportsContainer) {
          project.reports.forEach((report) => {
            if (report) {
              this.addFilePreview(report, reportsContainer, "report");
            }
          });
        }
      }

      // Для перенесенных проектов: отображаем дополнительные файлы из Future Projects
      if (isMigratedProject) {
        // Создаем контейнеры для specifications и budgetDocs, если они не существуют
        const specificationsContainer = document.querySelector(
          "#current-specifications-preview"
        );
        const budgetDocsContainer = document.querySelector(
          "#current-budget-preview"
        );

        // Добавляем спецификации, если они есть
        if (
          project.specifications &&
          Array.isArray(project.specifications) &&
          project.specifications.length > 0
        ) {
          const documentsSection =
            previewContainers[type].documents?.closest(".form-section");
          if (documentsSection) {
            if (!specificationsContainer) {
              // Создаем группу для спецификаций
              const specGroup = document.createElement("div");
              specGroup.className = "form-group migrated-files";
              specGroup.innerHTML = `
                <label>Specifications (from Future Project)</label>
                <div id="current-specifications-preview" class="file-preview-container"></div>
              `;
              documentsSection.appendChild(specGroup);
            }

            // Добавляем файлы в превью
            const targetContainer =
              specificationsContainer ||
              document.querySelector("#current-specifications-preview");
            if (targetContainer) {
              // Очищаем контейнер перед добавлением файлов
              targetContainer.innerHTML = "";

              project.specifications.forEach((spec) => {
                if (spec) {
                  this.addFilePreview(spec, targetContainer, "specification");
                }
              });
            }
          }
        }

        // Добавляем бюджетные документы, если они есть
        if (
          project.budgetDocs &&
          Array.isArray(project.budgetDocs) &&
          project.budgetDocs.length > 0
        ) {
          const documentsSection =
            previewContainers[type].documents?.closest(".form-section");
          if (documentsSection) {
            if (!budgetDocsContainer) {
              // Создаем группу для бюджетных документов
              const budgetGroup = document.createElement("div");
              budgetGroup.className = "form-group migrated-files";
              budgetGroup.innerHTML = `
                <label>Budget Documents (from Future Project)</label>
                <div id="current-budget-preview" class="file-preview-container"></div>
              `;
              documentsSection.appendChild(budgetGroup);
            }

            // Добавляем файлы в превью
            const targetContainer =
              budgetDocsContainer ||
              document.querySelector("#current-budget-preview");
            if (targetContainer) {
              // Очищаем контейнер перед добавлением файлов
              targetContainer.innerHTML = "";

              project.budgetDocs.forEach((doc) => {
                if (doc) {
                  this.addFilePreview(doc, targetContainer, "budgetDoc");
                }
              });
            }
          }
        }
      }
    } else if (type === "future") {
      // Отображаем документы
      if (
        project.documents &&
        Array.isArray(project.documents) &&
        project.documents.length > 0
      ) {
        const docsContainer = previewContainers[type].documents;
        if (docsContainer) {
          project.documents.forEach((doc) => {
            if (doc) {
              this.addFilePreview(doc, docsContainer, "document");
            }
          });
        }
      }

      // Отображаем спецификации
      if (
        project.specifications &&
        Array.isArray(project.specifications) &&
        project.specifications.length > 0
      ) {
        const specificationsContainer = previewContainers[type].specifications;
        if (specificationsContainer) {
          project.specifications.forEach((spec) => {
            if (spec) {
              this.addFilePreview(
                spec,
                specificationsContainer,
                "specification"
              );
            }
          });
        }
      }
    }

    // Добавляем обработчики событий к файловым превью
    Object.values(previewContainers[type]).forEach((container) => {
      if (container) {
        this.bindFilePreviewEvents(container);
      }
    });

    // Также обрабатываем динамически созданные контейнеры для перенесенных проектов
    if (isMigratedProject) {
      const migratedContainers = document.querySelectorAll(
        ".migrated-files .file-preview-container"
      );
      migratedContainers.forEach((container) => {
        if (container) {
          this.bindFilePreviewEvents(container);
        }
      });
    }
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
            // Проверка выбраны ли файлы
            if (e.target.files && e.target.files.length > 0) {
              // Обрабатываем каждый выбранный файл
              Array.from(e.target.files).forEach((file) => {
                this.addFilePreview(
                  file,
                  previewContainer,
                  key === "photos" ? "photo" : "document"
                );
              });

              // Сбрасываем input, чтобы можно было выбрать те же файлы повторно
              e.target.value = "";
            }
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
    const projectId = form.dataset.projectId
      ? parseInt(form.dataset.projectId)
      : null;
    const projectType = form.elements.projectType.value;

    // Получаем существующий проект для сравнения файлов, если редактируем
    const existingProject = projectId
      ? this.getProjectById(projectId, projectType)
      : null;

    // Базовые данные проекта
    const projectData = {
      name: form.elements.projectName.value,
      location: form.elements.location.value,
      startDate: this.formatDateForStorage(form.elements.startDate.value),
      endDate: this.formatDateForStorage(form.elements.endDate.value),
      contractorId: parseInt(form.elements.contractorId.value) || null,
      contactPersonId: parseInt(form.elements.contactPersonId.value) || null,
      businessType: form.elements.businessType.value,
    };

    // Определяем, является ли проект перенесенным из Future в Current
    const isMigratedProject =
      projectType === "current" &&
      (form.elements.description ||
        form.elements.objectives ||
        form.elements.risks ||
        form.elements.priority ||
        document.querySelector("#current-specifications-preview"));

    // Добавляем данные в зависимости от типа проекта
    if (projectType === "current") {
      projectData.progress = parseInt(form.elements.progress.value) || 0;
      projectData.actualCost = parseFloat(form.elements.actualCost.value) || 0;
      projectData.status = form.elements.status.value;
      projectData.lastUpdate = this.formatDateForStorage(
        form.elements.lastUpdate.value
      );

      // Добавляем файлы
      projectData.photos = this.collectFiles(
        "#current-photos",
        "#current-photos-preview"
      );
      projectData.documents = this.collectFiles(
        "#current-documents",
        "#current-documents-preview"
      );
      projectData.reports = this.collectFiles(
        "#current-reports",
        "#current-reports-preview"
      );

      // Для перенесенных проектов сохраняем дополнительные поля и файлы из Future Projects
      if (isMigratedProject) {
        // Сохраняем поля планирования, если они существуют
        if (form.elements.description) {
          projectData.description = form.elements.description.value || "";
        }

        if (form.elements.objectives) {
          projectData.objectives = form.elements.objectives.value || "";
        }

        if (form.elements.risks) {
          projectData.risks = form.elements.risks.value || "";
        }

        if (form.elements.priority) {
          projectData.priority = form.elements.priority.value || "medium";
        }

        // Собираем файлы спецификаций из контейнера превью
        const specificationsContainer = document.querySelector(
          "#current-specifications-preview"
        );
        if (specificationsContainer) {
          const specsFromContainer = this.collectFilesFromContainer(
            specificationsContainer
          );

          // Сохраняем файлы - используем только те, которые отображаются в превью
          if (specsFromContainer.length > 0) {
            projectData.specifications = specsFromContainer;
          } else if (existingProject && existingProject.specifications) {
            // Если контейнер пуст, но у существующего проекта есть спецификации, сохраняем их
            projectData.specifications = existingProject.specifications;
          } else {
            projectData.specifications = [];
          }
        }
      } else if (projectId && existingProject) {
        // Если это не перенесенный проект, но редактирование существующего,
        // сохраняем специфические поля Future Projects, если они существуют
        if (existingProject.description) {
          projectData.description = existingProject.description;
        }
        if (existingProject.objectives) {
          projectData.objectives = existingProject.objectives;
        }
        if (existingProject.risks) {
          projectData.risks = existingProject.risks;
        }
        if (existingProject.priority) {
          projectData.priority = existingProject.priority;
        }
        if (existingProject.specifications) {
          projectData.specifications = existingProject.specifications;
        }
      }
    } else {
      // Future project
      projectData.budget = parseFloat(form.elements.budget.value) || 0;
      projectData.priority = form.elements.priority.value;
      projectData.description = form.elements.description.value;
      projectData.objectives = form.elements.objectives.value;
      projectData.risks = form.elements.risks.value;

      // Собираем файлы из контейнеров превью
      const documentsContainer = document.querySelector(
        "#future-documents-preview"
      );
      if (documentsContainer) {
        const docsFromContainer =
          this.collectFilesFromContainer(documentsContainer);
        projectData.documents = docsFromContainer;
      } else {
        projectData.documents = [];
      }

      const specificationsContainer = document.querySelector(
        "#future-specifications-preview"
      );
      if (specificationsContainer) {
        const specsFromContainer = this.collectFilesFromContainer(
          specificationsContainer
        );
        projectData.specifications = specsFromContainer;
      } else {
        projectData.specifications = [];
      }
    }

    // Обновляем существующий проект или создаем новый
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

  // Метод для сбора файлов из контейнера предпросмотра
  collectFilesFromContainer(container) {
    if (!container) return [];

    const fileItems = container.querySelectorAll(".file-preview-item");
    const files = [];

    fileItems.forEach((item) => {
      const fileName = item.dataset.fileName;
      const mimeType = item.dataset.mimeType;
      const fileType = item.dataset.fileType;

      // Проверяем наличие элемента img, чтобы определить, является ли это изображением
      const imgElement = item.querySelector("img");
      let src = null;

      if (imgElement && imgElement.src) {
        src = imgElement.src;
      }

      // Получаем имя файла из элемента с классом file-name, если оно доступно
      const fileNameElement = item.querySelector(".file-name");
      const displayedName = fileNameElement
        ? fileNameElement.textContent
        : null;

      // Создаем объект файла с метаданными
      files.push({
        name: fileName || displayedName || "Unknown file",
        originalName: fileName || displayedName || "Unknown file", // Сохраняем оригинальное имя
        type: mimeType || "application/octet-stream",
        fileType: fileType || "unknown",
        src: src, // Добавляем src для изображений
        isStoredFile: true, // Отмечаем, что это сохраненный файл, а не свежезагруженный
      });
    });

    return files;
  }

  // Метод для сбора файлов из input и сохранения существующих
  collectFiles(inputSelector, previewSelector) {
    const inputElement = this.container.querySelector(inputSelector);
    const previewContainer = this.container.querySelector(previewSelector);

    // Сначала собираем новые файлы из input
    const newFiles = Array.from(inputElement?.files || []);

    // Затем собираем существующие файлы из превью
    const existingFiles = this.collectFilesFromContainer(previewContainer);

    // Объединяем новые и существующие файлы
    return [...newFiles, ...existingFiles];
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
    // Находим форму, в которой обновляем список контактных лиц
    const currentForm = this.container.querySelector("#current-project-form");
    const futureForm = this.container.querySelector("#future-project-form");

    const forms = [currentForm, futureForm].filter((form) => form);

    // Альтернативный метод поиска форм для активных модальных окон
    if (forms.length === 0) {
      const activeModal = this.container.querySelector(".modal.active");
      if (activeModal) {
        const formInModal = activeModal.querySelector("form");
        if (formInModal) {
          forms.push(formInModal);
        }
      }
    }

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

  closeModals() {
    this.container.querySelectorAll(".modal").forEach((modal) => {
      modal.classList.remove("active");

      // Очищаем информацию о перенесенных проектах при закрытии модального окна
      const form = modal.querySelector("form");
      if (form) {
        // Удаляем info-message элементы
        const infoMessages = form.querySelectorAll(".info-message");
        infoMessages.forEach((msg) => msg.remove());

        // Удаляем migrated-fields секции
        const migratedFields = form.querySelectorAll(".migrated-fields");
        migratedFields.forEach((field) => field.remove());
      }
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

  ensureFileStructures(project, type) {
    // Список типов файлов для каждого типа проекта
    const fileTypes = {
      current: ["photos", "documents", "reports"],
      future: ["documents", "specifications"],
    };

    // Проверяем и исправляем структуры файлов
    fileTypes[type].forEach((fileType) => {
      if (!project[fileType]) {
        project[fileType] = [];
      } else if (Array.isArray(project[fileType])) {
        // Проверка каждого файла в массиве
        project[fileType] = project[fileType]
          .map((file) => {
            if (!file) return null;

            const newFile = { ...file }; // Создаем копию, чтобы не модифицировать оригинал

            // Если файл не имеет необходимых свойств, создаем заполнитель
            if (!newFile.type) {
              // Пытаемся определить тип по имени файла
              const fileExt = newFile.name
                ? newFile.name.split(".").pop().toLowerCase()
                : "";
              let mimeType = "application/octet-stream";

              if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt)) {
                mimeType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;
              } else if (fileExt === "pdf") {
                mimeType = "application/pdf";
              } else if (["doc", "docx"].includes(fileExt)) {
                mimeType = "application/msword";
              } else if (["xls", "xlsx"].includes(fileExt)) {
                mimeType = "application/vnd.ms-excel";
              }

              newFile.type = mimeType;
            }

            // Сохраняем оригинальное имя файла, если оно есть
            if (newFile.name && newFile.name.trim() !== "") {
              newFile.originalName = newFile.name;
            }

            // Если нет имени, создаем стандартное
            if (!newFile.name || newFile.name.trim() === "") {
              const defaultName = `${
                fileType.charAt(0).toUpperCase() + fileType.slice(0, -1)
              } ${Math.floor(Math.random() * 1000)}`;
              newFile.name = defaultName;
              newFile.originalName = newFile.originalName || defaultName;
            }

            // Добавляем флаг, что это сохраненный файл
            newFile.isStoredFile = true;

            return newFile;
          })
          .filter((file) => file !== null); // Удаляем null элементы
      }
    });

    // Проверяем наличие дополнительных файлов при перемещении из future в current
    if (type === "current") {
      // Для файлов, которые могут быть только в future
      ["specifications"].forEach((fileType) => {
        if (project[fileType] && Array.isArray(project[fileType])) {
          project[fileType] = project[fileType]
            .map((file) => {
              if (!file) return null;

              const newFile = { ...file };

              // Сохраняем оригинальное имя файла, если оно есть
              if (newFile.name && newFile.name.trim() !== "") {
                newFile.originalName = newFile.originalName || newFile.name;
              }

              // Проверяем и исправляем тип файла
              if (!newFile.type) {
                // Пытаемся определить тип по имени файла
                const fileExt = newFile.name
                  ? newFile.name.split(".").pop().toLowerCase()
                  : "";
                let mimeType = "application/octet-stream";

                if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt)) {
                  mimeType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;
                } else if (fileExt === "pdf") {
                  mimeType = "application/pdf";
                } else if (["doc", "docx"].includes(fileExt)) {
                  mimeType = "application/msword";
                } else if (["xls", "xlsx"].includes(fileExt)) {
                  mimeType = "application/vnd.ms-excel";
                }

                newFile.type = mimeType;
              }

              // Проверяем и исправляем имя файла
              if (!newFile.name || newFile.name.trim() === "") {
                const defaultName = `${
                  fileType.charAt(0).toUpperCase() + fileType.slice(0, -1)
                } ${Math.floor(Math.random() * 1000)}`;
                newFile.name = defaultName;
                newFile.originalName = newFile.originalName || defaultName;
              }

              // Помечаем как сохраненный файл
              newFile.isStoredFile = true;

              return newFile;
            })
            .filter((file) => file !== null);
        }
      });
    }

    return project;
  }

  // ... rest of the existing methods ...

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
}
