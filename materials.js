// Function to get user ID from the data-user-id attribute on the body element
function getUserIdFromSession() {
  return document.body.dataset.userId || null;
}

// Module for working with materials

// Initialize materials module
function initMaterialsModule() {
  // Make sure user ID is set if available in localStorage
  initUserDataFromLocalStorage();

  // Update the UI in the menu to use Supplies instead of Materials
  updateMenuStyles();

  // Устанавливаем обработчики для скрытия/отображения панели статистики
  setupTaskStatsVisibility();

  // Установка начального состояния элементов фильтра и сортировки
  setupFilterSortVisibility();

  // Проверяем, какой раздел активен и скрываем/отображаем статистику соответственно
  const activeMenuItem = document.querySelector(".nav-item.active");
  if (
    activeMenuItem &&
    activeMenuItem.getAttribute("data-page") === "materials"
  ) {
    // Если активен раздел Supplies, скрываем статистику
    hideTaskStatistics();
    // И скрываем элементы фильтра и сортировки
    hideFilterSortElements();
  } else {
    // Иначе показываем статистику
    showTaskStatistics();
    // И показываем элементы фильтра и сортировки
    showFilterSortElements();
  }

  // Check if we have a materials grid on the page
  const materialsGrid = document.getElementById("materialsGrid");
  if (materialsGrid) {
    console.log("Materials grid found, loading materials data");

    // If there's a static grid already but we're in the dynamic app,
    // clear it and load dynamic content
    const appContainer = document.querySelector(".main-content");
    if (appContainer) {
      // We're in the app, load dynamic content
      loadMaterialsContent();
    } else {
      // We're on a static page, just initialize the existing grid
      initMaterialHandlers();
    }
  }

  // Load necessary data when "Materials" tab is activated
  document.addEventListener("click", function (e) {
    const materialsMenuItem = e.target.closest(
      '.nav-item[data-page="materials"]'
    );

    if (materialsMenuItem) {
      // Скрываем панель статистики при клике на пункт меню Supplies
      hideTaskStatistics();

      // Скрываем элементы фильтра и сортировки при переходе на страницу Supplies
      hideFilterSortElements();

      // If the click was on the mini cart button, open the cart modal without loading materials
      const cartButtonMini = e.target.closest("#cartButtonMini");

      if (cartButtonMini) {
        e.stopPropagation(); // Stop event propagation
        openCartModal();
      } else {
        // Otherwise load the materials page
        loadMaterialsContent();
      }
    }

    // Если кликнули на пункт Tasks, показываем элементы фильтра и сортировки
    const tasksMenuItem = e.target.closest('.nav-item[data-page="tasks"]');

    if (tasksMenuItem) {
      // Показываем элементы фильтра и сортировки при переходе на страницу Tasks
      showFilterSortElements();
    }
  });

  // Initialize the cart modal
  initCartModal();

  // Initialize the cart
  initCart();

  // Update cart counter in the menu too
  updateCartBadge();
  updateCartBadgeMini();
}

// Initialize user data from localStorage if needed
function initUserDataFromLocalStorage() {
  // If user ID is not set in the DOM but exists in localStorage, set it
  if (!document.body.dataset.userId) {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (currentUser && currentUser.id) {
      document.body.dataset.userId = currentUser.id;
      console.log("Set user ID from localStorage:", currentUser.id);
    }
  }
}

// Initialize event handlers for static material HTML
function initMaterialHandlers() {
  // Attach event handlers to quantity controls
  const quantityControls = document.querySelectorAll(".quantity-control");
  quantityControls.forEach((control) => {
    const decreaseBtn = control.querySelector(".decrease");
    const increaseBtn = control.querySelector(".increase");
    const input = control.querySelector(".quantity-input");

    decreaseBtn.addEventListener("click", () => {
      const currentValue = parseInt(input.value) || 0;
      if (currentValue > 0) {
        input.value = currentValue - 1;
      }
    });

    increaseBtn.addEventListener("click", () => {
      const currentValue = parseInt(input.value) || 0;
      input.value = currentValue + 1;
    });
  });

  // Attach event handlers to add to cart buttons
  const addButtons = document.querySelectorAll(".add-to-cart-btn");
  addButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const materialId = button.getAttribute("data-id");
      const materialName = button.getAttribute("data-name");
      const materialUnit = button.getAttribute("data-unit");
      const control = button
        .closest(".material-item")
        .querySelector(".quantity-control");
      const quantityInput = control.querySelector(".quantity-input");
      const quantity = parseInt(quantityInput.value) || 0;

      if (quantity > 0) {
        addToCart(materialId, materialName, materialUnit, quantity);
        quantityInput.value = 0; // Reset quantity after adding to cart
        showNotification(
          `Added ${quantity} ${materialUnit} of ${materialName} to cart`,
          "success"
        );
      } else {
        showNotification("Please select a quantity greater than 0", "info");
      }
    });
  });

  // Attach event handlers to add material buttons
  const addMaterialButtons = document.querySelectorAll(".add-material-btn");
  addMaterialButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.getAttribute("data-category");
      openAddMaterialModal(category);
    });
  });

  // Event listeners for editing and deleting materials
  document.addEventListener("click", function (e) {
    // Edit material button
    if (e.target.closest(".edit-material-btn")) {
      const button = e.target.closest(".edit-material-btn");
      const materialId = button.getAttribute("data-id");
      const materialName = button.getAttribute("data-name");
      const materialDescription = button.getAttribute("data-description");
      const materialUnit = button.getAttribute("data-unit");
      const materialCategory = button.getAttribute("data-category");

      openEditMaterialModal(
        materialId,
        materialName,
        materialDescription,
        materialUnit,
        materialCategory
      );
    }

    // Delete material button
    if (e.target.closest(".delete-material-btn")) {
      const button = e.target.closest(".delete-material-btn");
      const materialId = button.getAttribute("data-id");
      const materialName = button.getAttribute("data-name");

      confirmDeleteMaterial(materialId, materialName);
    }
  });
}

// Load materials section content
function loadMaterialsContent() {
  // Get the main content container
  const mainContent = document.querySelector(".main-content main");
  if (!mainContent) return;

  // Display loading indicator
  mainContent.innerHTML =
    '<div class="loading-indicator">Loading materials...</div>';

  // Определим, должен ли список быть свернут (по умолчанию - да)
  const isCollapsed = localStorage.getItem("ordersListCollapsed") !== "false";
  const toggleIconClass = isCollapsed ? "fa-chevron-down" : "fa-chevron-up";
  const toggleText = isCollapsed ? "Expand" : "Collapse";

  // Create page structure with materials
  const materialsHTML = `
        <div class="materials-content">
            <div class="materials-header">
                <h2>Supplies</h2>
                
                <div class="materials-actions">
                    <div class="filter-group">
                        <label for="materialCategory">Category:</label>
                        <select id="materialCategory">
                            <option value="">All categories</option>
                            <option value="cleaning">Cleaning supplies</option>
                            <option value="paper">Paper products</option>
                            <option value="kitchen">Kitchen items</option>
                            <option value="laundry">Laundry products</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="search-group">
                        <input type="text" id="materialSearch" placeholder="Search materials...">
                        <div id="searchResults" class="search-results"></div>
                    </div>
                    
                    <div class="cart-button" id="openCartBtn">
                        <i class="fas fa-shopping-cart"></i>
                        <span class="cart-badge" id="cartBadge">0</span>
                    </div>
                </div>
            </div>
            
            <div class="materials-grid" id="materialsGrid"></div>
            
            <div class="user-orders" id="userOrdersContainer">
                <div class="user-orders-header">
                    <h3>Your previous orders</h3>
                    <div class="orders-sorting">
                        <select id="orderSortBy" class="order-sort-select">
                            <option value="date_desc">Newest first</option>
                            <option value="date_asc">Oldest first</option>
                            <option value="status">Sort by status</option>
                        </select>
                    </div>
                    <button type="button" class="toggle-orders-btn" id="toggleOrdersBtn">
                        <i class="fas ${toggleIconClass}" id="toggleOrdersIcon"></i>
                        <span id="toggleOrdersText">${toggleText}</span>
                    </button>
                </div>
                <div class="orders-list${
                  isCollapsed ? " collapsed" : ""
                }" id="ordersList"></div>
            </div>
        </div>
    `;

  // Display materials section content
  mainContent.innerHTML = materialsHTML;

  // Initialize event handlers
  initMaterialsEvents();

  // Load materials list
  loadMaterials();

  // Load user's previous orders
  loadUserOrders();

  // Update cart counter
  updateCartBadge();

  // Initialize toggle for orders list
  initOrdersToggle();

  // Скрываем панель статистики
  hideTaskStatistics();
}

// Initialize orders toggle functionality
function initOrdersToggle() {
  const toggleBtn = document.getElementById("toggleOrdersBtn");
  const ordersList = document.getElementById("ordersList");
  const toggleIcon = document.getElementById("toggleOrdersIcon");
  const toggleText = document.getElementById("toggleOrdersText");

  if (!toggleBtn || !ordersList) return;

  // Set initial state - по умолчанию свернуто
  let isCollapsed = localStorage.getItem("ordersListCollapsed") !== "false"; // По умолчанию true

  // Применяем начальное состояние
  applyOrdersListState();

  // Добавим пульсацию для кнопки expand, если она не была нажата ранее
  if (isCollapsed && localStorage.getItem("expandButtonClicked") !== "true") {
    toggleBtn.classList.add("pulse-attention");

    // Удалим пульсацию после первого клика
    toggleBtn.addEventListener("click", removeButtonPulse, { once: true });
  }

  toggleBtn.addEventListener("click", function () {
    isCollapsed = !isCollapsed;

    // Сохраняем состояние в localStorage
    localStorage.setItem("ordersListCollapsed", isCollapsed);

    // Запоминаем, что кнопка была нажата
    localStorage.setItem("expandButtonClicked", "true");

    // Применяем новое состояние
    applyOrdersListState();
  });

  // Функция для удаления эффекта пульсации
  function removeButtonPulse() {
    toggleBtn.classList.remove("pulse-attention");
  }

  // Вспомогательная функция для применения состояния
  function applyOrdersListState() {
    if (isCollapsed) {
      // Свернуть список
      ordersList.classList.add("collapsed");
      toggleIcon.classList.remove("fa-chevron-up");
      toggleIcon.classList.add("fa-chevron-down");
      toggleText.textContent = "Expand";
      toggleBtn.classList.add("expanded"); // Добавляем класс для кнопки Expand
    } else {
      // Развернуть список
      ordersList.classList.remove("collapsed");
      toggleIcon.classList.remove("fa-chevron-down");
      toggleIcon.classList.add("fa-chevron-up");
      toggleText.textContent = "Collapse";
      toggleBtn.classList.remove("expanded"); // Удаляем класс для кнопки Expand
    }
  }
}

// Initialize event handlers for materials section
function initMaterialsEvents() {
  // Filter by category
  const categorySelect = document.getElementById("materialCategory");
  if (categorySelect) {
    categorySelect.addEventListener("change", function () {
      loadMaterials(this.value);
    });
  }

  // Search materials
  const searchInput = document.getElementById("materialSearch");
  const searchResults = document.getElementById("searchResults");

  if (searchInput && searchResults) {
    let debounceTimeout;

    searchInput.addEventListener("input", function () {
      clearTimeout(debounceTimeout);
      const query = this.value.trim();

      if (query === "") {
        searchResults.innerHTML = "";
        searchResults.style.display = "none";
        return;
      }

      debounceTimeout = setTimeout(() => {
        searchMaterials(query);
      }, 300);
    });

    // Close search results when clicking outside the input field
    document.addEventListener("click", function (e) {
      if (
        !searchInput.contains(e.target) &&
        !searchResults.contains(e.target)
      ) {
        searchResults.innerHTML = "";
        searchResults.style.display = "none";
      }
    });
  }

  // Open cart modal
  const openCartBtn = document.getElementById("openCartBtn");
  if (openCartBtn) {
    openCartBtn.addEventListener("click", function () {
      openCartModal();
    });
  }
}

// Load materials list
function loadMaterials(category = "") {
  const materialsGrid = document.getElementById("materialsGrid");
  if (!materialsGrid) return;

  materialsGrid.innerHTML = '<div class="loading-indicator">Loading...</div>';

  // Convert to lowercase to handle case inconsistencies
  const normalizedCategory = category ? category.toLowerCase() : "";

  console.log("Loading materials for category:", normalizedCategory || "all");

  const formData = new FormData();
  formData.append("materials_action", "getAllMaterials");
  if (normalizedCategory) {
    formData.append("category", normalizedCategory);
  }

  fetch("materials.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        // Special case for "other" category when it might be empty
        if (
          normalizedCategory === "other" &&
          (!data.data || data.data.length === 0)
        ) {
          console.log(
            "No materials found for 'other' category, showing empty category card"
          );
          // Create an empty card for the "other" category
          materialsGrid.innerHTML = generateCategoryCardHTML(
            "other",
            "Other",
            []
          );

          // Add event listeners for the Add Material button
          const addMaterialButtons =
            materialsGrid.querySelectorAll(".add-material-btn");
          addMaterialButtons.forEach((button) => {
            button.addEventListener("click", () => {
              const category = button.getAttribute("data-category");
              openAddMaterialModal(category);
            });
          });
        } else {
          displayMaterials(data.data);
        }
      } else {
        console.error("Error loading materials:", data.message);
        materialsGrid.innerHTML = `<div class="error-message">${
          data.message || "Error loading materials"
        }</div>`;
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      materialsGrid.innerHTML =
        '<div class="error-message">Error loading materials. Please try again later.</div>';
    });
}

// Display materials list
function displayMaterials(materials) {
  const materialsGrid = document.getElementById("materialsGrid");
  if (!materialsGrid) return;

  // Check if we're filtering by category
  const categorySelect = document.getElementById("materialCategory");
  const currentCategory = categorySelect ? categorySelect.value : "";

  console.log("Displaying materials for category:", currentCategory || "all");
  console.log("Materials data:", materials);

  if (materials.length === 0) {
    // If we have a selected category but no materials, show appropriate message
    if (currentCategory) {
      materialsGrid.innerHTML = `<div class="no-materials">No materials found in the "${getCategoryName(
        currentCategory
      )}" category. <br>
        Click on the "+" button in any category card to add new materials.</div>`;
    } else {
      materialsGrid.innerHTML =
        '<div class="no-materials">No materials found</div>';
    }
    return;
  }

  // Group materials by category
  const materialsByCategory = {};

  materials.forEach((material) => {
    // Ensure category is a valid string
    if (!material.category || typeof material.category !== "string") {
      console.warn("Material with invalid category found:", material);
      material.category = "other"; // Default to 'other' if category is invalid
    }

    // Convert to lowercase to handle case inconsistencies
    const normalizedCategory = material.category.toLowerCase();

    if (!materialsByCategory[normalizedCategory]) {
      materialsByCategory[normalizedCategory] = [];
    }
    materialsByCategory[normalizedCategory].push(material);
  });

  console.log("Materials by category:", materialsByCategory);

  let html = "";

  // If filtering by specific category, only show that category
  if (currentCategory) {
    // Convert to lowercase to handle case inconsistencies
    const normalizedCategory = currentCategory.toLowerCase();

    // If the category exists in the materials data
    if (materialsByCategory[normalizedCategory]) {
      const categoryName = getCategoryName(normalizedCategory);

      html += generateCategoryCardHTML(
        normalizedCategory,
        categoryName,
        materialsByCategory[normalizedCategory]
      );
    } else {
      // Show empty category message
      const categoryName = getCategoryName(normalizedCategory);

      html += `
        <div class="material-category-card" data-category="${normalizedCategory}">
          <div class="category-header">
            <h3>${categoryName}</h3>
            <div class="category-header-actions">
              <span class="category-label">${getCategoryLabel(
                normalizedCategory
              )}</span>
              <button type="button" class="add-material-btn" data-category="${normalizedCategory}" title="Add new material to this category">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>
          <div class="category-items">
            <div class="empty-category-message">
              There are no materials in this category yet. Click the "+" button to add a new material.
            </div>
          </div>
        </div>
      `;
    }
  } else {
    // Show all categories
    // Create a card for each category that has materials
    for (const [category, categoryMaterials] of Object.entries(
      materialsByCategory
    )) {
      const categoryName = getCategoryName(category);

      html += generateCategoryCardHTML(
        category,
        categoryName,
        categoryMaterials
      );
    }

    // Add missing categories that should always be shown
    const standardCategories = [
      "cleaning",
      "paper",
      "kitchen",
      "laundry",
      "other",
    ];

    standardCategories.forEach((category) => {
      if (!materialsByCategory[category]) {
        const categoryName = getCategoryName(category);

        html += `
          <div class="material-category-card" data-category="${category}">
            <div class="category-header">
              <h3>${categoryName}</h3>
              <div class="category-header-actions">
                <span class="category-label">${getCategoryLabel(
                  category
                )}</span>
                <button type="button" class="add-material-btn" data-category="${category}" title="Add new material to this category">
                  <i class="fas fa-plus"></i>
                </button>
              </div>
            </div>
            <div class="category-items">
              <div class="empty-category-message">
                There are no materials in this category yet. Click the "+" button to add a new material.
              </div>
            </div>
          </div>
        `;
      }
    });
  }

  materialsGrid.innerHTML = html;
  console.log("Grid updated with materials");

  // Add event listeners for quantity controls
  const quantityControls = materialsGrid.querySelectorAll(".quantity-control");
  quantityControls.forEach((control) => {
    const decreaseBtn = control.querySelector(".decrease");
    const increaseBtn = control.querySelector(".increase");
    const input = control.querySelector(".quantity-input");
    const materialId = control.getAttribute("data-id");

    decreaseBtn.addEventListener("click", () => {
      const currentValue = parseInt(input.value) || 0;
      if (currentValue > 0) {
        input.value = currentValue - 1;
      }
    });

    increaseBtn.addEventListener("click", () => {
      const currentValue = parseInt(input.value) || 0;
      input.value = currentValue + 1;
    });
  });

  // Add event listeners for Add to Cart buttons
  const addButtons = materialsGrid.querySelectorAll(".add-to-cart-btn");
  addButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const materialId = button.getAttribute("data-id");
      const materialName = button.getAttribute("data-name");
      const materialUnit = button.getAttribute("data-unit");
      const control = button
        .closest(".material-item")
        .querySelector(".quantity-control");
      const quantityInput = control.querySelector(".quantity-input");
      const quantity = parseInt(quantityInput.value) || 0;

      if (quantity > 0) {
        addToCart(materialId, materialName, materialUnit, quantity);
        quantityInput.value = 0; // Reset quantity after adding to cart
        showNotification(
          `Added ${quantity} ${materialUnit} of ${materialName} to cart`,
          "success"
        );
      } else {
        showNotification("Please select a quantity greater than 0", "info");
      }
    });
  });

  // Add event listeners for Edit Material buttons
  const editButtons = materialsGrid.querySelectorAll(".edit-material-btn");
  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const materialId = button.getAttribute("data-id");
      const materialName = button.getAttribute("data-name");
      const materialDescription = button.getAttribute("data-description");
      const materialUnit = button.getAttribute("data-unit");
      const materialCategory = button.getAttribute("data-category");

      openEditMaterialModal(
        materialId,
        materialName,
        materialDescription,
        materialUnit,
        materialCategory
      );
    });
  });

  // Add event listeners for Delete Material buttons
  const deleteButtons = materialsGrid.querySelectorAll(".delete-material-btn");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const materialId = button.getAttribute("data-id");
      const materialName = button.getAttribute("data-name");

      confirmDeleteMaterial(materialId, materialName);
    });
  });

  // Add event listeners for Add Material buttons in category headers
  const addMaterialButtons =
    materialsGrid.querySelectorAll(".add-material-btn");
  addMaterialButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.getAttribute("data-category");
      openAddMaterialModal(category);
    });
  });
}

// Helper function to generate category card HTML
function generateCategoryCardHTML(category, categoryName, materials) {
  let html = `
    <div class="material-category-card" data-category="${category}">
      <div class="category-header">
        <h3>${categoryName}</h3>
        <div class="category-header-actions">
          <span class="category-label">${getCategoryLabel(category)}</span>
          <button type="button" class="add-material-btn" data-category="${category}" title="Add new material to this category">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
      <div class="category-items">
  `;

  // Add each material in the category, or show empty message if none
  if (!materials || materials.length === 0) {
    html += `
      <div class="empty-category-message">
        There are no materials in this category yet. Click the "+" button to add a new material.
      </div>
    `;
  } else {
    // Add each material in the category
    materials.forEach((material) => {
      html += `
        <div class="material-item" data-id="${material.id}">
          <div class="material-item-details">
            <div class="material-item-name">${material.name}</div>
            <div class="material-item-description">${
              material.description || ""
            }</div>
          </div>
          <div class="material-item-unit">Unit: ${material.unit}</div>
          <div class="material-item-actions">
            <div class="quantity-control" data-id="${material.id}">
              <button type="button" class="quantity-btn decrease" aria-label="Decrease quantity">-</button>
              <input type="number" class="quantity-input" value="0" min="0" max="99">
              <button type="button" class="quantity-btn increase" aria-label="Increase quantity">+</button>
            </div>
            <div class="btn-group">
              <button type="button" class="add-to-cart-btn" data-id="${
                material.id
              }" 
                data-name="${material.name}" data-unit="${material.unit}">
                Add to Cart
              </button>
              <button type="button" class="edit-material-btn" data-id="${
                material.id
              }" 
                data-name="${material.name}" 
                data-description="${material.description || ""}" 
                data-unit="${material.unit}" 
                data-category="${material.category}"
                title="Edit material">
                <i class="fas fa-edit"></i>
              </button>
              <button type="button" class="delete-material-btn" data-id="${
                material.id
              }" 
                data-name="${material.name}" title="Delete material">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    });
  }

  html += `
      </div>
    </div>
  `;

  return html;
}

// Helper function to get the label for categories
function getCategoryLabel(category) {
  switch (category) {
    case "cleaning":
      return "Cleaning supplies";
    case "paper":
      return "Paper products";
    case "kitchen":
      return "Kitchen items";
    case "laundry":
      return "Laundry products";
    default:
      return "Other supplies";
  }
}

// Search materials
function searchMaterials(query) {
  const searchResults = document.getElementById("searchResults");
  if (!searchResults) return;

  const formData = new FormData();
  formData.append("materials_action", "searchMaterials");
  formData.append("query", query);

  fetch("materials.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        displaySearchResults(data.data);
      } else {
        searchResults.innerHTML = `<div class="empty-results">No matches found</div>`;
        searchResults.style.display = "block";
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      searchResults.innerHTML = `<div class="empty-results">Error searching</div>`;
      searchResults.style.display = "block";
    });
}

// Display search results
function displaySearchResults(materials) {
  const searchResults = document.getElementById("searchResults");
  if (!searchResults) return;

  if (materials.length === 0) {
    searchResults.innerHTML = `<div class="empty-results">No matches found</div>`;
    searchResults.style.display = "block";
    return;
  }

  let html = "";

  materials.forEach((material) => {
    html += `
            <div class="search-result-item" data-id="${material.id}">
                <div class="search-result-info">
                    <div class="search-result-name">${material.name}</div>
                    <div class="search-result-category">${getCategoryName(
                      material.category
                    )}</div>
                    <div class="search-result-unit">Unit: ${material.unit}</div>
                </div>
                <div class="search-result-actions">
                    <div class="search-quantity-control">
                        <button class="search-quantity-btn search-decrease" aria-label="Decrease quantity">-</button>
                        <input type="number" class="search-quantity-input" value="1" min="1" max="99">
                        <button class="search-quantity-btn search-increase" aria-label="Increase quantity">+</button>
                    </div>
                    <button class="search-result-add" data-id="${
                      material.id
                    }" data-name="${material.name}" data-unit="${
      material.unit
    }">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
  });

  searchResults.innerHTML = html;
  searchResults.style.display = "block";

  // Add event handlers for search results
  searchResults.querySelectorAll(".search-result-item").forEach((item) => {
    const materialId = item.dataset.id;

    // Обработка клика по элементу (исключаем клики по элементам управления количеством и кнопке добавления)
    item.addEventListener("click", function (e) {
      // Проверяем, что клик не на элементах управления или на кнопке добавления
      if (
        !e.target.closest(".search-quantity-control") &&
        !e.target.closest(".search-result-add")
      ) {
        // Scroll to the material card in the grid
        const materialCard = document.querySelector(
          `.material-item .add-to-cart-btn[data-id="${materialId}"]`
        );

        if (materialCard) {
          const card = materialCard.closest(".material-item");
          if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            card.classList.add("highlight");
            setTimeout(() => {
              card.classList.remove("highlight");
            }, 2000);
          }
        }

        // Clear search results
        searchResults.innerHTML = "";
        searchResults.style.display = "none";
      }
    });
  });

  // Обработчики кнопок количества
  searchResults.querySelectorAll(".search-quantity-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation(); // Предотвращаем всплытие события клика

      const container = this.closest(".search-quantity-control");
      const input = container.querySelector(".search-quantity-input");
      const currentValue = parseInt(input.value) || 1;

      if (this.classList.contains("search-decrease") && currentValue > 1) {
        input.value = currentValue - 1;
      } else if (this.classList.contains("search-increase")) {
        input.value = currentValue + 1;
      }
    });
  });

  // Предотвращаем закрытие поисковых результатов при взаимодействии с полем ввода количества
  searchResults.querySelectorAll(".search-quantity-input").forEach((input) => {
    input.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    input.addEventListener("input", function (e) {
      // Проверяем и корректируем значение
      let value = parseInt(this.value) || 1;
      if (value < 1) value = 1;
      if (value > 99) value = 99;
      this.value = value;
    });
  });

  // Add to cart directly from search results
  searchResults.querySelectorAll(".search-result-add").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation(); // Prevent triggering the parent click event

      const id = parseInt(this.dataset.id);
      const name = this.dataset.name;
      const unit = this.dataset.unit;

      // Получаем введенное количество из input
      const quantityInput = this.closest(".search-result-item").querySelector(
        ".search-quantity-input"
      );
      const quantity = parseInt(quantityInput.value) || 1;

      addToCart(id, name, unit, quantity);
      showNotification(
        `${name} (${quantity} ${unit}) added to cart`,
        "success"
      );

      // Clear search results
      searchResults.innerHTML = "";
      searchResults.style.display = "none";
    });
  });
}

// Get category name by key
function getCategoryName(categoryKey) {
  const categories = {
    cleaning: "Cleaning supplies",
    paper: "Paper products",
    kitchen: "Kitchen items",
    laundry: "Laundry products",
    other: "Other",
  };

  return categories[categoryKey] || categoryKey;
}

// Initialize cart
function initCart() {
  // Initialize cart from localStorage if it exists
  if (!localStorage.getItem("materialsCart")) {
    localStorage.setItem("materialsCart", JSON.stringify([]));
  }

  // Remove the redundant event listener that was causing double-counting
  // The add-to-cart buttons already have their own event listeners attached
  // in displayMaterials() and addMaterialToCard() functions
}

// Add item to cart
function addToCart(id, name, unit, quantity = 1) {
  let cart = JSON.parse(localStorage.getItem("materialsCart") || "[]");

  // Преобразуем id в число для гарантии правильного сравнения
  const numericId = parseInt(id);

  // Check if item already exists in cart
  const existingItem = cart.find((item) => parseInt(item.id) === numericId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      id: numericId,
      name: name,
      unit: unit,
      quantity: quantity,
    });
  }

  // Save updated cart
  localStorage.setItem("materialsCart", JSON.stringify(cart));

  // Update cart badge
  updateCartBadge();
  updateCartBadgeMini();
}

// Save cart to localStorage
function saveCart(cart) {
  localStorage.setItem("materialsCart", JSON.stringify(cart));
}

// Remove item from cart
function removeFromCart(id) {
  let cart = JSON.parse(localStorage.getItem("materialsCart") || "[]");

  // Преобразуем id в число для гарантии правильного сравнения
  const numericId = parseInt(id);

  cart = cart.filter((item) => parseInt(item.id) !== numericId);
  localStorage.setItem("materialsCart", JSON.stringify(cart));

  // Update cart badge
  updateCartBadge();
  updateCartBadgeMini();
}

// Update cart item quantity
function updateCartItemQuantity(id, change) {
  let cart = JSON.parse(localStorage.getItem("materialsCart") || "[]");

  // Преобразуем id в число для гарантии правильного сравнения
  const numericId = parseInt(id);

  const item = cart.find((item) => parseInt(item.id) === numericId);

  if (item) {
    item.quantity += change;

    // Remove item if quantity is zero or negative
    if (item.quantity <= 0) {
      cart = cart.filter((item) => parseInt(item.id) !== numericId);
    }

    localStorage.setItem("materialsCart", JSON.stringify(cart));

    // Update cart badge
    updateCartBadge();
    updateCartBadgeMini();
  }
}

// Update cart badge (main button)
function updateCartBadge() {
  const cartBadge = document.getElementById("cartBadge");
  if (!cartBadge) return;

  try {
    // Безопасно получаем данные из localStorage
    let cart = [];
    try {
      const cartData = localStorage.getItem("materialsCart");
      if (cartData) {
        cart = JSON.parse(cartData);
        // Проверяем, что cart - это массив
        if (!Array.isArray(cart)) {
          console.warn("Cart data is not an array, resetting to empty array");
          cart = [];
          localStorage.setItem("materialsCart", JSON.stringify([]));
        }
      }
    } catch (e) {
      console.error("Error parsing cart data from localStorage:", e);
      cart = [];
      localStorage.setItem("materialsCart", JSON.stringify([]));
    }

    if (cart.length === 0) {
      cartBadge.textContent = "0";
      cartBadge.style.display = "none";
    } else {
      // Count total quantity of all items, not just the number of unique items
      const itemCount = cart.reduce((total, item) => {
        // Проверяем, что quantity - число
        const qty =
          typeof item.quantity === "number"
            ? item.quantity
            : parseInt(item.quantity) || 0;
        return total + qty;
      }, 0);
      cartBadge.textContent = itemCount;
      cartBadge.style.display = "block";
    }
  } catch (e) {
    console.error("Error updating cart badge:", e);
    // Устанавливаем безопасные значения по умолчанию
    cartBadge.textContent = "0";
    cartBadge.style.display = "none";
  }
}

// Update mini cart badge (in sidebar)
function updateCartBadgeMini() {
  const cartBadgeMini = document.getElementById("cartBadgeMini");
  if (!cartBadgeMini) return;

  try {
    // Безопасно получаем данные из localStorage
    let cart = [];
    try {
      const cartData = localStorage.getItem("materialsCart");
      if (cartData) {
        cart = JSON.parse(cartData);
        // Проверяем, что cart - это массив
        if (!Array.isArray(cart)) {
          console.warn("Cart data is not an array, resetting to empty array");
          cart = [];
          localStorage.setItem("materialsCart", JSON.stringify([]));
        }
      }
    } catch (e) {
      console.error("Error parsing cart data from localStorage:", e);
      cart = [];
      localStorage.setItem("materialsCart", JSON.stringify([]));
    }

    if (cart.length === 0) {
      cartBadgeMini.textContent = "0";
      cartBadgeMini.style.display = "none";
    } else {
      // Count total quantity of all items, not just the number of unique items
      const itemCount = cart.reduce((total, item) => {
        // Проверяем, что quantity - число
        const qty =
          typeof item.quantity === "number"
            ? item.quantity
            : parseInt(item.quantity) || 0;
        return total + qty;
      }, 0);
      cartBadgeMini.textContent = itemCount;
      cartBadgeMini.style.display = "flex";
    }
  } catch (e) {
    console.error("Error updating mini cart badge:", e);
    // Устанавливаем безопасные значения по умолчанию
    cartBadgeMini.textContent = "0";
    cartBadgeMini.style.display = "none";
  }

  // Обновляем текст меню с Materials на Supplies
  try {
    const menuItem = document.querySelector(
      '.nav-item[data-page="materials"] span'
    );
    if (menuItem && menuItem.textContent === "Materials") {
      menuItem.textContent = "Supplies";
    }

    // Обновляем иконку
    const menuIcon = document.querySelector(
      '.nav-item[data-page="materials"] i.fas'
    );
    if (menuIcon && menuIcon.classList.contains("fa-box")) {
      menuIcon.classList.remove("fa-box");
      menuIcon.classList.add("fa-boxes");
    }
  } catch (e) {
    console.error("Error updating menu styles:", e);
  }
}

// Initialize cart modal
function initCartModal() {
  // Create modal HTML if it doesn't exist
  if (!document.getElementById("cartModal")) {
    const modalHTML = `
            <div class="modal" id="cartModal">
                <div class="material-modal-content">
                    <div class="material-modal-header">
                        <h2>Your Cart</h2>
                        <span class="material-modal-close" id="closeCartModal">&times;</span>
                    </div>
                    <div class="material-modal-body" id="cartContent">
                        <!-- Cart content will be loaded here -->
                    </div>
                    <div class="material-modal-footer">
                        <div class="order-notes">
                            <label for="orderNotes">Order Notes:</label>
                            <textarea id="orderNotes" placeholder="Add any notes for your order here..."></textarea>
                        </div>
                        <button id="submitOrderBtn" class="submit-order-btn">Submit Order</button>
                    </div>
                </div>
            </div>
        `;

    // Append modal to document body
    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);

    // Add event listeners for modal
    document
      .getElementById("closeCartModal")
      .addEventListener("click", function () {
        document.getElementById("cartModal").style.display = "none";
      });

    // Close modal when clicking outside
    document
      .getElementById("cartModal")
      .addEventListener("click", function (e) {
        if (e.target === this) {
          this.style.display = "none";
        }
      });

    // Submit order button
    document
      .getElementById("submitOrderBtn")
      .addEventListener("click", function () {
        submitOrder();
      });
  }
}

// Open cart modal
function openCartModal() {
  // Initialize modal if needed
  initCartModal();

  // Update content
  updateCartModalContent();

  // Display modal
  document.getElementById("cartModal").style.display = "block";
}

// Update cart modal content
function updateCartModalContent() {
  const cartContent = document.getElementById("cartContent");
  if (!cartContent) return;

  const cart = JSON.parse(localStorage.getItem("materialsCart") || "[]");

  if (cart.length === 0) {
    cartContent.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
    document.getElementById("submitOrderBtn").disabled = true;
    return;
  }

  // Enable submit button
  document.getElementById("submitOrderBtn").disabled = false;

  // Calculate total items
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const uniqueItems = cart.length;

  // Create table with cart items
  let html = `
        <div class="cart-summary">
            <div>Cart contains ${uniqueItems} unique item${
    uniqueItems !== 1 ? "s" : ""
  } (${totalItems} total item${totalItems !== 1 ? "s" : ""})</div>
        </div>
        <div class="cart-items">
            <table class="cart-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

  cart.forEach((item) => {
    html += `
            <tr data-id="${item.id}">
                <td>${item.name}</td>
                <td>
                    <div class="cart-quantity-display">
                        <span class="cart-quantity">${item.quantity}</span>
                        <span class="cart-unit">${item.unit}</span>
                    </div>
                </td>
                <td>
                    <button class="remove-cart-item" data-id="${item.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
  });

  html += `
                </tbody>
            </table>
        </div>
    `;

  cartContent.innerHTML = html;

  // Use event delegation for cart controls instead of adding individual event listeners
  cartContent.addEventListener(
    "click",
    function (e) {
      // Handle remove button
      if (
        e.target.classList.contains("remove-cart-item") ||
        e.target.closest(".remove-cart-item")
      ) {
        const button = e.target.classList.contains("remove-cart-item")
          ? e.target
          : e.target.closest(".remove-cart-item");

        const id = button.getAttribute("data-id");
        if (id) {
          const itemRow = button.closest("tr");
          const itemName = itemRow.querySelector("td:first-child").textContent;

          removeFromCart(id);
          showNotification(`Removed ${itemName} from cart`, "info");
          updateCartModalContent();
        }
      }
    },
    { once: false }
  );
}

// Submit order
function submitOrder() {
  console.log("Submit Order button clicked");
  const cart = JSON.parse(localStorage.getItem("materialsCart") || "[]");

  if (cart.length === 0) {
    showNotification("Your cart is empty", "error");
    return;
  }

  // Get user information
  const userId = getUserIdFromSession();
  console.log("User ID:", userId);

  if (!userId) {
    // Try to get user ID from localStorage as fallback
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (currentUser && currentUser.id) {
      // Set the user ID on the body element for future use
      document.body.dataset.userId = currentUser.id;
      // Proceed with order using localStorage ID
      processOrderSubmission(currentUser.id, cart);
    } else {
      showNotification("You must be logged in to submit an order", "error");
    }
    return;
  }

  processOrderSubmission(userId, cart);
}

// Helper function to handle order submission process
function processOrderSubmission(userId, cart) {
  // Prepare order items
  const items = cart.map((item) => ({
    material_id: item.id,
    quantity: item.quantity,
  }));
  console.log("Order items:", items);

  // Get order notes
  const notes = document.getElementById("orderNotes").value || "";
  console.log("Order notes:", notes);

  // Submit order to server
  const formData = new FormData();
  formData.append("materials_action", "createOrder");
  formData.append("user_id", userId);
  formData.append("notes", notes);
  formData.append("items", JSON.stringify(items));

  // Show loading state
  const submitBtn = document.getElementById("submitOrderBtn");
  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Processing...";

  console.log("Sending order to materials.php...");
  fetch("materials.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Response from materials.php:", data);
      if (data.success) {
        console.log("Order created successfully with ID:", data.order_id);
        // Order was created successfully in materials system
        // Now send the order data to Inspections-Checklist-Portal supplies section
        const orderData = {
          order_id: data.order_id,
          user_id: userId,
          items: cart,
          notes: notes,
        };

        console.log(
          "Sending order to Inspections-Checklist-Portal:",
          orderData
        );
        // Send order to Inspections-Checklist-Portal
        sendOrderToInspectionsPortal(orderData);

        // Clear cart
        localStorage.setItem("materialsCart", JSON.stringify([]));

        // Update UI
        updateCartBadge();
        updateCartBadgeMini();
        updateCartModalContent();

        // Show success message
        showNotification("Order submitted successfully", "success");

        // Close modal
        document.getElementById("cartModal").style.display = "none";

        // Reload user orders if we're on the materials page
        if (document.querySelector(".materials-content")) {
          loadUserOrders();
        }
      } else {
        console.error("Error from materials.php:", data.message);
        showNotification(data.message || "Error submitting order", "error");
      }
    })
    .catch((error) => {
      console.error("Error submitting order:", error);
      showNotification(
        "Error submitting order. Please try again later.",
        "error"
      );
    })
    .finally(() => {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    });
}

// Send order to Inspections-Checklist-Portal
function sendOrderToInspectionsPortal(orderData) {
  // Prepare data for Inspections Portal
  const formData = new FormData();
  formData.append("action", "addSupplyOrder");
  formData.append("order_data", JSON.stringify(orderData));

  console.log("FormData prepared for Inspections Portal:", {
    action: "addSupplyOrder",
    order_data: JSON.stringify(orderData),
  });

  // Определяем путь к API относительно текущего домена
  const apiUrl =
    window.location.origin +
    "/Inspections-Checklist-Portal/api/supplies-api.php";
  console.log("Sending request to API:", apiUrl);

  // Send data to Inspections Portal supplies API
  fetch(apiUrl, {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      console.log("Raw response from Inspections Portal API:", response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // First get the text response to check for issues
      return response.text();
    })
    .then((text) => {
      console.log("Raw response text:", text);

      // Check if the response starts with any PHP errors or warnings
      if (
        text.trim().startsWith("<?") ||
        text.includes("Warning:") ||
        text.includes("Notice:") ||
        text.includes("Error:")
      ) {
        console.error("API returned PHP error or invalid content:", text);
        throw new Error("API returned invalid JSON with PHP errors");
      }

      try {
        // Try to parse as JSON - if multiple JSON objects are present, extract the last one
        // This addresses the issue where multiple JSON responses are concatenated
        text = text.trim();

        // Look for the pattern of multiple JSON objects (ending with } and starting with {)
        // Find last valid JSON in the string
        let jsonStart = 0;
        let lastJsonStart = 0;

        // Find all occurrences of '}{' which would indicate concatenated JSON objects
        while ((jsonStart = text.indexOf("{", jsonStart + 1)) !== -1) {
          // Check if there's a closing brace before this opening brace
          if (text.lastIndexOf("}", jsonStart) !== -1) {
            lastJsonStart = jsonStart;
          }
        }

        // Extract the last JSON object if we found multiple
        const jsonText =
          lastJsonStart > 0 ? text.substring(lastJsonStart) : text;

        return JSON.parse(jsonText);
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
        console.error("Response content:", text);

        // Attempt to extract success message if it exists in the text
        if (
          text.includes('"success":true') &&
          text.includes('"supply_order_id"')
        ) {
          console.log(
            "Despite JSON parsing error, the order appears to be successful"
          );
          return { success: true, message: "Order processed successfully" };
        }

        throw new Error("Invalid JSON response from API");
      }
    })
    .then((data) => {
      console.log("Parsed response from Inspections Portal API:", data);
      if (data.success) {
        console.log(
          "Order added to Inspections-Checklist-Portal successfully. Supply Order ID:",
          data.supply_order_id
        );
      } else {
        console.error(
          "Failed to add order to Inspections-Checklist-Portal:",
          data.message
        );
      }
    })
    .catch((error) => {
      console.error(
        "Error sending order to Inspections-Checklist-Portal:",
        error
      );
      // Show notification to user but don't affect the main order flow
      showNotification(
        "The order was saved successfully, but there was an issue syncing with the Inspections Portal.",
        "warning"
      );
    });
}

// Load user orders
function loadUserOrders() {
  const ordersList = document.getElementById("ordersList");
  if (!ordersList) return;

  const userId = getUserIdFromSession();

  // Initialize the sort change event handler
  const sortSelect = document.getElementById("orderSortBy");
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      // If we already have orders loaded, just re-sort and display them
      const ordersData = window.cachedOrders;
      if (ordersData && ordersData.length > 0) {
        displayUserOrders(ordersData);
      }
    });
  }

  if (!userId) {
    console.warn("User ID not found in session, checking localStorage");
    // Fallback to localStorage
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (currentUser && currentUser.id) {
      // Set the user ID on the body element for future use
      document.body.dataset.userId = currentUser.id;
      // Use the ID from localStorage
      fetchUserOrders(currentUser.id, ordersList);
    } else {
      ordersList.innerHTML =
        '<div class="note-message">Please log in to view your orders</div>';
    }
    return;
  }

  fetchUserOrders(userId, ordersList);
}

// Helper function to fetch user orders
function fetchUserOrders(userId, ordersList) {
  ordersList.innerHTML =
    '<div class="loading-indicator">Loading orders...</div>';

  const formData = new FormData();
  formData.append("materials_action", "getUserOrders");
  formData.append("user_id", userId);

  fetch("materials.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Cache the orders data for re-sorting
        window.cachedOrders = data.data;
        displayUserOrders(data.data);
      } else {
        ordersList.innerHTML = `<div class="error-message">${
          data.message || "Error loading orders"
        }</div>`;
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      ordersList.innerHTML =
        '<div class="error-message">Error loading orders. Please try again later.</div>';
    });
}

// Display user orders
function displayUserOrders(orders) {
  const ordersList = document.getElementById("ordersList");
  if (!ordersList) return;

  if (orders.length === 0) {
    ordersList.innerHTML =
      '<div class="note-message">You have no previous orders</div>';

    // Скрываем кнопку переключения, если нет заказов
    const toggleBtn = document.getElementById("toggleOrdersBtn");
    if (toggleBtn) {
      toggleBtn.style.display = "none";
    }

    // Скрываем сортировку, если нет заказов
    const sortSelect = document.getElementById("orderSortBy");
    if (sortSelect) {
      sortSelect.style.display = "none";
    }
    return;
  }

  // Показываем кнопку переключения, если она была скрыта
  const toggleBtn = document.getElementById("toggleOrdersBtn");
  if (toggleBtn) {
    toggleBtn.style.display = "flex";
  }

  // Показываем сортировку, если она была скрыта
  const sortSelect = document.getElementById("orderSortBy");
  if (sortSelect) {
    sortSelect.style.display = "block";
  }

  // Sort orders based on current sorting selection
  const sortValue = sortSelect ? sortSelect.value : "date_desc";

  // Sort the orders array based on the selected sort option
  const sortedOrders = [...orders].sort((a, b) => {
    if (sortValue === "date_desc") {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (sortValue === "date_asc") {
      return new Date(a.created_at) - new Date(b.created_at);
    } else if (sortValue === "status") {
      // Define status priority order (you can adjust as needed)
      const statusPriority = {
        pending: 1,
        processing: 2,
        approved: 3,
        delivered: 4,
        completed: 5,
        rejected: 6,
        cancelled: 7,
      };

      // Compare by status priority, then by date if statuses are the same
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      } else {
        return new Date(b.created_at) - new Date(a.created_at);
      }
    }
    return 0;
  });

  let html = '<div class="orders-grid">';

  sortedOrders.forEach((order) => {
    // Format date
    const orderDate = new Date(order.created_at);
    const formattedDate =
      orderDate.toLocaleDateString() + " " + orderDate.toLocaleTimeString();

    // Get status class
    const statusClass = getStatusClass(order.status);

    html += `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-id">Order #${order.id}</div>
                    <div class="order-date">${formattedDate}</div>
                </div>
                <div class="order-status ${statusClass}">
                    ${getStatusLabel(order.status)}
                </div>
                <div class="order-items">
                    ${order.items_list || "No items"}
                </div>
                ${
                  order.notes
                    ? `<div class="order-notes">Notes: ${order.notes}</div>`
                    : ""
                }
            </div>
        `;
  });

  html += "</div>";
  ordersList.innerHTML = html;

  // Helper function for status class
  function getStatusClass(status) {
    const classes = {
      pending: "status-pending",
      approved: "status-approved",
      rejected: "status-rejected",
      delivered: "status-delivered",
      processing: "status-processing", // Добавляем для синхронизации с Inspections
      completed: "status-completed", // Добавляем для синхронизации с Inspections
      cancelled: "status-cancelled", // Добавляем для синхронизации с Inspections
    };

    return classes[status] || "";
  }

  // Helper function for status label
  function getStatusLabel(status) {
    const labels = {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      delivered: "Delivered",
      processing: "Processing", // Добавляем для синхронизации с Inspections
      completed: "Completed", // Добавляем для синхронизации с Inspections
      cancelled: "Cancelled", // Добавляем для синхронизации с Inspections
    };

    return labels[status] || status;
  }
}

// Show notification
function showNotification(message, type = "info") {
  // Remove existing notification if any
  const existingNotification = document.querySelector(".notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  // Add to body
  document.body.appendChild(notification);

  // Show notification
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  // Hide and remove after timeout
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Open modal to add a new material to a category
function openAddMaterialModal(category) {
  // Create modal if it doesn't exist
  if (!document.getElementById("addMaterialModal")) {
    const modalHTML = `
      <div class="modal" id="addMaterialModal">
        <div class="material-modal-content">
          <div class="material-modal-header">
            <h2>Add New Material</h2>
            <span class="material-modal-close" id="closeAddMaterialModal">&times;</span>
          </div>
          <div class="material-modal-body">
            <form id="addMaterialForm">
              <div class="form-group">
                <label for="materialName">Material Name:</label>
                <input type="text" id="materialName" required>
              </div>
              <div class="form-group">
                <label for="materialCategory">Category:</label>
                <select id="materialCategory" required>
                  <option value="cleaning">Cleaning supplies</option>
                  <option value="paper">Paper products</option>
                  <option value="kitchen">Kitchen items</option>
                  <option value="laundry">Laundry products</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label for="materialDescription">Description:</label>
                <textarea id="materialDescription"></textarea>
              </div>
              <div class="form-group">
                <label for="materialUnit">Unit (e.g., bottles, boxes, rolls):</label>
                <input type="text" id="materialUnit" required>
              </div>
            </form>
          </div>
          <div class="material-modal-footer">
            <button type="button" id="addMaterialBtn" class="add-material-btn-submit">Add Material</button>
          </div>
        </div>
      </div>
    `;

    // Append modal to body
    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);

    // Add close button event
    document
      .getElementById("closeAddMaterialModal")
      .addEventListener("click", function () {
        document.getElementById("addMaterialModal").style.display = "none";
      });

    // Close when clicking outside
    document
      .getElementById("addMaterialModal")
      .addEventListener("click", function (e) {
        if (e.target === this) {
          this.style.display = "none";
        }
      });

    // Submit form
    document
      .getElementById("addMaterialBtn")
      .addEventListener("click", function () {
        const form = document.getElementById("addMaterialForm");
        if (form.checkValidity()) {
          addNewMaterial();
        } else {
          form.reportValidity();
        }
      });
  }

  // Pre-select the category in the dropdown
  document.getElementById("materialCategory").value = category;

  // Show the modal
  document.getElementById("addMaterialModal").style.display = "block";
}

// Add a new material
function addNewMaterial() {
  const name = document.getElementById("materialName").value;
  const category = document.getElementById("materialCategory").value;
  const description = document.getElementById("materialDescription").value;
  const unit = document.getElementById("materialUnit").value;

  if (!name || !category || !unit) {
    showNotification("Please fill in all required fields", "error");
    return;
  }

  // Create a new material object
  const newMaterial = {
    id: Date.now(), // Temporary ID until server assigns one
    name: name,
    category: category,
    description: description,
    unit: unit,
  };

  // Add to the appropriate category card
  addMaterialToCard(newMaterial);

  // Close the modal
  document.getElementById("addMaterialModal").style.display = "none";

  // Reset form
  document.getElementById("addMaterialForm").reset();

  // Show success notification
  showNotification(`Added new material: ${name}`, "success");

  // Save to server
  saveMaterialToServer(newMaterial);
}

// Add a new material to the category card
function addMaterialToCard(material) {
  let categoryCard = document.querySelector(
    `.material-category-card[data-category="${material.category}"]`
  );

  // If category card doesn't exist, create it
  if (!categoryCard) {
    const categoryName = getCategoryName(material.category);
    const categoryHTML = `
      <div class="material-category-card" data-category="${material.category}">
        <div class="category-header">
          <h3>${categoryName}</h3>
          <div class="category-header-actions">
            <span class="category-label">${getCategoryLabel(
              material.category
            )}</span>
            <button type="button" class="add-material-btn" data-category="${
              material.category
            }" title="Add new material to this category">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
        <div class="category-items">
        </div>
      </div>
    `;

    // Create and append the new category card
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = categoryHTML;
    categoryCard = tempContainer.firstElementChild;

    const materialsGrid = document.getElementById("materialsGrid");
    if (materialsGrid) {
      materialsGrid.appendChild(categoryCard);

      // Add event listener for the new Add Material button
      const addMaterialBtn = categoryCard.querySelector(".add-material-btn");
      if (addMaterialBtn) {
        addMaterialBtn.addEventListener("click", () => {
          const category = addMaterialBtn.getAttribute("data-category");
          openAddMaterialModal(category);
        });
      }
    }
  }

  // Now we can be sure the category card exists
  const categoryItems = categoryCard.querySelector(".category-items");

  // Remove the empty message if it exists
  const emptyMessage = categoryItems.querySelector(".empty-category-message");
  if (emptyMessage) {
    emptyMessage.remove();
  }

  // Create material item HTML
  const materialItemHTML = `
    <div class="material-item" data-id="${material.id}">
      <div class="material-item-details">
        <div class="material-item-name">${material.name}</div>
        <div class="material-item-description">${
          material.description || ""
        }</div>
      </div>
      <div class="material-item-unit">Unit: ${material.unit}</div>
      <div class="material-item-actions">
        <div class="quantity-control" data-id="${material.id}">
          <button type="button" class="quantity-btn decrease" aria-label="Decrease quantity">-</button>
          <input type="number" class="quantity-input" value="0" min="0" max="99">
          <button type="button" class="quantity-btn increase" aria-label="Increase quantity">+</button>
        </div>
        <div class="btn-group">
          <button type="button" class="add-to-cart-btn" data-id="${
            material.id
          }" 
            data-name="${material.name}" data-unit="${material.unit}">
            Add to Cart
          </button>
          <button type="button" class="edit-material-btn" data-id="${
            material.id
          }" 
            data-name="${material.name}" 
            data-description="${material.description || ""}" 
            data-unit="${material.unit}" 
            data-category="${material.category}"
            title="Edit material">
            <i class="fas fa-edit"></i>
          </button>
          <button type="button" class="delete-material-btn" data-id="${
            material.id
          }" 
            data-name="${material.name}" title="Delete material">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  // Create a temporary container
  const tempContainer = document.createElement("div");
  tempContainer.innerHTML = materialItemHTML;
  const materialItem = tempContainer.firstElementChild;

  // Add to the category items
  categoryItems.appendChild(materialItem);

  // Add event listeners for the new item
  const decreaseBtn = materialItem.querySelector(".decrease");
  const increaseBtn = materialItem.querySelector(".increase");
  const input = materialItem.querySelector(".quantity-input");

  decreaseBtn.addEventListener("click", () => {
    const currentValue = parseInt(input.value) || 0;
    if (currentValue > 0) {
      input.value = currentValue - 1;
    }
  });

  increaseBtn.addEventListener("click", () => {
    const currentValue = parseInt(input.value) || 0;
    input.value = currentValue + 1;
  });

  const addButton = materialItem.querySelector(".add-to-cart-btn");
  addButton.addEventListener("click", () => {
    const materialId = addButton.getAttribute("data-id");
    const materialName = addButton.getAttribute("data-name");
    const materialUnit = addButton.getAttribute("data-unit");
    const control = addButton
      .closest(".material-item")
      .querySelector(".quantity-control");
    const quantityInput = control.querySelector(".quantity-input");
    const quantity = parseInt(quantityInput.value) || 0;

    if (quantity > 0) {
      addToCart(materialId, materialName, materialUnit, quantity);
      quantityInput.value = 0;
      showNotification(
        `Added ${quantity} ${materialUnit} of ${materialName} to cart`,
        "success"
      );
    } else {
      showNotification("Please select a quantity greater than 0", "info");
    }
  });

  // Add event listeners for edit and delete buttons
  const editButton = materialItem.querySelector(".edit-material-btn");
  if (editButton) {
    editButton.addEventListener("click", () => {
      const materialId = editButton.getAttribute("data-id");
      const materialName = editButton.getAttribute("data-name");
      const materialDescription = editButton.getAttribute("data-description");
      const materialUnit = editButton.getAttribute("data-unit");
      const materialCategory = editButton.getAttribute("data-category");

      openEditMaterialModal(
        materialId,
        materialName,
        materialDescription,
        materialUnit,
        materialCategory
      );
    });
  }

  const deleteButton = materialItem.querySelector(".delete-material-btn");
  if (deleteButton) {
    deleteButton.addEventListener("click", () => {
      const materialId = deleteButton.getAttribute("data-id");
      const materialName = deleteButton.getAttribute("data-name");

      confirmDeleteMaterial(materialId, materialName);
    });
  }
}

// Optional: Save material to server
function saveMaterialToServer(material) {
  const formData = new FormData();
  formData.append("materials_action", "addMaterial");
  formData.append("name", material.name);
  formData.append("category", material.category);
  formData.append("description", material.description);
  formData.append("unit", material.unit);

  // Show saving indicator
  showNotification("Saving material to database...", "info");

  fetch("materials.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        console.log("Material saved to server with ID:", data.id);

        // Update the temporary ID with the real one from server
        const materialItem = document.querySelector(
          `.quantity-control[data-id="${material.id}"]`
        );

        if (materialItem) {
          materialItem.setAttribute("data-id", data.id);

          // Also update the add to cart button
          const addButton = materialItem
            .closest(".material-item")
            .querySelector(".add-to-cart-btn");

          if (addButton) {
            addButton.setAttribute("data-id", data.id);
            addButton.setAttribute("data-name", material.name);
            addButton.setAttribute("data-unit", material.unit);
          }

          showNotification("Material saved successfully", "success");
        } else {
          console.warn("Material DOM element not found for ID:", material.id);
          showNotification(
            "Material saved, but UI update failed. Please refresh the page.",
            "info"
          );
        }
      } else {
        console.error("Error from server:", data.message);
        showNotification(data.message || "Error saving material", "error");
      }
    })
    .catch((error) => {
      console.error("Error saving material:", error);
      showNotification(
        "Error saving material to server. Please try again.",
        "error"
      );
    });
}

// Open modal to edit an existing material
function openEditMaterialModal(materialId, name, description, unit, category) {
  // Create modal if it doesn't exist
  if (!document.getElementById("editMaterialModal")) {
    const modalHTML = `
      <div class="modal" id="editMaterialModal">
        <div class="material-modal-content">
          <div class="material-modal-header">
            <h2>Edit Material</h2>
            <span class="material-modal-close" id="closeEditMaterialModal">&times;</span>
          </div>
          <div class="material-modal-body">
            <form id="editMaterialForm">
              <input type="hidden" id="editMaterialId">
              <div class="form-group">
                <label for="editMaterialName">Material Name:</label>
                <input type="text" id="editMaterialName" required>
              </div>
              <div class="form-group">
                <label for="editMaterialCategory">Category:</label>
                <select id="editMaterialCategory" required>
                  <option value="cleaning">Cleaning supplies</option>
                  <option value="paper">Paper products</option>
                  <option value="kitchen">Kitchen items</option>
                  <option value="laundry">Laundry products</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label for="editMaterialDescription">Description:</label>
                <textarea id="editMaterialDescription"></textarea>
              </div>
              <div class="form-group">
                <label for="editMaterialUnit">Unit (e.g., bottles, boxes, rolls):</label>
                <input type="text" id="editMaterialUnit" required>
              </div>
            </form>
          </div>
          <div class="material-modal-footer">
            <button type="button" id="updateMaterialBtn" class="add-material-btn-submit">Update Material</button>
          </div>
        </div>
      </div>
    `;

    // Append modal to body
    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);

    // Add close button event
    document
      .getElementById("closeEditMaterialModal")
      .addEventListener("click", function () {
        document.getElementById("editMaterialModal").style.display = "none";
      });

    // Close when clicking outside
    document
      .getElementById("editMaterialModal")
      .addEventListener("click", function (e) {
        if (e.target === this) {
          this.style.display = "none";
        }
      });

    // Submit form
    document
      .getElementById("updateMaterialBtn")
      .addEventListener("click", function () {
        const form = document.getElementById("editMaterialForm");
        if (form.checkValidity()) {
          updateMaterial();
        } else {
          form.reportValidity();
        }
      });
  }

  // Set form values
  document.getElementById("editMaterialId").value = materialId;
  document.getElementById("editMaterialName").value = name;
  document.getElementById("editMaterialCategory").value = category;
  document.getElementById("editMaterialDescription").value = description || "";
  document.getElementById("editMaterialUnit").value = unit;

  // Show the modal
  document.getElementById("editMaterialModal").style.display = "block";
}

// Update an existing material
function updateMaterial() {
  const id = document.getElementById("editMaterialId").value;
  const name = document.getElementById("editMaterialName").value;
  const category = document.getElementById("editMaterialCategory").value;
  const description = document.getElementById("editMaterialDescription").value;
  const unit = document.getElementById("editMaterialUnit").value;

  if (!name || !category || !unit) {
    showNotification("Please fill in all required fields", "error");
    return;
  }

  // Create updated material object
  const updatedMaterial = {
    id: id,
    name: name,
    category: category,
    description: description,
    unit: unit,
  };

  // Save to server
  updateMaterialOnServer(updatedMaterial);

  // Close the modal
  document.getElementById("editMaterialModal").style.display = "none";

  // Show notification
  showNotification(`Updating material: ${name}...`, "info");
}

// Update material on server
function updateMaterialOnServer(material) {
  const formData = new FormData();
  formData.append("materials_action", "updateMaterial");
  formData.append("id", material.id);
  formData.append("name", material.name);
  formData.append("category", material.category);
  formData.append("description", material.description);
  formData.append("unit", material.unit);

  fetch("materials.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        showNotification(
          `Material "${material.name}" updated successfully`,
          "success"
        );

        // If current category is same as material category, just update the UI
        // Otherwise, we need to reload materials to move item to correct category
        const categorySelect = document.getElementById("materialCategory");
        const currentCategory = categorySelect ? categorySelect.value : "";

        if (currentCategory && currentCategory !== material.category) {
          // Material moved to different category, reload materials
          loadMaterials(currentCategory);
        } else {
          // Update material in the UI
          updateMaterialUI(material);
        }
      } else {
        showNotification(data.message || "Error updating material", "error");
      }
    })
    .catch((error) => {
      console.error("Error updating material:", error);
      showNotification("Error updating material", "error");
    });
}

// Update material in UI
function updateMaterialUI(material) {
  const materialItem = document.querySelector(
    `.material-item[data-id="${material.id}"]`
  );

  if (materialItem) {
    // Update item details
    const nameElement = materialItem.querySelector(".material-item-name");
    const descElement = materialItem.querySelector(
      ".material-item-description"
    );
    const unitElement = materialItem.querySelector(".material-item-unit");

    if (nameElement) nameElement.textContent = material.name;
    if (descElement) descElement.textContent = material.description || "";
    if (unitElement) unitElement.textContent = `Unit: ${material.unit}`;

    // Update data attributes for all buttons
    const quantityControl = materialItem.querySelector(".quantity-control");
    const addToCartBtn = materialItem.querySelector(".add-to-cart-btn");
    const editBtn = materialItem.querySelector(".edit-material-btn");
    const deleteBtn = materialItem.querySelector(".delete-material-btn");

    // Update quantity control
    if (quantityControl) {
      quantityControl.setAttribute("data-id", material.id);
    }

    // Update add to cart button
    if (addToCartBtn) {
      addToCartBtn.setAttribute("data-id", material.id);
      addToCartBtn.setAttribute("data-name", material.name);
      addToCartBtn.setAttribute("data-unit", material.unit);
    }

    // Update edit button
    if (editBtn) {
      editBtn.setAttribute("data-id", material.id);
      editBtn.setAttribute("data-name", material.name);
      editBtn.setAttribute("data-description", material.description || "");
      editBtn.setAttribute("data-unit", material.unit);
      editBtn.setAttribute("data-category", material.category);
    }

    // Update delete button
    if (deleteBtn) {
      deleteBtn.setAttribute("data-id", material.id);
      deleteBtn.setAttribute("data-name", material.name);
    }

    // Show success message
    showNotification(`Material "${material.name}" has been updated`, "success");
  } else {
    // If material not found in current view, reload materials
    loadMaterials();
  }
}

// Open confirmation dialog for deleting a material
function confirmDeleteMaterial(materialId, materialName) {
  const confirmationDialog = document.createElement("div");
  confirmationDialog.classList.add("delete-confirmation-dialog");
  confirmationDialog.innerHTML = `
    <div class="delete-confirmation-content">
      <h3>Confirm Deletion</h3>
      <p>Are you sure you want to delete "${materialName}"?</p>
      <div class="delete-confirmation-buttons">
        <button class="cancel-delete-btn">Cancel</button>
        <button class="confirm-delete-btn">Delete</button>
      </div>
    </div>
  `;

  document.body.appendChild(confirmationDialog);

  // Add event listeners to the buttons
  const cancelBtn = confirmationDialog.querySelector(".cancel-delete-btn");
  const confirmBtn = confirmationDialog.querySelector(".confirm-delete-btn");

  cancelBtn.addEventListener("click", () => {
    document.body.removeChild(confirmationDialog);
  });

  confirmBtn.addEventListener("click", () => {
    document.body.removeChild(confirmationDialog);
    deleteMaterial(materialId, materialName);
  });
}

// Delete material function
function deleteMaterial(materialId, materialName) {
  console.log(`Deleting material: ${materialId} - ${materialName}`);

  const formData = new FormData();
  formData.append("materials_action", "deleteMaterial");
  formData.append("id", materialId);

  fetch("materials.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Remove the material from the DOM
        const materialElement = document.querySelector(
          `.material-item[data-id="${materialId}"]`
        );
        if (materialElement) {
          const categoryCard = materialElement.closest(
            ".material-category-card"
          );
          materialElement.remove();

          // Check if the category card is now empty
          const categoryItems = categoryCard.querySelector(".category-items");
          if (categoryItems.children.length === 0) {
            // Add empty message
            const category = categoryCard.getAttribute("data-category");
            const emptyHTML = `<div class="empty-category-message">No materials found in this category</div>`;
            categoryItems.innerHTML = emptyHTML;
          }
        }

        showNotification(
          `Material "${materialName}" has been deleted successfully`,
          "success"
        );
      } else {
        showNotification(`Failed to delete material: ${data.error}`, "error");
      }
    })
    .catch((error) => {
      console.error("Error deleting material:", error);
      showNotification(
        "An error occurred while deleting the material",
        "error"
      );
    });
}

// Update menu styles to use correct icon and name
function updateMenuStyles() {
  // Обновляем текст меню с Materials на Supplies
  const menuItem = document.querySelector(
    '.nav-item[data-page="materials"] span'
  );
  if (menuItem && menuItem.textContent === "Materials") {
    menuItem.textContent = "Supplies";
  }

  // Обновляем иконку
  const menuIcon = document.querySelector(
    '.nav-item[data-page="materials"] i.fas'
  );
  if (menuIcon && menuIcon.classList.contains("fa-box")) {
    menuIcon.classList.remove("fa-box");
    menuIcon.classList.add("fa-boxes");
  }

  // Убедимся, что пункт меню Maintenance Tasks есть на всех страницах
  ensureMaintenanceTasksMenuItem();
}

// Функция для добавления пункта меню Maintenance Tasks, если он отсутствует
function ensureMaintenanceTasksMenuItem() {
  const navMenu = document.querySelector(".nav-menu");
  if (!navMenu) return;

  // Проверяем, существует ли уже пункт меню Maintenance Tasks
  const tasksMenuItem = navMenu.querySelector('.nav-item[data-page="tasks"]');

  // Если пункт меню не существует, создаем его
  if (!tasksMenuItem) {
    const newTasksMenuItem = document.createElement("li");
    newTasksMenuItem.className = "nav-item";
    newTasksMenuItem.setAttribute("data-page", "tasks");
    newTasksMenuItem.innerHTML = `
      <i class="fas fa-tasks"></i>
      <span>Maintenance Tasks</span>
    `;

    // Добавляем обработчик клика
    newTasksMenuItem.addEventListener("click", function () {
      showTaskStatistics();
      window.location.href = "tasks.html";
    });

    // Вставляем в начало списка навигации
    const firstMenuItem = navMenu.querySelector("li:first-child");
    navMenu.insertBefore(newTasksMenuItem, firstMenuItem);
  }
}

// Функция для скрытия панели статистики при загрузке раздела Supplies
function hideTaskStatistics() {
  const taskStats = document.querySelector(".task-stats");
  if (taskStats) {
    // Скрываем панель статистики с анимацией
    taskStats.classList.add("hidden");

    // После завершения анимации скрываем элемент полностью
    setTimeout(() => {
      taskStats.style.display = "none";
    }, 300);
  }
}

// Функция для отображения панели статистики при переходе на другие разделы
function showTaskStatistics() {
  const taskStats = document.querySelector(".task-stats");
  if (taskStats) {
    // Сначала отображаем элемент
    taskStats.style.display = "";

    // Даем браузеру время обработать изменение display
    setTimeout(() => {
      // Затем удаляем класс hidden для анимации появления
      taskStats.classList.remove("hidden");
    }, 10);
  }
}

// Настраиваем обработчики для скрытия/отображения панели статистики при переключении между разделами
function setupTaskStatsVisibility() {
  // Проверяем, не установлен ли уже обработчик
  if (window.taskStatsVisibilitySetup) return;

  // Находим пункт меню Supplies
  const suppliesMenuItem = document.querySelector(
    '.nav-item[data-page="materials"]'
  );

  // Находим пункт меню Maintenance Tasks
  const tasksMenuItem = document.querySelector('.nav-item[data-page="tasks"]');

  // Находим все остальные пункты меню
  const otherMenuItems = document.querySelectorAll(
    '.nav-item:not([data-page="materials"])'
  );

  // Добавляем обработчик клика на пункт меню Supplies для скрытия панели
  if (suppliesMenuItem) {
    suppliesMenuItem.addEventListener("click", function () {
      hideTaskStatistics();
    });
  }

  // Добавляем обработчик клика на пункт меню Maintenance Tasks для отображения панели и перехода на страницу задач
  if (tasksMenuItem) {
    tasksMenuItem.addEventListener("click", function () {
      showTaskStatistics();
      window.location.href = "tasks.html";
    });
  }

  // Добавляем обработчики для остальных пунктов меню для отображения панели
  otherMenuItems.forEach((item) => {
    item.addEventListener("click", function () {
      showTaskStatistics();
    });
  });

  // Отмечаем, что обработчики уже установлены
  window.taskStatsVisibilitySetup = true;
}

// Функция для скрытия элементов фильтра и сортировки
function hideFilterSortElements() {
  // Ищем контейнер подменю
  const tasksSubmenuSection = document.querySelector(".tasks-submenu-section");

  // Сохраняем текущее состояние в localStorage
  localStorage.setItem("activeSection", "materials");

  if (tasksSubmenuSection) {
    // Измеряем текущую высоту
    const sectionHeight = tasksSubmenuSection.scrollHeight;

    // Устанавливаем фиксированную высоту для анимации
    tasksSubmenuSection.style.maxHeight = sectionHeight + "px";
    tasksSubmenuSection.style.overflow = "hidden";
    tasksSubmenuSection.style.transition =
      "opacity 0.5s ease, max-height 0.5s ease";

    // Начинаем анимацию скрытия
    setTimeout(() => {
      tasksSubmenuSection.style.opacity = "0.7";
      tasksSubmenuSection.style.maxHeight = sectionHeight * 0.7 + "px";

      setTimeout(() => {
        tasksSubmenuSection.style.opacity = "0.3";
        tasksSubmenuSection.style.maxHeight = sectionHeight * 0.3 + "px";

        setTimeout(() => {
          tasksSubmenuSection.style.opacity = "0";
          tasksSubmenuSection.style.maxHeight = "0";

          // Окончательно скрываем после завершения анимации
          setTimeout(() => {
            tasksSubmenuSection.style.display = "none";
            console.log("Tasks submenu section fully hidden");
          }, 200);
        }, 150);
      }, 150);
    }, 10);
  } else {
    // Используем старый способ, если новый контейнер не найден
    const filterNavItem = document.querySelector('[data-page="filter"]');
    const sortNavItem = document.querySelector('[data-page="sort"]');
    const filterSubmenu = filterNavItem?.nextElementSibling;
    const sortSubmenu = sortNavItem?.nextElementSibling;

    // Сначала скрываем подменю с анимацией
    if (filterSubmenu) {
      const filterSubmenuHeight = filterSubmenu.scrollHeight;
      filterSubmenu.style.height = filterSubmenuHeight + "px";
      filterSubmenu.style.overflow = "hidden";
      filterSubmenu.style.transition = "opacity 0.4s ease, height 0.4s ease";

      setTimeout(() => {
        filterSubmenu.style.height = filterSubmenu.scrollHeight + "px";
        filterSubmenu.style.opacity = "1";

        setTimeout(() => {
          filterSubmenu.style.height = "";
          filterSubmenu.style.overflow = "";
        }, 400);
      }, 50);
    }

    if (sortSubmenu) {
      sortSubmenu.style.display = "";
      sortSubmenu.style.height = "0";
      sortSubmenu.style.opacity = "0";
      sortSubmenu.style.transition = "opacity 0.4s ease, height 0.4s ease";

      setTimeout(() => {
        sortSubmenu.style.height = sortSubmenu.scrollHeight + "px";
        sortSubmenu.style.opacity = "1";

        setTimeout(() => {
          sortSubmenu.style.height = "";
          sortSubmenu.style.overflow = "";
        }, 400);
      }, 200);
    }
  }
}

// Добавляем проверку и установку начального состояния элементов фильтра и сортировки
function setupFilterSortVisibility() {
  // Проверяем локальное хранилище на активный раздел
  const activeSection = localStorage.getItem("activeSection") || "tasks";
  console.log("Initial active section for filter/sort:", activeSection);

  if (activeSection === "materials") {
    hideFilterSortElements();
  } else {
    showFilterSortElements();
  }
}

// Функция для отображения элементов фильтра и сортировки
function showFilterSortElements() {
  // Ищем контейнер подменю
  const tasksSubmenuSection = document.querySelector(".tasks-submenu-section");

  // Сохраняем текущее состояние в localStorage
  localStorage.setItem("activeSection", "tasks");

  if (tasksSubmenuSection) {
    // Сначала показываем элемент с нулевой прозрачностью
    tasksSubmenuSection.style.opacity = "0";
    tasksSubmenuSection.style.transition =
      "opacity 0.5s ease, max-height 0.5s ease";
    tasksSubmenuSection.style.display = "";
    tasksSubmenuSection.style.maxHeight = "0";
    tasksSubmenuSection.style.overflow = "hidden";

    // Запускаем анимацию появления с небольшой задержкой
    setTimeout(() => {
      const sectionHeight = tasksSubmenuSection.scrollHeight;
      tasksSubmenuSection.style.maxHeight = sectionHeight + "px";
      tasksSubmenuSection.style.opacity = "0.3";

      // Вторая фаза анимации
      setTimeout(() => {
        tasksSubmenuSection.style.opacity = "0.7";

        // Финальная фаза анимации
        setTimeout(() => {
          tasksSubmenuSection.style.opacity = "1";
          tasksSubmenuSection.style.maxHeight = "none";
          tasksSubmenuSection.style.overflow = "";
          console.log("Tasks submenu section fully shown");
        }, 150);
      }, 150);
    }, 10);
  } else {
    // Используем старый способ, если новый контейнер не найден
    const filterNavItem = document.querySelector('[data-page="filter"]');
    const sortNavItem = document.querySelector('[data-page="sort"]');
    const filterSubmenu = filterNavItem?.nextElementSibling;
    const sortSubmenu = sortNavItem?.nextElementSibling;

    if (filterNavItem) {
      filterNavItem.style.display = "";
      filterNavItem.style.height = "0";
      filterNavItem.style.opacity = "0";
      filterNavItem.style.transition = "opacity 0.5s ease, height 0.5s ease";

      setTimeout(() => {
        filterNavItem.style.height = filterNavItem.scrollHeight + "px";
        filterNavItem.style.opacity = "0.5";

        setTimeout(() => {
          filterNavItem.style.height = "";
          filterNavItem.style.opacity = "1";
          filterNavItem.style.overflow = "";
        }, 250);
      }, 10);
    }

    if (sortNavItem) {
      sortNavItem.style.display = "";
      sortNavItem.style.height = "0";
      sortNavItem.style.opacity = "0";
      sortNavItem.style.transition = "opacity 0.5s ease, height 0.5s ease";

      setTimeout(() => {
        sortNavItem.style.height = sortNavItem.scrollHeight + "px";
        sortNavItem.style.opacity = "0.5";

        setTimeout(() => {
          sortNavItem.style.height = "";
          sortNavItem.style.opacity = "1";
          sortNavItem.style.overflow = "";
        }, 250);
      }, 150); // Небольшая задержка относительно filter для эффекта каскада
    }

    if (filterSubmenu) {
      filterSubmenu.style.display = "";
      filterSubmenu.style.height = "0";
      filterSubmenu.style.opacity = "0";
      filterSubmenu.style.transition = "opacity 0.4s ease, height 0.4s ease";

      setTimeout(() => {
        filterSubmenu.style.height = filterSubmenu.scrollHeight + "px";
        filterSubmenu.style.opacity = "1";

        setTimeout(() => {
          filterSubmenu.style.height = "";
          filterSubmenu.style.overflow = "";
        }, 400);
      }, 50);
    }

    if (sortSubmenu) {
      sortSubmenu.style.display = "";
      sortSubmenu.style.height = "0";
      sortSubmenu.style.opacity = "0";
      sortSubmenu.style.transition = "opacity 0.4s ease, height 0.4s ease";

      setTimeout(() => {
        sortSubmenu.style.height = sortSubmenu.scrollHeight + "px";
        sortSubmenu.style.opacity = "1";

        setTimeout(() => {
          sortSubmenu.style.height = "";
          sortSubmenu.style.overflow = "";
        }, 400);
      }, 200);
    }
  }
}

// Initialize the module when the document is loaded
document.addEventListener("DOMContentLoaded", initMaterialsModule);
