export default class SuppliesManager {
  constructor(container) {
    this.container = container;
    this.supplies = [];
    this.filters = {
      status: null,
      dateFrom: null,
      dateTo: null,
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSupplies();

    // Создаем модальное окно для предпросмотра
    this.createPreviewModal();

    // Если счетчик в портале уже запущен, не дублируем его здесь
    if (!window.portalManager || !window.portalManager.orderBadgeInterval) {
      this.updateNewOrdersCount();

      // Запускаем автоматическое обновление счетчика каждые 60 секунд
      this.autoUpdateInterval = setInterval(() => {
        this.updateNewOrdersCount();
      }, 60000); // Каждую минуту
    }
  }

  // Очищаем интервал при уничтожении компонента
  destroy() {
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
    }
  }

  bindEvents() {
    // Delegation for supply card actions
    this.container.addEventListener("click", (e) => {
      // Process order button
      if (e.target.classList.contains("process-order-btn")) {
        const orderId = e.target.dataset.orderId;
        this.updateOrderStatus(orderId, "processing");
      }

      // Complete order button
      else if (e.target.classList.contains("complete-order-btn")) {
        const orderId = e.target.dataset.orderId;
        this.updateOrderStatus(orderId, "completed");
      }

      // Cancel order button
      else if (e.target.classList.contains("cancel-order-btn")) {
        const orderId = e.target.dataset.orderId;
        this.updateOrderStatus(orderId, "cancelled");
      }

      // Print order button
      else if (e.target.classList.contains("print-order-btn")) {
        const orderId = e.target.dataset.orderId;
        this.printOrder(orderId);
      }

      // Toggle receipts section
      else if (
        e.target.classList.contains("toggle-receipts-btn") ||
        e.target.closest(".toggle-receipts-btn")
      ) {
        const orderId = e.target.closest("[data-order-id]").dataset.orderId;
        this.toggleReceiptsSection(orderId);
      }

      // Upload receipt button
      else if (
        e.target.classList.contains("upload-receipt-btn") ||
        e.target.closest(".upload-receipt-btn")
      ) {
        const orderId = e.target.closest("[data-order-id]").dataset.orderId;
        this.showUploadReceiptDialog(orderId);
      }

      // Apply filters button
      else if (e.target.classList.contains("apply-filter-btn")) {
        this.applyFilters();
      }

      // Reset filters button
      else if (e.target.classList.contains("reset-filter-btn")) {
        this.resetFilters();
      }

      // Remove filter badge
      else if (e.target.closest(".filter-badge button")) {
        const badge = e.target.closest(".filter-badge");
        const filterType = badge.dataset.filterType;
        this.removeFilter(filterType);
      }
    });

    // Обработчик для модального окна с квитанциями
    document.body.addEventListener("click", (e) => {
      // Delete receipt button
      if (
        e.target.classList.contains("delete-receipt-btn") ||
        e.target.closest(".delete-receipt-btn")
      ) {
        e.preventDefault();
        e.stopPropagation();

        const button = e.target.closest(".delete-receipt-btn");
        if (!button) return;

        const receiptId = button.dataset.receiptId;
        const orderId = button.dataset.orderId;

        if (receiptId && orderId) {
          console.log("Deleting receipt:", receiptId, "from order:", orderId);
          this.deleteReceipt(receiptId, orderId);
        } else {
          console.error("Missing data attributes:", { receiptId, orderId });
        }
      }
      // View receipt thumbnail
      else if (
        e.target.classList.contains("receipt-thumbnail") ||
        e.target.closest(".receipt-thumbnail")
      ) {
        const thumbnail = e.target.closest(".receipt-thumbnail");
        if (!thumbnail) return;

        // Проверяем, что клик не был по кнопке удаления или её дочернему элементу
        if (e.target.closest(".delete-receipt-btn")) return;

        const receiptUrl = thumbnail.dataset.url;
        if (receiptUrl) {
          console.log("Viewing receipt:", receiptUrl);
          this.viewReceipt(receiptUrl);
        } else {
          console.error("Missing URL for receipt viewing");
        }
      }
    });

    // Обработчики для фильтров
    const statusFilter = this.container.querySelector("#status-filter");
    const dateFrom = this.container.querySelector("#date-from");
    const dateTo = this.container.querySelector("#date-to");

    // Event listener for status filter change
    if (statusFilter) {
      statusFilter.addEventListener("change", () => {
        // Auto-apply filter on status change
        this.applyFilters();
      });
    }

    // Event listeners for enter key on date inputs
    if (dateFrom) {
      dateFrom.addEventListener("keyup", (e) => {
        if (e.key === "Enter") this.applyFilters();
      });
    }

    if (dateTo) {
      dateTo.addEventListener("keyup", (e) => {
        if (e.key === "Enter") this.applyFilters();
      });
    }
  }

  loadSupplies() {
    const suppliesList = this.container.querySelector("#supplies-list");
    if (!suppliesList) return;

    suppliesList.innerHTML =
      '<div class="loading">Loading supplies orders...</div>';

    // Load supplies orders from API
    const formData = new FormData();
    formData.append("action", "getAllSupplyOrders");

    // Add filter parameters if they exist
    if (this.filters.status) {
      formData.append("status", this.filters.status);
    }

    if (this.filters.dateFrom) {
      formData.append("date_from", this.filters.dateFrom);
    }

    if (this.filters.dateTo) {
      formData.append("date_to", this.filters.dateTo);
    }

    // Используем правильный относительный путь к API
    const apiUrl =
      window.location.origin +
      "/Maintenance_P/Inspections-Checklist-Portal/api/supplies-api.php";
    console.log("Loading supplies from API:", apiUrl);
    console.log("With filters:", this.filters);

    fetch(apiUrl, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Get text response first to handle any JSON issues
        return response.text();
      })
      .then((text) => {
        console.log("Raw API response:", text);
        // Try to safely parse the JSON
        return this.safelyParseJson(text);
      })
      .then((data) => {
        console.log("Supplies data received:", data);
        if (data.success && data.data) {
          this.supplies = data.data;

          // Update filters with server response
          if (data.filters) {
            this.filters.status = data.filters.status;
            this.filters.dateFrom = data.filters.date_from;
            this.filters.dateTo = data.filters.date_to;
            this.updateFilterBadges();
            this.updateFilterStatus(data.filters.total_records);
          }

          this.renderSupplies();
        } else {
          suppliesList.innerHTML =
            '<div class="error">Failed to load supplies orders</div>';
        }
      })
      .catch((error) => {
        console.error("Error loading supplies:", error);
        suppliesList.innerHTML =
          '<div class="error">Error loading supplies orders</div>';
      });
  }

  // Apply filters from UI inputs
  applyFilters() {
    const statusFilter = this.container.querySelector("#status-filter");
    const dateFrom = this.container.querySelector("#date-from");
    const dateTo = this.container.querySelector("#date-to");

    // Update filter values
    this.filters.status = statusFilter ? statusFilter.value : null;
    this.filters.dateFrom = dateFrom && dateFrom.value ? dateFrom.value : null;
    this.filters.dateTo = dateTo && dateTo.value ? dateTo.value : null;

    // Reload supplies with new filters
    this.loadSupplies();
  }

  // Reset all filters
  resetFilters() {
    const statusFilter = this.container.querySelector("#status-filter");
    const dateFrom = this.container.querySelector("#date-from");
    const dateTo = this.container.querySelector("#date-to");

    // Reset UI
    if (statusFilter) statusFilter.value = "all";
    if (dateFrom) dateFrom.value = "";
    if (dateTo) dateTo.value = "";

    // Reset filter values
    this.filters.status = null;
    this.filters.dateFrom = null;
    this.filters.dateTo = null;

    // Reload supplies without filters
    this.loadSupplies();
  }

  // Remove specific filter
  removeFilter(filterType) {
    switch (filterType) {
      case "status":
        this.filters.status = null;
        const statusFilter = this.container.querySelector("#status-filter");
        if (statusFilter) statusFilter.value = "all";
        break;
      case "dateFrom":
        this.filters.dateFrom = null;
        const dateFrom = this.container.querySelector("#date-from");
        if (dateFrom) dateFrom.value = "";
        break;
      case "dateTo":
        this.filters.dateTo = null;
        const dateTo = this.container.querySelector("#date-to");
        if (dateTo) dateTo.value = "";
        break;
    }

    // Reload supplies with updated filters
    this.loadSupplies();
  }

  // Update filter badges
  updateFilterBadges() {
    const activeFilters = this.container.querySelector("#active-filters");
    if (!activeFilters) return;

    let badgesHTML = "";

    // Create badge for status filter
    if (this.filters.status) {
      let statusLabel = this.filters.status;

      // Map the status values to more readable labels
      const statusMap = {
        all: "All Active Statuses",
        all_including_hidden: "All Statuses (including hidden)",
        active: "Active Orders",
        pending: "Pending",
        processing: "Processing",
        completed: "Completed",
        cancelled: "Cancelled",
      };

      if (statusMap[statusLabel]) {
        statusLabel = statusMap[statusLabel];
      }

      badgesHTML += `
        <div class="filter-badge" data-filter-type="status">
          Status: ${statusLabel}
          <button title="Remove filter"><i class="fas fa-times"></i></button>
        </div>
      `;
    }

    // Create badge for date from filter
    if (this.filters.dateFrom) {
      badgesHTML += `
        <div class="filter-badge" data-filter-type="dateFrom">
          From: ${this.filters.dateFrom}
          <button title="Remove filter"><i class="fas fa-times"></i></button>
        </div>
      `;
    }

    // Create badge for date to filter
    if (this.filters.dateTo) {
      badgesHTML += `
        <div class="filter-badge" data-filter-type="dateTo">
          To: ${this.filters.dateTo}
          <button title="Remove filter"><i class="fas fa-times"></i></button>
        </div>
      `;
    }

    activeFilters.innerHTML = badgesHTML;
  }

  // Update filter status text
  updateFilterStatus(totalRecords) {
    const filterStatus = this.container.querySelector("#filter-status");
    if (!filterStatus) return;

    // Check if any filters are active
    const hasFilters =
      this.filters.status || this.filters.dateFrom || this.filters.dateTo;

    if (hasFilters) {
      filterStatus.innerHTML = `Showing <span>${totalRecords}</span> ${
        totalRecords === 1 ? "order" : "orders"
      } matching your filters`;
    } else {
      filterStatus.innerHTML = `Showing <span>${totalRecords}</span> ${
        totalRecords === 1 ? "order" : "orders"
      } (completed and cancelled orders are hidden by default)`;
    }
  }

  // Get icon for material category
  getMaterialCategoryIcon(category) {
    // Простая логика выбора иконки на основе названия категории
    const lowercaseCategory = category.toLowerCase();

    if (
      lowercaseCategory.includes("paint") ||
      lowercaseCategory.includes("краск")
    ) {
      return "fa-paint-roller";
    } else if (
      lowercaseCategory.includes("tool") ||
      lowercaseCategory.includes("инструмент")
    ) {
      return "fa-tools";
    } else if (
      lowercaseCategory.includes("wood") ||
      lowercaseCategory.includes("дерев")
    ) {
      return "fa-tree";
    } else if (
      lowercaseCategory.includes("pipe") ||
      lowercaseCategory.includes("труб")
    ) {
      return "fa-grip-lines";
    } else if (
      lowercaseCategory.includes("cable") ||
      lowercaseCategory.includes("wire") ||
      lowercaseCategory.includes("кабель")
    ) {
      return "fa-plug";
    } else if (
      lowercaseCategory.includes("light") ||
      lowercaseCategory.includes("lamp") ||
      lowercaseCategory.includes("свет")
    ) {
      return "fa-lightbulb";
    } else if (
      lowercaseCategory.includes("door") ||
      lowercaseCategory.includes("двер")
    ) {
      return "fa-door-open";
    } else if (
      lowercaseCategory.includes("window") ||
      lowercaseCategory.includes("окно") ||
      lowercaseCategory.includes("окон")
    ) {
      return "fa-window-maximize";
    } else if (
      lowercaseCategory.includes("tile") ||
      lowercaseCategory.includes("плитк")
    ) {
      return "fa-th-large";
    } else if (
      lowercaseCategory.includes("cement") ||
      lowercaseCategory.includes("concrete") ||
      lowercaseCategory.includes("цемент")
    ) {
      return "fa-cubes";
    } else if (
      lowercaseCategory.includes("glass") ||
      lowercaseCategory.includes("стекл")
    ) {
      return "fa-glass-martini-alt";
    } else if (
      lowercaseCategory.includes("metal") ||
      lowercaseCategory.includes("метал")
    ) {
      return "fa-hammer";
    } else if (
      lowercaseCategory.includes("hardware") ||
      lowercaseCategory.includes("крепеж")
    ) {
      return "fa-screwdriver";
    } else if (
      lowercaseCategory.includes("electric") ||
      lowercaseCategory.includes("электр")
    ) {
      return "fa-bolt";
    } else if (
      lowercaseCategory.includes("plumbing") ||
      lowercaseCategory.includes("сантех")
    ) {
      return "fa-faucet";
    } else if (
      lowercaseCategory.includes("floor") ||
      lowercaseCategory.includes("пол")
    ) {
      return "fa-shoe-prints";
    } else if (
      lowercaseCategory.includes("wall") ||
      lowercaseCategory.includes("стен")
    ) {
      return "fa-border-all";
    } else if (
      lowercaseCategory.includes("roof") ||
      lowercaseCategory.includes("крыш")
    ) {
      return "fa-home";
    } else if (
      lowercaseCategory.includes("insulation") ||
      lowercaseCategory.includes("изоляц")
    ) {
      return "fa-temperature-low";
    }

    // Иконка по умолчанию
    return "fa-box";
  }

  // Render grouped materials
  renderGroupedMaterials(materialsData) {
    if (!materialsData || Object.keys(materialsData).length === 0) {
      return '<div class="items-list">No items</div>';
    }

    let html = '<div class="items-list">';

    // Iterate through each category
    Object.keys(materialsData).forEach((category) => {
      const materials = materialsData[category];
      const iconClass = this.getMaterialCategoryIcon(category);

      html += `
        <div class="items-group">
          <div class="items-group-title">
            <i class="fas ${iconClass}"></i>
            ${category}
          </div>
          <div class="items-group-content">
      `;

      // Add each material in this category
      materials.forEach((material) => {
        html += `
          <div class="material-item">
            <div class="material-name">${material.material_name}</div>
            <div class="material-quantity">${material.quantity} ${material.unit}</div>
          </div>
        `;
      });

      html += "</div></div>";
    });

    html += "</div>";
    return html;
  }

  renderSupplies() {
    const suppliesList = this.container.querySelector("#supplies-list");
    if (!suppliesList) return;

    if (this.supplies.length === 0) {
      suppliesList.innerHTML =
        '<div class="no-supplies">No supplies orders found</div>';
      return;
    }

    let html = "";

    // Создаем оверлей для затемнения фона
    if (!document.querySelector(".receipts-overlay")) {
      const overlay = document.createElement("div");
      overlay.className = "receipts-overlay";
      document.body.appendChild(overlay);

      // Закрываем модальное окно при клике на оверлей
      overlay.addEventListener("click", () => {
        this.closeAllReceiptSections();
      });
    }

    this.supplies.forEach((order) => {
      // Format date
      const orderDate = new Date(order.created_at);
      const formattedDate =
        orderDate.toLocaleDateString() + " " + orderDate.toLocaleTimeString();

      // Status class
      const statusClass = this.getStatusClass(order.status);

      // Status buttons based on status - будут размещены в верхней части
      let statusButtons = "";
      if (order.status === "pending") {
        statusButtons = `
          <button class="process-order-btn" data-order-id="${order.id}">Process Order</button>
          <button class="cancel-order-btn" data-order-id="${order.id}">Cancel</button>
        `;
      } else if (order.status === "processing") {
        statusButtons = `
          <button class="complete-order-btn" data-order-id="${order.id}">Complete Order</button>
          <button class="cancel-order-btn" data-order-id="${order.id}">Cancel</button>
        `;
      }

      // Action buttons для нижней части карточки
      let actionButtons = `
        <button class="print-order-btn" data-order-id="${order.id}">
          <i class="fas fa-print"></i> Print
        </button>
        <button class="toggle-receipts-btn" data-order-id="${order.id}">
          <i class="fas fa-receipt"></i> Receipts
          <i class="fas fa-angle-down toggle-icon"></i>
        </button>
      `;

      // Генерация HTML для материалов
      let materialsHtml = "";

      // Если есть структурированные данные, используем их
      if (
        order.materials_data &&
        Object.keys(order.materials_data).length > 0
      ) {
        materialsHtml = this.renderGroupedMaterials(order.materials_data);
      } else {
        // Иначе используем стандартный формат
        materialsHtml = `<div class="items-list">${
          order.items_list || "No items"
        }</div>`;
      }

      html += `
        <div class="supply-card ${statusClass}" id="supply-card-${order.id}">
          <div class="supply-card-header">
            <h3>Order #${order.id}</h3>
            <div class="status-container">
              <div class="supply-status">${this.getStatusLabel(
                order.status
              )}</div>
              <div class="status-actions">
                ${statusButtons}
              </div>
            </div>
          </div>
          <div class="supply-info">
            <div class="supply-requester">Requested by: ${order.user_name}</div>
            <div class="supply-date">Date: ${formattedDate}</div>
          </div>
          <div class="supply-items">
            <h4>Items:</h4>
            ${materialsHtml}
          </div>
          ${
            order.notes
              ? `
            <div class="supply-notes">
              <h4>Notes:</h4>
              <p>${order.notes}</p>
            </div>
          `
              : ""
          }
          <div class="supply-actions">
            ${actionButtons}
          </div>
        </div>
      `;
    });

    suppliesList.innerHTML = html;

    // Создаем отдельные модальные окна для каждого заказа
    this.createReceiptModals();
  }

  // Создаем модальные окна для чеков отдельно от карточек
  createReceiptModals() {
    // Удаляем существующие модальные окна
    const existingModals = document.querySelectorAll(".receipts-section");
    existingModals.forEach((modal) => modal.remove());

    // Создаем новые модальные окна для каждого заказа
    this.supplies.forEach((order) => {
      const receiptModal = document.createElement("div");
      receiptModal.className = "receipts-section";
      receiptModal.id = `receipts-section-${order.id}`;

      // Содержимое модального окна
      receiptModal.innerHTML = `
        <button class="close-receipts-btn" data-order-id="${order.id}">
          <i class="fas fa-times"></i>
        </button>
        <div class="receipts-header">
          <h4>Receipts and Invoices - Order #${order.id}</h4>
          <button class="upload-receipt-btn" data-order-id="${order.id}">
            <i class="fas fa-upload"></i> Upload
          </button>
        </div>
        <div class="receipts-gallery" id="receipts-gallery-${order.id}">
          <div class="no-receipts">No receipts uploaded yet</div>
        </div>
      `;

      document.body.appendChild(receiptModal);

      // Добавляем обработчик для кнопки закрытия
      const closeBtn = receiptModal.querySelector(".close-receipts-btn");
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeReceiptSection(order.id);
      });

      // Добавляем обработчик для кнопки загрузки
      const uploadBtn = receiptModal.querySelector(".upload-receipt-btn");
      uploadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showUploadReceiptDialog(order.id);
        console.log("Нажата кнопка загрузки файла для заказа #" + order.id);
      });
    });
  }

  updateOrderStatus(orderId, status) {
    if (!orderId || !status) return;

    const formData = new FormData();
    formData.append("action", "updateSupplyOrderStatus");
    formData.append("order_id", orderId);
    formData.append("status", status);

    // Используем правильный относительный путь к API
    const apiUrl =
      window.location.origin +
      "/Maintenance_P/Inspections-Checklist-Portal/api/supplies-api.php";
    console.log(
      `Updating order ${orderId} status to ${status} via API:`,
      apiUrl
    );

    fetch(apiUrl, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Get text response first to handle any JSON issues
        return response.text();
      })
      .then((text) => {
        console.log("Raw status update response:", text);
        // Try to safely parse the JSON
        return this.safelyParseJson(text);
      })
      .then((data) => {
        console.log("Status update response:", data);
        if (data.success) {
          // Reload supplies to reflect changes
          this.loadSupplies();
          // Update new orders count
          this.updateNewOrdersCount();
        } else {
          alert(
            "Error updating order status: " + (data.message || "Unknown error")
          );
        }
      })
      .catch((error) => {
        console.error("Error updating order status:", error);
        alert("Error updating order status. Please try again.");
      });
  }

  // Метод для обновления количества новых заказов
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

        // Обрабатываем ответ с помощью безопасного парсера
        const data = this.safelyParseJson(text);

        if (data && data.success && typeof data.count === "number") {
          this.updateOrdersBadge(data.count);
        } else {
          console.warn("Could not extract order count from API response");
        }
      })
      .catch((error) => {
        console.error("Error updating new orders count:", error);
      });
  }

  // Вспомогательный метод для безопасного парсинга JSON
  safelyParseJson(text) {
    if (!text) return null;

    // Проверим простой случай - валидный JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      console.log("Simple JSON parse failed, trying alternative methods");
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

    // Запасной вариант: регулярное выражение для простых случаев
    if (
      jsonObjects.length === 0 &&
      text.includes('"success":true') &&
      text.includes('"count":')
    ) {
      const match = text.match(/"count":(\d+)/);
      if (match && match[1]) {
        return { success: true, count: parseInt(match[1]) };
      }
    }

    // Возвращаем последний валидный объект, если есть
    return jsonObjects.length > 0 ? jsonObjects[jsonObjects.length - 1] : null;
  }

  // Обновляем счетчик в значке корзины
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

  // Add this new method for printing orders
  printOrder(orderId) {
    // Find the order data
    const order = this.supplies.find((order) => order.id == orderId);
    if (!order) {
      console.error("Order not found:", orderId);
      return;
    }

    // Format date
    const orderDate = new Date(order.created_at);
    const formattedDate =
      orderDate.toLocaleDateString() + " " + orderDate.toLocaleTimeString();

    // Prepare items table HTML
    let itemsTableHTML = "";

    // Check if we have structured materials data
    if (order.materials_data && Object.keys(order.materials_data).length > 0) {
      itemsTableHTML = `
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 30px;"></th>
              <th>Category</th>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
      `;

      // Iterate through each category
      Object.keys(order.materials_data).forEach((category) => {
        const materials = order.materials_data[category];
        const rowCount = materials.length;
        const iconClass = this.getMaterialCategoryIcon(category);

        // Add each material in this category
        materials.forEach((material, index) => {
          if (index === 0) {
            // First item in category shows the category name with rowspan
            itemsTableHTML += `
              <tr>
                <td rowspan="${rowCount}" class="icon-cell">
                  <i class="fas ${iconClass}"></i>
                </td>
                <td rowspan="${rowCount}" class="category-cell">${category}</td>
                <td>${material.material_name}</td>
                <td>${material.quantity}</td>
                <td>${material.unit}</td>
              </tr>
            `;
          } else {
            // Other items in the same category
            itemsTableHTML += `
              <tr>
                <td>${material.material_name}</td>
                <td>${material.quantity}</td>
                <td>${material.unit}</td>
              </tr>
            `;
          }
        });
      });

      itemsTableHTML += "</tbody></table>";
    } else {
      // Fallback to original implementation
      // Parse items list into structured format
      const itemsList = order.items_list || "No items";
      let itemsArray = [];

      if (itemsList !== "No items") {
        // Parse items from comma-separated format: "Item1 (quantity unit), Item2 (quantity unit)"
        itemsArray = itemsList.split(", ").map((item) => {
          const match = item.match(/(.*?) \((\d+) (.*?)\)/);
          if (match) {
            return {
              name: match[1],
              quantity: match[2],
              unit: match[3],
            };
          }
          return { name: item, quantity: "", unit: "" };
        });
      }

      itemsTableHTML = `
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            ${
              itemsArray.length > 0
                ? itemsArray
                    .map(
                      (item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit}</td>
                </tr>
              `
                    )
                    .join("")
                : '<tr><td colspan="3">No items</td></tr>'
            }
          </tbody>
        </table>
      `;
    }

    // Create print template with a table for items
    const printTemplate = `
      <div class="print-container">
        <div class="print-header">
          <h1>Supply Order #${order.id}</h1>
          <div class="print-status">${this.getStatusLabel(order.status)}</div>
        </div>
        
        <div class="print-details">
          <p><strong>Requested by:</strong> ${order.user_name}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ""}
        </div>
        
        <div class="print-items">
          <h2>Order Items</h2>
          ${itemsTableHTML}
        </div>
        
        <div class="print-footer">
          <p>Printed on: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Supply Order #${order.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .print-container {
              max-width: 800px;
              margin: 0 auto;
            }
            .print-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .print-status {
              font-weight: bold;
              padding: 5px 10px;
              border-radius: 4px;
              color: white;
              background-color: ${
                order.status === "pending"
                  ? "#f39c12"
                  : order.status === "processing"
                  ? "#3498db"
                  : order.status === "completed"
                  ? "#2ecc71"
                  : order.status === "cancelled"
                  ? "#e74c3c"
                  : "#999"
              };
            }
            .print-details {
              margin-bottom: 30px;
            }
            .print-items h2 {
              margin-bottom: 15px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .items-table th, .items-table td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            .items-table th {
              background-color: #f5f5f5;
            }
            .category-cell {
              background-color: #f9f9f9;
              font-weight: 600;
            }
            .icon-cell {
              text-align: center;
              background-color: #f5f5f5;
              font-size: 1.2rem;
              color: #3498db;
            }
            .print-footer {
              margin-top: 50px;
              border-top: 1px solid #ddd;
              padding-top: 10px;
              font-size: 12px;
              color: #777;
              text-align: center;
            }
            @media print {
              body {
                padding: 0;
              }
              .print-container {
                max-width: 100%;
              }
            }
          </style>
        </head>
        <body>
          ${printTemplate}
          <script>
            // Auto print and close after loading
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Helper methods
  getStatusClass(status) {
    const classes = {
      pending: "status-pending",
      processing: "status-processing",
      completed: "status-completed",
      cancelled: "status-cancelled",
    };

    return classes[status] || "";
  }

  getStatusLabel(status) {
    const labels = {
      pending: "Pending",
      processing: "Processing",
      completed: "Completed",
      cancelled: "Cancelled",
    };

    return labels[status] || "Unknown";
  }

  // Toggle the receipts section visibility
  toggleReceiptsSection(orderId) {
    const receiptsSection = document.getElementById(
      `receipts-section-${orderId}`
    );
    const overlay = document.querySelector(".receipts-overlay");
    if (!receiptsSection || !overlay) return;

    const supplyCard = document.getElementById(`supply-card-${orderId}`);
    const toggleBtn = supplyCard.querySelector(".toggle-receipts-btn");
    const toggleIcon = toggleBtn
      ? toggleBtn.querySelector(".toggle-icon")
      : null;

    // Текущее состояние (открыто/закрыто)
    const isCurrentlyClosed = !receiptsSection.classList.contains("active");

    // Если открываем секцию
    if (isCurrentlyClosed) {
      // Сначала закрываем все открытые секции
      this.closeAllReceiptSections();

      // Затем открываем нужную секцию
      supplyCard.classList.add("expanded");
      receiptsSection.classList.add("active");
      overlay.classList.add("active");

      // Обновляем кнопку
      if (toggleIcon) toggleIcon.classList.add("rotated");

      // Загружаем данные о чеках
      this.loadReceipts(orderId);
    } else {
      // Закрываем секцию
      this.closeReceiptSection(orderId);
    }
  }

  // Метод для закрытия всех открытых секций чеков
  closeAllReceiptSections() {
    const allReceiptSections = document.querySelectorAll(".receipts-section");
    const overlay = document.querySelector(".receipts-overlay");

    allReceiptSections.forEach((section) => {
      if (section.classList.contains("active")) {
        const cardId = section.id.replace("receipts-section-", "");
        this.closeReceiptSection(cardId);
      }
    });

    // Скрываем оверлей
    if (overlay) {
      overlay.classList.remove("active");
    }

    // Снимаем выделение со всех карточек
    const allExpandedCards = document.querySelectorAll(".supply-card.expanded");
    allExpandedCards.forEach((card) => {
      card.classList.remove("expanded");

      // Сбрасываем состояние иконки
      const btn = card.querySelector(".toggle-receipts-btn");
      if (btn) {
        const icon = btn.querySelector(".toggle-icon");
        if (icon) icon.classList.remove("rotated");
      }
    });
  }

  // Метод для закрытия конкретной секции чеков
  closeReceiptSection(orderId) {
    const receiptsSection = document.getElementById(
      `receipts-section-${orderId}`
    );
    const overlay = document.querySelector(".receipts-overlay");
    const supplyCard = document.getElementById(`supply-card-${orderId}`);
    if (!receiptsSection || !supplyCard) return;

    const toggleBtn = supplyCard.querySelector(".toggle-receipts-btn");
    const toggleIcon = toggleBtn
      ? toggleBtn.querySelector(".toggle-icon")
      : null;

    // Закрываем секцию
    supplyCard.classList.remove("expanded");
    receiptsSection.classList.remove("active");

    // Скрываем оверлей, если больше нет открытых секций
    const anyActive = document.querySelector(".receipts-section.active");
    if (!anyActive && overlay) {
      overlay.classList.remove("active");
    }

    // Сбрасываем состояние кнопки
    if (toggleIcon) toggleIcon.classList.remove("rotated");
  }

  // Load receipts for an order
  loadReceipts(orderId) {
    const receiptsGallery = document.getElementById(
      `receipts-gallery-${orderId}`
    );
    if (!receiptsGallery) return;

    // Show loading state
    receiptsGallery.innerHTML =
      '<div class="loading-receipts">Loading...</div>';

    // Prepare API request
    const formData = new FormData();
    formData.append("action", "getOrderReceipts");
    formData.append("order_id", orderId);

    const apiUrl =
      window.location.origin +
      "/Maintenance_P/Inspections-Checklist-Portal/api/supplies-api.php";

    fetch(apiUrl, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then((text) => {
        console.log("Raw receipts API response:", text);
        return this.safelyParseJson(text);
      })
      .then((data) => {
        console.log("Receipts data:", data);

        if (data && data.success && data.receipts) {
          const receipts = data.receipts;

          if (receipts.length === 0) {
            receiptsGallery.innerHTML =
              '<div class="no-receipts">No receipts uploaded yet</div>';
          } else {
            receiptsGallery.innerHTML = receipts
              .map(
                (receipt) => `
            <div class="receipt-thumbnail" data-url="${
              receipt.file_url
            }" data-order-id="${orderId}" data-receipt-id="${receipt.id}">
              <div class="thumbnail-container">
                <i class="fas ${this.getFileIcon(receipt.file_type)}"></i>
              </div>
              <div class="receipt-info">
                <div class="receipt-name">${receipt.file_name}</div>
                <div class="receipt-date">${new Date(
                  receipt.upload_date
                ).toLocaleDateString()}</div>
              </div>
              <button class="delete-receipt-btn" data-receipt-id="${
                receipt.id
              }" data-order-id="${orderId}" title="Delete receipt">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          `
              )
              .join("");
          }
        } else {
          receiptsGallery.innerHTML =
            '<div class="error">Failed to load receipts</div>';
        }
      })
      .catch((error) => {
        console.error("Error loading receipts:", error);
        receiptsGallery.innerHTML =
          '<div class="error">Error loading receipts</div>';
      });
  }

  // Show upload dialog for receipts
  showUploadReceiptDialog(orderId) {
    console.log("Метод showUploadReceiptDialog вызван для заказа #" + orderId);

    // Create a file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*,.pdf";
    fileInput.multiple = false;

    // When a file is selected, upload it
    fileInput.addEventListener("change", (e) => {
      console.log("Выбран файл, вызывается uploadReceipt");
      if (fileInput.files.length > 0) {
        this.uploadReceipt(orderId, fileInput.files[0]);
      }
    });

    // Trigger file selection dialog
    fileInput.click();
  }

  // Upload receipt file
  uploadReceipt(orderId, file) {
    console.log(
      "Метод uploadReceipt вызван для файла:",
      file.name,
      ", заказ #" + orderId
    );

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("File is too large. Maximum size is 10MB.");
      console.error("Файл слишком большой:", file.size, "байт");
      return;
    }

    // Check file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Please upload an image or PDF file.");
      console.error("Неверный тип файла:", file.type);
      return;
    }

    // Prepare form data for upload
    const formData = new FormData();
    formData.append("action", "uploadReceipt");
    formData.append("order_id", orderId);
    formData.append("receipt_file", file);

    const apiUrl =
      window.location.origin +
      "/Maintenance_P/Inspections-Checklist-Portal/api/supplies-api.php";

    console.log("Отправка файла на API:", apiUrl);

    // Show loading state in gallery
    const receiptsGallery = document.getElementById(
      `receipts-gallery-${orderId}`
    );
    if (receiptsGallery) {
      receiptsGallery.innerHTML =
        '<div class="loading-receipts">Uploading...</div>';
    }

    // Upload file
    fetch(apiUrl, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        console.log("Получен ответ от сервера:", response.status);
        return response.text();
      })
      .then((text) => {
        console.log("Raw upload response:", text);
        return this.safelyParseJson(text);
      })
      .then((data) => {
        console.log("Upload response:", data);

        if (data && data.success) {
          console.log("Файл успешно загружен!");
          // Reload receipts to show the new one
          this.loadReceipts(orderId);
        } else {
          console.error(
            "Ошибка загрузки файла:",
            data?.message || "Unknown error"
          );
          alert(
            "Failed to upload receipt: " + (data?.message || "Unknown error")
          );
          // Reload receipts to reset view
          this.loadReceipts(orderId);
        }
      })
      .catch((error) => {
        console.error("Error uploading receipt:", error);
        alert("Error uploading receipt. Please try again.");
        // Reload receipts to reset view
        this.loadReceipts(orderId);
      });
  }

  // Создаем модальное окно для предпросмотра файлов
  createPreviewModal() {
    // Удаляем существующее модальное окно, если оно есть
    const existingModal = document.getElementById("file-preview-modal");
    if (existingModal) {
      existingModal.remove();
    }

    // Создаем новое модальное окно
    const modal = document.createElement("div");
    modal.id = "file-preview-modal";
    modal.className = "file-preview-modal";

    modal.innerHTML = `
      <div class="file-preview-overlay"></div>
      <div class="file-preview-content">
        <button class="file-preview-close">&times;</button>
        <div class="file-preview-header">
          <h3 class="file-preview-title">File Preview</h3>
        </div>
        <div class="file-preview-body">
          <div class="file-preview-loading">Loading preview...</div>
          <div class="file-preview-error" style="display:none;">Could not preview this file</div>
          <div class="file-preview-iframe-container" style="display:none;">
            <iframe class="file-preview-iframe" src="" frameborder="0"></iframe>
          </div>
          <div class="file-preview-image-container" style="display:none;">
            <img class="file-preview-image" src="" alt="Preview" />
          </div>
        </div>
        <div class="file-preview-footer">
          <a href="#" class="file-preview-download-link" target="_blank" download>Download File</a>
          <a href="#" class="file-preview-open-link" target="_blank">Open in New Tab</a>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Обработчик закрытия модального окна
    const closeBtn = modal.querySelector(".file-preview-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closePreviewModal();
      });
    }

    const overlay = modal.querySelector(".file-preview-overlay");
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closePreviewModal();
      });
    }
  }

  // Метод для закрытия модального окна предпросмотра
  closePreviewModal() {
    const modal = document.getElementById("file-preview-modal");
    if (modal) {
      // Немедленно очищаем источники, чтобы прервать текущие загрузки
      const iframe = modal.querySelector(".file-preview-iframe");
      const img = modal.querySelector(".file-preview-image");

      // Применяем пустой src с обработкой ошибок
      if (img) {
        // Удаляем обработчики событий, чтобы избежать ошибок при отмене загрузки
        img.onload = null;
        img.onerror = null;
        img.src = "";
      }

      if (iframe) {
        iframe.onload = null;
        iframe.onerror = null;
        iframe.src = "";
      }

      // Скрываем модальное окно
      modal.classList.remove("active");

      // Дополнительная очистка после анимации закрытия
      setTimeout(() => {
        // Перезагружаем элементы DOM в случае изменений
        const containers = modal.querySelectorAll(
          ".file-preview-iframe-container, .file-preview-image-container"
        );
        containers.forEach((container) => {
          container.style.display = "none";
        });

        // Сбрасываем состояние экрана загрузки и ошибок
        const loading = modal.querySelector(".file-preview-loading");
        const error = modal.querySelector(".file-preview-error");
        if (loading) loading.style.display = "none";
        if (error) error.style.display = "none";
      }, 300);
    }
  }

  // View receipt (открывает в модальном окне)
  viewReceipt(url) {
    if (!url) {
      console.error("No URL provided for viewReceipt");
      return;
    }

    console.log("Opening receipt in modal preview:", url);

    try {
      // Флаг для проверки, открыто ли еще модальное окно
      let isModalActive = true;

      // Проверим URL на наличие полного пути (если начинается с http)
      let fullUrl = url;
      if (!url.startsWith("http")) {
        // Если URL относительный, добавим базовый путь
        fullUrl = window.location.origin + url;
        console.log("Converted to full URL:", fullUrl);
      }

      // Определяем тип файла по расширению
      const fileName = url.split("/").pop();
      const fileExtension = url.split(".").pop().toLowerCase();
      const isPdf = fileExtension === "pdf";
      const isImage = ["jpg", "jpeg", "png", "gif"].includes(fileExtension);

      console.log("File type detected:", {
        fileName,
        fileExtension,
        isPdf,
        isImage,
      });

      // Получаем модальное окно и его элементы
      const modal = document.getElementById("file-preview-modal");
      if (!modal) {
        console.error("Preview modal not found");
        // Создаем модальное окно, если оно еще не было создано
        this.createPreviewModal();
        setTimeout(() => this.viewReceipt(url), 100);
        return;
      }

      const loading = modal.querySelector(".file-preview-loading");
      const error = modal.querySelector(".file-preview-error");
      const iframeContainer = modal.querySelector(
        ".file-preview-iframe-container"
      );
      const imageContainer = modal.querySelector(
        ".file-preview-image-container"
      );
      const iframe = modal.querySelector(".file-preview-iframe");
      const image = modal.querySelector(".file-preview-image");
      const title = modal.querySelector(".file-preview-title");
      const downloadLink = modal.querySelector(".file-preview-download-link");
      const openLink = modal.querySelector(".file-preview-open-link");

      // Добавляем обработчик для отслеживания закрытия модального окна
      const checkModalClosed = () => {
        if (!modal.classList.contains("active")) {
          isModalActive = false;
        }
      };

      // Наблюдаем за изменениями класса модального окна
      const observer = new MutationObserver(checkModalClosed);
      observer.observe(modal, { attributes: true, attributeFilter: ["class"] });

      // Сбрасываем предыдущее состояние
      loading.style.display = "block";
      error.style.display = "none";
      iframeContainer.style.display = "none";
      imageContainer.style.display = "none";

      // Очищаем src для предотвращения проблем кэширования
      iframe.src = "";
      image.src = "";

      // Устанавливаем заголовок и ссылки
      title.textContent = fileName || "File Preview";
      downloadLink.href = fullUrl;
      openLink.href = fullUrl;

      // Открываем модальное окно
      modal.classList.add("active");

      // Проверяем существование файла (только для изображений)
      // Создаем тестовое изображение для проверки доступности
      if (isImage) {
        const testImage = new Image();
        testImage.onload = () => {
          // Проверяем, что модальное окно все еще открыто
          if (!isModalActive) return;

          console.log("Image pre-check successful, file exists:", fullUrl);
          showImage(fullUrl);
        };
        testImage.onerror = () => {
          // Проверяем, что модальное окно все еще открыто
          if (!isModalActive) return;

          console.error("Image pre-check failed, file may not exist:", fullUrl);

          // Массив возможных вариантов путей для проверки
          let alternativePaths = [];

          // Вариант 1: без /Maintenance_P в начале
          if (fullUrl.includes("/Maintenance_P")) {
            alternativePaths.push(fullUrl.replace("/Maintenance_P", ""));
          }

          // Вариант 2: добавление /uploads в начало
          if (!fullUrl.includes("/uploads")) {
            alternativePaths.push(window.location.origin + "/uploads" + url);
          }

          // Вариант 3: относительный путь изображения
          if (url.startsWith("/")) {
            alternativePaths.push(window.location.origin + url);
          }

          // Вариант 4: прямой путь из file_url без модификаций
          alternativePaths.push(url);

          console.log("Will try alternative URLs:", alternativePaths);

          // Функция для последовательной проверки альтернативных путей
          function tryNextPath(pathIndex) {
            // Проверяем, что модальное окно все еще открыто
            if (!isModalActive) return;

            if (pathIndex >= alternativePaths.length) {
              // Все пути проверены, но ни один не работает
              showError(
                "Image file not found or cannot be accessed. Please check the file path."
              );
              return;
            }

            const altUrl = alternativePaths[pathIndex];
            console.log(
              `Trying alternative URL ${pathIndex + 1}/${
                alternativePaths.length
              }:`,
              altUrl
            );

            const altTestImage = new Image();
            altTestImage.onload = () => {
              // Проверяем, что модальное окно все еще открыто
              if (!isModalActive) return;

              console.log("Alternative URL works:", altUrl);
              // Обновляем URL для основного изображения
              fullUrl = altUrl;
              downloadLink.href = fullUrl;
              openLink.href = fullUrl;
              showImage(fullUrl);
            };
            altTestImage.onerror = () => {
              // Проверяем, что модальное окно все еще открыто
              if (!isModalActive) return;

              console.error(`Alternative URL ${pathIndex + 1} failed:`, altUrl);
              // Пробуем следующий путь
              tryNextPath(pathIndex + 1);
            };
            // Добавляем параметр для предотвращения кэширования
            altTestImage.src =
              altUrl +
              (altUrl.includes("?") ? "&" : "?") +
              "check=" +
              new Date().getTime();
          }

          // Начинаем проверку с первого альтернативного пути
          tryNextPath(0);
        };

        // Запускаем первую проверку оригинального URL
        testImage.src = fullUrl + "?check=" + new Date().getTime();
      } else if (isPdf) {
        showPdf(fullUrl);
      } else {
        // Для остальных типов файлов показываем сообщение, что предпросмотр недоступен
        loading.style.display = "none";
        error.style.display = "block";
        error.textContent =
          "Preview not available for this file type. Please download the file.";
      }

      // Функция для отображения изображения
      function showImage(imageUrl) {
        // Проверяем, что модальное окно все еще открыто
        if (!isModalActive) return;

        image.onload = () => {
          // Еще раз проверяем, что модальное окно все еще открыто
          if (!isModalActive) return;

          loading.style.display = "none";
          imageContainer.style.display = "block";
        };

        image.onerror = () => {
          // Еще раз проверяем, что модальное окно все еще открыто
          if (!isModalActive) return;

          loading.style.display = "none";
          error.style.display = "block";
          error.textContent =
            "Failed to load image. The file may be corrupted or unavailable.";
          console.error("Failed to load image:", imageUrl);
        };

        setTimeout(() => {
          // Финальная проверка перед установкой src
          if (!isModalActive) return;

          image.src = imageUrl + "?t=" + new Date().getTime();
        }, 100);
      }

      // Функция для отображения PDF
      function showPdf(pdfUrl) {
        // Проверяем, что модальное окно все еще открыто
        if (!isModalActive) return;

        iframe.onload = () => {
          // Еще раз проверяем, что модальное окно все еще открыто
          if (!isModalActive) return;

          loading.style.display = "none";
          iframeContainer.style.display = "block";
        };

        iframe.onerror = () => {
          // Еще раз проверяем, что модальное окно все еще открыто
          if (!isModalActive) return;

          loading.style.display = "none";
          error.style.display = "block";
          error.textContent =
            "Failed to load PDF. The file may be corrupted or unavailable.";
          console.error("Failed to load PDF in iframe:", pdfUrl);
        };

        setTimeout(() => {
          // Финальная проверка перед установкой src
          if (!isModalActive) return;

          iframe.src = pdfUrl + "?t=" + new Date().getTime();
        }, 100);
      }

      // Функция для отображения ошибки
      function showError(message) {
        // Проверяем, что модальное окно все еще открыто
        if (!isModalActive) return;

        loading.style.display = "none";
        error.style.display = "block";
        error.textContent = message;
      }

      // При выходе из функции, отключаем наблюдатель за классами
      return () => {
        observer.disconnect();
      };
    } catch (error) {
      console.error("Error while trying to preview receipt:", error);
      alert("Failed to preview the file. Please try again or download it.");
    }
  }

  // Delete receipt
  deleteReceipt(receiptId, orderId) {
    console.log(
      `Attempting to delete receipt #${receiptId} from order #${orderId}`
    );

    if (!receiptId || !orderId) {
      console.error("Missing required data for deletion", {
        receiptId,
        orderId,
      });
      return;
    }

    // Confirm deletion
    if (
      !confirm(
        "Are you sure you want to delete this receipt? This action cannot be undone."
      )
    ) {
      console.log("Deletion cancelled by user");
      return;
    }

    console.log("Deletion confirmed, proceeding...");

    // Show loading state
    const receiptsGallery = document.getElementById(
      `receipts-gallery-${orderId}`
    );
    if (receiptsGallery) {
      receiptsGallery.innerHTML =
        '<div class="loading-receipts">Deleting...</div>';
    }

    // Prepare API request
    const formData = new FormData();
    formData.append("action", "deleteReceipt");
    formData.append("receipt_id", receiptId);

    const apiUrl =
      window.location.origin +
      "/Maintenance_P/Inspections-Checklist-Portal/api/supplies-api.php";
    console.log("Sending delete request to API:", apiUrl);

    fetch(apiUrl, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        console.log("API Response status:", response.status);
        return response.text();
      })
      .then((text) => {
        console.log("Raw delete receipt response:", text);
        return this.safelyParseJson(text);
      })
      .then((data) => {
        console.log("Parsed delete receipt response:", data);

        if (data && data.success) {
          console.log("Receipt deletion successful");
          // Reload receipts list
          this.loadReceipts(orderId);
        } else {
          console.error(
            "Receipt deletion failed:",
            data?.message || "Unknown error"
          );
          alert(
            "Failed to delete receipt: " + (data?.message || "Unknown error")
          );
          // Reload receipts to reset view
          this.loadReceipts(orderId);
        }
      })
      .catch((error) => {
        console.error("Error during receipt deletion:", error);
        alert("Error deleting receipt. Please try again.");
        // Reload receipts to reset view
        this.loadReceipts(orderId);
      });
  }

  // Get icon class based on file type
  getFileIcon(fileType) {
    if (!fileType) return "fa-file";

    // Проверка на MIME тип
    if (fileType.startsWith && fileType.startsWith("image/"))
      return "fa-file-image";
    if (fileType === "application/pdf") return "fa-file-pdf";

    // Проверка на расширение файла
    const iconMap = {
      pdf: "fa-file-pdf",
      jpg: "fa-file-image",
      jpeg: "fa-file-image",
      png: "fa-file-image",
      gif: "fa-file-image",
      doc: "fa-file-word",
      docx: "fa-file-word",
      xls: "fa-file-excel",
      xlsx: "fa-file-excel",
      ppt: "fa-file-powerpoint",
      pptx: "fa-file-powerpoint",
      zip: "fa-file-archive",
      rar: "fa-file-archive",
      txt: "fa-file-alt",
    };

    const extension = fileType.toLowerCase();
    return iconMap[extension] || "fa-file";
  }
}
