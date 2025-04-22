/**
 * Sidebar navigation for Corporate Chat Portal
 * This manages the sidebar menu, navigation, and role-based access control
 */

// Оборачиваем весь код в IIFE для предотвращения конфликтов переменных
(function () {
  // DOM Elements
  let sidebarNav;
  let sidebarOverlay;
  let mobileMenuButton;
  let closeSidebarButton;
  let touchHint;
  let chatWindow;

  // Initialize when the DOM is loaded
  document.addEventListener("DOMContentLoaded", function () {
    sidebarNav = document.querySelector(".sidebar-navigation");
    sidebarOverlay = document.querySelector(".sidebar-overlay");
    mobileMenuButton = document.querySelector(".mobile-menu-button");
    closeSidebarButton = document.querySelector(".close-sidebar-button");
    touchHint = document.querySelector(".touch-hint");
    chatWindow = document.querySelector(".chat-window");

    setupEventListeners();
    applyRoleBasedAccess();

    // Инициализация стилей чат-контейнера при загрузке страницы
    initChatContainerStyles();

    // Позиционирование кнопки закрытия
    updateCloseButtonPosition();
  });

  // Инициализация стилей чат-контейнера в соответствии с размером экрана
  function initChatContainerStyles() {
    const chatContainer = document.querySelector(".chat-container");
    if (chatContainer) {
      if (window.innerWidth <= 768) {
        chatContainer.style.marginLeft = "1%";
        chatContainer.style.width = "98%";
      } else if (window.innerWidth <= 992) {
        chatContainer.style.marginLeft = "calc(300px + 10px)";
        chatContainer.style.width = "calc(95% - 300px)";
      } else {
        chatContainer.style.marginLeft = "calc(300px + 20px)";
        chatContainer.style.width = "calc(90% - 300px)";
      }
    }
  }

  // Функция для обновления позиции кнопки закрытия
  function updateCloseButtonPosition() {
    if (!closeSidebarButton) return;

    const sidebarWidth =
      window.innerWidth <= 768 ? Math.min(window.innerWidth * 0.8, 280) : 300;

    // Позиционируем кнопку правее края меню с отступом
    closeSidebarButton.style.left = `${sidebarWidth + 5}px`;
  }

  // Set up event listeners for sidebar navigation
  function setupEventListeners() {
    // Mobile menu button
    if (mobileMenuButton) {
      mobileMenuButton.addEventListener("click", openSidebar);
    }

    // Close sidebar button
    if (closeSidebarButton) {
      closeSidebarButton.addEventListener("click", closeSidebar);
    }

    // Overlay click to close sidebar
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener("click", closeSidebar);
    }

    // Sidebar menu items click handlers
    const menuItems = document.querySelectorAll(".sidebar-menu-item");
    menuItems.forEach((item) => {
      item.addEventListener("click", handleMenuItemClick);
    });

    // Back button
    const backButton = document.querySelector(".sidebar-back-button");
    if (backButton) {
      backButton.addEventListener("click", function () {
        window.location.href = "../main.html";
      });
    }

    // Add touch swipe gestures for mobile
    setupTouchGestures();

    // Для мобильных устройств
    if (window.innerWidth <= 768) {
      if (mobileMenuButton) {
        mobileMenuButton.addEventListener("click", function () {
          openSidebar();
        });
      }
    }

    // Adjust layout when window is resized
    window.addEventListener("resize", function () {
      const chatContainer = document.querySelector(".chat-container");

      // Обновляем позицию кнопки закрытия при изменении размера окна
      updateCloseButtonPosition();

      if (window.innerWidth <= 768) {
        // Не удаляем классы active, если меню открыто
        if (!sidebarNav.classList.contains("active")) {
          closeSidebar(); // Закрываем сайдбар только если он был закрыт
        }

        if (chatContainer) {
          chatContainer.style.marginLeft = "1%";
          chatContainer.style.width = "98%";
        }
      } else {
        // При переходе на десктоп всегда закрываем мобильное меню
        closeSidebar();

        if (chatContainer) {
          if (window.innerWidth <= 992) {
            chatContainer.style.marginLeft = "calc(300px + 10px)";
            chatContainer.style.width = "calc(95% - 300px)";
          } else {
            chatContainer.style.marginLeft = "calc(300px + 20px)";
            chatContainer.style.width = "calc(90% - 300px)";
          }
        }
      }
    });
  }

  // Open sidebar
  function openSidebar() {
    sidebarNav.classList.add("active");
    sidebarOverlay.classList.add("active");
    document.body.classList.add("sidebar-active");
    document.body.style.overflow = "hidden"; // Prevent scrolling

    // Добавляем класс active для кнопки закрытия
    if (closeSidebarButton) {
      updateCloseButtonPosition();
      closeSidebarButton.classList.add("active");
    }
  }

  // Close sidebar
  function closeSidebar() {
    sidebarNav.classList.remove("active");
    sidebarOverlay.classList.remove("active");
    document.body.classList.remove("sidebar-active");
    document.body.style.overflow = ""; // Enable scrolling

    // Удаляем класс active для кнопки закрытия
    if (closeSidebarButton) {
      closeSidebarButton.classList.remove("active");
    }
  }

  // Handle menu item clicks
  function handleMenuItemClick(event) {
    const item = event.currentTarget;
    const section = item.dataset.section;

    // Handle different sections
    switch (section) {
      case "maintenance-request":
        window.location.href = "../request.html";
        break;
      case "event-request":
        window.location.href = "../events.html";
        break;
      case "maintenance-staff":
        window.location.href = "../tasks.html";
        break;
      case "inspections":
        window.location.href = "../Inspections-Checklist-Portal/";
        break;
    }
  }

  // Setup touch gestures for mobile
  function setupTouchGestures() {
    let touchStartX = 0;
    let touchEndX = 0;

    // Minimum distance required for swipe
    const minSwipeDistance = 50;

    // For opening the sidebar with swipe
    document.addEventListener(
      "touchstart",
      function (e) {
        touchStartX = e.changedTouches[0].screenX;
      },
      false
    );

    document.addEventListener(
      "touchend",
      function (e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      },
      false
    );

    // For closing the sidebar with swipe
    if (sidebarNav) {
      sidebarNav.addEventListener(
        "touchstart",
        function (e) {
          touchStartX = e.changedTouches[0].screenX;
        },
        false
      );

      sidebarNav.addEventListener(
        "touchend",
        function (e) {
          touchEndX = e.changedTouches[0].screenX;
          handleSidebarSwipe();
        },
        false
      );
    }

    // Handle swipe to open sidebar
    function handleSwipe() {
      if (touchEndX - touchStartX > minSwipeDistance && touchStartX < 50) {
        // Swipe right from left edge of screen
        openSidebar();
      }
    }

    // Handle swipe to close sidebar
    function handleSidebarSwipe() {
      if (touchStartX - touchEndX > minSwipeDistance) {
        // Swipe left on sidebar
        closeSidebar();
      }
    }
  }

  // Apply role-based access control to sidebar menu items
  function applyRoleBasedAccess() {
    const userRole = getUserRole();

    if (!userRole) {
      // User is not logged in, redirect to login
      window.location.href = "../loginUser.html";
      return;
    }

    // Show/hide elements based on role
    const maintenanceRequestElements = document.querySelectorAll(
      ".maintenance-request"
    );
    const eventRequestElements = document.querySelectorAll(".event-request");
    const maintenanceStaffElements =
      document.querySelectorAll(".maintenance-staff");
    const inspectionsElements = document.querySelectorAll(".inspections");

    // All users can see maintenance request
    maintenanceRequestElements.forEach((element) => {
      element.classList.remove("hidden-menu-item");
    });

    // All users can see event request
    eventRequestElements.forEach((element) => {
      element.classList.remove("hidden-menu-item");
    });

    // Only admin and support can see maintenance staff portal
    maintenanceStaffElements.forEach((element) => {
      if (userRole === "admin" || userRole === "support") {
        element.classList.remove("hidden-menu-item");
      } else {
        element.classList.add("hidden-menu-item");
      }
    });

    // Only admin can see inspections & checklist
    inspectionsElements.forEach((element) => {
      if (userRole === "admin") {
        element.classList.remove("hidden-menu-item");
      } else {
        element.classList.add("hidden-menu-item");
      }
    });
  }

  // Get user role from localStorage
  function getUserRole() {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    return user ? user.role : null;
  }
})();
