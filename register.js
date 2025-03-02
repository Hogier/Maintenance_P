document
  .getElementById("registerForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    try {
      const fullName = document.getElementById("fullName").value;
      const email = document.getElementById("email").value;
      const department = document.getElementById("department").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      // Clear previous error messages
      const errorElement = document.getElementById("errorMessage");
      errorElement.textContent = "";
      errorElement.style.color = "red";

      // Password validation
      if (password !== confirmPassword) {
        errorElement.textContent = "Passwords do not match";
        return;
      }

      if (password.length < 6) {
        errorElement.textContent =
          "Password must be at least 6 characters long";
        return;
      }

      // Show loading message
      errorElement.textContent = "Processing registration...";
      errorElement.style.color = "blue";

      // Verify if the teacher name exists in roomTeachers
      const isValidTeacher = Object.values(roomTeachers).some(
        (room) =>
          room.mainTeacher.includes(fullName) ||
          room.assistant.includes(fullName)
      );

      if (!isValidTeacher) {
        errorElement.textContent =
          "This name is not in the list of authorized teachers";
        return;
      }

      const user = {
        fullName,
        email,
        department,
        password,
        role: "user",
      };

      // Send registration request
      const response = await fetch("database.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "addUser",
          ...user,
        }),
      });

      const result = await response.json();
      console.log("Registration response:", result);

      if (result.success) {
        // Save current user info
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            fullName: user.fullName,
            email: user.email,
            role: user.role,
          })
        );
        errorElement.style.color = "green";
        errorElement.textContent = "Registration successful! Redirecting...";

        setTimeout(() => {
          window.location.href = "request.html";
        }, 1500);
      } else {
        errorElement.style.color = "red";
        errorElement.textContent =
          result.message || "Registration failed. Please try again.";
      }
    } catch (error) {
      console.error("Registration error:", error);
      const errorElement = document.getElementById("errorMessage");
      errorElement.style.color = "red";
      errorElement.textContent =
        "An error occurred during registration. Please try again.";
    }
  });
