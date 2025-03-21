export default class MobileNav {
  constructor() {
    this.sidebar = document.querySelector(".sidebar");
    this.overlay = document.querySelector(".sidebar-overlay");
    this.menuButton = document.querySelector(".mobile-menu-button");
    this.isOpen = false;

    this.init();
  }

  init() {
    // Add event listeners
    this.menuButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });

    this.overlay.addEventListener("click", () => this.closeMenu());

    // Close menu when clicking on a nav item
    const navItems = this.sidebar.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", () => this.closeMenu());
    });

    // Handle window resize
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1024) {
        this.closeMenu();
      }
    });

    // Prevent clicks inside sidebar from closing the menu
    this.sidebar.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  toggleMenu() {
    this.isOpen = !this.isOpen;

    // Update sidebar
    this.sidebar.classList.toggle("active", this.isOpen);

    // Update overlay
    this.overlay.classList.toggle("active", this.isOpen);

    // Update button icon
    this.menuButton.innerHTML = this.isOpen
      ? '<i class="fas fa-times"></i>'
      : '<i class="fas fa-bars"></i>';

    // Prevent body scroll when menu is open
    document.body.style.overflow = this.isOpen ? "hidden" : "";
  }

  closeMenu() {
    this.isOpen = false;
    this.sidebar.classList.remove("active");
    this.overlay.classList.remove("active");
    this.menuButton.innerHTML = '<i class="fas fa-bars"></i>';
    document.body.style.overflow = "";
  }
}
