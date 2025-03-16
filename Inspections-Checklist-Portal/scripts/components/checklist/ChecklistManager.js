export default class ChecklistManager {
  constructor(container) {
    this.container = container;
    this.checklists = [];
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadChecklists();
  }

  bindEvents() {
    const addButton = this.container.querySelector("#add-checklist");
    if (addButton) {
      addButton.addEventListener("click", () => this.showAddChecklistForm());
    }
  }

  async loadChecklists() {
    try {
      // Here will be API call to load checklists
      const checklistList = this.container.querySelector("#checklist-list");
      if (checklistList) {
        checklistList.innerHTML = this.renderChecklistItems();
      }
    } catch (error) {
      console.error("Error loading checklists:", error);
    }
  }

  renderChecklistItems() {
    if (this.checklists.length === 0) {
      return '<div class="no-items">No checklists available</div>';
    }

    return this.checklists
      .map(
        (checklist) => `
            <div class="checklist-item" data-id="${checklist.id}">
                <div class="checklist-item-header">
                    <h3>${checklist.title}</h3>
                    <div class="checklist-item-actions">
                        <button class="btn-edit" data-id="${checklist.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" data-id="${checklist.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="checklist-item-content">
                    <p>${checklist.description}</p>
                </div>
                <div class="checklist-item-footer">
                    <span>Created: ${new Date(
                      checklist.createdAt
                    ).toLocaleDateString()}</span>
                    <span>${checklist.items.length} items</span>
                </div>
            </div>
        `
      )
      .join("");
  }

  showAddChecklistForm() {
    // Implementation for adding new checklist
    console.log("Opening add checklist form...");
  }

  editChecklist(id) {
    // Implementation for editing checklist
    console.log("Editing checklist:", id);
  }

  deleteChecklist(id) {
    // Implementation for deleting checklist
    console.log("Deleting checklist:", id);
  }
}
