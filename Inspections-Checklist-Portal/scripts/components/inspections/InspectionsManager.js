export default class InspectionsManager {
  constructor(container) {
    this.container = container;
    this.inspections = [];
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadInspections();
  }

  bindEvents() {
    const addBtn = this.container.querySelector("#add-inspection");
    const searchInput = this.container.querySelector("#search-inspection");
    const statusFilter = this.container.querySelector("#status-filter");
    const modal = this.container.querySelector("#inspection-modal");
    const closeModal = this.container.querySelector(".close-modal");
    const form = this.container.querySelector("#inspection-form");
    const cancelBtn = this.container.querySelector("#cancel-inspection");

    if (addBtn) {
      addBtn.addEventListener("click", () => this.showModal());
    }

    if (searchInput) {
      searchInput.addEventListener("input", (e) =>
        this.filterInspections(e.target.value)
      );
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", (e) =>
        this.filterByStatus(e.target.value)
      );
    }

    if (closeModal) {
      closeModal.addEventListener("click", () => this.hideModal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.hideModal());
    }

    if (form) {
      form.addEventListener("submit", (e) => this.handleSubmit(e));
    }
  }

  async loadInspections() {
    try {
      // Here will be API call to load inspections
      // For now using mock data
      this.inspections = [
        {
          id: 1,
          title: "Monthly Safety Inspection",
          date: "2024-03-15",
          type: "routine",
          status: "pending",
          description: "Regular monthly safety inspection of main facility",
        },
        // Add more mock inspections as needed
      ];
      this.renderInspections();
    } catch (error) {
      console.error("Error loading inspections:", error);
    }
  }

  renderInspections(inspections = this.inspections) {
    const listContainer = this.container.querySelector("#inspections-list");
    if (!listContainer) return;

    listContainer.innerHTML = inspections
      .map(
        (inspection) => `
            <div class="inspection-card">
                <div class="inspection-card-header">
                    <h3 class="inspection-title">${inspection.title}</h3>
                    <span class="inspection-status status-${
                      inspection.status
                    }">${inspection.status}</span>
                </div>
                <div class="inspection-details">
                    <div class="inspection-date">
                        <i class="fas fa-calendar"></i> ${new Date(
                          inspection.date
                        ).toLocaleDateString()}
                    </div>
                    <div class="inspection-type">
                        <i class="fas fa-tag"></i> ${inspection.type}
                    </div>
                    <p class="inspection-description">${
                      inspection.description
                    }</p>
                </div>
                <div class="inspection-actions">
                    <button class="btn-action" onclick="event.stopPropagation(); this.editInspection(${
                      inspection.id
                    })">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action" onclick="event.stopPropagation(); this.deleteInspection(${
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

  showModal(inspection = null) {
    const modal = this.container.querySelector("#inspection-modal");
    const modalTitle = this.container.querySelector("#modal-title");
    const form = this.container.querySelector("#inspection-form");

    if (!modal || !modalTitle || !form) return;

    modalTitle.textContent = inspection ? "Edit Inspection" : "New Inspection";

    if (inspection) {
      form.elements["inspection-title"].value = inspection.title;
      form.elements["inspection-date"].value = inspection.date;
      form.elements["inspection-type"].value = inspection.type;
      form.elements["inspection-description"].value = inspection.description;
      form.dataset.inspectionId = inspection.id;
    } else {
      form.reset();
      delete form.dataset.inspectionId;
    }

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
    const inspectionData = {
      title: form.elements["inspection-title"].value,
      date: form.elements["inspection-date"].value,
      type: form.elements["inspection-type"].value,
      description: form.elements["inspection-description"].value,
      status: "pending",
    };

    if (form.dataset.inspectionId) {
      this.updateInspection(form.dataset.inspectionId, inspectionData);
    } else {
      this.createInspection(inspectionData);
    }

    this.hideModal();
  }

  createInspection(data) {
    const newInspection = {
      id: Date.now(),
      ...data,
    };
    this.inspections.push(newInspection);
    this.renderInspections();
  }

  updateInspection(id, data) {
    const index = this.inspections.findIndex((i) => i.id === parseInt(id));
    if (index !== -1) {
      this.inspections[index] = {
        ...this.inspections[index],
        ...data,
      };
      this.renderInspections();
    }
  }

  deleteInspection(id) {
    if (confirm("Are you sure you want to delete this inspection?")) {
      this.inspections = this.inspections.filter((i) => i.id !== id);
      this.renderInspections();
    }
  }

  filterInspections(searchTerm) {
    const filtered = this.inspections.filter(
      (inspection) =>
        inspection.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inspection.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    this.renderInspections(filtered);
  }

  filterByStatus(status) {
    if (status === "all") {
      this.renderInspections();
    } else {
      const filtered = this.inspections.filter(
        (inspection) => inspection.status === status
      );
      this.renderInspections(filtered);
    }
  }
}
