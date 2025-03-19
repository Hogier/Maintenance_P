export default class InspectionsManager {
  constructor(container) {
    this.container = container;
    this.inspections = {
      safety: [],
      maintenance: [],
      environmental: [],
      fire: [],
    };
    this.activeTab = "safety";
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadInspections();
  }

  bindEvents() {
    // Tab navigation
    this.container.querySelectorAll(".submenu-tab").forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab.dataset.tab));
    });

    // Add button
    const addBtn = this.container.querySelector("#add-inspection");
    if (addBtn) {
      addBtn.addEventListener("click", () => this.showModal());
    }

    // Form submission
    const form = this.container.querySelector("#inspection-form");
    if (form) {
      form.addEventListener("submit", (e) => this.handleSubmit(e));
    }

    // Close modal
    const closeModal = this.container.querySelector(".close-modal");
    const cancelBtn = this.container.querySelector("#cancel-inspection");
    if (closeModal) {
      closeModal.addEventListener("click", () => this.hideModal());
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.hideModal());
    }

    // Setup filters
    this.setupFilters();
  }

  setupFilters() {
    const searchInput = this.container.querySelector("#active-search");
    const statusFilter = this.container.querySelector("#active-status-filter");
    const dateFilter = this.container.querySelector("#active-date-filter");
    const resetBtn = this.container.querySelector("#reset-active-filters");

    if (searchInput) {
      searchInput.addEventListener("input", () => this.filterInspections());
    }
    if (statusFilter) {
      statusFilter.addEventListener("change", () => this.filterInspections());
    }
    if (dateFilter) {
      dateFilter.addEventListener("change", () => this.filterInspections());
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.resetFilters());
    }
  }

  async loadInspections() {
    try {
      // Here will be API call to load inspections
      // For now using mock data
      this.inspections = {
        safety: [
          {
            id: 1,
            title: "Monthly Safety Inspection",
            date: "2024-03-15",
            type: "routine",
            status: "pending",
            description: "Regular monthly safety inspection of main facility",
          },
        ],
        maintenance: [
          {
            id: 2,
            title: "HVAC System Check",
            date: "2024-03-16",
            type: "routine",
            status: "in-progress",
            description: "Quarterly HVAC system maintenance inspection",
          },
        ],
        environmental: [
          {
            id: 3,
            title: "Air Quality Assessment",
            date: "2024-03-17",
            type: "routine",
            status: "completed",
            description: "Annual air quality inspection and testing",
          },
        ],
        fire: [
          {
            id: 4,
            title: "Fire Safety Audit",
            date: "2024-03-18",
            type: "routine",
            status: "pending",
            description: "Monthly fire safety equipment inspection",
          },
        ],
      };
      this.renderActiveSection();
    } catch (error) {
      console.error("Error loading inspections:", error);
    }
  }

  switchTab(tab) {
    // Update sections
    this.container
      .querySelectorAll(".inspections-section")
      .forEach((s) => s.classList.remove("active"));
    this.container.querySelector(`#${tab}-section`).classList.add("active");

    // Update header title
    const sectionTitle = this.container.querySelector("#section-title");
    if (sectionTitle) {
      sectionTitle.textContent = `${
        tab.charAt(0).toUpperCase() + tab.slice(1)
      } Inspections`;
    }

    this.activeTab = tab;
    this.renderActiveSection();
  }

  renderActiveSection() {
    const section = this.activeTab;
    const listContainer = this.container.querySelector(
      `#${section}-inspections-list`
    );
    if (!listContainer) return;

    listContainer.innerHTML = this.inspections[section]
      .map(
        (inspection) => `
          <div class="inspection-card">
            <div class="inspection-header">
              <h3>${inspection.title}</h3>
              <span class="inspection-status status-${inspection.status}">${
          inspection.status
        }</span>
            </div>
            <div class="inspection-info">
              <div class="info-item">
                <i class="fas fa-calendar"></i>
                <span>${new Date(inspection.date).toLocaleDateString()}</span>
              </div>
              <div class="info-item">
                <i class="fas fa-tag"></i>
                <span>${inspection.type}</span>
              </div>
            </div>
            <p class="inspection-description">${inspection.description}</p>
            <div class="card-actions">
              <button class="btn-icon edit" onclick="event.stopPropagation(); this.editInspection(${
                inspection.id
              })">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-icon delete" onclick="event.stopPropagation(); this.deleteInspection(${
                inspection.id
              })">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `
      )
      .join("");
  }

  showModal(type = null) {
    const modal = this.container.querySelector("#inspection-modal");
    const modalTitle = this.container.querySelector("#modal-title");
    const form = this.container.querySelector("#inspection-form");

    if (!modal || !modalTitle || !form) return;

    modalTitle.textContent = type
      ? `New ${type.charAt(0).toUpperCase() + type.slice(1)} Inspection`
      : "New Inspection";
    form.dataset.inspectionType = type || this.activeTab;

    modal.classList.add("active");
  }

  hideModal() {
    const modal = this.container.querySelector("#inspection-modal");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const type = form.dataset.inspectionType || this.activeTab;
    const inspectionData = {
      id: Date.now(),
      title: form.elements["inspection-title"].value,
      date: form.elements["inspection-date"].value,
      type: form.elements["inspection-type"].value,
      description: form.elements["inspection-description"].value,
      status: "pending",
    };

    this.inspections[type].push(inspectionData);
    this.renderActiveSection();
    this.hideModal();
  }

  editInspection(id) {
    const type = this.activeTab;
    const inspection = this.inspections[type].find((i) => i.id === id);
    if (!inspection) return;

    this.showModal(type);
    const form = this.container.querySelector("#inspection-form");
    form.elements["inspection-title"].value = inspection.title;
    form.elements["inspection-date"].value = inspection.date;
    form.elements["inspection-type"].value = inspection.type;
    form.elements["inspection-description"].value = inspection.description;
    form.dataset.inspectionId = id;
  }

  deleteInspection(id) {
    if (confirm("Are you sure you want to delete this inspection?")) {
      const type = this.activeTab;
      this.inspections[type] = this.inspections[type].filter(
        (i) => i.id !== id
      );
      this.renderActiveSection();
    }
  }

  filterInspections() {
    const searchInput = this.container.querySelector("#active-search");
    const statusFilter = this.container.querySelector("#active-status-filter");
    const dateFilter = this.container.querySelector("#active-date-filter");

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const status = statusFilter ? statusFilter.value : "all";
    const date = dateFilter ? dateFilter.value : "";

    const section = this.activeTab;
    const filtered = this.inspections[section].filter((inspection) => {
      const matchesSearch =
        inspection.title.toLowerCase().includes(searchTerm) ||
        inspection.description.toLowerCase().includes(searchTerm);
      const matchesStatus = status === "all" || inspection.status === status;
      const matchesDate = !date || inspection.date === date;

      return matchesSearch && matchesStatus && matchesDate;
    });

    const listContainer = this.container.querySelector(
      `#${section}-inspections-list`
    );
    if (listContainer) {
      listContainer.innerHTML = filtered
        .map(
          (inspection) => `
            <div class="inspection-card">
              <div class="inspection-header">
                <h3>${inspection.title}</h3>
                <span class="inspection-status status-${inspection.status}">${
            inspection.status
          }</span>
              </div>
              <div class="inspection-info">
                <div class="info-item">
                  <i class="fas fa-calendar"></i>
                  <span>${new Date(inspection.date).toLocaleDateString()}</span>
                </div>
                <div class="info-item">
                  <i class="fas fa-tag"></i>
                  <span>${inspection.type}</span>
                </div>
              </div>
              <p class="inspection-description">${inspection.description}</p>
              <div class="card-actions">
                <button class="btn-icon edit" onclick="event.stopPropagation(); this.editInspection(${
                  inspection.id
                })">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete" onclick="event.stopPropagation(); this.deleteInspection(${
                  inspection.id
                })">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          `
        )
        .join("");
    }
  }

  resetFilters() {
    const searchInput = this.container.querySelector("#active-search");
    const statusFilter = this.container.querySelector("#active-status-filter");
    const dateFilter = this.container.querySelector("#active-date-filter");

    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "all";
    if (dateFilter) dateFilter.value = "";

    this.filterInspections();
  }
}
