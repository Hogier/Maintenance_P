
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
async function loginUser(email, password) {
  try {
      // Формируем запрос к PHP-серверу
      const response = await fetch('database.php', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
              action: 'loginUser',
              email: email,
              password: password,
          }),
      });

      // Получаем ответ от сервера
      const result = await response.json();

      if (result.success) {
          console.log('User found:', result.user);
          return result.user; // Возвращаем данные пользователя
      } else {
          console.error('Error:', result.message);
          return null;
      }
  } catch (error) {
      console.error('Fetch error:', error);
      return null;
  }
}

// Функция выхода
function logout() {
  localStorage.removeItem("maintenanceStaffAuth");
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}
