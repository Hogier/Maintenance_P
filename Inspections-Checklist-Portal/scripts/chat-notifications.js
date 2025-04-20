/**
 * Функционал для работы с уведомлениями о новых сообщениях в чате
 */

// Инициализация счетчика новых сообщений
function initChatNotifications() {
  // Элемент счетчика сообщений
  const chatBadgeMini = document.getElementById("chatBadgeMini");
  const chatNotificationBadge = document.getElementById(
    "chatNotificationBadge"
  );

  if (!chatBadgeMini || !chatNotificationBadge) return;

  // Получаем текущего пользователя
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  // Если пользователь не авторизован, не продолжаем
  if (!currentUser || !currentUser.id) return;

  // Получаем количество непрочитанных сообщений из API
  checkNewMessages();

  // Настраиваем обработчик клика на пункт меню Chat
  const chatMenuItem = document.querySelector('.nav-item[data-page="chat"]');
  if (chatMenuItem) {
    chatMenuItem.addEventListener("click", function () {
      // Перенаправляем пользователя в чат-портал
      window.location.href = "/Maintenance_P/corporate-chat/index.html";
    });
  }

  // Периодически проверяем наличие новых сообщений
  setInterval(checkNewMessages, 15000); // Проверка каждые 15 секунд
}

// Функция проверки новых сообщений
function checkNewMessages() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || !currentUser.id) {
    updateChatBadge(0);
    return;
  }

  // Используем API для проверки новых сообщений
  fetch(
    `/Maintenance_P/corporate-chat/api/chat-api.php?action=get_unread_count&user_id=${currentUser.id}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        // Обновляем счетчик с реальным количеством непрочитанных сообщений
        updateChatBadge(data.unread_count || 0);
      } else {
        console.error("Ошибка при проверке новых сообщений:", data.error);
        updateChatBadge(0);
      }
    })
    .catch((error) => {
      console.error("Ошибка при запросе новых сообщений:", error);
      updateChatBadge(0);
    });
}

// Функция для обновления счетчика сообщений
function updateChatBadge(count) {
  const chatBadgeMini = document.getElementById("chatBadgeMini");
  const chatNotificationBadge = document.getElementById(
    "chatNotificationBadge"
  );

  if (!chatBadgeMini || !chatNotificationBadge) return;

  // Обновляем отображение счетчика
  if (count > 0) {
    chatBadgeMini.textContent = count > 99 ? "99+" : count;
    chatBadgeMini.style.display = "flex";
    // Подсвечиваем элемент меню с уведомлением
    const chatMenuItem = document.querySelector('.nav-item[data-page="chat"]');
    if (chatMenuItem) {
      chatMenuItem.classList.add("has-notification");
    }
  } else {
    chatBadgeMini.textContent = "0";
    chatBadgeMini.style.display = "none";
    // Убираем подсветку с элемента меню
    const chatMenuItem = document.querySelector('.nav-item[data-page="chat"]');
    if (chatMenuItem) {
      chatMenuItem.classList.remove("has-notification");
    }
  }
}

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", function () {
  initChatNotifications();
});
