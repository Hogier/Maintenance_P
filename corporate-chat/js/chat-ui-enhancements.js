/**
 * Chat UI Enhancements
 * Дополнительные функции для улучшения интерфейса чата
 */

document.addEventListener("DOMContentLoaded", function () {
  // Инициализация улучшений UI
  initChatUIEnhancements();
});

/**
 * Инициализация улучшений интерфейса чата
 */
function initChatUIEnhancements() {
  // Применяем стилизацию сообщений при прокрутке
  applyScrollEffects();

  // Фиксируем размеры чата
  enforceFixedChatDimensions();

  // Добавляем эффекты для кнопок и элементов
  addInteractionEffects();

  // Добавляем анимации для сообщений
  enhanceMessageAnimations();

  // Группируем сообщения от одного пользователя
  groupMessagesBySender();

  // Наблюдатель за новыми сообщениями для применения группировки
  setupMessageGroupingObserver();
}

/**
 * Группировка сообщений от одного пользователя
 */
function groupMessagesBySender() {
  const messagesContainer = document.getElementById("messagesContainer");
  if (!messagesContainer) return;

  const messages = messagesContainer.querySelectorAll(".message");
  let currentSenderId = null;
  let groupStartIndex = 0;

  messages.forEach((message, index) => {
    // Получаем ID отправителя (предполагается, что он хранится в data-атрибуте)
    const senderId = message.getAttribute("data-sender-id");
    const isOutgoing = message.classList.contains("outgoing");

    // Если первое сообщение или сменился отправитель
    if (
      index === 0 ||
      senderId !== currentSenderId ||
      isOutgoing !== messages[index - 1].classList.contains("outgoing")
    ) {
      // Если это не первое сообщение, завершаем предыдущую группу
      if (index > 0) {
        messages[index - 1].classList.add("last-in-group");
      }

      // Начинаем новую группу
      message.classList.add("first-in-group");
      currentSenderId = senderId;
      groupStartIndex = index;
    } else {
      // Продолжение группы
      message.classList.add("same-sender");
    }

    // Если это последнее сообщение
    if (index === messages.length - 1) {
      message.classList.add("last-in-group");
    }
  });
}

/**
 * Наблюдатель за новыми сообщениями для применения группировки
 */
function setupMessageGroupingObserver() {
  const messagesContainer = document.getElementById("messagesContainer");
  if (!messagesContainer) return;

  const observer = new MutationObserver(function (mutations) {
    let messageAdded = false;

    mutations.forEach(function (mutation) {
      if (mutation.type === "childList" && mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.classList && node.classList.contains("message")) {
            messageAdded = true;
          }
        });
      }
    });

    if (messageAdded) {
      // Перегруппировка сообщений при добавлении новых
      groupMessagesBySender();
    }
  });

  observer.observe(messagesContainer, { childList: true });
}

/**
 * Применяем эффекты при прокрутке сообщений
 */
function applyScrollEffects() {
  const messagesContainer = document.getElementById("messagesContainer");
  if (!messagesContainer) return;

  // Применяем эффект при прокрутке
  messagesContainer.addEventListener("scroll", function () {
    const messages = this.querySelectorAll(".message");
    messages.forEach((msg) => {
      const rect = msg.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Если сообщение в видимой области
      if (rect.top >= 0 && rect.bottom <= windowHeight) {
        const scrollPos = (rect.top + rect.height / 2) / windowHeight;
        const scale = 1 - Math.min(0.05, Math.abs(scrollPos - 0.5) * 0.1);

        // Применяем небольшой эффект масштабирования для сообщений
        msg.style.transform = `scale(${scale})`;
        msg.style.opacity = 1;
      } else {
        // Немного уменьшаем непрокрученные сообщения
        msg.style.opacity = 0.9;
      }
    });
  });
}

/**
 * Обеспечиваем фиксированные размеры чата
 */
function enforceFixedChatDimensions() {
  const messagesContainer = document.getElementById("messagesContainer");
  if (!messagesContainer) return;

  // Функция для автоматической прокрутки вниз при новых сообщениях
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Создаем наблюдатель за изменениями в контейнере сообщений
  const observer = new MutationObserver(function (mutations) {
    let shouldScroll = false;

    // Проверка, находился ли пользователь в нижней части чата
    const wasAtBottom =
      messagesContainer.scrollHeight - messagesContainer.scrollTop <=
      messagesContainer.clientHeight + 100;

    mutations.forEach(function (mutation) {
      if (mutation.type === "childList" && mutation.addedNodes.length) {
        // Если добавлены новые сообщения
        shouldScroll = shouldScroll || wasAtBottom;

        // Применяем максимальную ширину к новым сообщениям
        mutation.addedNodes.forEach((node) => {
          if (node.classList && node.classList.contains("message")) {
            // Делаем сообщения фиксированной ширины
            const msgContent = node.querySelector(".message-bubble");
            if (msgContent) {
              msgContent.style.maxWidth = "420px";

              // Добавляем красивое затухание для длинных сообщений
              if (
                msgContent.scrollHeight > msgContent.clientHeight ||
                msgContent.scrollWidth > msgContent.clientWidth
              ) {
                msgContent.classList.add("long-message");
              }
            }
          }
        });
      }
    });

    // Прокручиваем до конца, если пользователь уже находился внизу
    if (shouldScroll) {
      scrollToBottom();
    }
  });

  // Наблюдаем за изменениями в контейнере сообщений
  observer.observe(messagesContainer, { childList: true, subtree: true });

  // Автоматическая прокрутка при отправке сообщения
  const sendButton = document.getElementById("sendMessage");
  if (sendButton) {
    sendButton.addEventListener("click", function () {
      // Отложенная прокрутка, чтобы учесть добавление нового сообщения
      setTimeout(scrollToBottom, 100);
    });
  }
}

/**
 * Добавляем эффекты взаимодействия с элементами
 */
function addInteractionEffects() {
  // Добавляем эффект волны для кнопок
  const buttons = document.querySelectorAll("button");
  buttons.forEach((button) => {
    button.addEventListener("click", function (e) {
      // Создаем элемент эффекта
      const ripple = document.createElement("span");
      ripple.classList.add("ripple-effect");

      // Позиционируем эффект относительно кнопки
      const buttonRect = this.getBoundingClientRect();
      const diameter = Math.max(buttonRect.width, buttonRect.height);
      const radius = diameter / 2;

      ripple.style.width = ripple.style.height = `${diameter}px`;
      ripple.style.left = `${e.clientX - buttonRect.left - radius}px`;
      ripple.style.top = `${e.clientY - buttonRect.top - radius}px`;

      // Добавляем эффект в кнопку
      this.appendChild(ripple);

      // Удаляем эффект после анимации
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

  // Добавляем эффект наведения на аватары
  const avatars = document.querySelectorAll(".chat-avatar");
  avatars.forEach((avatar) => {
    avatar.addEventListener("mouseenter", function () {
      this.classList.add("avatar-hover");
    });
    avatar.addEventListener("mouseleave", function () {
      this.classList.remove("avatar-hover");
    });
  });

  // Добавляем эффект активации для чатов в сайдбаре
  const chatItems = document.querySelectorAll(".chat-item");
  chatItems.forEach((item) => {
    item.addEventListener("click", function () {
      // Убираем активный класс у всех элементов
      chatItems.forEach((chat) => chat.classList.remove("active"));
      // Добавляем активный класс выбранному элементу
      this.classList.add("active");

      // Добавляем эффект при выборе чата
      this.classList.add("selected-chat");
      setTimeout(() => {
        this.classList.remove("selected-chat");
      }, 300);
    });
  });
}

/**
 * Улучшаем анимации сообщений
 */
function enhanceMessageAnimations() {
  // Получаем существующие сообщения
  const messages = document.querySelectorAll(".message");

  // Добавляем задержку анимации для создания эффекта каскада
  messages.forEach((msg, index) => {
    msg.style.animationDelay = `${index * 0.05}s`;
  });

  // Наблюдатель для новых сообщений
  const messagesContainer = document.getElementById("messagesContainer");
  if (!messagesContainer) return;

  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "childList" && mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          if (node.classList && node.classList.contains("message")) {
            // Добавляем анимацию для новых сообщений
            node.classList.add("new-message-animation");

            // Удаляем класс анимации после её завершения
            setTimeout(() => {
              node.classList.remove("new-message-animation");
            }, 500);
          }
        });
      }
    });
  });

  // Наблюдаем за изменениями в контейнере сообщений
  observer.observe(messagesContainer, { childList: true });
}

// Дополнительные CSS-стили, добавляемые через JavaScript
const addCustomStyles = () => {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    /* Ripple effect */
    .ripple-effect {
      position: absolute;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.4);
      pointer-events: none;
      animation: rippleAnimation 0.6s ease-out;
      transform: scale(0);
      opacity: 1;
    }
    
    @keyframes rippleAnimation {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
    
    /* Avatar hover effect */
    .avatar-hover {
      transform: scale(1.1);
      box-shadow: 0 5px 15px rgba(67, 97, 238, 0.3);
    }
    
    /* Selected chat effect */
    .selected-chat {
      animation: selectedChatPulse 0.3s ease-out;
    }
    
    @keyframes selectedChatPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.03); }
      100% { transform: scale(1); }
    }
    
    /* New message animation */
    .new-message-animation {
      animation: newMessagePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    
    @keyframes newMessagePop {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    /* Long message treatment */
    .long-message {
      position: relative;
      overflow: hidden;
    }
    
    .long-message::after {
      content: '';
      position: absolute;
      bottom: 0;
      right: 0;
      width: 40px;
      height: 100%;
      background: linear-gradient(to right, transparent, var(--primary-light));
      pointer-events: none;
    }
    
    .message.incoming .long-message::after {
      background: linear-gradient(to right, transparent, var(--background-light));
    }
    
    /* Время сообщения для мобильных устройств */
    @media (max-width: 768px) {
      .message-time {
        font-size: 9px;
        margin-top: 2px;
      }
      
      .message-bubble {
        padding: 8px 12px;
      }
    }
  `;

  document.head.appendChild(styleElement);
};

// Добавляем стили при загрузке документа
document.addEventListener("DOMContentLoaded", addCustomStyles);
