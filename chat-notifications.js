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

  // Временно показываем индикатор, пока загружаются данные
  // (решение проблемы отсутствия бейджа при первой загрузке)
  updateChatBadge(0);

  // Настраиваем обработчик клика на пункт меню Chat
  // В tasks.html используется .nav-item[data-page="chat"]
  // В events.html используется .sidebar-menu-item[data-section="chat"] или .sidebar-menu-item[data-page="chat"]
  const chatMenuItem = document.querySelector(
    '.nav-item[data-page="chat"], .sidebar-menu-item[data-page="chat"], .sidebar-menu-item[data-section="chat"]'
  );
  if (chatMenuItem) {
    chatMenuItem.addEventListener("click", function () {
      // Перенаправляем пользователя в чат-портал
      window.location.href = "/Maintenance_P/corporate-chat/index.html";
    });
  }

  // Периодически проверяем наличие новых сообщений
  setInterval(checkNewMessages, 15000); // Проверка каждые 15 секунд
}

// Функция для обновления счетчика сообщений
function updateChatBadge(count) {
  const chatBadgeMini = document.getElementById("chatBadgeMini");
  const chatNotificationBadge = document.getElementById(
    "chatNotificationBadge"
  );

  if (!chatBadgeMini || !chatNotificationBadge) return;

  // Устанавливаем стиль шрифта принудительно
  chatBadgeMini.style.fontSize = "10px";
  chatBadgeMini.style.width = "16px";
  chatBadgeMini.style.height = "16px";

  // Обновляем отображение счетчика
  if (count > 0) {
    chatBadgeMini.textContent = count > 99 ? "99+" : count;
    chatBadgeMini.style.display = "flex";
    // Подсвечиваем элемент меню с уведомлением
    const chatMenuItem = document.querySelector(
      '.nav-item[data-page="chat"], .sidebar-menu-item[data-page="chat"], .sidebar-menu-item[data-section="chat"]'
    );
    if (chatMenuItem) {
      chatMenuItem.classList.add("has-notification");
    }
  } else {
    chatBadgeMini.textContent = "0";
    chatBadgeMini.style.display = "none";
    // Убираем подсветку с элемента меню
    const chatMenuItem = document.querySelector(
      '.nav-item[data-page="chat"], .sidebar-menu-item[data-page="chat"], .sidebar-menu-item[data-section="chat"]'
    );
    if (chatMenuItem) {
      chatMenuItem.classList.remove("has-notification");
    }
  }
}

// Функция для проверки наличия новых сообщений
function checkNewMessages() {
  // Получаем текущего пользователя
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  // Если пользователь не авторизован, не продолжаем
  if (!currentUser || !currentUser.id) {
    updateChatBadge(0);
    return;
  }

  // Делаем запрос к API для получения списка чатов с непрочитанными сообщениями
  fetch(
    "/Maintenance_P/corporate-chat/api/chat-api.php?action=get_unread_count&user_id=" +
      currentUser.id
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
        console.error("Failed to get unread messages: ", data.error);
        updateChatBadge(0);
      }
    })
    .catch((error) => {
      console.error("Error checking new messages: ", error);
      updateChatBadge(0);
    });
}

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", function () {
  initChatNotifications();
});
