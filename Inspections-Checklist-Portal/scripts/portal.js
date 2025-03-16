class PortalManager {
  constructor() {
    this.currentPage = "dashboard";
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadDefaultPage();
  }

  bindEvents() {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", () => {
        const page = item.getAttribute("data-page");
        this.changePage(page);
      });
    });
  }

  async changePage(page) {
    // Update active menu item
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });
    document.querySelector(`[data-page="${page}"]`).classList.add("active");

    // Update active section
    document.querySelectorAll(".content-section").forEach((section) => {
      section.classList.remove("active");
    });

    const section = document.getElementById(`${page}-section`);
    section.classList.add("active");

    // Load component if not loaded yet
    if (!section.hasAttribute("data-loaded")) {
      await this.loadComponent(page, section);
      section.setAttribute("data-loaded", "true");
    }

    this.currentPage = page;
  }

  async loadComponent(page, section) {
    try {
      const response = await fetch(`components/${page}/${page}.html`);
      const html = await response.text();
      section.innerHTML = html;

      const module = await import(`./components/${page}/${page}Manager.js`);
      if (module.default) {
        new module.default(section);
      }
    } catch (error) {
      console.error(`Error loading ${page} component:`, error);
      section.innerHTML = `<div class="error-message">Error loading ${page} component</div>`;
    }
  }

  loadDefaultPage() {
    this.changePage("dashboard");
  }
}

// Initialize portal when page loads
document.addEventListener("DOMContentLoaded", () => {
  window.portalManager = new PortalManager();
});
