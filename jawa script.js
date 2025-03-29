// Создаем WebSocket соединение
const requestWS = new WebSocket("ws://localhost:2346");

window.onload = function () {
  // При открытии соединения
  requestWS.onopen = function () {
    console.log("Подключено к WebSocket серверу");
  };

  // При получении сообщения
  requestWS.onmessage = function (e) {
    try {
      const response = JSON.parse(e.data);
      console.log("Получен ответ:", response);

      if (response.type === "tasks") {
        // Обработка полученных задач
        const tasks = response.data;
        console.log("Получены задачи:", tasks);
        // Здесь можно вызвать функцию для отображения задач
        displayUserTasks(tasks);
      } else if (response.type === "error") {
        console.error("Ошибка сервера:", response.message);
      }
    } catch (error) {
      console.error("Ошибка парсинга JSON:", error);
      console.log("Полученные данные:", e.data);
    }
  };

  // При ошибке
  requestWS.onerror = function (e) {
    console.error("WebSocket ошибка: " + e.message);
  };

  
  // При закрытии соединения
  requestWS.onclose = function () {
    console.log("Соединение закрыто");
  };
}


// В начале файла добавим функцию для проверки текущего пользователя
async function checkCurrentUser() {
  try {
    await db.waitForDB();
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (currentUser) {
    } else {
      console.error("Error checking current user:", error);
    }
  } catch (error) {
    console.error("Error checking current user:", error);
  }
}

// Проверяем авторизацию при загрузке страницы
document.addEventListener("DOMContentLoaded", async function () {
  try {
    await db.waitForDB();
    await checkCurrentUser(); // Добавляем проверку пользователя
    //   const users = await db.getAllUsers();
    let currUser = JSON.parse(localStorage.getItem("currentUser"));
    //   if (users && users.length > 0) {
    if (currUser != null) {
      await initializeForm();
    } else {
      console.log("No registered users found");
    }
  } catch (error) {
    console.error("Error initializing page:", error);
    alert("Error loading page. Please try again.");
  }
});

// Функция инициализации формы
async function initializeForm() {
  // Проверяем существование формы
  const form = document.querySelector("form");
  if (!form) return; // Если формы нет, прекращаем выполнение

  const userBuildingSelect = document.getElementById("userBuildingSelect");
  const userRoomSelect = document.getElementById("userRoomSelect");
  const userStaffSelect = document.getElementById("userStaffSelect");
  //const staffTypeRadios = document.getElementsByName("staffType");
  const staffSelectContainer = document.getElementById("staffSelectContainer");
  //const staffSelect = document.getElementById("staffSelect");
  const requestForm = document.getElementById("requestForm");

  console.log("userBuildingSelect: " + userBuildingSelect);
  console.log("userRoomSelect: " + userRoomSelect);
  console.log("userStaffSelect: " + userStaffSelect);
  console.log("staffSelectContainer: " + staffSelectContainer);
  console.log("requestForm: " + requestForm);
  // Проверяем наличие необходимых элементов
  if (
    !userBuildingSelect ||
    !userRoomSelect ||
    !userStaffSelect ||
    !staffSelectContainer ||
    !requestForm
  ) {
    console.log("Some form elements are missing");
    return;
  }

  let selectedPriority = null;
  console.log("selectedBuilding: ");
  // Функция для анимации загрузки
  function startLoadingAnimation(element) {
    let dots = "";
    const maxDots = 5;
    const interval = setInterval(() => {
      dots += ".";
      if (dots.length > maxDots) {
        dots = "";
      }
      element.value = `${dots}`;
    }, 250);
    return interval;
  }

  // Запускаем анимацию загрузки
  const buildingLoadingInterval = startLoadingAnimation(userBuildingSelect);
  const roomLoadingInterval = startLoadingAnimation(userRoomSelect);
  const staffLoadingInterval = startLoadingAnimation(userStaffSelect);

  // Получаем местоположение пользователя
  let userLocation = await getUserLocation();

  // Останавливаем анимацию загрузки
  clearInterval(buildingLoadingInterval);
  clearInterval(roomLoadingInterval);
  clearInterval(staffLoadingInterval);

  // Устанавливаем полученные значения
  userBuildingSelect.value = userLocation.building;
  userRoomSelect.value = userLocation.room;
  userStaffSelect.value = userLocation.staffType;

  /*
  buildingSelect.addEventListener("change", function () {
    const selectedBuilding = this.value;
    console.log("selectedBuilding: " + selectedBuilding);
    if (selectedBuilding) {
      roomSelection.style.display = "block";
      populateRoomSelect(selectedBuilding);
    } else {
      roomSelection.style.display = "none";
      teacherSelection.style.display = "none";
      requestForm.style.display = "none";
    }
  });

  // Обработчик выбора комнаты
  roomSelect.addEventListener("change", function () {
    if (this.value) {
      teacherSelection.style.display = "block";
      staffTypeRadios[0].checked = false;
      staffTypeRadios[1].checked = false;
      staffSelectContainer.style.display = "none";
      requestForm.style.display = "none";
    } else {
      teacherSelection.style.display = "none";
      requestForm.style.display = "none";
    }
  });

  // Обработчики выбора типа сотрудника
  async function handleStaffTypeSelection() {
    const selectedRoom = roomSelect.value;
    const staffType = this.value;
    if (selectedRoom && staffType) {
      await populateStaffSelect(selectedRoom, staffType);
      staffSelectContainer.style.display = "block";
    }
  }

  staffTypeRadios[0].addEventListener("change", handleStaffTypeSelection);
  staffTypeRadios[1].addEventListener("change", handleStaffTypeSelection);

  // Обработчик выбора сотрудника
  staffSelect.addEventListener("change", async function () {
    console.log("sel.staf. " + this.value);
    if (this.value) {
      const selectedStaff = this.value;
      const isAuthorized = await checkUserAuthorization(selectedStaff);

      if (isAuthorized) {
        requestForm.style.display = "block";
      } else {
        alert("Please register or login to submit maintenance requests.");
        window.location.href = "register.html";
      }
    } else {
      requestForm.style.display = "none";
    }
  });
*/
  // Функция проверки авторизации пользователя
  async function checkUserAuthorization(selectedStaff) {
    try {
      await db.waitForDB(); // Дожидаемся инициализации базы данных
      const user = await db.getUserByNameFromServer(selectedStaff);
      return !!user;
    } catch (error) {
      console.error("Error checking authorization:", error);
      return false;
    }
  }

  // Обработчики кнопок приоритета
  const priorityButtons = document.querySelectorAll(".priority-btn");

  priorityButtons.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault(); // Предотвращаем отправку формы
      // Убираем выделение со всех кнопок
      priorityButtons.forEach((b) => b.classList.remove("selected"));
      // Добавляем выделение на нажатую кнопку
      this.classList.add("selected");
      selectedPriority = this.dataset.priority;
    });
  });

  // Обработчик отправки формы
  //generateRequestId()
  //addTaskWithMedia()
  //showConfirmationModal()

  document
    .getElementById("submitRequest")
    .addEventListener("click", async function (e) {
      e.preventDefault();

      if (!selectedPriority) {
        alert("Please select a priority level");
        return;
      }

      const building = userBuildingSelect.value;
      const room = userRoomSelect.value;
      const staff = JSON.parse(localStorage.getItem("currentUser")).fullName;
      const details = document.getElementById("requestDetails").value;

      if (!details.trim()) {
        alert("Please provide maintenance request details");
        return;
      }

      const mediaFiles = document.getElementById("mediaFiles").files;

      try {
        // Получаем информацию о текущем пользователе
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));

        const requestData = {
          requestId: generateRequestId(),
          building,
          room,
          staff,
          priority: selectedPriority,
          details,
          timestamp: getDallasDateTime(),
          status: "Pending",
          assignedTo: null,
          comments: [],
          media: [],
          submittedBy: currentUser ? currentUser.fullName : "Anonymous",
        };

        console.log("ХРЕН ТЕБЕ:", requestData);

        // Сохраняем задачу с медиафайлами
        const success = await db.addTaskWithMedia(requestData, mediaFiles);

        if (success) {
          console.log("Task saved successfully"); 
          console.log("mediaFiles.length: " + mediaFiles.length); 
          console.log("Array.from(mediaFiles): " + Array.from(mediaFiles));

          requestWS.send(JSON.stringify({...requestData, action: "addTask"}));

          showConfirmationModal(requestData.requestId);

          // Очищаем форму
          document.querySelector("form").reset();
          selectedPriority = null;
          document
            .querySelectorAll(".priority-btn")
            .forEach((btn) => btn.classList.remove("selected"));
          document.getElementById("mediaPreview").innerHTML = "";
        } else {
          throw new Error("Failed to save request");
        }
      } catch (error) {
        console.error("Error saving request:", error);
        alert("Error saving request. Please try again.");
      }
    });

  // Добавим обработчик для предпросмотра медиафайлов
  document
    .getElementById("mediaFiles")
    .addEventListener("change", function (e) {
      const preview = document.getElementById("mediaPreview");
      preview.innerHTML = "";

      if (this.files.length > 0) {
        preview.style.display = "grid";

        Array.from(this.files).forEach((file) => {
          const reader = new FileReader();

          reader.onload = function (e) {
            if (file.type.startsWith("image/")) {
              const img = document.createElement("img");
              img.src = e.target.result;
              preview.appendChild(img);
            } else if (file.type.startsWith("video/")) {
              const video = document.createElement("video");
              video.src = e.target.result;
              video.controls = true;
              preview.appendChild(video);
            }
          };

          reader.readAsDataURL(file);
        });
      } else {
        preview.style.display = "none";
      }
    });
}

// Функция для генерации ID запроса
function generateRequestId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `REQ-${timestamp}-${random}`.toUpperCase();
}

// Функция для показа модального окна
function showConfirmationModal(requestId) {
  try {
    const modal = document.getElementById("confirmationModal");
    if (!modal) {
      console.error("Modal element not found");
      return;
    }

    const requestIdElement = document.getElementById("requestId");
    if (requestIdElement) {
      requestIdElement.textContent = requestId;
    }

    modal.style.display = "flex";
  } catch (error) {
    console.error("Error showing confirmation modal:", error);
    alert("Request saved successfully. Request ID: " + requestId);
  }
}

// Обработчик для закрытия модального окна
document.getElementById("closeModal").addEventListener("click", function () {
  document.getElementById("confirmationModal").style.display = "none";
  // Опционально: очистить форму или перезагрузить страницу
  location.reload();
});

// Закрытие модального окна при клике вне его
document
  .getElementById("confirmationModal")
  .addEventListener("click", function (e) {
    if (e.target === this) {
      this.style.display = "none";
      location.reload();
    }
  });

// Функция для заполнения списка комнат
function populateRoomSelect(building) {
  const roomSelect = document.getElementById("roomSelect");
  roomSelect.innerHTML = '<option value="">Select Room</option>';

  const rooms = buildingRooms[building] || [];
  rooms.forEach((room) => {
    const option = document.createElement("option");
    option.value = room;
    option.textContent = room;
    roomSelect.appendChild(option);
  });
}

// Функция для заполнения списка сотрудников
async function populateStaffSelect(room, staffType) {
  try {
    await db.waitForDB(); // Дожидаемся инициализации базы данных
    const staffSelect = document.getElementById("staffSelect");
    staffSelect.innerHTML = '<option value="">Select Staff Member</option>';

    if (roomTeachers[room]) {
      const staffList =
        staffType === "mainTeacher"
          ? roomTeachers[room].mainTeacher
          : roomTeachers[room].assistant;

      const registeredUsers = await db.getAllUsersFromServer();
      console.log("Registered users:", registeredUsers); // Для отладки
      console.log("staffList users:", staffList);

      const availableStaff = staffList.filter((staff) =>
        registeredUsers.some((user) => user.full_name === staff)
      );
      console.log("Available staff:", availableStaff); // Для отладки

      availableStaff.forEach((staff) => {
        const option = document.createElement("option");
        option.value = staff;
        option.textContent = staff;
        staffSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error populating staff select:", error);
  }
}

/*
// Обновим обработчик для кнопки выхода
document
  .getElementById("logoutButton")
  .addEventListener("click", async function () {
    try {
      localStorage.removeItem("currentUser");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  });
*/
// Обновим функцию отправки запроса
async function submitRequest(formData) {
  try {
    // Добавим текущее время Далласа
    formData.timestamp = getDallasDateTime();

    // ... остальной код отправки ...
  } catch (error) {
    console.error("Error submitting request:", error);
  }
}

function formatDateFromTimestamp(timestamp) {
  // Разбиваем строку на части
  const [month, day, year] = timestamp.split(",")[0].split("/");

  // Форматируем дату в нужный формат
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

async function getUserLocation() {
  try {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || !currentUser.email) {
      throw new Error("User not logged in");
    }

    const formData = new FormData();
    formData.append("action", "getUserLocation");
    formData.append("email", currentUser.email);

    const response = await fetch("database.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      console.log("User location:", data.location);
      return data.location;
    } else {
      throw new Error(data.message || "Failed to get user location");
    }
  } catch (error) {
    console.error("Error getting user location:", error);
    return null;
  }
}
