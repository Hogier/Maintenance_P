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
    this.initNewOrdersCounter();
    this.bindEvents();

    // Проверяем, была ли сохранена текущая страница в sessionStorage
    const savedPage = sessionStorage.getItem("currentPage");
    if (savedPage) {
      this.currentPage = savedPage;
      this.changePage(savedPage);
    } else {
      this.loadDefaultPage();
    }

    // Инициализация видимости элементов фильтрации и сортировки
    this.updateFilterSortVisibility(this.currentPage);
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
      "/Inspections-Checklist-Portal/api/supplies-api.php";

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
        console.log("Clicked on nav-item with data-page:", page);

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
    console.log("changePage called with page:", page);

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

    // Управление видимостью элементов Filter и Sort
    this.updateFilterSortVisibility(page);

    this.currentPage = page;
    console.log("Current page updated to:", this.currentPage);

    // Сохраняем текущую страницу в sessionStorage для восстановления при перезагрузке
    sessionStorage.setItem("currentPage", page);

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

      let module;
      try {
        // Сначала пробуем загрузить файл с маленькой буквы, как в оригинале
        module = await import(`./components/${page}/${page}Manager.js`);
      } catch (importError) {
        // Если не удалось, пробуем вариант с большой буквы
        const capitalizedPage = page.charAt(0).toUpperCase() + page.slice(1);
        module = await import(`./components/${page}/${capitalizedPage}Manager.js`);
      }

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
    // Initialize construction manager if container exists and manager doesn't already exist
    const constructionContainer = document.querySelector(
      "#construction-container"
    );
    if (constructionContainer && !window.constructionManager) {
      console.log("Creating new ConstructionManager instance");
      window.constructionManager = new ConstructionManager(
        constructionContainer
      );
    } else if (window.constructionManager) {
      console.log(
        "ConstructionManager already exists, skipping initialization"
      );
    }
  }

  updateActiveMenuItem(page) {
    // Implementation of updateActiveMenuItem method
  }

  // Добавим выделенный метод для управления видимостью элементов фильтра и сортировки
  updateFilterSortVisibility(page) {
    console.log("updateFilterSortVisibility called with page:", page);

    // Проверяем наличие нового контейнера tasks-submenu-section
    const tasksSubmenuSection = document.querySelector(
      ".tasks-submenu-section"
    );

    if (tasksSubmenuSection) {
      // Используем новый контейнер, если он существует
      if (page === "tasks") {
        console.log("Showing tasks-submenu-section for tasks page");

        // Подготавливаем элемент к анимации
        tasksSubmenuSection.style.opacity = "0";
        tasksSubmenuSection.style.maxHeight = "0";
        tasksSubmenuSection.style.overflow = "hidden";
        tasksSubmenuSection.style.display = "";

        // Даем браузеру время для отрисовки текущего состояния
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Плавная анимация появления
            tasksSubmenuSection.style.transition =
              "opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), max-height 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
            const sectionHeight = tasksSubmenuSection.scrollHeight;
            tasksSubmenuSection.style.maxHeight = sectionHeight + "px";
            tasksSubmenuSection.style.opacity = "1";

            // После завершения анимации устанавливаем нормальное состояние
            setTimeout(() => {
              tasksSubmenuSection.style.maxHeight = "none";
              tasksSubmenuSection.style.overflow = "";
            }, 500);
          });
        });
      } else {
        console.log("Hiding tasks-submenu-section for page:", page);

        // Измеряем текущую высоту перед началом анимации
        const sectionHeight = tasksSubmenuSection.scrollHeight;
        tasksSubmenuSection.style.maxHeight = sectionHeight + "px";
        tasksSubmenuSection.style.overflow = "hidden";

        // Даем браузеру время для отрисовки текущего состояния
        requestAnimationFrame(() => {
          // Устанавливаем переход и запускаем анимацию исчезновения
          tasksSubmenuSection.style.transition =
            "opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), max-height 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
          tasksSubmenuSection.style.opacity = "0";
          tasksSubmenuSection.style.maxHeight = "0";

          // После завершения анимации скрываем элемент полностью
          setTimeout(() => {
            tasksSubmenuSection.style.display = "none";
          }, 500);
        });
      }
    } else {
      // Используем старый способ, если новый контейнер не найден
      const filterNavItem = document.querySelector('[data-page="filter"]');
      const sortNavItem = document.querySelector('[data-page="sort"]');
      const filterSubmenu = filterNavItem?.nextElementSibling;
      const sortSubmenu = sortNavItem?.nextElementSibling;

      console.log("Elements found:", {
        filterNavItem: !!filterNavItem,
        sortNavItem: !!sortNavItem,
        filterSubmenu: !!filterSubmenu,
        sortSubmenu: !!sortSubmenu,
      });

      if (page === "tasks") {
        console.log("Showing filter and sort elements for tasks page");
        // Показываем элементы для страницы Maintenance Tasks с анимацией
        if (filterNavItem) {
          filterNavItem.style.display = "";
          filterNavItem.style.height = "0";
          filterNavItem.style.opacity = "0";

          requestAnimationFrame(() => {
            filterNavItem.style.transition =
              "opacity 0.5s ease, height 0.5s ease";
            filterNavItem.style.height = filterNavItem.scrollHeight + "px";
            filterNavItem.style.opacity = "1";

            setTimeout(() => {
              filterNavItem.style.height = "";
              filterNavItem.style.overflow = "";
            }, 500);
          });
        }

        if (sortNavItem) {
          sortNavItem.style.display = "";
          sortNavItem.style.height = "0";
          sortNavItem.style.opacity = "0";

          // Добавляем небольшую задержку для каскадного эффекта
          setTimeout(() => {
            requestAnimationFrame(() => {
              sortNavItem.style.transition =
                "opacity 0.5s ease, height 0.5s ease";
              sortNavItem.style.height = sortNavItem.scrollHeight + "px";
              sortNavItem.style.opacity = "1";

              setTimeout(() => {
                sortNavItem.style.height = "";
                sortNavItem.style.overflow = "";
              }, 500);
            });
          }, 150);
        }

        if (filterSubmenu) {
          filterSubmenu.style.display = "";
          filterSubmenu.style.height = "0";
          filterSubmenu.style.opacity = "0";

          setTimeout(() => {
            requestAnimationFrame(() => {
              filterSubmenu.style.transition =
                "opacity 0.4s ease, height 0.4s ease";
              filterSubmenu.style.height = filterSubmenu.scrollHeight + "px";
              filterSubmenu.style.opacity = "1";

              setTimeout(() => {
                filterSubmenu.style.height = "";
                filterSubmenu.style.overflow = "";
              }, 400);
            });
          }, 50);
        }

        if (sortSubmenu) {
          sortSubmenu.style.display = "";
          sortSubmenu.style.height = "0";
          sortSubmenu.style.opacity = "0";

          setTimeout(() => {
            requestAnimationFrame(() => {
              sortSubmenu.style.transition =
                "opacity 0.4s ease, height 0.4s ease";
              sortSubmenu.style.height = sortSubmenu.scrollHeight + "px";
              sortSubmenu.style.opacity = "1";

              setTimeout(() => {
                sortSubmenu.style.height = "";
                sortSubmenu.style.overflow = "";
              }, 400);
            });
          }, 200);
        }
      } else {
        console.log("Hiding filter and sort elements for page:", page);
        // Скрываем элементы для всех остальных страниц с анимацией
        if (filterNavItem) {
          const filterHeight = filterNavItem.scrollHeight;
          filterNavItem.style.height = filterHeight + "px";
          filterNavItem.style.overflow = "hidden";

          requestAnimationFrame(() => {
            filterNavItem.style.transition =
              "opacity 0.5s ease, height 0.5s ease";
            filterNavItem.style.opacity = "0";
            filterNavItem.style.height = "0";

            setTimeout(() => {
              filterNavItem.style.display = "none";
              console.log("Filter element hidden with display:none");
            }, 500);
          });
        }

        if (sortNavItem) {
          const sortHeight = sortNavItem.scrollHeight;
          sortNavItem.style.height = sortHeight + "px";
          sortNavItem.style.overflow = "hidden";

          setTimeout(() => {
            requestAnimationFrame(() => {
              sortNavItem.style.transition =
                "opacity 0.5s ease, height 0.5s ease";
              sortNavItem.style.opacity = "0";
              sortNavItem.style.height = "0";

              setTimeout(() => {
                sortNavItem.style.display = "none";
                console.log("Sort element hidden with display:none");
              }, 500);
            });
          }, 100);
        }

        if (filterSubmenu) {
          const filterSubmenuHeight = filterSubmenu.scrollHeight;
          filterSubmenu.style.height = filterSubmenuHeight + "px";
          filterSubmenu.style.overflow = "hidden";

          requestAnimationFrame(() => {
            filterSubmenu.style.transition =
              "opacity 0.4s ease, height 0.4s ease";
            filterSubmenu.style.opacity = "0";
            filterSubmenu.style.height = "0";

            setTimeout(() => {
              filterSubmenu.style.display = "none";
            }, 400);
          });
        }

        if (sortSubmenu) {
          const sortSubmenuHeight = sortSubmenu.scrollHeight;
          sortSubmenu.style.height = sortSubmenuHeight + "px";
          sortSubmenu.style.overflow = "hidden";

          requestAnimationFrame(() => {
            sortSubmenu.style.transition =
              "opacity 0.4s ease, height 0.4s ease";
            sortSubmenu.style.opacity = "0";
            sortSubmenu.style.height = "0";

            setTimeout(() => {
              sortSubmenu.style.display = "none";
            }, 400);
          });
        }
      }
    }
  }
}

// Initialize portal manager
const portalManager = new PortalManager();

// Initialize mobile navigation
const mobileNav = new MobileNav();

// Make portalManager available globally
window.portalManager = portalManager;
