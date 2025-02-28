// Список авторизованных сотрудников технического обслуживания
const authorizedStaff = [
  {
    id: 1,
    username: "maintenance1",
    password: "pass1",
    name: "John Maintenance",
    role: "maintenance",
  },
  {
    id: 2,
    username: "maintenance2",
    password: "pass2",
    name: "Sarah Technical",
    role: "maintenance",
  },
  {
    id: 3,
    username: "maintenance3",
    password: "pass3",
    name: "Mike Repairs",
    role: "maintenance",
  },
  {
    id: 4,
    username: "maintenance4",
    password: "pass4",
    name: "Lisa Engineer",
    role: "maintenance",
  },
];

// Проверка авторизации и роли
function checkAuth() {
  const loggedInUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!loggedInUser || loggedInUser.role !== "maintenance") {
    window.location.href = "login.html";
    return false;
  }
  return true;
}



async function loginMaintenanceStaff(username, password) {
  try {
    // Формируем запрос к PHP-серверу
    const response = await fetch("database.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "loginMaintenanceStaff",
        username: username,
        password: password,
      }),
    });

    // Получаем ответ от сервера
    const result = await response.json();

    if (result.success) {
      console.log("User found:", result.user);
      return result.user; // Возвращаем данные пользователя
    } else {
      console.error("Error:", result.message);
      return null;
    }
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}

// Функция выхода
function logout() {
  localStorage.removeItem("maintenanceStaffAuth");
  localStorage.removeItem("currentUser");
  window.location.href = "main.html";
}
