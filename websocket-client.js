// Реализация единого WebSocket-клиента с системой обработки сообщений
const WebSocketClient = (function() {
  // Приватные переменные
  let socket = null;
  let isConnected = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;
  const handlers = {}; // Хранилище обработчиков по типам сообщений
  
  // Начальная конфигурация
  const config = {
    url: 'ws://localhost:2346',
    debug: false
  };
  
  // Приватные методы
  function log(message) {
    if (config.debug) {
      console.log(`[WebSocketClient] ${message}`);
    }
  }
  
  function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      log('Соединение уже установлено или устанавливается');
      return;
    }
    
    try {
      log(`Подключение к ${config.url}...`);
      socket = new WebSocket(config.url);
      
      socket.onopen = function() {
        log('Соединение установлено');
        isConnected = true;
        reconnectAttempts = 0;
        // Вызываем все обработчики для события 'connection'
        triggerHandlers('connection', { status: 'connected' });
      };
      
      socket.onclose = function(event) {
        log(`Соединение закрыто: ${event.code} ${event.reason}`);
        isConnected = false;
        
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          log(`Попытка переподключения ${reconnectAttempts} из ${MAX_RECONNECT_ATTEMPTS} через ${RECONNECT_DELAY}мс...`);
          setTimeout(connect, RECONNECT_DELAY);
        } else {
          log('Превышено максимальное количество попыток переподключения');
          triggerHandlers('connection', { status: 'disconnected', error: 'max_reconnect_attempts' });
        }
      };
      
      socket.onerror = function(error) {
        log(`Ошибка соединения: ${error}`);
        triggerHandlers('error', { error: error });
      };
      
      socket.onmessage = function(event) {
        let message;
        try {
          message = JSON.parse(event.data);
          log(`Получено сообщение: ${event.data}`);
          
          // Проверяем наличие type или action в сообщении
          const messageType = message.type || message.action;
          if (messageType) {
            // Вызываем обработчики для конкретного типа сообщения
            triggerHandlers(messageType, message);
          }
          
          // Также вызываем обработчики для всех сообщений
          triggerHandlers('message', message);
        } catch (e) {
          log(`Ошибка разбора сообщения: ${e.message}`);
          triggerHandlers('error', { error: 'parse_error', message: event.data });
        }
      };
    } catch (error) {
      log(`Ошибка при создании WebSocket: ${error.message}`);
      triggerHandlers('error', { error: 'connection_error', message: error.message });
    }
  }
  
  function triggerHandlers(type, data) {
    if (handlers[type]) {
      handlers[type].forEach(handler => {
        try {
          handler(data);
        } catch (e) {
          log(`Ошибка в обработчике ${type}: ${e.message}`);
        }
      });
    }
  }
  
  // Публичный API
  return {
    // Инициализация с пользовательскими настройками
    init: function(options) {
      Object.assign(config, options);
      log('Инициализация с настройками: ' + JSON.stringify(config));
      connect();
      return this;
    },
    
    // Подписка на события
    on: function(type, callback) {
      if (!handlers[type]) {
        handlers[type] = [];
      }
      handlers[type].push(callback);
      log(`Добавлен обработчик для события "${type}"`);
      return this;
    },
    
    // Отписка от событий
    off: function(type, callback) {
      if (handlers[type]) {
        if (callback) {
          const index = handlers[type].indexOf(callback);
          if (index !== -1) {
            handlers[type].splice(index, 1);
            log(`Удален конкретный обработчик для события "${type}"`);
          }
        } else {
          handlers[type] = [];
          log(`Удалены все обработчики для события "${type}"`);
        }
      }
      return this;
    },
    
    // Отправка сообщения
    send: function(message) {
      if (!isConnected) {
        log('Невозможно отправить сообщение: отсутствует соединение');
        return false;
      }
      
      try {
        if (typeof message === 'object') {
          message = JSON.stringify(message);
        }
        socket.send(message);
        log(`Отправлено сообщение: ${message}`);
        return true;
      } catch (e) {
        log(`Ошибка при отправке сообщения: ${e.message}`);
        return false;
      }
    },
    
    // Проверка состояния соединения
    isConnected: function() {
      return isConnected;
    },
    
    // Закрытие соединения
    close: function() {
      if (socket) {
        socket.close();
        log('Соединение закрыто вручную');
      }
      return this;
    }
  };
})();

// Экспортируем объект для использования в других файлах
window.WebSocketClient = WebSocketClient; 