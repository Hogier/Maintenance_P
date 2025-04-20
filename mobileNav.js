class MobileNav {
  constructor() {
    this.isOpen = false;
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.touchMoveX = 0;
    this.swipeThreshold = 100;
    this.touchStartTime = 0;
    this.touchEndTime = 0;
    this.touchTimeThreshold = 300;
    this.isDragging = false;

    // DOM Elements
    this.sidebar = document.querySelector(".sidebar-navigation");
    this.overlay = document.querySelector(".sidebar-overlay");
    this.menuButton = document.querySelector(".mobile-menu-button");
    this.touchHint = document.querySelector(".touch-hint");

    // Sidebar width for calculations
    this.sidebarWidth = 220; // Should match width from CSS

    this.init();
  }

  init() {
    // Menu button click event
    this.menuButton.addEventListener("click", () => {
      this.toggleMenu();
    });

    // Overlay click event to close menu
    this.overlay.addEventListener("click", () => {
      this.closeMenu();
    });

    // Handle touch events for swipe gestures
    this.setupSwipeGestures();

    // Hide touch hint if user has interacted with menu before
    if (localStorage.getItem("menuSwiped") === "true") {
      this.touchHint.style.display = "none";
    }
  }

  setupSwipeGestures() {
    // Touch start event
    document.addEventListener(
      "touchstart",
      (e) => {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartTime = new Date().getTime();
        this.isDragging = true;
      },
      { passive: true }
    );

    // Touch move event for smooth animation
    document.addEventListener(
      "touchmove",
      (e) => {
        if (this.isDragging) {
          this.touchMoveX = e.changedTouches[0].screenX;
          this.handleTouchMove();
        }
      },
      { passive: true }
    );

    // Touch end event
    document.addEventListener(
      "touchend",
      (e) => {
        this.touchEndX = e.changedTouches[0].screenX;
        this.touchEndTime = new Date().getTime();
        this.isDragging = false;
        this.handleSwipe();
      },
      { passive: true }
    );
  }

  handleTouchMove() {
    // Calculate distance from start of touch
    const touchDistance = this.touchMoveX - this.touchStartX;

    // Only respond to horizontal drags
    if (Math.abs(touchDistance) > 10) {
      if (!this.isOpen && touchDistance > 0) {
        // Opening drag (right swipe from edge)
        // Convert distance to a percentage of sidebar width for smoother animation
        const openPercentage = Math.min(touchDistance / this.sidebarWidth, 1);
        this.animateSidebarDrag(openPercentage * this.sidebarWidth);
      } else if (this.isOpen && touchDistance < 0) {
        // Closing drag (left swipe when menu is open)
        // Calculate distance from right edge of sidebar
        const fromRightEdge = this.touchStartX - this.touchMoveX;
        const closePercentage = Math.min(fromRightEdge / this.sidebarWidth, 1);
        const remainingWidth =
          this.sidebarWidth - closePercentage * this.sidebarWidth;
        this.animateSidebarDrag(remainingWidth);
      }
    }
  }

  animateSidebarDrag(distance) {
    // Ensure distance is within bounds
    distance = Math.max(0, Math.min(distance, this.sidebarWidth));

    // Calculate show percentage (0 to 1)
    const showPercentage = distance / this.sidebarWidth;

    // Set transform with calculated distance and make visible during drag
    if (showPercentage > 0) {
      this.sidebar.style.transform = `translateX(${
        -this.sidebarWidth + distance
      }px)`;
      this.sidebar.style.transition = "none"; // No transition during drag for immediate response
      this.sidebar.style.visibility = "visible";
    } else {
      this.sidebar.style.transform = "translateX(-100%)";
    }

    // Adjust overlay opacity based on drag distance
    const opacity = showPercentage * 0.5; // Max opacity is 0.5
    this.overlay.style.display = "block";
    this.overlay.style.opacity = opacity.toString();

    // Move button with sidebar (like in Inspections-Checklist-Portal)
    if (showPercentage > 0.5) {
      // Start moving the button when sidebar is halfway open
      const buttonX = Math.max(
        15,
        (showPercentage - 0.5) * 2 * this.sidebarWidth + 15
      );
      this.menuButton.style.left = `${buttonX}px`;

      // Change to close icon when mostly open
      if (showPercentage > 0.7) {
        this.menuButton.innerHTML = '<i class="fas fa-times"></i>';
        this.menuButton.classList.add("menu-open");
      } else {
        this.menuButton.innerHTML = '<i class="fas fa-bars"></i>';
        this.menuButton.classList.remove("menu-open");
      }
    } else {
      // Reset button to original position
      this.menuButton.style.left = "15px";
      this.menuButton.classList.remove("menu-open");
      this.menuButton.innerHTML = '<i class="fas fa-bars"></i>';
    }
  }

  handleSwipe() {
    // Calculate time and distance of swipe
    const timeDiff = this.touchEndTime - this.touchStartTime;
    const distance = this.touchEndX - this.touchStartX;

    // Check if the swipe was fast (for immediate action regardless of distance)
    const isFastSwipe = timeDiff < this.touchTimeThreshold;

    // Distance as percentage of sidebar width
    const distancePercentage = Math.abs(distance) / this.sidebarWidth;

    if (!this.isOpen) {
      // Opening: Right swipe or drag more than 50% of sidebar width
      if (
        (isFastSwipe && distance > this.swipeThreshold) ||
        distancePercentage > 0.5
      ) {
        this.openMenu();
        // Mark that user has interacted with menu
        localStorage.setItem("menuSwiped", "true");
        if (this.touchHint) {
          this.touchHint.style.display = "none";
        }
      } else {
        // Reset sidebar position with animation
        this.sidebar.style.transform = "translateX(-100%)";
        this.sidebar.style.transition = "transform 0.3s ease";
        this.overlay.style.opacity = "0";

        // Reset after animation
        setTimeout(() => {
          if (!this.isOpen) {
            this.sidebar.style.visibility = "hidden";
            this.overlay.style.display = "none";
          }
        }, 300);
      }
    } else {
      // Closing: Left swipe or drag less than 50% of sidebar width
      if (
        (isFastSwipe && distance < -this.swipeThreshold) ||
        distancePercentage > 0.5
      ) {
        this.closeMenu();
      } else {
        // Reset to fully open with animation
        this.sidebar.style.transform = "translateX(0)";
        this.sidebar.style.transition = "transform 0.3s ease";
        this.overlay.style.opacity = "0.5";
      }
    }
  }

  toggleMenu() {
    if (this.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
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

    // Prevent body scrolling when menu is open
    document.body.style.overflow = "hidden";
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

    // Allow body scrolling again
    document.body.style.overflow = "";
  }
}

// Initialize mobile navigation when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize mobile navigation only on small screens
  if (window.innerWidth <= 768) {
    const mobileNav = new MobileNav();
  }

  // Handle resize events to initialize/reset mobile nav
  window.addEventListener("resize", () => {
    if (window.innerWidth <= 768 && !window.mobileNav) {
      window.mobileNav = new MobileNav();
    } else if (window.innerWidth > 768 && window.mobileNav) {
      // Reset any mobile-specific states when moving to desktop
      document.querySelector(".sidebar-navigation").classList.remove("active");
      document.querySelector(".sidebar-overlay").classList.remove("active");
      document
        .querySelector(".mobile-menu-button")
        .classList.remove("menu-open");
      document.body.style.overflow = "";

      // Set to null so we can re-initialize if we resize down again
      window.mobileNav = null;
    }
  });

  // Initialize sidebar menu items click behavior for mobile
  const sidebarItems = document.querySelectorAll(".sidebar-menu-item");

  sidebarItems.forEach((item) => {
    item.addEventListener("click", function () {
      // Close sidebar on mobile after selecting an item
      if (window.innerWidth <= 768 && window.mobileNav) {
        window.mobileNav.closeMenu();
      }
    });
  });
});
