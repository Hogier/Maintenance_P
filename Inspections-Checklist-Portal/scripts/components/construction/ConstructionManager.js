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
          margin-bottom: 5px; /* Reduced margin */
          overflow: visible;
          /* Removed transition properties related to collapsing individual sections */
        }
        
        .from-future-title {
          color: #0088cc;
          font-weight: bold;
          margin-bottom: 5px; /* Reduced margin */
          display: block; /* Keep it potentially visible if needed elsewhere, though likely removed by JS */
        }
        
        .migrated-separator {
          height: 1px;
          background-color: #ddd;
          margin: 10px 0; /* Reduced margin */
          transition: margin 0.3s ease;
        }
        
        .current-files-title {
          color: #4CAF50;
          font-weight: bold;
          margin-bottom: 5px; /* Reduced margin */
        }
        
        .migrated-files {
          margin-bottom: 5px; /* Reduced margin */
          position: relative;
        }
        
        .from-future-flag {
          color: #0088cc;
          font-size: 12px;
          font-weight: bold;
          margin-left: 8px; /* Ensure some space from the title */
        }
        
        .migrated-header {
          /* Removed specific margins, rely on group margins */
        }
        
        .migrated-files-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px; /* Reduced margin */
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
      .querySelector("#employee-form")
      ?.addEventListener("submit", (e) => {
        this.handleEmployeeSubmit(e);
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
    console.log(`ConstructionManager switching to tab: ${tab}`);
    // Remove active class from all content sections within the construction container
    this.container
      .querySelectorAll(".construction-section") // Target only sections within this manager's container
      .forEach((section) => {
        section.classList.remove("active");
      });

    // Update section title (find title within the container)
    const sectionTitle = this.container.querySelector("#section-title");
    if (sectionTitle) {
      sectionTitle.textContent =
        tab === "contractors"
          ? "Contractors"
          : tab === "current-projects"
          ? "Current Projects"
          : "Future Projects";
    } else {
      console.warn(
        "Section title element (#section-title) not found within construction container."
      );
    }

    // Show appropriate content section within the container
    const activeSection = this.container.querySelector(`#${tab}-section`);
    if (activeSection) {
      activeSection.classList.add("active");
    } else {
      console.warn(
        `Content section for tab #${tab}-section not found within construction container.`
      );
    }

    // Update filters visibility - only for contractors
    const contractorsFilters = this.container.querySelector(
      "#contractors-filters"
    );
    if (contractorsFilters) {
      contractorsFilters.style.display =
        tab === "contractors" ? "flex" : "none";
    } else {
      console.warn(
        "Contractors filter group (#contractors-filters) not found within construction container."
      );
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

    this.activeTab = tab; // Keep track of the active tab internally
    // Maybe call renderActiveSection() or specific rendering if needed after switch
    if (tab === "contractors") this.renderContractors();
    if (tab === "current-projects") this.renderProjects("current");
    if (tab === "future-projects") this.renderProjects("future");

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
    // Определяем URL API
    const apiUrl = "/Maintenance_P/backend/construction/contractors_api.php";
    // Возможно, стоит вынести URL в конфигурацию или константы

    try {
      console.log("ConstructionManager: Fetching contractors from API...");
      const response = await fetch(apiUrl);

      if (!response.ok) {
        // Если ответ сервера не OK (например, 404, 500)
        console.error(
          `Error fetching contractors: ${response.status} ${response.statusText}`
        );
        // Попробуем прочитать тело ошибки, если оно есть
        const errorData = await response.json().catch(() => null);
        console.error("Error data:", errorData);
        // Отображаем ошибку пользователю (или используем дефолтные данные)
        this.contractors = []; // Показываем пустой список при ошибке
      } else {
        // Если ответ OK, парсим JSON
        this.contractors = await response.json();
        console.log(
          "ConstructionManager: Contractors loaded successfully:",
          this.contractors
        );

        // Загружаем сотрудников для каждого контрактора
        for (const contractor of this.contractors) {
          contractor.employees = await this.loadEmployeesForContractor(
            contractor.id
          );
        }
      }
    } catch (error) {
      // Обрабатываем ошибки сети или другие ошибки fetch
      console.error("Error during fetch contractors:", error);
      this.contractors = []; // Показываем пустой список при ошибке
    }

    // Вызываем рендер после загрузки (или ошибки)
    this.renderContractors();
    // Важно: нужно убедиться, что renderContractors вызывается после loadContractors
    // Возможно, его вызов нужно перенести из init() сюда или в loadData()
  }

  async loadEmployeesForContractor(contractorId) {
    try {
      const response = await fetch(
        `/Maintenance_P/backend/construction/contractor_employees_api.php?contractor_id=${contractorId}`
      );
      if (!response.ok) {
        console.error(
          `Error fetching employees for contractor ${contractorId}: ${response.status}`
        );
        return [];
      }
      const employees = await response.json();
      // Преобразуем поля из snake_case в camelCase для совместимости с существующим кодом
      return employees.map((emp) => ({
        id: emp.id,
        fullName: emp.full_name,
        position: emp.position,
        phone: emp.phone || "",
        contractorId: emp.contractor_id,
      }));
    } catch (error) {
      console.error(
        `Error fetching employees for contractor ${contractorId}:`,
        error
      );
      return [];
    }
  }

  renderContractors() {
    const container = this.container.querySelector("#contractors-list");
    if (!container) return;

    // Добавим проверку, что this.contractors это массив
    if (!Array.isArray(this.contractors)) {
      console.error(
        "renderContractors: this.contractors is not an array!",
        this.contractors
      );
      this.contractors = []; // Устанавливаем пустой массив, чтобы избежать дальнейших ошибок
    }

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

    console.log("Rendering contractors:", this.contractors);

    container.innerHTML = this.contractors
      .map((contractor) => {
        // Добавим проверку на сам объект contractor и его свойства
        if (!contractor) {
          console.error(
            "renderContractors: Encountered null/undefined contractor in array"
          );
          return "";
        }

        // Проверим все необходимые поля и установим значения по умолчанию
        const companyName =
          contractor.company_name || contractor.companyName || "N/A";
        const businessType =
          contractor.business_type || contractor.businessType || "N/A";
        const location = contractor.location || "N/A"; // Делаем явную проверку на location
        const email = contractor.email || "N/A";
        const phone = contractor.phone || "N/A";
        const rating = parseInt(contractor.rating) || 0;
        const contactPersonName = contractor.contact_person || "N/A";
        const contactPersonPosition =
          contractor.contact_person_position || "N/A"; // Проверяем и получаем position
        const contactPersonPhone = phone; // Используем основной телефон
        const contactPersonEmail = email; // Используем основной email
        const employees = contractor.employees || [];

        // В API нет поля employees

        return `
            <div class="contractor-card" data-id="${contractor.id}">
                <div class="contractor-header">
                <h3>${companyName}</h3>
                <div class="contractor-rating">
                    ${this.generateRatingStars(rating)}
                </div>
                </div>
                <div class="contractor-info">
                <div class="info-item">
                    <i class="fas fa-briefcase"></i>
                    <span>${businessType}</span> <!-- Используем исправленную переменную -->
                </div>
                <div class="info-item">
                    <i class="fas fa-location-dot"></i>
                    <span>${location}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-envelope"></i>
                    <span>${email}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-phone"></i>
                    <span>${phone}</span>
                </div>
                </div>
                <div class="contact-person-info">
                <h4>Contact Person</h4>
                <div class="info-item">
                    <i class="fas fa-user"></i>
                    <span>${contactPersonName}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-id-badge"></i>
                    <span>${contactPersonPosition}</span> <!-- Отображаем заглушку N/A -->
                </div>
                <div class="info-item">
                    <i class="fas fa-phone"></i>
                    <span>${contactPersonPhone}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-envelope"></i>
                    <span>${contactPersonEmail}</span>
                </div>
                </div>
                <div class="contractor-employees">
                <h4>Employees (${employees.length})</h4>
                <div class="employees-list">
                    ${this.renderEmployeesList(employees)}
                </div>
                <button class="btn-secondary add-employee" data-contractor-id="${
                  contractor.id
                }">
                    <i class="fas fa-user-plus"></i> Add Employee
                </button>
                </div>
                <div class="contractor-actions">
                <button class="btn-action edit" data-contractor-id="${
                  contractor.id
                }">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action delete" data-contractor-id="${
                  contractor.id
                }">
                    <i class="fas fa-trash"></i>
                </button>
                </div>
            </div>
            `;
      })
      .join("");

    // Добавляем обработчики событий после рендеринга
    this.bindEmployeeEvents();
    this.bindContractorEvents(); // Выделяем логику обработчиков в отдельный метод для реиспользования
  }

  // Выделяем обработчики кнопок в отдельный метод
  bindContractorEvents() {
    // Add event handlers for contractor edit and delete buttons
    this.container
      .querySelectorAll(".contractor-actions .btn-action.edit")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          const contractorId = parseInt(button.dataset.contractorId);
          console.log("Edit button clicked for contractor ID:", contractorId);
          const contractor = this.contractors.find(
            (c) => c.id === contractorId
          );
          if (contractor) {
            this.showContractorModal(contractor);
          } else {
            console.error("Contractor not found for ID:", contractorId);
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
    if (!employees || employees.length === 0) {
      return '<div class="no-employees">No employees yet</div>';
    }

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

  async deleteEmployee(contractorId, employeeId) {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        const response = await fetch(
          `/Maintenance_P/backend/construction/contractor_employees_api.php?id=${employeeId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to delete employee");
        }

        // Получаем результат операции
        const result = await response.json().catch(() => ({}));
        console.log("Employee deleted successfully:", result);

        // Обновляем локальный список сотрудников
        const contractor = this.contractors.find((c) => c.id === contractorId);
        if (contractor) {
          // Обновляем список сотрудников с API
          contractor.employees = await this.loadEmployeesForContractor(
            contractorId
          );
          // Перерисовываем карточки подрядчиков
          this.renderContractors();
        }
      } catch (error) {
        console.error("Error deleting employee:", error);
        alert(
          "An error occurred while deleting the employee. Please try again."
        );
      }
    }
  }

  async handleEmployeeSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const contractorId = parseInt(form.elements.contractorId.value);
    const employeeData = {
      contractor_id: contractorId,
      full_name: form.elements.fullName.value,
      position: form.elements.position.value,
      phone: form.elements.phone.value || "",
    };

    try {
      if (form.dataset.employeeId) {
        // Редактирование существующего сотрудника
        const employeeId = parseInt(form.dataset.employeeId);
        await this.updateEmployee(employeeId, employeeData);
      } else {
        // Добавление нового сотрудника
        await this.addEmployeeToContractor(employeeData);
      }

      // Перезагружаем список сотрудников для данного контрактора
      const contractor = this.contractors.find((c) => c.id === contractorId);
      if (contractor) {
        contractor.employees = await this.loadEmployeesForContractor(
          contractorId
        );
        this.renderContractors();
      }
    } catch (error) {
      console.error("Error handling employee submission:", error);
      alert("An error occurred while saving employee data. Please try again.");
    }

    this.closeModals();
  }

  async addEmployeeToContractor(data) {
    try {
      const response = await fetch(
        "/Maintenance_P/backend/construction/contractor_employees_api.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add employee");
      }

      return await response.json();
    } catch (error) {
      console.error("Error adding employee:", error);
      throw error;
    }
  }

  async updateEmployee(employeeId, data) {
    try {
      const response = await fetch(
        `/Maintenance_P/backend/construction/contractor_employees_api.php?id=${employeeId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update employee");
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating employee:", error);
      throw error;
    }
  }

  // Методы для работы с проектами
  async loadCurrentProjects() {
    // TODO: Implement filtering/status checking if backend returns all projects
    try {
      const response = await fetch(
        "/Maintenance_P/backend/construction/projects_api.php"
      ); // Полный путь до API
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const projects = await response.json();
      console.log("Raw projects data from backend:", projects);

      // Filter for projects that are considered 'current' (e.g., based on status)
      // Example: Assuming 'current' projects are those with status 'in-progress', 'on-hold', 'completed'
      this.currentProjects = Array.isArray(projects)
        ? projects.filter((p) =>
            ["in-progress", "on-hold", "completed"].includes(p.status)
          )
        : [];
      console.log(
        "Current Projects loaded from backend:",
        this.currentProjects
      );

      this.currentProjects.forEach((project) =>
        this.ensureFileStructures(project, "current")
      );
      // this.renderProjects("current"); // Rendering is usually called after all data is loaded in init or switchTab
    } catch (error) {
      console.error("Error loading current projects:", error);
      this.currentProjects = []; // Reset on error
      // Optionally show an error message to the user
    }
  }

  async loadFutureProjects() {
    // TODO: Implement filtering/status checking if backend returns all projects
    try {
      const response = await fetch(
        "/Maintenance_P/backend/construction/projects_api.php"
      ); // Полный путь до API
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const projects = await response.json();
      console.log("Raw projects data from backend:", projects);

      // Filter for projects that are considered 'future' (e.g., based on status)
      // Example: Assuming 'future' projects are those with status 'planned', 'pending' or similar
      this.futureProjects = Array.isArray(projects)
        ? projects.filter(
            (p) => !["in-progress", "on-hold", "completed"].includes(p.status)
          )
        : []; // Adjust statuses as needed
      console.log("Future Projects loaded from backend:", this.futureProjects);

      this.futureProjects.forEach((project) =>
        this.ensureFileStructures(project, "future")
      );
      // this.renderProjects("future"); // Rendering is usually called after all data is loaded in init or switchTab
    } catch (error) {
      console.error("Error loading future projects:", error);
      this.futureProjects = []; // Reset on error
      // Optionally show an error message to the user
    }
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

    console.log(`Rendering ${projects.length} ${type} projects:`, projects);

    projects.forEach((project) => {
      console.log(`Rendering project:`, project);

      // Ищем подрядчика учитывая разные форматы ID
      const contractorId = project.contractorId || project.contractor_id;
      console.log(`Looking for contractor with ID: ${contractorId}`);

      let contractor = null;
      if (contractorId) {
        contractor = this.contractors.find((c) => c.id == contractorId);
        console.log(`Found contractor:`, contractor);
      }

      const template = this.container.querySelector(
        `#${type}-project-card-template`
      );
      const card = template.content.cloneNode(true);

      // Set project ID
      card.querySelector(".project-card").dataset.id = project.id;

      // Set project name and status
      // Используем любое доступное поле для имени проекта
      const projectName =
        project.name ||
        project.project_name ||
        project.title ||
        "Unnamed Project";
      card.querySelector(".project-name").textContent = projectName;

      const statusSelect = card.querySelector(".status-select");
      statusSelect.value = project.status;

      // Обновляем классы статуса
      this.updateStatusClasses(statusSelect, project.status);

      // Set project details - используем любое доступное поле для местоположения
      const projectLocation = project.location || project.address || "";
      card.querySelector(".location").textContent = projectLocation;

      // Форматируем даты для отображения
      const startDate = project.startDate || project.start_date;
      const endDate = project.endDate || project.end_date;
      const startDateFormatted = this.formatDateForDisplay(startDate);
      const endDateFormatted = this.formatDateForDisplay(endDate);
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
    console.log(
      "Rendering current project details with contractor:",
      contractor
    );

    // Set current project specific details
    const progress = project.progress || 0;
    card.querySelector(".progress").textContent = progress
      ? `${progress}%`
      : "Not started";

    const actualCost = project.actualCost || project.actual_cost || 0;
    card.querySelector(".actual-cost").textContent = actualCost
      ? `$${actualCost.toLocaleString()}`
      : "Not specified";

    // Обработка информации о подрядчике
    if (contractor) {
      console.log("Setting contractor info in card:", contractor);
      // Используем все возможные варианты имени компании
      const companyName =
        contractor.companyName || contractor.company_name || "Unknown Company";
      card.querySelector(".contractor").textContent = companyName;

      // Проверяем все возможные форматы контактного лица
      if (contractor.contactPerson) {
        // Объект contactPerson
        card.querySelector(
          ".project-manager"
        ).textContent = `${contractor.contactPerson.name} (${contractor.contactPerson.position})`;
      } else if (contractor.contact_person) {
        // Строковое поле contact_person
        const position = contractor.contact_person_position || "Contact Person";
        card.querySelector(
          ".project-manager"
        ).textContent = `${contractor.contact_person} (${position})`;
      } else {
        card.querySelector(".project-manager").textContent = "Not assigned";
      }
    } else {
      console.log("No contractor found for project");
      card.querySelector(".contractor").textContent = "Not assigned";
      card.querySelector(".project-manager").textContent = "Not assigned";
    }

    // Форматируем дату последнего обновления
    const lastUpdate = project.lastUpdate || project.last_update;
    const lastUpdateFormatted = lastUpdate
      ? this.formatDateForDisplay(lastUpdate)
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
    // Add toggle icon if it doesn't exist in the template

    // Add click event to toggle
    docHeader.addEventListener("click", (e) => {
      e.preventDefault();
      const isCollapsed = documentsGrid.classList.toggle("collapsed");
      docHeader.classList.toggle("collapsed", isCollapsed);

      // Update card size after toggle - pass the project card element
      this.updateCardSize(docHeader.closest(".project-card"));
    });

    // Reorganize documents grid - group migrated files at the top
    if (isMigratedProject) {
      // Clear existing content
      documentsGrid.innerHTML = "";

      // Add "From Future Project" flag to the main header
      const existingFlag = docHeader.querySelector(".from-future-flag");
      if (!existingFlag) {
        const futureFlag = document.createElement("span");
        futureFlag.className = "from-future-flag";
        futureFlag.textContent = "From Future Project";
        docHeader.appendChild(futureFlag);
      }

      // Create migrated files group
      const migratedFilesGroup = document.createElement("div");
      migratedFilesGroup.className = "migrated-files-group documents-content"; // Use documents-content class
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
          icon.classList.toggle("fa-chevron-down", !isCollapsed);
          icon.classList.toggle("fa-chevron-right", isCollapsed);

          // Update card size after toggle
          this.updateCardSize(toggle.closest(".project-card"));
        });
      });

      // Add a separator between migrated and current files if both exist
      if (
        migratedFilesGroup.children.length > 0 &&
        currentFilesGroup.children.length > 0
      ) {
        const separator = document.createElement("hr");
        separator.className = "migrated-separator";
        documentsGrid.insertBefore(separator, currentFilesGroup); // Insert before current files
      }

      documentsGrid.appendChild(currentFilesGroup); // Append current files group
    } else {
      // Remove "From Future Project" flag if it exists from a previous render
      const existingFlag = docHeader.querySelector(".from-future-flag");
      if (existingFlag) {
        existingFlag.remove();
      }
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
    console.log(
      "Rendering future project details with contractor:",
      contractor
    );

    // Set future project specific details
    const priority = project.priority || "medium";
    const priorityElement = card.querySelector(".priority");
    if (priorityElement) {
      priorityElement.textContent = priority
        ? priority.charAt(0).toUpperCase() + priority.slice(1)
        : "Medium";
    }

    const budget = project.budget || 0;
    const budgetElement = card.querySelector(".budget");
    if (budgetElement) {
      budgetElement.textContent = budget
        ? `$${budget.toLocaleString()}`
        : "Not specified";
    }

    // Обработка информации о подрядчике
    if (contractor) {
      console.log("Setting contractor info in card:", contractor);
      // Используем все возможные варианты имени компании
      const companyName =
        contractor.companyName || contractor.company_name || "Unknown Company";

      // Добавляем проверки на существование элементов перед установкой значений
      const contractorElement = card.querySelector(".contractor");
      if (contractorElement) {
        contractorElement.textContent = companyName;
      }

      const preferredContractorElement = card.querySelector(
        ".preferred-contractor"
      );
      if (preferredContractorElement) {
        preferredContractorElement.textContent = companyName;
      }

      // Проверяем все возможные форматы контактного лица
      const contactPersonElement = card.querySelector(".contact-person");
      if (contactPersonElement) {
        if (contractor.contactPerson) {
          // Объект contactPerson
          contactPersonElement.textContent = `${contractor.contactPerson.name} (${contractor.contactPerson.position})`;
        } else if (contractor.contact_person) {
          // Строковое поле contact_person
          const position =
            contractor.contact_person_position || "Contact Person";
          contactPersonElement.textContent = `${contractor.contact_person} (${position})`;
        } else {
          contactPersonElement.textContent = "Not assigned";
        }
      }

      // Проверяем есть ли элемент project-manager
      const projectManagerElement = card.querySelector(".project-manager");
      if (projectManagerElement) {
        if (contractor.contactPerson) {
          projectManagerElement.textContent = `${contractor.contactPerson.name} (${contractor.contactPerson.position})`;
        } else if (contractor.contact_person) {
          const position =
            contractor.contact_person_position || "Contact Person";
          projectManagerElement.textContent = `${contractor.contact_person} (${position})`;
        } else {
          projectManagerElement.textContent = "Not assigned";
        }
      }
    } else {
      console.log("No contractor found for project");

      // Аналогично добавляем проверки перед установкой значений
      const contractorElement = card.querySelector(".contractor");
      if (contractorElement) {
        contractorElement.textContent = "Not assigned";
      }

      const preferredContractorElement = card.querySelector(
        ".preferred-contractor"
      );
      if (preferredContractorElement) {
        preferredContractorElement.textContent = "Not assigned";
      }

      const contactPersonElement = card.querySelector(".contact-person");
      if (contactPersonElement) {
        contactPersonElement.textContent = "Not assigned";
      }

      const projectManagerElement = card.querySelector(".project-manager");
      if (projectManagerElement) {
        projectManagerElement.textContent = "Not assigned";
      }
    }

    // Добавляем дополнительную информацию о планировании
    const descriptionElement = card.querySelector(".description");
    if (descriptionElement) {
      descriptionElement.textContent = project.description || "No description";
    }

    const objectivesElement = card.querySelector(".objectives");
    if (objectivesElement) {
      objectivesElement.textContent =
        project.objectives || "No specific objectives";
    }

    const risksElement = card.querySelector(".risks");
    if (risksElement) {
      risksElement.textContent = project.risks || "No identified risks";
    }

    // Make Project Documents header collapsible
    const documentsSection = card.querySelector(
      ".project-details .details-section:last-child"
    );
    if (documentsSection) {
      const docHeader = documentsSection.querySelector("h4");
      if (docHeader) {
        docHeader.classList.add("collapsible-header");
        const documentsGrid = documentsSection.querySelector(".documents-grid");
        if (documentsGrid) {
          documentsGrid.classList.add("collapsible-content");

          // Add click event to toggle
          docHeader.addEventListener("click", (e) => {
            e.preventDefault();
            const isCollapsed = documentsGrid.classList.toggle("collapsed");
            docHeader.classList.toggle("collapsed", isCollapsed);

            // Update card size after toggle
            this.updateCardSize(docHeader.closest(".project-card"));
          });
        }
      }
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
        const projectCard = button.closest(".project-card");
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

    // Очищаем форму перед заполнением
    form.reset();
    this.setRating(0); // Сбрасываем рейтинг
    delete form.dataset.contractorId;

    if (contractor) {
      console.log("Showing contractor modal with data:", contractor);

      // Заполняем форму данными из API (плоская структура)
      form.elements.companyName.value = contractor.company_name || "";
      // Используем business_type вместо scope_of_work
      form.elements.businessType.value = contractor.business_type || "";
      form.elements.location.value = contractor.location || "";
      form.elements.email.value = contractor.email || "";
      form.elements.phone.value = contractor.phone || "";
      form.elements.contactName.value = contractor.contact_person || "";
      // Используем значение contact_person_position из данных API
      form.elements.position.value = contractor.contact_person_position || "";
      form.elements.contactPhone.value = contractor.phone || ""; // Используем основной телефон
      form.elements.contactEmail.value = contractor.email || ""; // Используем основной email

      // Поле rating отсутствует в API
      const ratingValue = parseInt(contractor.rating) || 0;
      this.setRating(ratingValue);
      form.elements.rating.value = ratingValue;
      form.dataset.contractorId = contractor.id;
    } else {
      // Для нового контрактора просто сбрасываем форму (уже сделано выше)
    }

    modal.classList.add("active");
  }

  showProjectModal(type, project = null) {
    console.log(
      `Opening ${type} project modal`,
      project ? `for editing project ID: ${project.id}` : "for new project"
    );

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

    // Сначала заполняем список всех подрядчиков
    this.populateContractorSelect(form.elements.contractorId);

    // Добавляем обработчик выбора типа бизнеса для обновления списка подрядчиков
    const businessTypeSelect = form.elements.businessType;
    businessTypeSelect.onchange = (e) => {
      console.log(`Business type changed to: ${e.target.value}`);
      this.updateContractorSelectByBusinessType(
        e.target.value,
        form.elements.contractorId
      );

      // Сбрасываем выбор подрядчика, так как фильтр изменился
      form.elements.contractorId.value = "";

      // Сбрасываем выбор контактного лица
      if (form.elements.contactPersonId) {
        form.elements.contactPersonId.innerHTML =
          '<option value="">Select Contact Person</option>';
        form.elements.contactPersonId.disabled = true;
      }
    };

    // Добавляем обработчик выбора подрядчика для обновления списка контактных лиц
    const contractorSelect = form.elements.contractorId;
    contractorSelect.onchange = (e) => {
      console.log(`Contractor changed to ID: ${e.target.value}`);

      if (e.target.value) {
        this.updateContactPersonSelect(e.target.value);
      } else {
        // Если подрядчик не выбран, очищаем список контактных лиц
        if (form.elements.contactPersonId) {
          form.elements.contactPersonId.innerHTML =
            '<option value="">Select Contact Person</option>';
          form.elements.contactPersonId.disabled = true;
        }
      }
    };

    // Если редактируем существующий проект
    if (project) {
      // Сохраняем ID проекта
      form.dataset.projectId = project.id;

      console.log("Project data to fill form:", project);

      // Отладка: выведем все доступные поля в проекте
      console.log("Available fields in project:", Object.keys(project));

      // Отладка: выведем все доступные элементы формы
      console.log("Form elements:", Object.keys(form.elements));

      // Попробуем явно заполнить поле name
      if (
        project.name ||
        project.project_name ||
        project.projectName ||
        project.title
      ) {
        const projectNameValue =
          project.name ||
          project.project_name ||
          project.projectName ||
          project.title;
        console.log("Setting project name to:", projectNameValue);

        // Проверим все возможные имена полей для названия проекта
        ["name", "projectName", "project_name", "title"].forEach(
          (fieldName) => {
            if (form.elements[fieldName]) {
              console.log(`Found form field ${fieldName}, setting value`);
              form.elements[fieldName].value = projectNameValue;
            }
          }
        );
      }

      // Маппинг полей из snake_case в camelCase и наоборот
      const fieldMappings = {
        // Базовые поля, которые могут быть в разных форматах
        name: ["name", "projectName", "project_name", "title"],
        projectName: [
          "name",
          "title",
          "project_name",
          "projectName",
          "project_title",
        ],
        title: [
          "title",
          "name",
          "project_name",
          "projectName",
          "project_title",
        ],
        status: ["status"],
        businessType: ["businessType", "business_type"],
        startDate: ["startDate", "start_date"],
        endDate: ["endDate", "end_date"],
        contractAmount: ["contractAmount", "contract_amount"],
        address: ["address", "location"],
        location: ["location", "address"],
        stageDescription: ["stageDescription", "stage_description"],
        scheduledInspectionDate: [
          "scheduledInspectionDate",
          "scheduled_inspection_date",
        ],
        contractorId: ["contractorId", "contractor_id"],
        contactPersonId: ["contactPersonId", "contact_person_id"],
        // Поля для Current проектов
        progress: ["progress"],
        actualCost: ["actualCost", "actual_cost"],
        lastUpdate: ["lastUpdate", "last_update"],
        // Поля для Future проектов
        description: ["description"],
        objectives: ["objectives"],
        risks: ["risks"],
        priority: ["priority"],
        budget: ["budget"],
      };

      // Заполняем поля формы на основе данных проекта
      Object.keys(fieldMappings).forEach((formFieldName) => {
        if (form.elements[formFieldName]) {
          const possibleProjectFields = fieldMappings[formFieldName];

          // Проверяем все возможные имена полей
          for (const projectField of possibleProjectFields) {
            if (project[projectField] !== undefined) {
              console.log(
                `Setting form field ${formFieldName} = ${project[projectField]} from project field ${projectField}`
              );
              form.elements[formFieldName].value = project[projectField];
              break;
            }
          }
        }
      });

      // Обновляем список подрядчиков в зависимости от типа бизнеса
      const businessType = project.businessType || project.business_type;
      console.log(
        `Updating contractor list for business type: ${businessType}`
      );
      if (businessType) {
        this.updateContractorSelectByBusinessType(
          businessType,
          form.elements.contractorId
        );
      }

      // После обновления списка подрядчиков, выбираем нужного подрядчика
      const contractorId = project.contractorId || project.contractor_id;
      if (contractorId && form.elements.contractorId) {
        setTimeout(() => {
          console.log(`Setting contractor to ID: ${contractorId}`);
          form.elements.contractorId.value = contractorId;

          // После выбора подрядчика обновляем список контактных лиц
          this.updateContactPersonSelect(contractorId);

          // Устанавливаем контактное лицо
          const contactPersonId =
            project.contactPersonId || project.contact_person_id;
          if (contactPersonId && form.elements.contactPersonId) {
            setTimeout(() => {
              console.log(`Setting contact person to ID: ${contactPersonId}`);
              form.elements.contactPersonId.value = contactPersonId;
            }, 300);
          }
        }, 300);
      }

      // Отображаем существующие файлы
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

  async handleProjectSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const type = form.id === "current-project-form" ? "current" : "future";
    const projectId = form.dataset.projectId;
    const submitButton = form.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = projectId ? "Saving..." : "Creating...";

    console.log(
      "handleProjectSubmit called with type:",
      type,
      "and id:",
      projectId
    );

    try {
      // Basic form data extraction
      const formData = new FormData(form);

      // Преобразуем FormData в объект для отправки
      const data = {};
      for (let [key, value] of formData.entries()) {
        // Convert camelCase to snake_case
        const snakeCaseKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        data[snakeCaseKey] = value;
      }

      console.log("Form data collected:", data);

      // Важно: правильно обработать поле названия проекта
      // Если есть project_name, используем его значение для поля name (которое есть в БД)
      if (data.project_name) {
        data.name = data.project_name;
        delete data.project_name; // Удаляем поле project_name, так как оно не нужно
      }

      // Если есть projectname, тоже используем для name
      if (data.projectname) {
        data.name = data.projectname;
        delete data.projectname;
      }

      // Проверяем, что поле name существует
      if (!data.name) {
        // Если поле name отсутствует, выводим предупреждение
        console.warn("Project name is missing! This may cause errors.");
      }

      // Additional field mappings if needed
      if (data.projecttype) {
        data.project_type = data.projecttype;
        delete data.projecttype;
      }

      if (data.startdate) {
        data.start_date = data.startdate;
        delete data.startdate;
      }

      if (data.enddate) {
        data.end_date = data.enddate;
        delete data.enddate;
      }

      if (data.businesstype) {
        data.business_type = data.businesstype;
        delete data.businesstype;
      }

      if (data.contractorid) {
        data.contractor_id = data.contractorid;
        delete data.contractorid;
      }

      if (data.contactpersonid) {
        data.contact_person_id = data.contactpersonid;
        delete data.contactpersonid;
      }

      if (data.actualcost) {
        data.actual_cost = data.actualcost;
        delete data.actualcost;
      }

      if (data.lastupdate) {
        data.last_update = data.lastupdate;
        delete data.lastupdate;
      }

      if (data.managerid) {
        data.manager_id = data.managerid;
        delete data.managerid;
      }

      if (data.contractamount) {
        data.contract_amount = data.contractamount;
        delete data.contractamount;
      }

      if (data.stageDescription) {
        data.stage_description = data.stageDescription;
        delete data.stageDescription;
      }

      if (data.scheduledInspectionDate) {
        data.scheduled_inspection_date = data.scheduledInspectionDate;
        delete data.scheduledInspectionDate;
      }

      // Specific data handling for future projects (planning details)
      if (type === "future") {
        // Form fields are already converted to snake_case above
        // Convert date formats if necessary
        if (data.start_date)
          data.start_date = this.formatDateForStorage(data.start_date);
        if (data.end_date)
          data.end_date = this.formatDateForStorage(data.end_date);

        // Ensure status is set correctly for new future projects
        if (!projectId) {
          data.status = "planned"; // Or 'pending', match your default status for future projects
        }
      }

      // Specific data handling for current projects
      if (type === "current") {
        // Form fields are already converted to snake_case above
        // Convert date formats
        if (data.start_date)
          data.start_date = this.formatDateForStorage(data.start_date);
        if (data.end_date)
          data.end_date = this.formatDateForStorage(data.end_date);
        if (data.last_update)
          data.last_update = this.formatDateForStorage(data.last_update);
        if (data.scheduled_inspection_date)
          data.scheduled_inspection_date = this.formatDateForStorage(
            data.scheduled_inspection_date
          );
      }

      console.log("Final data to send:", data);

      const apiUrl =
        "/Maintenance_P/backend/construction/projects_api.php" +
        (projectId ? `?id=${projectId}` : ""); // Полный путь до API
      const method = projectId ? "PUT" : "POST";

      console.log(`Sending ${method} request to ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      // Для отладки выведем raw-ответ
      const rawText = await response.text();
      console.log("Raw API response:", rawText);

      // Попытаемся преобразовать ответ в JSON
      let result;
      try {
        result = JSON.parse(rawText);
      } catch (e) {
        console.error("Error parsing JSON response:", e);
        throw new Error("Invalid JSON response from server");
      }

      if (!response.ok) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      console.log("Project saved successfully:", result);
      alert(result.message || "Project saved successfully!"); // Simple feedback
      this.closeModals();

      // Refresh the relevant project list
      if (type === "current") {
        await this.loadCurrentProjects();
        this.renderProjects("current");
        this.updateCurrentProjectStatistics();
      } else {
        await this.loadFutureProjects();
        this.renderProjects("future");
        this.updateFutureProjectStatistics();
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert(`Error saving project: ${error.message}`); // Show error to user
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = projectId ? "Save Changes" : "Add Project";
    }
  }

  // --- Remove or comment out the old createProject, updateProject, deleteProject methods ---
  // createProject(data, type) { ... old code ... }
  // updateProject(id, data, type) { ... old code ... }
  // deleteProject(id, type) { ... old code ... }
  // --- End Removal ---

  // Function to collect files (kept for reference, needs rework for backend uploads)
  collectFilesFromContainer(containerSelector) {
    if (!containerSelector) return [];

    const container = document.querySelector(containerSelector);
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
      .map((contractor) => {
        // Используем API структуру данных (плоская структура)
        const companyName =
          contractor.company_name || contractor.companyName || "N/A";
        const businessType =
          contractor.business_type || contractor.businessType || "N/A";
        const location = contractor.location || "N/A";
        const email = contractor.email || "N/A";
        const phone = contractor.phone || "N/A";
        const rating = contractor.rating || 0;
        const contactPersonName = contractor.contact_person || "N/A";
        const contactPersonPosition =
          contractor.contact_person_position || "N/A";
        const contactPersonPhone = phone; // Используем основной телефон
        const contactPersonEmail = email; // Используем основной email
        const employees = contractor.employees || [];

        return `
      <div class="contractor-card" data-id="${contractor.id}">
        <div class="contractor-header">
          <h3>${companyName}</h3>
          <div class="contractor-rating">
            ${this.generateRatingStars(rating)}
          </div>
        </div>
        <div class="contractor-info">
          <div class="info-item">
            <i class="fas fa-briefcase"></i>
            <span>${businessType}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-location-dot"></i>
            <span>${location}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-envelope"></i>
            <span>${email}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-phone"></i>
            <span>${phone}</span>
          </div>
        </div>
        <div class="contact-person-info">
          <h4>Contact Person</h4>
          <div class="info-item">
            <i class="fas fa-user"></i>
            <span>${contactPersonName}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-id-badge"></i>
            <span>${contactPersonPosition}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-phone"></i>
            <span>${contactPersonPhone}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-envelope"></i>
            <span>${contactPersonEmail}</span>
          </div>
        </div>
        <div class="contractor-employees">
          <h4>Employees (${employees.length})</h4>
          <div class="employees-list">
            ${this.renderEmployeesList(employees)}
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
    `;
      })
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
    console.log("Populating contractor select dropdown");

    // Проверка параметра
    if (!select || !(select instanceof HTMLElement)) {
      console.error(
        "Invalid select element provided to populateContractorSelect"
      );
      return;
    }

    // Очищаем текущий список
    select.innerHTML = '<option value="">Select Contractor</option>';

    // Проверяем наличие подрядчиков
    if (
      !this.contractors ||
      !Array.isArray(this.contractors) ||
      this.contractors.length === 0
    ) {
      console.warn("No contractors available to populate dropdown");
      return;
    }

    console.log(
      `Found ${this.contractors.length} contractors to populate dropdown`
    );

    // Заполняем список подрядчиками
    this.contractors.forEach((contractor) => {
      const option = document.createElement("option");
      option.value = contractor.id;

      // Используем подходящее поле имени компании, учитывая разные форматы данных
      const companyName =
        contractor.company_name || contractor.companyName || "Unknown";
      const businessType =
        contractor.business_type || contractor.businessType || "General";

      option.textContent = `${companyName} (${businessType})`;
      select.appendChild(option);
    });

    console.log("Contractor select dropdown populated successfully");
  }

  // Метод для обновления списка контактных лиц при выборе подрядчика
  updateContactPersonSelect(contractorId) {
    console.log(
      `Updating contact person list for contractor ID: ${contractorId}`
    );

    // Находим активную форму
    let activeForm = null;
    const currentForm = this.container.querySelector("#current-project-form");
    const futureForm = this.container.querySelector("#future-project-form");

    // Ищем активную форму среди модальных окон
    const activeModal = this.container.querySelector(".modal.active");
    if (activeModal) {
      activeForm = activeModal.querySelector("form");
    } else {
      // Если нет активного модального окна, проверяем обе формы
      activeForm =
        currentForm && currentForm.offsetParent
          ? currentForm
          : futureForm && futureForm.offsetParent
          ? futureForm
          : null;
    }

    if (!activeForm) {
      console.warn("No active form found for contact person update");
      return;
    }

    const contactPersonSelect = activeForm.elements.contactPersonId;
    if (!contactPersonSelect) {
      console.warn("Contact person select not found in the form");
      return;
    }

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
      console.warn(`Contractor with ID ${contractorId} not found`);
      contactPersonSelect.disabled = true;
      return;
    }

    console.log("Found contractor:", contractor);

    // Делаем список активным
    contactPersonSelect.disabled = false;

    // Добавляем основное контактное лицо подрядчика
    if (contractor.contact_person) {
      const option = document.createElement("option");
      option.value = `contact_${contractorId}`; // Особый ID для основного контактного лица
      option.textContent = `${contractor.contact_person} (${
        contractor.contact_person_position || "Contact Person"
      })`;
      contactPersonSelect.appendChild(option);

      console.log(`Added main contact person: ${contractor.contact_person}`);
    }

    // Добавляем сотрудников подрядчика
    if (
      contractor.employees &&
      Array.isArray(contractor.employees) &&
      contractor.employees.length > 0
    ) {
      console.log(
        `Adding ${contractor.employees.length} employees from contractor`
      );

      contractor.employees.forEach((employee) => {
        const option = document.createElement("option");
        option.value = employee.id;

        // Используем поля, совместимые с нашим API
        const fullName = employee.fullName || employee.full_name || "Unknown";
        const position = employee.position || "Employee";

        option.textContent = `${fullName} (${position})`;
        contactPersonSelect.appendChild(option);
      });
    } else {
      console.log("No employees found for this contractor");
    }
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
    const contractorId = form.dataset.contractorId
      ? parseInt(form.dataset.contractorId)
      : null;

    // Добавим лог для отладки
    console.log("handleContractorSubmit: Form values:", {
      companyName: form.elements.companyName.value,
      businessType: form.elements.businessType.value,
      location: form.elements.location.value,
      position: form.elements.position.value,
      rating: form.elements.rating.value,
    });

    const contractorData = {
      company_name: form.elements.companyName.value,
      business_type: form.elements.businessType.value,
      location: form.elements.location.value, // Убедимся, что location правильно включен
      email: form.elements.email.value,
      phone: form.elements.phone.value,
      contact_person: form.elements.contactName.value,
      contact_person_position: form.elements.position.value,
      rating: parseInt(form.elements.rating.value) || 0,
      project_id: 1, // ВРЕМЕННАЯ ЗАГЛУШКА - ЗАМЕНИТЬ!
    };

    // Логируем итоговый объект данных перед отправкой
    console.log(
      "handleContractorSubmit: Data being sent:",
      JSON.stringify(contractorData)
    );

    // Убираем временную заглушку для project_id
    // if (!contractorData.project_id) {
    //    console.warn("handleContractorSubmit: project_id is missing! Setting to null for now. Fix this!");
    //    contractorData.project_id = null;
    // }

    // ВАЖНО: Добавьте здесь логику получения project_id
    // Например, если у вас есть select для проекта в форме или он передается при открытии раздела:
    // const projectIdSelect = document.getElementById('project-selector'); // Пример
    // if (projectIdSelect && projectIdSelect.value) {
    //      contractorData.project_id = parseInt(projectIdSelect.value);
    // } else {
    //      alert("Error: Project ID is missing!");
    //      console.error("handleContractorSubmit: Could not determine Project ID.");
    //      return; // Не продолжаем без ID проекта
    // }
    // Временная заглушка для теста (удалите это)
    if (!contractorData.project_id) {
      contractorData.project_id = 1; // Установите ID существующего проекта для теста
      console.warn(
        `handleContractorSubmit: Using TEST Project ID: ${contractorData.project_id}. REMOVE THIS!`
      );
    }

    if (contractorId) {
      this.updateContractor(contractorId, contractorData);
    } else {
      // Проверка project_id перед созданием
      if (!contractorData.project_id) {
        alert("Error: Cannot add contractor without a Project ID.");
        console.error(
          "handleContractorSubmit: project_id is null or undefined before calling createContractor."
        );
        return; // Прерываем выполнение
      }
      this.createContractor(contractorData);
    }

    this.closeModals();
  }

  setupSearchFilters() {
    // Keep only contractor filter logic, remove project filters
    const contractorsSection = this.container.querySelector(
      "#contractors-section"
    );
    if (contractorsSection) {
      const searchInput = this.container.querySelector("#contractor-search");
      const businessTypeSelect = this.container.querySelector(
        "#business-type-filter"
      );
      const ratingSelect = this.container.querySelector("#rating-filter");
      const resetButton = this.container.querySelector("#reset-filters");

      if (searchInput) {
        searchInput.addEventListener("input", () => {
          this.filters.contractors.search = searchInput.value.toLowerCase();
          this.filterContractors();
        });
      }

      if (businessTypeSelect) {
        businessTypeSelect.addEventListener("change", () => {
          this.filters.contractors.businessType = businessTypeSelect.value;
          this.filterContractors();
        });
      }

      if (ratingSelect) {
        ratingSelect.addEventListener("change", () => {
          this.filters.contractors.rating = ratingSelect.value;
          this.filterContractors();
        });
      }

      if (resetButton) {
        resetButton.addEventListener("click", () => {
          this.resetContractorFilters();
        });
      }
    }

    // Remove currentProjects and futureProjects filter setup
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
      // For filtering, we'll check both company_name and companyName to be safe
      const companyName =
        contractor.company_name || contractor.companyName || "";
      // Same for business_type
      const businessType =
        contractor.business_type || contractor.businessType || "";

      const matchesSearch =
        companyName.toLowerCase().includes(this.filters.contractors.search) ||
        businessType.toLowerCase().includes(this.filters.contractors.search);
      const matchesBusinessType =
        this.filters.contractors.businessType === "all" ||
        businessType === this.filters.contractors.businessType;
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
    console.log(`Updating contractor list by business type: "${businessType}"`);

    // Очищаем текущий список
    select.innerHTML = '<option value="">Select Contractor</option>';

    if (!businessType) {
      // Если тип бизнеса не выбран, показываем всех подрядчиков
      this.populateContractorSelect(select);
      return;
    }

    // Проверяем наличие подрядчиков
    if (
      !this.contractors ||
      !Array.isArray(this.contractors) ||
      this.contractors.length === 0
    ) {
      console.warn("No contractors available to filter");
      return;
    }

    console.log("Filtering contractors. Available:", this.contractors.length);

    // Фильтруем подрядчиков по выбранному типу бизнеса
    // Проверяем оба возможных имени поля: businessType и business_type
    const filteredContractors = this.contractors.filter(
      (c) => c.businessType === businessType || c.business_type === businessType
    );

    console.log(
      `Found ${filteredContractors.length} contractors of type "${businessType}"`
    );

    // Заполняем список отфильтрованными подрядчиками
    filteredContractors.forEach((contractor) => {
      const option = document.createElement("option");
      option.value = contractor.id;

      // Используем подходящее поле имени компании, учитывая разные форматы данных
      const companyName =
        contractor.company_name || contractor.companyName || "Unknown";

      option.textContent = companyName;
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
  async createContractor(data) {
    // API ожидает project_id, company_name, contact_person, phone, email, scope_of_work
    // Убедимся, что все необходимые поля присутствуют
    if (!data.project_id || !data.company_name) {
      alert(
        "Missing required fields: Project ID and Company Name are required."
      );
      console.error("createContractor: Missing required fields", data);
      return;
    }

    const apiUrl = "/Maintenance_P/backend/construction/contractors_api.php";
    console.log("ConstructionManager: Creating contractor...", data);
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data), // Отправляем плоские данные
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || `HTTP error! status: ${response.status}`
        );
      }

      console.log("Contractor created successfully:", result);

      // После успешного создания получаем полные данные подрядчика с сервера
      const newId = result.id;
      const getResponse = await fetch(`${apiUrl}?id=${newId}`);

      if (!getResponse.ok) {
        console.warn(
          `Failed to fetch complete contractor data after creation, using partial data`
        );
        // Как резервный вариант, просто добавляем ID к данным формы
        data.id = newId;
        data.employees = [];
        this.contractors.push(data);
      } else {
        // Получаем полные данные с сервера
        const fullContractorData = await getResponse.json();
        console.log("Fetched full contractor data:", fullContractorData);

        // Добавляем пустой массив сотрудников
        fullContractorData.employees = [];

        // Добавляем в массив подрядчиков
        this.contractors.push(fullContractorData);
      }

      this.updateBusinessTypeFilter(); // Обновляем список типов бизнеса
      this.renderContractors(); // Перерисовываем список
      alert(result.message || "Contractor added successfully");
    } catch (error) {
      console.error("Error creating contractor:", error);
      alert(`Error adding contractor: ${error.message}`);
    }
  }

  async updateContractor(id, data) {
    const updateUrl = `/Maintenance_P/backend/construction/contractors_api.php?id=${id}`;
    console.log(`ConstructionManager: Updating contractor ID: ${id}`, data);
    try {
      // 1. Отправляем PUT запрос на обновление
      const updateResponse = await fetch(updateUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const updateResult = await updateResponse.json();

      if (!updateResponse.ok) {
        // Если обновление не удалось, выбрасываем ошибку
        throw new Error(
          updateResult.message ||
            `Update failed! status: ${updateResponse.status}`
        );
      }

      console.log("Update API call successful:", updateResult);

      // 2. Запрашиваем обновленные данные с сервера GET-запросом
      console.log(`Fetching updated data for contractor ID: ${id}`);
      const getUrl = `/Maintenance_P/backend/construction/contractors_api.php?id=${id}`;
      const getResponse = await fetch(getUrl);

      if (!getResponse.ok) {
        // Если не удалось получить обновленные данные
        console.error(
          `Failed to fetch updated contractor data: ${getResponse.status}`
        );
        // Можно или показать ошибку, или просто перерисовать с тем, что было (менее точно)
        // На всякий случай обновим локально с отправленными данными как запасной вариант
        const index = this.contractors.findIndex((c) => c.id === id);
        if (index !== -1) {
          this.contractors[index] = { ...this.contractors[index], ...data };
        }
        throw new Error("Update succeeded, but failed to fetch updated data.");
      }

      const updatedContractorData = await getResponse.json();
      console.log("Fetched updated contractor data:", updatedContractorData);

      // 3. Обновляем локальный массив свежими данными
      const index = this.contractors.findIndex((c) => c.id === id);
      if (index !== -1) {
        // Сохраняем текущих сотрудников перед обновлением
        const currentEmployees = this.contractors[index].employees || [];

        this.contractors[index] = updatedContractorData; // Заменяем объект полностью

        // Загружаем сотрудников для обновленного подрядчика
        this.contractors[index].employees =
          await this.loadEmployeesForContractor(id);

        console.log(
          "Local contractor data updated with fetched data:",
          this.contractors[index]
        );
      } else {
        // Этого не должно произойти, но на всякий случай добавим
        console.warn(
          `updateContractor: Contractor with ID ${id} not found locally after update. Adding fetched data.`
        );
        updatedContractorData.employees = await this.loadEmployeesForContractor(
          id
        );
        this.contractors.push(updatedContractorData);
      }

      // 4. Перерисовываем список
      this.renderContractors();
      alert(updateResult.message || "Contractor updated successfully"); // Показываем сообщение из PUT ответа
    } catch (error) {
      console.error(
        `Error during update process for contractor ID ${id}:`,
        error
      );
      // Показываем более общее сообщение или специфичное из ошибки
      alert(`Error updating contractor: ${error.message || "Unknown error"}`);
      // Перерисовываем на случай, если нужно откатить визуальные изменения
      this.renderContractors();
    }
  }

  async deleteContractor(id) {
    if (confirm("Are you sure you want to delete this contractor?")) {
      const apiUrl = `/Maintenance_P/backend/construction/contractors_api.php?id=${id}`;
      console.log(`ConstructionManager: Deleting contractor ID: ${id}`);
      try {
        const response = await fetch(apiUrl, {
          method: "DELETE",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || `HTTP error! status: ${response.status}`
          );
        }

        console.log("Contractor deleted successfully:", result);
        // Удаляем из локального массива
        this.contractors = this.contractors.filter((c) => c.id !== id);
        this.renderContractors(); // Перерисовываем список
        alert(result.message || "Contractor deleted successfully");
      } catch (error) {
        console.error(`Error deleting contractor ID ${id}:`, error);
        alert(`Error deleting contractor: ${error.message}`);
      }
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
