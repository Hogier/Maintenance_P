export default class ConstructionManager {
  constructor(container) {
    this.container = container;
    this.contractors = [];
    this.currentProjects = [];
    this.futureProjects = [];
    this.activeTab = "contractors";
    this.handleRating = this.handleRating.bind(this);
    this.filters = {
      search: "",
      businessType: "all",
      rating: "all",
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadData();
    // Добавляем вывод в консоль для отладки
    console.log("ConstructionManager initialized");
  }

  bindEvents() {
    // Tab navigation
    this.container.querySelectorAll(".nav-tab").forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab.dataset.tab));
    });

    // Add buttons
    this.container
      .querySelector("#add-contractor")
      .addEventListener("click", () => this.showContractorModal());
    this.container
      .querySelector("#add-current-project")
      .addEventListener("click", () => this.showProjectModal("current"));
    this.container
      .querySelector("#add-future-project")
      .addEventListener("click", () => this.showProjectModal("future"));

    // Form submissions
    this.container
      .querySelector("#contractor-form")
      .addEventListener("submit", (e) => this.handleContractorSubmit(e));
    this.container
      .querySelector("#employee-form")
      .addEventListener("submit", (e) => this.handleEmployeeSubmit(e));
    this.container
      .querySelector("#project-form")
      .addEventListener("submit", (e) => this.handleProjectSubmit(e));

    // Rating system
    this.initializeRatingSystem();

    // Close modals
    this.container.querySelectorAll(".close-modal").forEach((btn) => {
      btn.addEventListener("click", () => this.closeModals());
    });

    // Добавляем логирование для отладки фильтров
    const searchInput = this.container.querySelector("#contractor-search");
    const businessTypeFilter = this.container.querySelector(
      "#business-type-filter"
    );
    const ratingFilter = this.container.querySelector("#rating-filter");
    const resetFiltersBtn = this.container.querySelector("#reset-filters");

    console.log("Search input:", searchInput);
    console.log("Business type filter:", businessTypeFilter);
    console.log("Rating filter:", ratingFilter);
    console.log("Reset button:", resetFiltersBtn);

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        console.log("Search input value:", e.target.value);
        this.filters.search = e.target.value.toLowerCase();
        this.applyFilters();
      });
    }

    if (businessTypeFilter) {
      businessTypeFilter.addEventListener("change", (e) => {
        this.filters.businessType = e.target.value;
        this.applyFilters();
      });
    }

    if (ratingFilter) {
      ratingFilter.addEventListener("change", (e) => {
        this.filters.rating = e.target.value;
        this.applyFilters();
      });
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener("click", () => this.resetFilters());
    }
  }

  initializeRatingSystem() {
    const ratingContainer = this.container.querySelector(".rating");
    if (ratingContainer) {
      const stars = ratingContainer.querySelectorAll("i");
      stars.forEach((star) => {
        // Удаляем старые обработчики
        star.removeEventListener("click", this.handleRating);
        // Добавляем новые
        star.addEventListener("click", (e) => {
          const rating = parseInt(e.target.dataset.rating);
          this.setRating(rating);
        });
        // Добавляем hover эффект
        star.addEventListener("mouseover", (e) => {
          const rating = parseInt(e.target.dataset.rating);
          this.showTemporaryRating(rating);
        });
      });

      // Восстанавливаем оригинальный рейтинг при уходе мыши
      ratingContainer.addEventListener("mouseleave", () => {
        const currentRating = parseInt(
          this.container.querySelector('input[name="rating"]').value
        );
        this.setRating(currentRating);
      });
    }
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

    stars.forEach((star, index) => {
      if (index < rating) {
        star.className = "fas fa-star";
      } else {
        star.className = "far fa-star";
      }
    });

    if (ratingInput) {
      ratingInput.value = rating;
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
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  switchTab(tab) {
    this.container
      .querySelectorAll(".nav-tab")
      .forEach((t) => t.classList.remove("active"));
    this.container
      .querySelectorAll(".construction-section")
      .forEach((s) => s.classList.remove("active"));

    this.container.querySelector(`[data-tab="${tab}"]`).classList.add("active");
    this.container.querySelector(`#${tab}-section`).classList.add("active");

    this.activeTab = tab;
    this.renderActiveSection();
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

  renderProjects(type) {
    const projects =
      type === "current" ? this.currentProjects : this.futureProjects;
    const container = this.container.querySelector(`#${type}-projects-list`);
    if (!container) return;

    container.innerHTML = projects
      .map((project) => {
        const contractor = this.contractors.find(
          (c) => c.id === project.contractorId
        );
        return `
      <div class="project-card" data-id="${project.id}">
        <div class="project-header">
          <h3>${project.name}</h3>
          <span class="project-status status-${project.status}">${
          project.status
        }</span>
        </div>
        <div class="project-details">
          <div class="info-item">
            <i class="fas fa-location-dot"></i>
            <span>${project.location}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-calendar"></i>
            <span>${new Date(
              project.startDate
            ).toLocaleDateString()} - ${new Date(
          project.endDate
        ).toLocaleDateString()}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-building"></i>
            <span>${
              contractor ? contractor.companyName : "Unknown Contractor"
            }</span>
          </div>
          ${
            contractor && contractor.contactPerson
              ? `
            <div class="info-item">
              <i class="fas fa-user"></i>
              <span>${contractor.contactPerson.name} (${contractor.contactPerson.position})</span>
            </div>
          `
              : ""
          }
          ${
            type === "future" && project.budget
              ? `
            <div class="info-item">
              <i class="fas fa-money-bill"></i>
              <span>$${project.budget.toLocaleString()}</span>
            </div>
          `
              : ""
          }
        </div>
        <div class="project-actions">
          <button class="btn-action edit" onclick="event.stopPropagation(); this.editProject(${
            project.id
          }, '${type}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-action delete" onclick="event.stopPropagation(); this.deleteProject(${
            project.id
          }, '${type}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
      })
      .join("");
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
    setTimeout(() => this.initializeRatingSystem(), 0);
  }

  showProjectModal(type, project = null) {
    const modal = this.container.querySelector("#project-modal");
    const form = modal.querySelector("#project-form");
    const title = modal.querySelector("#project-modal-title");

    title.textContent = project ? "Edit Project" : "Add Project";
    form.elements.projectType.value = type;

    // Заполняем список подрядчиков
    const contractorSelect = form.elements.contractorId;
    this.populateContractorSelect(contractorSelect);

    // Показываем/скрываем поля для будущих проектов
    const futureFields = modal.querySelectorAll(".future-project-field");
    futureFields.forEach((field) => {
      field.style.display = type === "future" ? "block" : "none";
    });

    if (project) {
      form.elements.projectName.value = project.name;
      form.elements.location.value = project.location;
      form.elements.startDate.value = project.startDate;
      form.elements.endDate.value = project.endDate;
      form.elements.contractorId.value = project.contractorId;
      form.elements.status.value = project.status;
      if (type === "future") {
        form.elements.budget.value = project.budget;
      }
      form.dataset.projectId = project.id;

      // Обновляем список контактных лиц после выбора подрядчика
      this.updateContactPersonSelect(project.contractorId);
      if (project.contactPersonId) {
        form.elements.contactPersonId.value = project.contactPersonId;
      }
    } else {
      form.reset();
      delete form.dataset.projectId;
    }

    // Добавляем обработчик изменения подрядчика
    contractorSelect.addEventListener("change", (e) => {
      this.updateContactPersonSelect(e.target.value);
    });

    modal.classList.add("active");
  }

  // Метод для заполнения списка подрядчиков
  populateContractorSelect(select) {
    // Очищаем текущий список
    select.innerHTML = `
        <option value="">Select Contractor</option>
        ${this.contractors
          .map(
            (contractor) => `
            <option value="${contractor.id}">
                ${contractor.companyName} (${contractor.businessType})
            </option>
        `
          )
          .join("")}
    `;
  }

  // Метод для обновления списка контактных лиц при выборе подрядчика
  updateContactPersonSelect(contractorId) {
    const form = this.container.querySelector("#project-form");
    const contactPersonSelect = form.elements.contactPersonId;

    if (!contractorId) {
      contactPersonSelect.innerHTML =
        '<option value="">Select Contact Person</option>';
      contactPersonSelect.disabled = true;
      return;
    }

    const contractor = this.contractors.find(
      (c) => c.id === parseInt(contractorId)
    );
    if (contractor && contractor.contactPerson) {
      contactPersonSelect.innerHTML = `
            <option value="${contractor.id}">
                ${contractor.contactPerson.name} (${contractor.contactPerson.position})
            </option>
        `;
      contactPersonSelect.disabled = false;
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

  handleProjectSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const projectData = {
      name: form.elements.projectName.value,
      location: form.elements.location.value,
      startDate: form.elements.startDate.value,
      endDate: form.elements.endDate.value,
      contractorId: parseInt(form.elements.contractorId.value),
      contactPersonId: parseInt(form.elements.contactPersonId.value),
      status: form.elements.status.value,
    };

    const projectType = form.elements.projectType.value;
    if (projectType === "future") {
      projectData.budget = parseFloat(form.elements.budget.value) || 0;
      projectData.files = Array.from(form.elements.files.files);
    }

    if (form.dataset.projectId) {
      this.updateProject(
        parseInt(form.dataset.projectId),
        projectData,
        projectType
      );
    } else {
      this.createProject(projectData, projectType);
    }

    this.closeModals();
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
    if (type === "current") {
      this.currentProjects.push(data);
    } else {
      this.futureProjects.push(data);
    }
    this.renderProjects(type);
  }

  updateProject(id, data, type) {
    const projects =
      type === "current" ? this.currentProjects : this.futureProjects;
    const index = projects.findIndex((p) => p.id === id);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...data };
      this.renderProjects(type);
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
        contractor.companyName.toLowerCase().includes(this.filters.search) ||
        contractor.businessType.toLowerCase().includes(this.filters.search);

      // Фильтр по типу бизнеса
      const matchesBusinessType =
        this.filters.businessType === "all" ||
        contractor.businessType === this.filters.businessType;

      // Фильтр по рейтингу
      const matchesRating =
        this.filters.rating === "all" ||
        contractor.rating >= parseInt(this.filters.rating);

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
    this.filters = {
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
}
