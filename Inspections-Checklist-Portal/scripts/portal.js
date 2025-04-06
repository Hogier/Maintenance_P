import MobileNav from "./mobileNav.js";
import checkPortalAccess from "./authGuard.js";

class PortalManager {
  constructor() {
    // Check user access before initializing the portal
    if (checkPortalAccess()) {
      this.currentPage = "dashboard";
      this.init();
    }
  }

  init() {
    this.bindEvents();
    this.loadDefaultPage();
    this.initNewOrdersCounter();
  }

  // Метод для инициализации счетчика новых заказов
  initNewOrdersCounter() {
    this.updateNewOrdersCount();

    // Обновляем счетчик каждую минуту
    this.orderBadgeInterval = setInterval(() => {
      this.updateNewOrdersCount();
    }, 60000);
  }

  // Получение и обновление количества новых заказов
  updateNewOrdersCount() {
    const formData = new FormData();
    formData.append("action", "getNewOrdersCount");

    const apiUrl =
      window.location.origin +
      "/Maintenance_P/Inspections-Checklist-Portal/api/supplies-api.php";

    fetch(apiUrl, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then((text) => {
        console.log("Raw API response:", text);

        // Более надежная обработка возможных сконкатенированных JSON-ответов
        try {
          // Попробуем найти все корректные JSON-объекты в ответе
          const result = this.extractLastValidJson(text);

          if (result && result.success && typeof result.count === "number") {
            this.updateOrdersBadge(result.count);
            return;
          }

          // Запасной вариант: регулярное выражение
          if (text.includes('"success":true') && text.includes('"count":')) {
            const match = text.match(/"count":(\d+)/);
            if (match && match[1]) {
              this.updateOrdersBadge(parseInt(match[1]));
              return;
            }
          }

          console.warn("Could not extract order count from API response");
        } catch (e) {
          console.error("Error processing API response:", e);
        }
      })
      .catch((error) => {
        console.error("Error updating new orders count:", error);
      });
  }

  // Вспомогательный метод для извлечения последнего валидного JSON из ответа
  extractLastValidJson(text) {
    if (!text) return null;

    // Проверим, может это простой, валидный JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      // Продолжим, если простой парсинг не сработал
    }

    // Ищем все возможные JSON-объекты в ответе
    let jsonObjects = [];
    let depth = 0;
    let startPos = -1;

    // Сканируем строку побайтово
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "{") {
        if (depth === 0) {
          startPos = i;
        }
        depth++;
      } else if (text[i] === "}") {
        depth--;
        if (depth === 0 && startPos !== -1) {
          // Нашли потенциальный JSON-объект
          const slice = text.substring(startPos, i + 1);
          try {
            const parsed = JSON.parse(slice);
            jsonObjects.push(parsed);
          } catch (e) {
            // Игнорируем невалидные объекты
          }
          startPos = -1;
        }
      }
    }

    // Возвращаем последний валидный объект, если есть
    return jsonObjects.length > 0 ? jsonObjects[jsonObjects.length - 1] : null;
  }

  // Обновление значка на кнопке
  updateOrdersBadge(count) {
    const badgeElement = document.querySelector(
      "#newOrdersBadge .cart-badge-mini"
    );
    if (badgeElement) {
      badgeElement.textContent = count;

      // Отображаем или скрываем значок в зависимости от наличия новых заказов
      if (count > 0) {
        badgeElement.style.display = "flex";
      } else {
        badgeElement.style.display = "none";
      }
    }
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

    // Notification badge click handler
    const notificationBadge = document.getElementById("newOrdersBadge");
    if (notificationBadge) {
      notificationBadge.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent the parent nav-item click event
        this.changePage("supplies");
      });
    }
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

// Make portalManager available globally
window.portalManager = portalManager;
