// Реализация клиента для работы с Pusher
const PusherClient = (function() {
  // Приватные переменные
  let pusher = null;
  let channel = null;
  let isConnected = false;
  const handlers = {}; // Хранилище обработчиков по типам сообщений
  
  // Начальная конфигурация
  const config = {
    key: '16f6b338124ef7c54632',
    cluster: 'eu',
    channelName: 'maintenance-channel',
    debug: false
  };
  
  // Приватные методы
  function log(message) {
    if (config.debug) {
      console.log(`[PusherClient] ${message}`);
    }
  }
  
  function connect() {
    if (pusher !== null) {
      log('Соединение уже установлено');
      return;
    }
    
    try {
      log(`Подключение к Pusher с ключом ${config.key}...`);
      
      // Инициализация Pusher
      pusher = new Pusher(config.key, {
        cluster: config.cluster,
        forceTLS: true
      });
      
      // Подписываемся на канал
      channel = pusher.subscribe(config.channelName);
      
      // Обработчик успешного подключения
      pusher.connection.bind('connected', function() {
        log('Соединение установлено');
        isConnected = true;
        triggerHandlers('connection', { status: 'connected' });
      });
      
      // Обработчик отключения
      pusher.connection.bind('disconnected', function() {
        log('Соединение разорвано');
        isConnected = false;
        triggerHandlers('connection', { status: 'disconnected' });
      });
      
      // Обработчик ошибок
      pusher.connection.bind('error', function(error) {
        log(`Ошибка соединения: ${error}`);
        triggerHandlers('error', { error: error });
      });
      
      // Настраиваем обработчики событий
      // Для задач
      channel.bind('taskAdded', function(data) {
        log(`Получено событие taskAdded: ${JSON.stringify(data)}`);
        triggerHandlers('taskAdded', data);
      });
      
      channel.bind('sendComments', function(data) {
        log(`Получено событие sendComments: ${JSON.stringify(data)}`);
        triggerHandlers('sendComments', data);
      });
      
      // Для событий календаря
      channel.bind('eventCommentAdded', function(data) {
        log(`Получено событие eventCommentAdded: ${JSON.stringify(data)}`);
        triggerHandlers('eventCommentAdded', data);
      });
      
      // Для чата
      channel.bind('new-message', function(data) {
        log(`Получено сообщение чата: ${JSON.stringify(data)}`);
        triggerHandlers('new-message', data);
      });
      
    } catch (error) {
      log(`Ошибка при создании Pusher: ${error.message}`);
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
      
      // Проверяем наличие Pusher
      if (typeof Pusher === 'undefined') {
        console.error('Библиотека Pusher не найдена. Пожалуйста, подключите скрипт Pusher.js.');
        return this;
      }
      
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
    
    // Отправка запроса к серверу
    send: function(action, data = {}) {
      if (!action) {
        log('Не указано действие для отправки');
        return Promise.reject('Не указано действие');
      }
      
      const requestData = {
        action: action,
        ...data
      };
      
      log(`Отправка запроса: ${JSON.stringify(requestData)}`);
      
      return fetch('api/pusher-server.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ошибка: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        log(`Получен ответ: ${JSON.stringify(data)}`);
        return data;
      })
      .catch(error => {
        log(`Ошибка при отправке запроса: ${error.message}`);
        throw error;
      });
    },
    
    // Проверка состояния соединения
    isConnected: function() {
      return isConnected;
    },
    
    // Закрытие соединения
    close: function() {
      if (channel) {
        pusher.unsubscribe(config.channelName);
        channel = null;
      }
      
      if (pusher) {
        pusher.disconnect();
        pusher = null;
        isConnected = false;
        log('Соединение закрыто вручную');
      }
      
      return this;
    },
    
    // Получение текущего канала
    getChannel: function() {
      return channel;
    },
    
    // Получение экземпляра Pusher
    getPusher: function() {
      return pusher;
    },
    
    // СПЕЦИАЛЬНЫЕ МЕТОДЫ ДЛЯ РАБОТЫ С ЗАДАЧАМИ
    
    // Получение списка задач для сотрудника
    getUserTasks: function(staff) {
      return this.send('getUserTasks', { staff });
    },
    
    // Добавление новой задачи
    addTask: function(taskData) {
      return this.send('addTask', taskData);
    },
    
    // Добавление комментария к задаче
    addComment: function(taskId, comment, staffName, photoUrl = '') {
      const data = {
        taskId,
        comment,
        staffName,
        timestamp: new Date().toISOString(),
        photoUrl
      };
      return this.send('updateComments', data);
    },
    
    // Добавление комментария к событию
    addEventComment: function(eventId, text, author, eventDate, userPhotoUrl = '') {
      const data = {
        eventId,
        text,
        author,
        date: new Date().toISOString(),
        eventDate,
        userPhotoUrl
      };
      return this.send('addEventComment', data);
    }
  };
})();

// Экспортируем объект для использования в других файлах
window.PusherClient = PusherClient; 