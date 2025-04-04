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
    // Добавляем стили для мигрированных проектов
    if (
      typeof window.GlobalData !== "undefined" &&
      window.GlobalData &&
      window.GlobalData.MigratedProjects &&
      window.GlobalData.MigratedProjects.length
    ) {
      window.GlobalData.MigratedProjects.forEach((projectId) => {
        this.addStyleForMigratedProjects(projectId);
      });
    }

    // Создаем модальное окно для превью, если его нет
    this.ensurePreviewModalExists();

    // Загружаем данные и инициализируем компоненты
    this.loadData().then(() => {
      // Инициализация всех компонентов
      this.initDatepickers();
      this.initNavigation();
      this.initEventListeners();
      this.renderActiveSection();
    });
  }

  // Метод для создания модального окна для предпросмотра изображений
  ensurePreviewModalExists() {
    // Проверяем наличие модального окна
    if (!this.container.querySelector(".preview-modal")) {
      console.log("Creating preview modal window");

      // Добавляем стили для файловых превью, если их нет
      if (!document.getElementById("file-preview-styles")) {
        const previewStyles = document.createElement("style");
        previewStyles.id = "file-preview-styles";
        previewStyles.innerHTML = `
          .file-preview-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
          }
          
          .file-preview-item {
            position: relative;
            width: 100px;
            height: 120px;
            border: 1px solid #ddd;
        border-radius: 4px;
            padding: 5px;
        display: flex;
            flex-direction: column;
        align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            background-color: #f9f9f9;
            overflow: hidden;
          }
          
          .file-preview-item:hover {
            border-color: #0088cc;
            box-shadow: 0 0 5px rgba(0, 136, 204, 0.5);
          }
          
          .file-preview-item img {
            max-width: 90%;
            max-height: 70px;
            object-fit: contain;
            margin-bottom: 5px;
          }
          
          .file-type-icon {
            font-size: 2.5rem;
            color: #999;
            margin-bottom: 5px;
          }
          
          .file-name {
            font-size: 0.8rem;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
          }
          
          .remove-file {
            position: absolute;
            top: 2px;
            right: 2px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: #f44336;
            color: white;
            border: none;
            font-size: 14px;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            opacity: 0.7;
          }
          
          .remove-file:hover {
            opacity: 1;
          }
          
          .preview-modal {
            z-index: 9999 !important;
          }
          
          .preview-content {
            position: relative;
            max-width: 90%;
            max-height: 90%;
            background-color: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          .preview-content img {
            max-width: 100%;
            max-height: 80vh;
            object-fit: contain;
          }
        `;
        document.head.appendChild(previewStyles);
      }

      // Создаем модальное окно
      const modal = document.createElement("div");
      modal.className = "preview-modal";
      modal.style.display = "none";
      modal.style.alignItems = "center";
      modal.style.justifyContent = "center";
      modal.style.position = "fixed";
      modal.style.top = "0";
      modal.style.left = "0";
      modal.style.width = "100%";
      modal.style.height = "100%";
      modal.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      modal.style.zIndex = "1000";

      // Создаем содержимое модального окна
      const previewContent = document.createElement("div");
      previewContent.className = "preview-content";
      previewContent.style.position = "relative";
      previewContent.style.maxWidth = "90%";
      previewContent.style.maxHeight = "90%";
      previewContent.style.backgroundColor = "#fff";
      previewContent.style.padding = "20px";
      previewContent.style.borderRadius = "5px";
      previewContent.style.boxShadow = "0 0 20px rgba(0, 0, 0, 0.3)";

      // Создаем кнопку закрытия
      const closeButton = document.createElement("button");
      closeButton.className = "close-preview";
      closeButton.innerHTML = "&times;";
      closeButton.style.position = "absolute";
      closeButton.style.top = "10px";
      closeButton.style.right = "10px";
      closeButton.style.backgroundColor = "#f44336";
      closeButton.style.color = "white";
      closeButton.style.border = "none";
      closeButton.style.borderRadius = "50%";
      closeButton.style.width = "30px";
      closeButton.style.height = "30px";
      closeButton.style.fontSize = "20px";
      closeButton.style.cursor = "pointer";
      closeButton.style.display = "flex";
      closeButton.style.alignItems = "center";
      closeButton.style.justifyContent = "center";

      // Создаем элемент изображения
      const previewImage = document.createElement("img");
      previewImage.style.maxWidth = "100%";
      previewImage.style.maxHeight = "80vh";
      previewImage.style.display = "block";
      previewImage.alt = "Preview";

      // Собираем модальное окно
      previewContent.appendChild(closeButton);
      previewContent.appendChild(previewImage);
      modal.appendChild(previewContent);

      // Добавляем модальное окно в контейнер
      this.container.appendChild(modal);
    }
  }

  // Добавляем стили для конкретного мигрированного проекта
  addStyleForMigratedProjects(projectId) {
    // Проверяем наличие стилей для мигрированных проектов
    if (!document.getElementById("migrated-project-styles")) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "migrated-project-styles";
      styleSheet.innerHTML = `
        .project-card.migrated-project {
          border-left: 4px solid #0088cc;
          background-color: rgba(0, 136, 204, 0.05);
          transition: height 0.3s ease, min-height 0.3s ease;
        }
        
        .migrated-flag {
        display: inline-block;
          background-color: #0088cc;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
          font-size: 12px;
        margin-left: 8px;
        }
        
        .migrated-files-group {
          border-left: 3px solid #0088cc;
          padding-left: 10px;
          margin-bottom: 20px;
          overflow: visible;
          transition: max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease;
        }
        
        .from-future-title {
          color: #0088cc;
          font-weight: bold;
          margin-bottom: 10px;
          display: none;
        }
        
        .migrated-separator {
          height: 1px;
          background-color: #ddd;
          margin: 20px 0;
          transition: margin 0.3s ease;
        }
        
        .current-files-title {
          color: #4CAF50;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .migrated-files {
          margin-bottom: 15px;
          position: relative;
        }
        
        .from-future-flag {
          color: #0088cc;
        font-size: 12px;
          font-weight: bold;
        }
        
        .migrated-header {
          margin-bottom: 8px;
          margin-top: 5px;
        }
        
        .migrated-files-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
      `;
      document.head.appendChild(styleSheet);
    }

    console.log(`Added styles for migrated project ${projectId}`);
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

  // Helper method to update card size after toggle
  updateCardSize(card) {
    // Ensure card is a DOM element
    if (!card || typeof card.closest !== "function") {
      // If card is not a DOM element, try to find the project card differently
      // This handles cases where 'card' might be the project card body or another element
      const projectCard = card.parentElement
        ? card.parentElement.closest(".project-card")
        : document.querySelector(".project-card");

      if (projectCard) {
        // Set height to auto to let it resize naturally
        projectCard.style.height = "auto";
        const cardBody = projectCard.querySelector(".card-body");
        if (cardBody) {
          cardBody.style.height = "auto";
        }
      }
      return;
    }

    // Regular handling if card is a DOM element with closest method
    const projectCard = card.closest(".project-card");
    if (projectCard) {
      // Ensure card body expands/contracts with content
      const cardBody = projectCard.querySelector(".card-body");
      if (cardBody) {
        // Use setTimeout to ensure DOM has updated
        setTimeout(() => {
          // Reset any fixed heights
          cardBody.style.height = "";
          projectCard.style.height = "";

          // Calculate and set new height
          const height = cardBody.scrollHeight;
          cardBody.style.height = height + "px";

          // Allow height to adjust naturally after initial animation
          setTimeout(() => {
            cardBody.style.height = "auto";
          }, 300);
        }, 10);
      }
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
      (project.budgetDocs && project.budgetDocs.length > 0) ||
      (project.documents &&
        project.documents.length > 0 &&
        project.migratedFromFuture);

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

      // Update card size after toggle - pass the project card element
      this.updateCardSize(docHeader.closest(".project-card"));
    });

    // Reorganize documents grid - group migrated files at the top
    if (isMigratedProject) {
      // Clear existing content
      documentsGrid.innerHTML = "";

      // Add a collapsible header for migrated files
      const migratedHeader = document.createElement("div");
      migratedHeader.className = "section-header";
      migratedHeader.innerHTML = `
        <h4 class="toggle-documents">
          <i class="fas fa-chevron-down"></i> 
          <span class="from-future-flag">From Future Project</span>
        </h4>
      `;
      documentsGrid.appendChild(migratedHeader);

      // Create migrated files group
      const migratedFilesGroup = document.createElement("div");
      migratedFilesGroup.className = "migrated-files-group documents-content";
      documentsGrid.appendChild(migratedFilesGroup);

      // Make sure content is fully visible with scrolling if needed
      migratedFilesGroup.style.overflowY = "visible";
      migratedFilesGroup.style.maxHeight = "none";
      documentsGrid.style.overflowY = "visible";

      // Add Planning Documents (formerly called Documents in Future Projects) if they exist
      if (
        project.documents &&
        project.documents.length > 0 &&
        project.migratedFromFuture
      ) {
        const planningDocsGroup = document.createElement("div");
        planningDocsGroup.className = "documents-group migrated-files";
        planningDocsGroup.innerHTML = `
          <h5>Planning Documents</h5>
          <div class="planning-docs-preview file-preview-container">
            ${this.renderFilePreviews(project.documents, "document")}
          </div>
        `;
        migratedFilesGroup.appendChild(planningDocsGroup);
      }

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

      // Add a collapsible header for current files
      const currentHeader = document.createElement("div");
      currentHeader.className = "section-header";
      currentHeader.innerHTML = `
        <h4 class="toggle-documents">
          <i class="fas fa-chevron-down"></i> 
          <span class="current-files-title">Current Project Files</span>
        </h4>
      `;
      documentsGrid.appendChild(currentHeader);

      // Create current files group
      const currentFilesGroup = document.createElement("div");
      currentFilesGroup.className = "current-files-group documents-content";
      documentsGrid.appendChild(currentFilesGroup);

      // Add current files (Photos, Reports)
      // Photos
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

      // Reports
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

      // Add toggle functionality for each section individually
      const toggleSections = card.querySelectorAll(".toggle-documents");
      toggleSections.forEach((toggle) => {
        toggle.addEventListener("click", (e) => {
          const content = toggle.closest(".section-header").nextElementSibling;
          content.classList.toggle("collapsed");
          const icon = toggle.querySelector("i");
          icon.classList.toggle("fa-chevron-down");
          icon.classList.toggle("fa-chevron-right");

          // Update card size after toggle
          this.updateCardSize(toggle.closest(".project-card"));
        });
      });
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

      // Update card size after toggle
      this.updateCardSize(card);
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

    console.log("Adding file preview:", file); // Для отладки

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

    // Всегда устанавливаем тип MIME для фотографий
    if (type === "photo") {
      previewItem.dataset.mimeType = file.type || "image/jpeg";
    } else {
      previewItem.dataset.mimeType = file.type || "application/octet-stream";
    }

    // Проверяем, является ли файл изображением - для фото это всегда true
    const isImage =
      type === "photo" ||
      file.type?.startsWith("image/") ||
      (fileName && fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff|tif)$/i));

    console.log("Is image:", isImage, "Type:", type, "File type:", file.type); // Для отладки

    // Если это изображение, создаем превью
    if (isImage) {
      const img = document.createElement("img");
      try {
        // Используем существующий URL или создаем новый
        if (file.src) {
          console.log("Using existing src:", file.src); // Для отладки
          img.src = file.src;
        } else if (file instanceof Blob || file instanceof File) {
          console.log("Creating new blob URL"); // Для отладки
          const imgUrl = URL.createObjectURL(file);
          img.src = imgUrl;
          previewItem.dataset.imgUrl = imgUrl; // Сохраняем URL для последующего освобождения
        } else if (file.file instanceof Blob || file.file instanceof File) {
          // Иногда файл может быть обернут в объект с полем file
          console.log("Creating new blob URL from file.file"); // Для отладки
          const imgUrl = URL.createObjectURL(file.file);
          img.src = imgUrl;
          previewItem.dataset.imgUrl = imgUrl;
        } else {
          // Если у нас нет прямого доступа к блобу, попробуем использовать base64 или путь к файлу
          console.log("Trying to use file data or path"); // Для отладки
          if (file.data) {
            // Если есть данные в base64
            img.src = file.data;
          } else if (file.path) {
            // Если есть путь к файлу
            img.src = file.path;
          } else {
            // Последняя попытка - если файл - это строка с URL или данными base64
            img.src = typeof file === "string" ? file : "";
          }
        }

        // Проверка на ошибку загрузки изображения
        img.onerror = () => {
          console.error("Error loading image:", img.src);
          img.remove();
          // Если не удалось загрузить изображение, используем иконку
          const iconDiv = document.createElement("div");
          iconDiv.className = "file-type-icon";
          iconDiv.innerHTML = `<i class="fas fa-image"></i>`;
          previewItem.appendChild(iconDiv);
        };

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

    // Добавляем кнопку удаления
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-file";
    removeBtn.innerHTML = "×";
    removeBtn.title = "Remove file";
    previewItem.appendChild(removeBtn);

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
    // Предотвращаем добавление обработчиков дважды
    if (container.dataset.previewEventsInitialized === "true") {
      return;
    }

    // Добавляем кнопки удаления ко всем превью, если их еще нет
    const fileItems = container.querySelectorAll(".file-preview-item");
    fileItems.forEach((item) => {
      // Проверяем, есть ли уже кнопка удаления
      if (!item.querySelector(".remove-file")) {
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-file";
        removeBtn.innerHTML = "×";
        removeBtn.title = "Remove file";
        item.appendChild(removeBtn);
      }
    });

    // Обработка событий нажатия на превью файлов
    fileItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        // Проверяем, не кликнули ли мы на кнопку удаления
        if (
          e.target.classList.contains("remove-file") ||
          e.target.closest(".remove-file")
        ) {
          e.stopPropagation();
          return;
        }

        // Получаем данные о файле
        const fileType = item.dataset.fileType;
        const mimeType = item.dataset.mimeType;
        const fileName = item.dataset.fileName;

        console.log("File clicked:", fileType, mimeType, fileName); // Для отладки

        // Если это фото или изображение, показываем его в модальном окне
        if (
          fileType === "photo" ||
          (mimeType && mimeType.startsWith("image/"))
        ) {
          const imgElement = item.querySelector("img");
          if (imgElement && imgElement.src) {
            console.log("Opening image preview:", imgElement.src); // Для отладки
            this.showFilePreviewModal(imgElement.src);
          } else {
            console.log("No img element or src found for image preview"); // Для отладки

            // Пробуем получить данные о фото из базы данных или хранилища
            const fileName = item.dataset.fileName;
            const projectId = item.closest(".project-card")?.dataset.projectId;

            if (projectId && fileName) {
              // Формируем путь к файлу на сервере
              const fileUrl = `components/construction/uploads/${projectId}/${fileName}`;
              console.log("Trying to load image from server:", fileUrl);
              this.showFilePreviewModal(fileUrl);
            }
          }
        } else {
          // Для других типов файлов можно реализовать другую логику (например, скачивание)
          console.log(`File clicked: ${fileName} of type ${fileType}`);
        }
      });
    });

    // Привязываем событие для кнопок удаления файлов
    const removeButtons = container.querySelectorAll(".remove-file");
    removeButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault(); // Добавлено для предотвращения перенаправления

        // Находим родительский элемент и удаляем его
        const fileItem = button.closest(".file-preview-item");
        if (fileItem) {
          // Если есть URL-объект, освобождаем его
          if (fileItem.dataset.imgUrl) {
            URL.revokeObjectURL(fileItem.dataset.imgUrl);
          }

          // Удаляем элемент
          fileItem.remove();

          // Найдем ID проекта и обновим данные проекта, чтобы синхронизировать удаление в карточке и форме редактирования
          const projectCard = button.closest(".project-card");
          if (projectCard) {
            const projectId = parseInt(projectCard.dataset.id);
            const projectsList = projectCard.closest(".projects-grid");
            const projectType =
              projectsList.id === "current-projects-list"
                ? "current"
                : "future";
            const project = this.getProjectById(projectId, projectType);

            if (project) {
              // Синхронизируем удаленные файлы между карточкой и потенциальной формой редактирования
              this.syncDeletedPhotos(fileItem, project);
            }
          }
        }
      });
    });

    // Добавляем обработчики для toggle-documents в модальном окне
    if (
      container.closest("#current-project-modal") ||
      container.closest("#future-project-modal")
    ) {
      const toggleElements = container
        .closest(".form-section")
        ?.querySelectorAll(".toggle-documents");
      if (toggleElements && toggleElements.length > 0) {
        toggleElements.forEach((toggle) => {
          // Предотвращаем повторное добавление обработчика
          if (toggle.dataset.toggleInitialized === "true") {
            return;
          }

          toggle.addEventListener("click", (e) => {
            const content =
              toggle.closest(".section-header").nextElementSibling;
            content.classList.toggle("collapsed");
            const icon = toggle.querySelector("i");
            icon.classList.toggle("fa-chevron-down");
            icon.classList.toggle("fa-chevron-right");
          });

          toggle.dataset.toggleInitialized = "true";
        });
      }
    }

    // Помечаем контейнер как инициализированный
    container.dataset.previewEventsInitialized = "true";
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

    // Синхронизируем Photos
    if (
      targetProject.photos &&
      Array.isArray(targetProject.photos) &&
      sourceProject.photos &&
      Array.isArray(sourceProject.photos)
    ) {
      // Создаем карту файлов из исходного проекта
      const sourcePhotoMap = {};
      sourceProject.photos.forEach((photo) => {
        if (photo && photo.name) {
          const key = photo.name || photo.originalName;
          sourcePhotoMap[key] = true;
        }
      });

      // Фильтруем фотографии, оставляя только те, которые есть в исходном проекте
      targetProject.photos = targetProject.photos.filter((photo) => {
        if (!photo) return false;
        const key = photo.name || photo.originalName;
        return sourcePhotoMap[key];
      });
    }

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

      // Пометим все specifications как мигрированные
      targetProject.specifications = targetProject.specifications.map(
        (file) => {
          return { ...file, migratedFromFuture: true };
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

      // Отфильтровываем только те документы, которые есть в исходном проекте
      // и помечаем их как мигрированные
      const migratedDocuments = targetProject.documents
        .filter((file) => {
          const key = `${file.name}-${file.type}`;
          return sourceFileMap[key];
        })
        .map((file) => {
          return { ...file, migratedFromFuture: true };
        });

      // Сохраняем немигрированные документы
      const currentDocuments = targetProject.documents.filter((file) => {
        return !file.migratedFromFuture;
      });

      // Объединяем документы
      targetProject.documents = [...migratedDocuments, ...currentDocuments];
    }

    // Синхронизируем Budget Documents
    if (sourceProject.budgetDocs && targetProject.budgetDocs) {
      const sourceFileMap = {};
      sourceProject.budgetDocs.forEach((file) => {
        const key = `${file.name}-${file.type}`;
        sourceFileMap[key] = true;
      });

      targetProject.budgetDocs = targetProject.budgetDocs.filter((file) => {
        const key = `${file.name}-${file.type}`;
        return sourceFileMap[key];
      });

      // Пометим все budget documents как мигрированные
      targetProject.budgetDocs = targetProject.budgetDocs.map((file) => {
        return { ...file, migratedFromFuture: true };
      });
    }

    // Помечаем проект как мигрированный
    targetProject.migratedFromFuture = true;

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

      // Mark that this project was migrated from Future Projects
      projectCopy.migratedFromFuture = true;

      // Mark documents as migrated
      if (projectCopy.documents && projectCopy.documents.length > 0) {
        projectCopy.documents = projectCopy.documents.map((doc) => {
          return { ...doc, migratedFromFuture: true };
        });
      }

      // Отмечаем спецификации как мигрированные
      if (projectCopy.specifications && projectCopy.specifications.length > 0) {
        projectCopy.specifications = projectCopy.specifications.map((spec) => {
          return { ...spec, migratedFromFuture: true };
        });
      }

      // Отмечаем бюджетные документы как мигрированные
      if (projectCopy.budgetDocs && projectCopy.budgetDocs.length > 0) {
        projectCopy.budgetDocs = projectCopy.budgetDocs.map((doc) => {
          return { ...doc, migratedFromFuture: true };
        });
      }

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

    // Добавляем обработчики для кнопок удаления файлов
    setTimeout(() => {
      const allRemoveButtons = modal.querySelectorAll(".remove-file");
      allRemoveButtons.forEach((button) => {
        // Клонируем кнопку, чтобы удалить все обработчики событий
        const clone = button.cloneNode(true);
        button.parentNode.replaceChild(clone, button);

        // Добавляем новый обработчик с правильной логикой
        clone.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();

          // Удаляем превью файла
          const fileItem = clone.closest(".file-preview-item");
          if (fileItem) {
            if (fileItem.dataset.imgUrl) {
              URL.revokeObjectURL(fileItem.dataset.imgUrl);
            }
            fileItem.remove();
          }
        });
      });
    }, 300);

    modal.classList.add("active");
  }

  displayExistingFiles(project, type) {
    // Если проект отсутствует или не имеет структуры файлов, нечего отображать
    if (!project) return;

    // Предварительно проверяем и корректируем структуру файлов проекта
    project = this.ensureFileStructures(project, type);

    // Определяем контейнеры для превью в зависимости от типа проекта
    if (type === "current") {
      // Текущий проект - отображаем фотографии, документы и отчеты
      const modal = this.container.querySelector("#current-project-modal");
      if (!modal) return;

      // Находим все контейнеры превью
      const photosContainer = modal.querySelector("#current-photos-preview");
      const documentsContainer = modal.querySelector(
        "#current-documents-preview"
      );
      const reportsContainer = modal.querySelector("#current-reports-preview");

      // Очищаем контейнеры перед добавлением файлов
      if (photosContainer) photosContainer.innerHTML = "";
      if (documentsContainer) documentsContainer.innerHTML = "";
      if (reportsContainer) reportsContainer.innerHTML = "";

      // Отображаем фотографии
      if (photosContainer && project.photos && Array.isArray(project.photos)) {
        project.photos.forEach((photo) => {
          if (photo) {
            this.addFilePreview(photo, photosContainer, "photo");
          }
        });
      }

      // Отображаем отчеты
      if (
        reportsContainer &&
        project.reports &&
        Array.isArray(project.reports)
      ) {
        project.reports.forEach((report) => {
          if (report) {
            this.addFilePreview(report, reportsContainer, "report");
          }
        });
      }

      // Отображаем документы
      if (
        documentsContainer &&
        project.documents &&
        Array.isArray(project.documents)
      ) {
        // Фильтруем документы, чтобы отображать только те, которые не мигрированы из будущих проектов
        const nonMigratedDocs = project.documents.filter(
          (doc) => !doc.migratedFromFuture
        );
        nonMigratedDocs.forEach((doc) => {
          if (doc) {
            this.addFilePreview(doc, documentsContainer, "document");
          }
        });
      }

      // Проверяем, является ли проект мигрированным из Future Projects
      const isMigratedProject =
        project.migratedFromFuture ||
        (project.specifications && project.specifications.length) ||
        (project.documents &&
          project.documents.some((doc) => doc.migratedFromFuture));

      if (isMigratedProject) {
        // Создаем или находим контейнер для мигрированных файлов
        let migratedFilesGroup = modal.querySelector(".migrated-files-group");

        if (!migratedFilesGroup) {
          // Если контейнера нет, создаем его
          const filesSection =
            modal.querySelector(".form-section:has(#current-photos-preview)") ||
            modal.querySelector(".form-section:has(.file-preview-container)");

          if (filesSection) {
            migratedFilesGroup = document.createElement("div");
            migratedFilesGroup.className = "form-section migrated-files-group";
            migratedFilesGroup.innerHTML = `
              <h3>Files from Future Project</h3>
              <div class="info-message">
                <i class="fas fa-info-circle"></i> These files were migrated from Future Projects section.
              </div>
            `;

            filesSection.after(migratedFilesGroup);
          }
        }

        if (migratedFilesGroup) {
          // Очищаем контейнер перед добавлением файлов
          const existingContainers =
            migratedFilesGroup.querySelectorAll(".form-group");
          existingContainers.forEach((container) => container.remove());

          // Добавляем мигрированные документы
          if (
            project.documents &&
            project.documents.some((doc) => doc.migratedFromFuture)
          ) {
            const migratedDocs = project.documents.filter(
              (doc) => doc.migratedFromFuture
            );

            if (migratedDocs.length > 0) {
              const docsGroup = document.createElement("div");
              docsGroup.className = "form-group";
              docsGroup.innerHTML = `
                <label>Planning Documents</label>
                <div id="current-planning-docs-preview" class="file-preview-container"></div>
              `;
              migratedFilesGroup.appendChild(docsGroup);

              const docsContainer = docsGroup.querySelector(
                "#current-planning-docs-preview"
              );
              migratedDocs.forEach((doc) => {
                if (doc) {
                  this.addFilePreview(doc, docsContainer, "document");
                }
              });
            }
          }

          // Добавляем спецификации
          if (project.specifications && project.specifications.length > 0) {
            const specsGroup = document.createElement("div");
            specsGroup.className = "form-group";
            specsGroup.innerHTML = `
              <label>Project Specifications</label>
                <div id="current-specifications-preview" class="file-preview-container"></div>
              `;
            migratedFilesGroup.appendChild(specsGroup);

            const specsContainer = specsGroup.querySelector(
              "#current-specifications-preview"
            );
            project.specifications.forEach((spec) => {
              if (spec) {
                this.addFilePreview(spec, specsContainer, "specification");
              }
            });
          }
        }
      }

      // После добавления всех файлов, настраиваем обработчики для кнопок удаления
      setTimeout(() => {
        const allRemoveButtons = modal.querySelectorAll(".remove-file");
        allRemoveButtons.forEach((button) => {
          // Удаляем существующие обработчики
          const clone = button.cloneNode(true);
          button.parentNode.replaceChild(clone, button);

          // Добавляем новый обработчик для модального окна
          clone.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Удаляем превью файла
            const fileItem = clone.closest(".file-preview-item");
            if (fileItem) {
              if (fileItem.dataset.imgUrl) {
                URL.revokeObjectURL(fileItem.dataset.imgUrl);
              }
              fileItem.remove();
            }
          });
        });
      }, 200);
    } else {
      // Future project - отображаем документы и спецификации
      const modal = this.container.querySelector("#future-project-modal");
      if (!modal) return;

      // Находим контейнеры для превью
      const documentsContainer = modal.querySelector(
        "#future-documents-preview"
      );
      const specificationsContainer = modal.querySelector(
        "#future-specifications-preview"
      );

      // Очищаем контейнеры перед добавлением файлов
      if (documentsContainer) documentsContainer.innerHTML = "";
      if (specificationsContainer) specificationsContainer.innerHTML = "";

      // Добавляем документы
      if (
        documentsContainer &&
        project.documents &&
        Array.isArray(project.documents)
      ) {
        project.documents.forEach((doc) => {
          if (doc) {
            this.addFilePreview(doc, documentsContainer, "document");
          }
        });
      }

      // Добавляем спецификации
      if (
        specificationsContainer &&
        project.specifications &&
        Array.isArray(project.specifications)
      ) {
        project.specifications.forEach((spec) => {
          if (spec) {
            this.addFilePreview(spec, specificationsContainer, "specification");
          }
        });
      }

      // Настраиваем обработчики для кнопок удаления
      setTimeout(() => {
        const allRemoveButtons = modal.querySelectorAll(".remove-file");
        allRemoveButtons.forEach((button) => {
          // Удаляем существующие обработчики
          const clone = button.cloneNode(true);
          button.parentNode.replaceChild(clone, button);

          // Добавляем новый обработчик для модального окна
          clone.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Удаляем превью файла
            const fileItem = clone.closest(".file-preview-item");
            if (fileItem) {
              if (fileItem.dataset.imgUrl) {
                URL.revokeObjectURL(fileItem.dataset.imgUrl);
              }
              fileItem.remove();
            }
          });
        });
      }, 200);
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
    // Define file input selectors based on project type
    const fileInputs =
      type === "current"
        ? ["#current-photos", "#current-documents", "#current-reports"]
        : ["#future-documents", "#future-specifications"];

    fileInputs.forEach((inputSelector) => {
      const input = this.container.querySelector(inputSelector);
      if (!input) return;

      // Определяем соответствующий контейнер превью
      const previewSelector = inputSelector + "-preview";
      const previewContainer = this.container.querySelector(previewSelector);
      if (!previewContainer) return;

      // Очищаем существующие обработчики
      if (input._eventListenerAttached) {
        input.removeEventListener("change", input._eventListenerAttached);
      }

      // Обработчик события выбора файлов
      const handleFileSelect = (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Определяем тип файла на основе селектора
        let fileType = "document";
        if (inputSelector.includes("photos")) {
          fileType = "photo";
        } else if (inputSelector.includes("reports")) {
          fileType = "report";
        } else if (inputSelector.includes("specifications")) {
          fileType = "specification";
        }

        console.log(
          `Selected ${files.length} files of type ${fileType} for ${inputSelector}`
        );

        // Обрабатываем каждый выбранный файл
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          this.addFilePreview(file, previewContainer, fileType);
        }
      };

      // Прикрепляем обработчик
      input._eventListenerAttached = handleFileSelect;
      input.addEventListener("change", handleFileSelect);

      // Добавляем специальную обработку для кнопок удаления внутри модального окна
      // Это предотвратит перенаправление на главную страницу при удалении фото
      const setupRemoveButtons = () => {
        const modal = input.closest(".modal");
        if (!modal) return;

        const removeButtons = modal.querySelectorAll(".remove-file");
        removeButtons.forEach((button) => {
          // Удаляем существующие обработчики, чтобы избежать дублирования
          const clone = button.cloneNode(true);
          button.parentNode.replaceChild(clone, button);

          // Добавляем новый обработчик с правильной логикой для модального окна
          clone.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Удаляем превью файла
            const fileItem = clone.closest(".file-preview-item");
            if (fileItem) {
              if (fileItem.dataset.imgUrl) {
                URL.revokeObjectURL(fileItem.dataset.imgUrl);
              }
              fileItem.remove();
            }
          });
        });
      };

      // Выполняем настройку обработчиков с небольшой задержкой, чтобы
      // дать время для рендеринга превью файлов в модальном окне
      setTimeout(setupRemoveButtons, 100);
    });

    // Добавляем обработчик для обеспечения правильного удаления файлов после загрузки модального окна
    const setupModalRemoveHandlers = () => {
      const modal = this.container.querySelector(`#${type}-project-modal`);
      if (!modal) return;

      // Обрабатываем все кнопки удаления в модальном окне
      const allRemoveButtons = modal.querySelectorAll(".remove-file");
      allRemoveButtons.forEach((button) => {
        // Удаляем существующие обработчики
        const clone = button.cloneNode(true);
        button.parentNode.replaceChild(clone, button);

        // Добавляем новый обработчик для модального окна
        clone.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();

          // Удаляем превью файла
          const fileItem = clone.closest(".file-preview-item");
          if (fileItem) {
            if (fileItem.dataset.imgUrl) {
              URL.revokeObjectURL(fileItem.dataset.imgUrl);
            }
            fileItem.remove();
          }
        });
      });
    };

    // Выполняем настройку с небольшой задержкой
    setTimeout(setupModalRemoveHandlers, 200);
  }

  // Обновленный метод для отображения превью изображений в модальном окне
  showFilePreviewModal(imageSrc) {
    console.log("Showing preview modal for image:", imageSrc); // Для отладки

    // Проверяем наличие модального окна
    if (!this.container.querySelector(".preview-modal")) {
      this.ensurePreviewModalExists();
    }

    const modal = this.container.querySelector(".preview-modal");
    const previewImage = modal.querySelector(".preview-content img");
    if (!previewImage) {
      console.error("Preview image element not found!");
      return;
    }

    // Создаем индикатор загрузки
    let loadingIndicator = modal.querySelector(".loading-indicator");
    if (!loadingIndicator) {
      loadingIndicator = document.createElement("div");
      loadingIndicator.className = "loading-indicator";
      loadingIndicator.innerHTML = `
        <div class="spinner">
          <div class="bounce1"></div>
          <div class="bounce2"></div>
          <div class="bounce3"></div>
        </div>
        <p>Loading image...</p>
      `;
      loadingIndicator.style.position = "absolute";
      loadingIndicator.style.top = "50%";
      loadingIndicator.style.left = "50%";
      loadingIndicator.style.transform = "translate(-50%, -50%)";
      loadingIndicator.style.color = "#333";
      loadingIndicator.style.fontSize = "16px";
      loadingIndicator.style.textAlign = "center";

      const spinner = loadingIndicator.querySelector(".spinner");
      spinner.style.margin = "0 auto";
      spinner.style.width = "70px";
      spinner.style.textAlign = "center";

      const bounces = loadingIndicator.querySelectorAll(
        ".bounce1, .bounce2, .bounce3"
      );
      bounces.forEach((bounce) => {
        bounce.style.width = "18px";
        bounce.style.height = "18px";
        bounce.style.backgroundColor = "#0088cc";
        bounce.style.borderRadius = "100%";
        bounce.style.display = "inline-block";
        bounce.style.animation =
          "sk-bouncedelay 1.4s infinite ease-in-out both";
        bounce.style.marginRight = "5px";
      });

      const styleSheet = document.createElement("style");
      styleSheet.textContent = `
        @keyframes sk-bouncedelay {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
        .spinner .bounce1 { animation-delay: -0.32s; }
        .spinner .bounce2 { animation-delay: -0.16s; }
      `;
      document.head.appendChild(styleSheet);

      modal.querySelector(".preview-content").appendChild(loadingIndicator);
    }

    // Показываем индикатор загрузки и скрываем изображение
    loadingIndicator.style.display = "block";
    previewImage.style.display = "none";

    // Важно! Удаляем предыдущие обработчики событий перед установкой новых
    previewImage.onload = null;
    previewImage.onerror = null;

    // Очищаем предыдущее изображение
    previewImage.src = "";

    // Устанавливаем новые обработчики перед загрузкой нового изображения
    previewImage.onload = () => {
      console.log("Image loaded successfully in modal"); // Для отладки
      loadingIndicator.style.display = "none";
      previewImage.style.display = "block";
    };

    previewImage.onerror = () => {
      console.error("Failed to load image in modal:", imageSrc); // Для отладки

      // Пытаемся исправить URL, если это путь к локальному файлу
      if (
        !imageSrc.startsWith("data:") &&
        !imageSrc.startsWith("blob:") &&
        !imageSrc.startsWith("http")
      ) {
        // Пробуем разные пути к изображению
        const attemptPaths = [
          // Оригинальный путь
          imageSrc,
          // Путь относительно корня сайта
          `${window.location.origin}/${imageSrc}`,
          // Путь относительно Inspections-Checklist-Portal
          `${window.location.origin}/Maintenance_P/Inspections-Checklist-Portal/${imageSrc}`,
          // Путь с другим расширением
          `${imageSrc.replace(/\.\w+$/, ".jpg")}`,
          `${imageSrc.replace(/\.\w+$/, ".jpeg")}`,
          `${imageSrc.replace(/\.\w+$/, ".png")}`,
        ];

        console.log("Trying alternative URLs:", attemptPaths);

        // Последовательно пробуем все альтернативные пути
        let currentPathIndex = 1; // Начинаем со второго пути, так как первый уже не сработал

        const tryNextPath = () => {
          if (currentPathIndex < attemptPaths.length) {
            // Снова очищаем обработчики перед установкой нового src
            const nextPath = attemptPaths[currentPathIndex];
            currentPathIndex++;

            // Устанавливаем обработчики перед установкой нового src
            previewImage.onload = () => {
              console.log(
                "Image loaded with alternative URL:",
                previewImage.src
              );
              loadingIndicator.style.display = "none";
              previewImage.style.display = "block";
            };

            previewImage.onerror = tryNextPath;

            // Устанавливаем новый src
            previewImage.src = nextPath;
          } else {
            // Если все попытки не удались, показываем сообщение об ошибке
            loadingIndicator.innerHTML = `
              <div style="text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #f44336;"></i>
                <p>Failed to load image</p>
              </div>
            `;
          }
        };

        // Начинаем процесс
        tryNextPath();
      } else if (imageSrc.startsWith("blob:")) {
        // Для blob URL есть проблема с повторным использованием
        // Покажем сообщение с информацией, что превью может быть временно недоступно
        loadingIndicator.innerHTML = `
          <div style="text-align: center;">
            <i class="fas fa-info-circle" style="font-size: 2rem; color: #0088cc;"></i>
            <p>Preview may be temporarily unavailable.<br>Try closing and reopening the modal.</p>
          </div>
        `;
      } else {
        // Для URL из data или http протоколов, просто показываем сообщение об ошибке
        loadingIndicator.innerHTML = `
          <div style="text-align: center;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #f44336;"></i>
            <p>Failed to load image</p>
          </div>
        `;
      }
    };

    // Устанавливаем новый src после настройки обработчиков
    setTimeout(() => {
      previewImage.src = imageSrc;
    }, 100);

    // Показываем модальное окно
    modal.style.display = "flex";

    // Функция закрытия модального окна
    const closePreviewHandler = () => {
      modal.style.display = "none";
      document.removeEventListener("keydown", escapeKeyHandler);

      // Важно! Очищаем src и обработчики при закрытии
      previewImage.src = "";
      previewImage.onload = null;
      previewImage.onerror = null;
    };

    // Находим кнопку закрытия
    const closeButton = modal.querySelector(".close-preview");
    if (closeButton) {
      // Закрытие по клику на кнопку закрытия
      closeButton.onclick = closePreviewHandler;
    }

    // Закрытие по клику на фон (но не на само изображение)
    modal.onclick = (e) => {
      if (e.target === modal) {
        closePreviewHandler();
      }
    };

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

    // Preserve migratedFromFuture flag if it exists
    if (existingProject && existingProject.migratedFromFuture) {
      projectData.migratedFromFuture = true;
    }

    // Определяем, является ли проект перенесенным из Future в Current
    const isMigratedProject =
      projectType === "current" &&
      (form.elements.description ||
        form.elements.objectives ||
        form.elements.risks ||
        form.elements.priority ||
        document.querySelector("#current-specifications-preview") ||
        document.querySelector("#current-planning-docs-preview") ||
        existingProject?.migratedFromFuture);

    // Добавляем данные в зависимости от типа проекта
    if (projectType === "current") {
      projectData.progress = parseInt(form.elements.progress.value) || 0;
      projectData.actualCost = parseFloat(form.elements.actualCost.value) || 0;
      projectData.status = form.elements.status.value;
      projectData.lastUpdate = this.formatDateForStorage(
        form.elements.lastUpdate.value
      );

      // Always collect photos and reports
      projectData.photos = this.collectFiles(
        "#current-photos",
        "#current-photos-preview"
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
            projectData.specifications = specsFromContainer.map((spec) => {
              spec.migratedFromFuture = true; // Mark as migrated
              return spec;
            });
          } else if (existingProject && existingProject.specifications) {
            // Если контейнер пуст, но у существующего проекта есть спецификации, сохраняем их
            projectData.specifications = existingProject.specifications;
          } else {
            projectData.specifications = [];
          }
        }

        // Собираем файлы планирования (Planning Documents)
        const planningDocsContainer = document.querySelector(
          "#current-planning-docs-preview"
        );

        // Initialize the documents array with migrated planning documents
        let allDocuments = [];

        // Add migrated planning documents
        if (planningDocsContainer) {
          const planningDocs = this.collectFilesFromContainer(
            planningDocsContainer
          );

          if (planningDocs.length > 0) {
            const migratedDocs = planningDocs.map((doc) => {
              doc.migratedFromFuture = true;
              return doc;
            });
            allDocuments = [...migratedDocs];
          } else if (existingProject && existingProject.documents) {
            // If planning docs container is empty but existing project has migrated docs, preserve them
            const existingMigratedDocs = existingProject.documents.filter(
              (doc) => doc.migratedFromFuture
            );

            if (existingMigratedDocs.length > 0) {
              allDocuments = [...existingMigratedDocs];
            }
          }
        } else if (existingProject && existingProject.documents) {
          // If no planning docs container but project has migrated docs, preserve them
          const existingMigratedDocs = existingProject.documents.filter(
            (doc) => doc.migratedFromFuture
          );

          if (existingMigratedDocs.length > 0) {
            allDocuments = [...existingMigratedDocs];
          }
        }

        // Save all documents (which will only include migrated planning documents now)
        projectData.documents = allDocuments;
      } else {
        // For non-migrated projects, just collect documents normally
        projectData.documents = this.collectFiles(
          "#current-documents",
          "#current-documents-preview"
        );
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
      const isMigrated =
        item.closest(".migrated-files") !== null ||
        container.closest(".migrated-files") !== null;

      // Проверяем наличие элемента img, чтобы определить, является ли это изображением
      const imgElement = item.querySelector("img");
      let src = null;

      if (imgElement && imgElement.src) {
        src = imgElement.src;
        console.log(`Collecting file ${fileName} with src: ${src}`); // Для отладки
      }

      // Получаем имя файла из элемента с классом file-name, если оно доступно
      const fileNameElement = item.querySelector(".file-name");
      const displayedName = fileNameElement
        ? fileNameElement.textContent
        : null;

      // Для фотографий и изображений всегда устанавливаем правильный тип MIME
      let finalMimeType = mimeType;
      if (
        fileType === "photo" &&
        (!mimeType || !mimeType.startsWith("image/"))
      ) {
        // Определяем тип MIME на основе расширения файла
        if (fileName && fileName.match(/\.jpe?g$/i)) {
          finalMimeType = "image/jpeg";
        } else if (fileName && fileName.match(/\.png$/i)) {
          finalMimeType = "image/png";
        } else if (fileName && fileName.match(/\.gif$/i)) {
          finalMimeType = "image/gif";
        } else if (fileName && fileName.match(/\.webp$/i)) {
          finalMimeType = "image/webp";
        } else {
          finalMimeType = "image/jpeg"; // По умолчанию
        }
      }

      // Создаем объект файла с метаданными
      files.push({
        name: fileName || displayedName || "Unknown file",
        originalName: fileName || displayedName || "Unknown file", // Сохраняем оригинальное имя
        type: finalMimeType || "application/octet-stream",
        fileType: fileType || "unknown",
        src: src, // Добавляем src для изображений
        isStoredFile: true, // Отмечаем, что это сохраненный файл, а не свежезагруженный
        migratedFromFuture: isMigrated, // Сохраняем статус миграции
      });
    });

    return files;
  }

  // Метод для сбора файлов из input и сохранения существующих
  collectFiles(inputSelector, previewSelector) {
    const files = [];

    // Получаем элемент input
    const input = this.container.querySelector(inputSelector);
    if (!input) return files;

    // Проверяем, есть ли новые выбранные файлы для загрузки
    if (input.files && input.files.length > 0) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        files.push({
          name: file.name,
          originalName: file.name,
          type: file.type,
          file: file, // Это объект File, а не строка с данными
          isStoredFile: false,
          migratedFromFuture: false, // Новые файлы никогда не мигрированные
        });
      }
    }

    // Получаем ранее загруженные файлы из превью
    const previewContainer = this.container.querySelector(previewSelector);
    if (previewContainer) {
      // Собираем существующие файлы из контейнера превью
      const existingFiles = this.collectFilesFromContainer(previewContainer);
      files.push(...existingFiles);
    }

    // Для случая с мигрированными проектами в модальном окне, нужно собрать файлы из дополнительных секций
    // Определяем тип контейнера по селектору
    if (
      inputSelector.includes("current-photos") ||
      inputSelector.includes("current-reports") ||
      inputSelector.includes("current-documents")
    ) {
      // Проверяем, есть ли в модальном окне мигрированные файлы
      const migratedFilesGroup = this.container.querySelector(
        "#current-project-modal .migrated-files-group"
      );
      if (migratedFilesGroup) {
        // Если это контейнер для фотографий, нам не нужно собирать мигрированные файлы
        if (
          !inputSelector.includes("photos") &&
          !inputSelector.includes("reports")
        ) {
          // Для documents собираем мигрированные документы
          const migratedDocs = migratedFilesGroup.querySelectorAll(
            ".file-preview-container"
          );
          migratedDocs.forEach((container) => {
            const containerFiles = this.collectFilesFromContainer(container);
            // Убедимся, что все файлы помечены как мигрированные
            containerFiles.forEach((file) => {
              file.migratedFromFuture = true;
            });
            files.push(...containerFiles);
          });
        }
      }
    }

    return files;
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
    // Find the project to update
    if (type === "current") {
      const index = this.currentProjects.findIndex((p) => p.id === id);
      if (index !== -1) {
        // Keep track of the existing photos to detect deletions
        const existingPhotos = this.currentProjects[index].photos || [];

        // Check if photos were deleted by comparing with what's in the form data
        if (Array.isArray(existingPhotos) && Array.isArray(data.photos)) {
          const existingPhotoMap = {};
          existingPhotos.forEach((photo) => {
            if (photo && (photo.name || photo.originalName)) {
              const key = photo.name || photo.originalName;
              existingPhotoMap[key] = true;
            }
          });

          // Check which photos are still present in the form data
          const updatedPhotoMap = {};
          data.photos.forEach((photo) => {
            if (photo && (photo.name || photo.originalName)) {
              const key = photo.name || photo.originalName;
              updatedPhotoMap[key] = true;
            }
          });

          // Log deleted photos for debugging
          existingPhotos.forEach((photo) => {
            if (photo && (photo.name || photo.originalName)) {
              const key = photo.name || photo.originalName;
              if (!updatedPhotoMap[key]) {
                console.log(`Photo deleted during update: ${key}`);
              }
            }
          });
        }

        // Update the project with new data
        this.currentProjects[index] = {
          ...this.currentProjects[index],
          ...data,
        };
      }
    } else {
      const index = this.futureProjects.findIndex((p) => p.id === id);
      if (index !== -1) {
        this.futureProjects[index] = { ...this.futureProjects[index], ...data };
      }
    }

    // Re-render the projects list to reflect changes
    this.renderProjects(type);
    this.updateProjectStatistics(type);
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

  // Новый метод для синхронизации удаленных фотографий
  syncDeletedPhotos(deletedFileItem, project) {
    if (!project || !deletedFileItem) return;

    const fileName = deletedFileItem.dataset.fileName;
    const fileType = deletedFileItem.dataset.fileType;

    // Если это фото, удаляем его из массива фотографий проекта
    if (
      fileType === "photo" &&
      project.photos &&
      Array.isArray(project.photos)
    ) {
      project.photos = project.photos.filter((photo) => {
        // Проверяем имя файла или оригинальное имя
        return (
          photo && photo.name !== fileName && photo.originalName !== fileName
        );
      });
      console.log("Photo removed from project data:", fileName);
    }
  }
}
