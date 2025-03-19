import MobileNav from "./mobileNav.js";

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
    // Main navigation items
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", () => {
        const page = item.getAttribute("data-page");
        if (page === "inspections") {
          // First switch to dashboard
          this.changePage("dashboard");
          // Then open the submenu
          setTimeout(() => this.toggleSubmenu(), 100);
        } else {
          this.changePage(page);
        }
      });
    });

    // Submenu items
    document.querySelectorAll(".submenu-item").forEach((item) => {
      item.addEventListener("click", () => {
        const tab = item.getAttribute("data-tab");
        this.changePage("inspections", tab);
      });
    });

    // Back button in submenu
    const submenuBackButton = document.querySelector(
      "#inspections-submenu .back-button"
    );
    if (submenuBackButton) {
      submenuBackButton.addEventListener("click", () => {
        this.toggleSubmenu();
        this.changePage("dashboard");
      });
    }
  }

  toggleSubmenu() {
    const submenu = document.getElementById("inspections-submenu");
    const inspectionsItem = document.querySelector('[data-page="inspections"]');

    if (submenu && inspectionsItem) {
      submenu.classList.toggle("active");
      inspectionsItem.classList.toggle("active");
    }
  }

  async changePage(page, tab = null) {
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

    // If it's an inspection tab, update the active tab
    if (page === "inspections" && tab) {
      const inspectionsManager = section.querySelector(
        ".inspections-container"
      )?.__manager;
      if (inspectionsManager) {
        inspectionsManager.switchTab(tab);
      }
    }

    this.currentPage = page;

    // Close submenu if it's open
    if (page !== "inspections") {
      const submenu = document.getElementById("inspections-submenu");
      const inspectionsItem = document.querySelector(
        '[data-page="inspections"]'
      );
      if (submenu && inspectionsItem) {
        submenu.classList.remove("active");
        inspectionsItem.classList.remove("active");
      }
    }
  }

  async loadComponent(page, section) {
    try {
      const response = await fetch(`components/${page}/${page}.html`);
      const html = await response.text();
      section.innerHTML = html;

      const module = await import(`./components/${page}/${page}Manager.js`);
      if (module.default) {
        const manager = new module.default(section);
        // Store the manager instance on the container element for later access
        section.querySelector(`.${page}-container`).__manager = manager;
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

// Initialize portal manager
const portalManager = new PortalManager();

// Initialize mobile navigation
const mobileNav = new MobileNav();
