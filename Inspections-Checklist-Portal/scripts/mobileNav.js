export default class MobileNav {
  constructor() {
    this.sidebar = document.querySelector(".sidebar");
    this.overlay = document.querySelector(".sidebar-overlay");
    this.menuButton = document.querySelector(".mobile-menu-button");
    this.touchHint = document.querySelector(".touch-hint");
    this.isOpen = false;

    // Swipe tracking
    this.swipeStartX = 0;
    this.swipeEndX = 0;
    this.swipeStartY = 0;
    this.swipeEndY = 0;
    this.swipeThreshold = 50; // Minimum distance in pixels to be considered a swipe
    this.swipeAngleThreshold = 30; // Maximum angle in degrees to be considered horizontal
    this.swiping = false;

    // Bind methods to preserve context
    this.preventHorizontalScroll = this.preventHorizontalScroll.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

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
      item.addEventListener("click", () => {
        // Don't close menu for items with submenu
        if (!item.querySelector(".submenu-arrow")) {
          this.closeMenu();
        }
      });
    });

    // Handle window resize
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1024) {
        this.closeMenu();
      } else if (this.isOpen) {
        // Reposition button when resizing while open
        this.positionCloseButton();
      }
    });

    // Prevent clicks inside sidebar from closing the menu
    this.sidebar.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Close menu when clicking submenu items
    const submenuItems = this.sidebar.querySelectorAll(".submenu-item");
    submenuItems.forEach((item) => {
      item.addEventListener("click", () => this.closeMenu());
    });

    // Prevent horizontal scrolling
    this.sidebar.addEventListener("wheel", this.preventHorizontalScroll);
    this.sidebar.addEventListener("touchmove", this.preventHorizontalScroll, {
      passive: false,
    });

    // Prevent horizontal scrolling in submenus
    const submenus = document.querySelectorAll(".submenu");
    submenus.forEach((submenu) => {
      submenu.addEventListener("wheel", this.preventHorizontalScroll);
      submenu.addEventListener("touchmove", this.preventHorizontalScroll, {
        passive: false,
      });
    });

    // Add swipe gesture handlers
    this.setupSwipeGestures();

    // Hide swipe hint after first use
    if (localStorage.getItem("menuSwiped") === "true") {
      this.touchHint.style.display = "none";
    }
  }

  // Setup swipe gesture detection
  setupSwipeGestures() {
    // For opening menu by swiping from left edge
    document.addEventListener("touchstart", this.handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", this.handleTouchMove, {
      passive: true,
    });
    document.addEventListener("touchend", this.handleTouchEnd, {
      passive: true,
    });

    // For closing menu by swiping left
    this.sidebar.addEventListener("touchstart", this.handleTouchStart, {
      passive: true,
    });
    this.sidebar.addEventListener("touchmove", this.handleTouchMove, {
      passive: true,
    });
    this.sidebar.addEventListener("touchend", this.handleTouchEnd, {
      passive: true,
    });
  }

  // Handle touch start
  handleTouchStart(e) {
    if (!e.touches || e.touches.length !== 1) return;

    const touch = e.touches[0];
    this.swipeStartX = touch.clientX;
    this.swipeStartY = touch.clientY;
    this.swipeEndX = touch.clientX; // Initialize end position to start position
    this.swipeEndY = touch.clientY;
    this.swiping = true;

    // If this is a touch on the document (not sidebar), only consider touches near left edge
    if (
      e.target !== this.sidebar &&
      !this.sidebar.contains(e.target) &&
      !this.isOpen
    ) {
      // Only track swipes starting within 30px of left edge for opening menu
      if (this.swipeStartX > 30) {
        this.swiping = false;
      }
    }
  }

  // Handle touch move
  handleTouchMove(e) {
    if (!this.swiping || !e.touches || e.touches.length !== 1) return;

    const touch = e.touches[0];
    this.swipeEndX = touch.clientX;
    this.swipeEndY = touch.clientY;

    // Calculate horizontal distance
    const deltaX = this.swipeEndX - this.swipeStartX;
    const absDeltaX = Math.abs(deltaX);
    const deltaY = this.swipeEndY - this.swipeStartY;
    const absDeltaY = Math.abs(deltaY);

    // Only consider as swipe if horizontal movement is greater than vertical
    if (absDeltaY > absDeltaX * 1.5) {
      return; // This is more of a vertical scroll than a horizontal swipe
    }

    // If this is part of a menu-opening swipe, animate the sidebar following the finger
    if (
      !this.isOpen &&
      e.target !== this.sidebar &&
      !this.sidebar.contains(e.target)
    ) {
      const swipeDistance = deltaX;
      // Only animate if swiping right (positive distance)
      if (swipeDistance > 0 && swipeDistance <= this.sidebar.offsetWidth) {
        this.animateSidebarDrag(swipeDistance);
      }
    }
    // If this is part of a menu-closing swipe, animate the sidebar following the finger
    else if (this.isOpen) {
      const swipeDistance = -deltaX; // Invert for closing (negative deltaX means swipe left)
      // Only animate if swiping left (positive distance after inversion)
      if (swipeDistance > 0 && swipeDistance <= this.sidebar.offsetWidth) {
        this.animateSidebarDrag(this.sidebar.offsetWidth - swipeDistance);
      }
    }
  }

  // Animate sidebar during drag
  animateSidebarDrag(distance) {
    // Ensure distance is not negative
    distance = Math.max(0, Math.min(distance, this.sidebar.offsetWidth));

    // Calculate show percentage (0 to 1)
    const showPercentage = distance / this.sidebar.offsetWidth;

    // Set transform with calculated distance
    this.sidebar.style.transform = `translateX(${
      -this.sidebar.offsetWidth + distance
    }px)`;
    this.sidebar.style.transition = "none";
    this.sidebar.style.visibility = "visible";

    // Show overlay with opacity based on swipe distance
    const opacity = showPercentage * 0.5; // Max opacity is 0.5
    this.overlay.style.display = "block";
    this.overlay.style.opacity = opacity;

    // Move button with sidebar
    if (distance > 50) {
      // Only move button if sufficient distance
      const buttonX = Math.max(15, distance - this.sidebar.offsetWidth + 8);
      this.menuButton.style.left = `${buttonX}px`;

      if (showPercentage > 0.7) {
        // Change to close icon when mostly open
        this.menuButton.innerHTML = '<i class="fas fa-times"></i>';
        this.menuButton.classList.add("menu-open");
      } else {
        this.menuButton.innerHTML = '<i class="fas fa-bars"></i>';
        this.menuButton.classList.remove("menu-open");
      }
    }
  }

  // Handle touch end
  handleTouchEnd(e) {
    if (!this.swiping) return;

    // Calculate distance and angle
    const deltaX = this.swipeEndX - this.swipeStartX;
    const deltaY = this.swipeEndY - this.swipeStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.abs((Math.atan2(deltaY, deltaX) * 180) / Math.PI);

    // Check if this is a valid horizontal swipe
    const isHorizontalSwipe =
      angle <= this.swipeAngleThreshold ||
      angle >= 180 - this.swipeAngleThreshold;

    // If user did a swipe, hide the hint for future visits
    if (isHorizontalSwipe && distance >= this.swipeThreshold) {
      localStorage.setItem("menuSwiped", "true");
      this.touchHint.style.display = "none";
    }

    // Calculate how far the menu is open (as a percentage)
    const currentPosition =
      this.sidebar.getBoundingClientRect().left + this.sidebar.offsetWidth;
    const openPercentage = currentPosition / this.sidebar.offsetWidth;

    if (isHorizontalSwipe && distance >= this.swipeThreshold) {
      // Open menu on right swipe from left edge
      if (deltaX > 0 && !this.isOpen) {
        this.openMenu();
      }
      // Close menu on left swipe when menu is open
      else if (deltaX < 0 && this.isOpen) {
        this.closeMenu();
      }
    } else if (openPercentage > 0.5) {
      // If menu is more than 50% open, complete the opening
      this.openMenu();
    } else {
      // Otherwise, close it
      this.closeMenu();
    }

    this.swiping = false;
  }

  // Reset sidebar position after incomplete swipe
  resetSidebarPosition() {
    this.sidebar.style.transform = this.isOpen
      ? "translateX(0)"
      : "translateX(-100%)";
    this.sidebar.style.transition = "transform 0.3s ease";

    // Reset overlay
    if (!this.isOpen) {
      this.overlay.style.display = "none";
      this.overlay.style.opacity = 0;
    } else {
      this.overlay.style.display = "block";
      this.overlay.style.opacity = 0.5;
    }
  }

  // Helper to prevent horizontal scrolling
  preventHorizontalScroll(e) {
    // Store last touch globally instead of on this
    if (e.type === "touchmove" && e.touches && e.touches[0]) {
      const touch = e.touches[0];
      if (MobileNav.lastTouch) {
        const deltaX = Math.abs(touch.clientX - MobileNav.lastTouch.clientX);
        const deltaY = Math.abs(touch.clientY - MobileNav.lastTouch.clientY);

        // If horizontal movement is greater than vertical, prevent it
        if (deltaX > deltaY) {
          e.preventDefault();
        }
      }
      MobileNav.lastTouch = { clientX: touch.clientX, clientY: touch.clientY };
    }
    // For wheel events, prevent horizontal scrolling
    else if (e.deltaX && Math.abs(e.deltaX) > Math.abs(e.deltaY || 0)) {
      e.preventDefault();
    }
  }

  positionCloseButton() {
    if (this.isOpen) {
      // Position button to right of sidebar
      const sidebarWidth = this.sidebar.offsetWidth;
      this.menuButton.style.left = `${sidebarWidth + 8}px`;
      this.menuButton.classList.add("menu-open");
    } else {
      // Reset to original position
      this.menuButton.style.left = "15px";
      this.menuButton.classList.remove("menu-open");
    }
  }

  toggleMenu() {
    if (this.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    this.isOpen = true;

    // Update sidebar
    this.sidebar.classList.add("active");
    this.sidebar.style.transform = "translateX(0)";
    this.sidebar.style.transition = "transform 0.3s ease";
    this.sidebar.style.visibility = "visible";

    // Update overlay
    this.overlay.classList.add("active");
    this.overlay.style.display = "block";
    this.overlay.style.opacity = "0.5";

    // Update button icon
    this.menuButton.innerHTML = '<i class="fas fa-times"></i>';

    // Position the button
    this.positionCloseButton();

    // Hide touch hint once menu is opened
    if (this.touchHint) {
      this.touchHint.style.display = "none";
      localStorage.setItem("menuSwiped", "true");
    }
  }

  closeMenu() {
    this.isOpen = false;

    // Update sidebar
    this.sidebar.classList.remove("active");
    this.sidebar.style.transform = "translateX(-100%)";
    this.sidebar.style.transition = "transform 0.3s ease";

    // Update overlay
    this.overlay.classList.remove("active");
    this.overlay.style.opacity = "0";

    // Update button icon
    this.menuButton.innerHTML = '<i class="fas fa-bars"></i>';

    // Reset button position and class
    this.menuButton.style.left = "15px";
    this.menuButton.classList.remove("menu-open");

    // Ensure sidebar is hidden after animation
    setTimeout(() => {
      if (!this.isOpen) {
        this.sidebar.style.visibility = "hidden";
        this.overlay.style.display = "none";
      }
    }, 300);
  }
}
