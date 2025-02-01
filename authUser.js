// Проверка авторизации и роли
function checkAuth() {
  const loggedInUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!loggedInUser) {
    window.location.href = "loginUser.html";
    return false;
  }
  return true;
}

// Функция входа
async function loginUser(email, password) {
  try {
    const response = await fetch("database.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "loginUser",
        email: email,
        password: password,
      }),
    });

    const result = await response.json();

    if (result.success) {
      return {
        id: result.user.id,
        fullName: result.user.fullName,
        email: result.user.email,
        role: result.user.role,
        department: result.user.department,
      };
    } else {
      console.error("Login error:", result.message);
      return null;
    }
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}

// Функция проверки авторизации
function checkUserAuth() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  return user && user.role === "user";
}

// Функция выхода
function logoutUser() {
  localStorage.removeItem("currentUser");
  window.location.href = "main.html";
}
