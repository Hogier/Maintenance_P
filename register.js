document
  .getElementById("registerForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    try {
      await db.waitForDB(); // Дожидаемся инициализации базы данных

      const fullName = document.getElementById("fullName").value;
      const email = document.getElementById("email").value;
      const department = document.getElementById("department").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (password !== confirmPassword) {
        document.getElementById("errorMessage").textContent =
          "Passwords do not match";
        return;
      }

      const user = {
        fullName,
        email,
        department,
        password,
        role: "user",
        registrationDate: new Date().toISOString(),
      };

      // Проверяем существующих пользователей
      const existingUser = await db.getUser(email);
      const existingName = await db.getUserByNameFromServer(fullName);

      if (existingUser || existingName) {
        document.getElementById("errorMessage").textContent =
          "User with this email or name already exists";
        return;
      }

      const success = await db.addUserToServer(user);
      if (success) {
        // Сохраняем информацию о текущем пользователе
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            fullName: user.fullName,
            email: user.email,
            role: user.role,
          })
        );
        alert(
          "Registration successful! You can now submit maintenance requests."
        );
        window.location.href = "request.html";
      } else {
        document.getElementById("errorMessage").textContent =
          "Error during registration. Please try again.";
      }
    } catch (error) {
      console.error("Registration error:", error);
      document.getElementById("errorMessage").textContent =
        "An error occurred during registration";
    }
  });
