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
  const loggedInUser = JSON.parse(localStorage.getItem("maintenanceStaffAuth"));
  if (!loggedInUser || loggedInUser.role !== "maintenance") {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// Функция входа
function login(username, password) {
  const user = authorizedStaff.find(
    (staff) => staff.username === username && staff.password === password
  );

  if (user) {
    const authData = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    };
    localStorage.setItem("maintenanceStaffAuth", JSON.stringify(authData));
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        fullName: user.name,
        role: user.role,
      })
    );
    return true;
  }
  return false;
}

// Функция выхода
function logout() {
  localStorage.removeItem("maintenanceStaffAuth");
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}
