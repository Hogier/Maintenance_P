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
          setTimeout(() => this.toggleSubmenu("inspections"), 100);
        } else if (page === "construction") {
          // First switch to dashboard
          this.changePage("dashboard");
          // Then open the submenu
          setTimeout(() => this.toggleSubmenu("construction"), 100);
        } else {
          this.changePage(page);
        }
      });
    });

    // Submenu items
    document.querySelectorAll(".submenu-item").forEach((item) => {
      item.addEventListener("click", () => {
        const tab = item.getAttribute("data-tab");
        const submenu = item.closest(".submenu");
        const page = submenu.id.replace("-submenu", "");
        this.changePage(page, tab);
      });
    });

    // Back buttons in submenus
    document.querySelectorAll(".submenu .back-button").forEach((button) => {
      button.addEventListener("click", () => {
        const submenu = button.closest(".submenu");
        const page = submenu.id.replace("-submenu", "");
        this.toggleSubmenu(page);
        this.changePage("dashboard");
      });
    });
  }

  toggleSubmenu(page) {
    const submenu = document.getElementById(`${page}-submenu`);
    const menuItem = document.querySelector(`[data-page="${page}"]`);

    if (submenu && menuItem) {
      submenu.classList.toggle("active");
      menuItem.classList.toggle("active");
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

    // Update the active tab for inspections or construction
    if ((page === "inspections" || page === "construction") && tab) {
      const manager = section.querySelector(`.${page}-container`)?.__manager;
      if (manager) {
        manager.switchTab(tab);
      }
    }

    this.currentPage = page;

    // Close submenus if they're open
    if (page !== "inspections" && page !== "construction") {
      const submenus = document.querySelectorAll(".submenu");
      const menuItems = document.querySelectorAll(".nav-item");
      submenus.forEach((submenu) => submenu.classList.remove("active"));
      menuItems.forEach((item) => item.classList.remove("active"));
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

      // Initialize components after loading
      this.initializeComponents();

      // Update active menu item
      this.updateActiveMenuItem(page);
    } catch (error) {
      console.error(`Error loading ${page} component:`, error);
      section.innerHTML = `<div class="error-message">Error loading ${page} component</div>`;
    }
  }

  loadDefaultPage() {
    this.changePage("dashboard");
  }

  initializeComponents() {
    // Initialize construction manager if container exists
    const constructionContainer = document.querySelector(
      "#construction-container"
    );
    if (constructionContainer) {
      window.constructionManager = new ConstructionManager(
        constructionContainer
      );
    }
  }

  updateActiveMenuItem(page) {
    // Implementation of updateActiveMenuItem method
  }
}

// Initialize portal manager
const portalManager = new PortalManager();

// Initialize mobile navigation
const mobileNav = new MobileNav();
