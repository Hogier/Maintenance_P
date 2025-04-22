// DOM Elements
const directMessagesList = document.getElementById("directMessagesList");
const groupsList = document.getElementById("groupsList");
const tabButtons = document.querySelectorAll(".tab-btn");
const searchUsersInput = document.getElementById("searchUsers");
const createGroupBtn = document.getElementById("createGroupBtn");
const messagesContainer = document.getElementById("messagesContainer");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessage");
const currentChatName = document.getElementById("currentChatName");
const chatStatus = document.getElementById("chatStatus");
const viewChatInfoBtn = document.getElementById("viewChatInfo");
const addUserToChat = document.getElementById("addUserToChat");
const infoPanel = document.getElementById("infoPanel");
const closeInfoPanelBtn = document.getElementById("closeInfoPanel");
const infoPanelContent = document.getElementById("infoPanelContent");
const createGroupModal = document.getElementById("createGroupModal");
const closeGroupModalBtn = document.getElementById("closeGroupModal");
const groupNameInput = document.getElementById("groupName");
const userSelection = document.getElementById("userSelection");
const createGroupConfirmBtn = document.getElementById("createGroupConfirm");
const addUserModal = document.getElementById("addUserModal");
const closeAddUserModalBtn = document.getElementById("closeAddUserModal");
const addUserSelection = document.getElementById("addUserSelection");
const addUserConfirmBtn = document.getElementById("addUserConfirm");
const overlay = document.getElementById("overlay");
// Remove references to header elements since we removed the header
// const userNameElement = document.getElementById("userName");
// const userDepartmentElement = document.querySelector(".user-department");
// const userAvatarElement = document.getElementById("userAvatar");
// const logoutButton = document.getElementById("logoutButton");
// const backToMainMenuBtn = document.getElementById("backToMainMenu");
// Элементы для раздела онлайн-пользователей
const onlineUsersContainer = document.getElementById("onlineUsersContainer");
const prevOnlineUsersBtn = document.getElementById("prevOnlineUsers");
const nextOnlineUsersBtn = document.getElementById("nextOnlineUsers");

// State variables
let currentUser = null;
let currentChat = null;
let users = [];
let directChats = [];
let groupChats = [];
let messages = {};
let onlineStatusInterval = null; // Переменная для хранения интервала обновления статуса
let onlineUsersRefreshInterval = null; // Переменная для хранения интервала обновления блока онлайн-пользователей

// Global photo cache
const userPhotoCache = {};

// Check if user is logged in
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Сбрасываем счетчик непрочитанных сообщений при открытии чата
    resetUnreadMessagesCount();

    // Check login status
    const loggedIn = checkAuth();
    if (!loggedIn) {
      window.location.href = "../loginUser.html";
      return;
    }

    // Get current user data
    currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) {
      window.location.href = "../loginUser.html";
      return;
    }

    // Check if the role is set, if not, set default role to 'user'
    if (!currentUser.role) {
      currentUser.role = "user";
    }

    // Initialize user profile display
    displayUserInfo();

    // Load chat data
    initializeChat();

    // Setup logout button
    setupLogoutButton();
  } catch (error) {
    console.error("Error initializing chat:", error);
  }
});

// Initialize chat
async function initializeChat() {
  if (!currentUser) return;

  console.log("Initializing chat for user:", currentUser.id);

  // Create server-side session
  try {
    const response = await fetch("./api/create_session.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: currentUser.id,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create session");
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to create session");
    }

    console.log("Session created successfully");
  } catch (error) {
    console.error("Error creating session:", error);
  }

  await fetchUsers();
  await fetchChats();
  console.log(
    "After fetchChats: Direct chats:",
    directChats.length,
    "Group chats:",
    groupChats.length
  );

  // Debug log all group members
  groupChats.forEach((group, index) => {
    console.log(
      `Group ${index + 1}: ${group.name} (${group.id}) has ${
        group.members.length
      } members:`,
      group.members
    );
  });

  renderChats();
  setupEventListeners();

  // Настраиваем навигацию для раздела онлайн-пользователей
  setupOnlineUsersNavigation();

  // Скрываем кнопку Info, пока не выбран чат
  viewChatInfoBtn.classList.add("hidden");

  // Запускаем обновление статуса
  startStatusUpdates();
}

// Display user info - empty implementation since header is removed
function displayUserInfo() {
  console.log("User info display skipped - header elements removed");
}

// Load user photo - empty implementation since header is removed
async function loadUserPhoto() {
  console.log("User photo loading skipped - header elements removed");
  return;
}

// Get user photo from server
async function getUserPhotoFromServer() {
  try {
    if (!currentUser || !currentUser.id) {
      console.log("Current user not available for photo fetch");
      return null;
    }

    const userId = currentUser.id;
    console.log("Fetching photo for user ID:", userId);
    const response = await fetch(`./php/get_user_photo.php?user_id=${userId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Photo API response:", data); // Full response details

    if (data.success && data.photo_url) {
      // Check if debug paths are available
      if (data.debug) {
        console.log("Photo debug info:", data.debug);
      }

      // Try to get absolute URL
      let photoUrl = data.photo_url;

      // If URL starts with /, it's relative to domain root
      if (photoUrl.startsWith("/") && !photoUrl.startsWith("//")) {
        // Convert to absolute URL
        const baseUrl = window.location.origin;
        console.log("Base URL:", baseUrl);
        photoUrl = baseUrl + photoUrl;
        console.log("Converted to absolute URL:", photoUrl);
      }

      return photoUrl;
    }

    if (data.debug_paths) {
      console.log("Debug paths checked:", data.debug_paths);
    }

    return null;
  } catch (error) {
    console.error("Error fetching user photo:", error);
    return null;
  }
}

// Setup logout button - empty implementation since header is removed
function setupLogoutButton() {
  console.log("Logout button setup skipped - header elements removed");
}

// Check user authentication
function checkAuth() {
  const loggedInUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!loggedInUser) {
    return false;
  }

  // Check if user has one of the allowed roles (admin, support, or user)
  const allowedRoles = ["admin", "support", "user"];
  if (!allowedRoles.includes(loggedInUser.role)) {
    alert("You do not have permission to access the chat portal.");
    window.location.href = "../loginUser.html";
    return false;
  }

  return true;
}

// Fetch all users
async function fetchUsers() {
  try {
    console.log("Fetching users...");
    // Fetch users from API
    const response = await fetch("./api/chat-api.php?action=get_users");
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && Array.isArray(data.users)) {
      users = data.users;

      // Check if users have their roles set, update currentUser
      const currentUserData = users.find((u) => u.id === currentUser.id);
      if (currentUserData && currentUserData.role) {
        currentUser.role = currentUserData.role;
        // Update localStorage
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
      }

      console.log(`Loaded ${users.length} users from database`);
    } else {
      throw new Error("Invalid response format or no users found");
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    // No fallback to mock data - we only want real users
    users = [];
  }
}

// Fetch chats from server
async function fetchChats() {
  try {
    // Get direct chats from API
    const directResponse = await fetch(
      "./api/chat-api.php?action=get_direct_chats"
    );
    if (!directResponse.ok) {
      throw new Error(`API error: ${directResponse.status}`);
    }

    const directData = await directResponse.json();
    console.log("Direct chats response:", directData);

    if (directData.success && Array.isArray(directData.directChats)) {
      directChats = directData.directChats;
      console.log(`Loaded ${directChats.length} direct chats from API`);
    } else {
      console.warn("No direct chats found or invalid response format");
      directChats = [];
    }

    // Get group chats from API
    const groupResponse = await fetch(
      "./api/chat-api.php?action=get_group_chats"
    );
    if (!groupResponse.ok) {
      throw new Error(`API error: ${groupResponse.status}`);
    }

    const groupData = await groupResponse.json();
    console.log("Group chats response:", groupData);

    if (groupData.success && Array.isArray(groupData.groupChats)) {
      groupChats = groupData.groupChats;
      console.log(`Loaded ${groupChats.length} group chats from API`);
    } else {
      console.warn("No group chats found or invalid response format");
      groupChats = [];
    }

    // Initialize empty messages object
    messages = {};

    // Обновляем счетчики в заголовках табов
    updateTabCounters();
  } catch (error) {
    console.error("Error fetching chats:", error);
    // If API fails, initialize with empty arrays
    directChats = [];
    groupChats = [];
    messages = {};
  }
}

// Render chat lists
function renderChats() {
  renderDirectMessages();
  renderGroups();
  updateTabCounters(); // Обновляем счетчики в заголовках разделов
}

// Get photo URL for a specific user
async function getUserPhotoUrl(userId) {
  try {
    // Check if we have already cached this photo
    if (userPhotoCache[userId]) {
      return userPhotoCache[userId];
    }

    console.log(`Fetching photo for user ${userId}`);
    const response = await fetch(`./php/get_user_photo.php?user_id=${userId}`);

    if (!response.ok) {
      console.error(
        `HTTP error fetching photo for user ${userId}: ${response.status}`
      );
      return null;
    }

    const data = await response.json();
    console.log(`Photo API response for user ${userId}:`, data);

    if (data.success && data.photo_url) {
      // Convert to absolute URL if needed
      let photoUrl = data.photo_url;
      if (photoUrl.startsWith("/") && !photoUrl.startsWith("//")) {
        const baseUrl = window.location.origin;
        photoUrl = baseUrl + photoUrl;
        console.log(`Converted to absolute URL: ${photoUrl}`);
      }

      // Cache the photo URL
      userPhotoCache[userId] = photoUrl;
      return photoUrl;
    } else {
      console.log(`No photo found for user ${userId}`);
      // Cache a null result to avoid repeated failed requests
      userPhotoCache[userId] = null;
      return null;
    }
  } catch (error) {
    console.error(`Error fetching photo for user ${userId}:`, error);
    return null;
  }
}

// Create avatar element (photo or initials)
function createAvatarElement(user, size = "normal") {
  // Use initials as default/fallback
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Create outer div
  const avatarDiv = document.createElement("div");
  avatarDiv.className = `chat-avatar ${
    size === "small" ? "chat-avatar-small" : ""
  }`;

  // Set initials as default content
  avatarDiv.textContent = initials;

  // Check cached photo URL first (either from user object or global cache)
  const cachedPhotoUrl = user.photoUrl || userPhotoCache[user.id];

  if (cachedPhotoUrl) {
    // Use cached photo
    const img = document.createElement("img");
    img.src = cachedPhotoUrl;
    img.alt = user.name;
    img.style.objectFit = "cover";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.borderRadius = "50%";
    img.style.position = "absolute";
    img.style.top = "0";
    img.style.left = "0";
    img.onerror = function () {
      avatarDiv.textContent = initials; // Fallback to initials on error
      // Remove from cache if loading failed
      if (userPhotoCache[user.id] === cachedPhotoUrl) {
        delete userPhotoCache[user.id];
      }
      if (user.photoUrl === cachedPhotoUrl) {
        delete user.photoUrl;
      }
    };

    avatarDiv.textContent = ""; // Clear any existing content
    avatarDiv.appendChild(img);
  } else {
    // No cached photo, try to fetch it in the background without causing reflow
    if (user.id) {
      // Start loading in background but don't change DOM until complete
      getUserPhotoUrl(user.id).then((photoUrl) => {
        if (photoUrl) {
          user.photoUrl = photoUrl; // Cache the URL in user object

          // Check if the avatar is still in the DOM before updating
          if (avatarDiv.isConnected) {
            const img = document.createElement("img");
            img.src = photoUrl;
            img.alt = user.name;
            img.style.objectFit = "cover";
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.borderRadius = "50%";
            img.style.position = "absolute";
            img.style.top = "0";
            img.style.left = "0";
            img.onerror = function () {
              avatarDiv.textContent = initials; // Fallback to initials on error
            };

            // Only clear text content and append img after img is loaded
            img.onload = function () {
              avatarDiv.textContent = ""; // Clear any existing content
              avatarDiv.appendChild(img);
            };
          }
        }
      });
    }
  }

  return avatarDiv;
}

/**
 * Create a chat item for direct messages or group list
 */
function createChatItem(chat, type) {
  const chatItem = document.createElement("div");
  chatItem.className = "chat-item";
  chatItem.setAttribute("data-chat-id", chat.id);
  chatItem.setAttribute("data-chat-type", type);

  // Direct message chat
  if (type === "direct") {
    const otherUser = chat.users.find((u) => u.id != currentUser.id);
    if (!otherUser) return null;

    // Find if the user is online
    const isOnline =
      users.find((u) => u.id == otherUser.id)?.status === "online";

    // Создаем аватар пользователя напрямую, без вложенности
    const avatarElement = createAvatarElement(otherUser);

    const chatDetails = document.createElement("div");
    chatDetails.className = "chat-details";

    const chatName = document.createElement("div");
    chatName.className = "chat-name";
    chatName.textContent = otherUser.name;

    const statusIndicator = document.createElement("span");
    statusIndicator.className = `status-indicator ${
      isOnline ? "online" : "offline"
    }`;
    chatName.appendChild(statusIndicator);

    const lastMessage = document.createElement("div");
    lastMessage.className = "chat-last-message";
    lastMessage.textContent = chat.lastMessage
      ? chat.lastMessage.text
      : "No messages yet";

    chatDetails.appendChild(chatName);
    chatDetails.appendChild(lastMessage);

    // Добавляем метаданные чата (время и индикатор непрочитанных сообщений)
    const chatMeta = document.createElement("div");
    chatMeta.className = "chat-meta";

    // Добавляем время последнего сообщения
    if (chat.timestamp) {
      const chatTime = document.createElement("div");
      chatTime.className = "chat-time";
      chatTime.textContent = formatTime(chat.timestamp);
      chatMeta.appendChild(chatTime);
    }

    // Добавляем индикатор непрочитанных сообщений
    if (chat.unreadCount) {
      const unreadBadge = document.createElement("div");
      unreadBadge.className = "unread-badge";
      unreadBadge.textContent = chat.unreadCount;
      chatMeta.appendChild(unreadBadge);
    }

    chatItem.appendChild(avatarElement);
    chatItem.appendChild(chatDetails);
    chatItem.appendChild(chatMeta);
  }
  // Group chat
  else if (type === "group") {
    // Создаем аватар группы
    const avatarDiv = document.createElement("div");
    avatarDiv.className = "chat-avatar group-avatar";
    const avatarText = document.createElement("span");
    avatarText.textContent = chat.name.charAt(0).toUpperCase();
    avatarDiv.appendChild(avatarText);

    const chatDetails = document.createElement("div");
    chatDetails.className = "chat-details";

    const chatName = document.createElement("div");
    chatName.className = "chat-name";
    chatName.textContent = chat.name;

    const lastMessage = document.createElement("div");
    lastMessage.className = "chat-last-message";
    lastMessage.textContent = chat.lastMessage
      ? chat.lastMessage.text
      : "No messages yet";

    chatDetails.appendChild(chatName);
    chatDetails.appendChild(lastMessage);

    // Добавляем метаданные чата (время и индикатор непрочитанных сообщений)
    const chatMeta = document.createElement("div");
    chatMeta.className = "chat-meta";

    // Добавляем время последнего сообщения
    if (chat.timestamp) {
      const chatTime = document.createElement("div");
      chatTime.className = "chat-time";
      chatTime.textContent = formatTime(chat.timestamp);
      chatMeta.appendChild(chatTime);
    }

    // Добавляем индикатор непрочитанных сообщений
    if (chat.unreadCount) {
      const unreadBadge = document.createElement("div");
      unreadBadge.className = "unread-badge";
      unreadBadge.textContent = chat.unreadCount;
      chatMeta.appendChild(unreadBadge);
    }

    chatItem.appendChild(avatarDiv);
    chatItem.appendChild(chatDetails);
    chatItem.appendChild(chatMeta);
  }

  chatItem.addEventListener("click", () => {
    document.querySelectorAll(".chat-item").forEach((item) => {
      item.classList.remove("active");
    });
    chatItem.classList.add("active");
    selectChat(chat.id, type);
  });

  return chatItem;
}

// Render direct messages list
function renderDirectMessages() {
  directMessagesList.innerHTML = "";

  directChats
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach((chat) => {
      const user = users.find((u) => u.id === chat.userId);
      if (!user) return;

      // Создаем элемент чата с помощью функции createChatItem
      const chatItem = createChatItem(
        {
          id: chat.id,
          users: [
            { id: currentUser.id, name: currentUser.fullName },
            { id: user.id, name: user.name },
          ],
          lastMessage: { text: chat.lastMessage || "No messages yet" },
          unreadCount: chat.unread,
          timestamp: chat.timestamp,
        },
        "direct"
      );

      if (chatItem) {
        directMessagesList.appendChild(chatItem);
      }
    });
}

// Render groups list
function renderGroups() {
  // Clear only the group list items but keep the header with the button
  const groupHeader = groupsList.querySelector(".group-header");
  groupsList.innerHTML = "";

  // Re-add the group header
  if (groupHeader) {
    groupsList.appendChild(groupHeader);
  } else {
    // Create the header if it doesn't exist
    const newGroupHeader = document.createElement("div");
    newGroupHeader.className = "group-header";
    newGroupHeader.innerHTML =
      '<button id="createGroupBtn" class="create-group-btn">+ Create New Group</button>';
    groupsList.appendChild(newGroupHeader);

    // Reattach event listener for the new button
    document
      .getElementById("createGroupBtn")
      .addEventListener("click", showCreateGroupModal);
  }

  groupChats
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach((chat) => {
      // Создаем элемент чата с помощью функции createChatItem
      const chatItem = createChatItem(
        {
          id: chat.id,
          name: chat.name,
          members: chat.members || [],
          lastMessage: { text: chat.lastMessage || "No messages yet" },
          unreadCount: chat.unread,
          timestamp: chat.timestamp,
        },
        "group"
      );

      if (chatItem) {
        groupsList.appendChild(chatItem);
      }
    });
}

// Format timestamp for display
function formatTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);

  if (now.toDateString() === date.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (now.getFullYear() === date.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } else {
    return date.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}

// Select a chat
function selectChat(chatId, chatType) {
  console.log(`Selecting chat: ${chatId} (${chatType})`);

  // Update UI to show selected chat
  document.querySelectorAll(".chat-item").forEach((item) => {
    item.classList.remove("active");
  });

  const chatItem = document.querySelector(
    `.chat-item[data-chat-id="${chatId}"][data-chat-type="${chatType}"]`
  );
  if (chatItem) {
    chatItem.classList.add("active");
  } else {
    console.warn(`Chat item not found in DOM: ${chatId} (${chatType})`);
  }

  // Update current chat
  currentChat = { id: chatId, type: chatType };
  console.log("Current chat updated:", currentChat);

  // Update chat header
  updateChatHeader();

  // Load messages
  loadMessages(chatId);

  // Enable message input
  messageInput.disabled = false;
  sendMessageBtn.disabled = false;

  // If info panel is open, update its content for the new chat
  if (!infoPanel.classList.contains("hidden")) {
    showChatInfo();
  }

  // Clear unread count
  if (chatType === "direct") {
    const chat = directChats.find((c) => c.id === chatId);
    if (chat) {
      chat.unread = 0;
      renderDirectMessages();
    } else {
      console.warn(`Direct chat not found: ${chatId}`);
    }
  } else {
    const chat = groupChats.find((c) => c.id === chatId);
    if (chat) {
      chat.unread = 0;
      console.log(
        `Selected group chat: ${chat.name} with ${chat.members.length} members:`,
        chat.members
      );
      renderGroups();
    } else {
      console.warn(`Group chat not found: ${chatId}`);
    }
  }

  // Обновляем счетчики в заголовках после очистки непрочитанных
  updateTabCounters();
}

/**
 * Update chat header with current chat info
 */
function updateChatHeader() {
  if (!currentChat) {
    currentChatName.textContent = "Select a chat to start messaging";
    chatStatus.textContent = "";
    addUserToChat.classList.add("hidden");
    viewChatInfoBtn.classList.add("hidden"); // Скрываем кнопку Info
    messageInput.disabled = true;
    sendMessageBtn.disabled = true;
    return;
  }

  messageInput.disabled = false;
  sendMessageBtn.disabled = false;
  messageInput.focus();
  viewChatInfoBtn.classList.remove("hidden"); // Показываем кнопку Info, когда выбран чат

  if (currentChat.type === "direct") {
    // Найдем полную информацию о прямом чате
    const chat = directChats.find((c) => c.id === currentChat.id);
    if (!chat) {
      console.error("Direct chat not found:", currentChat.id);
      return;
    }

    // Найдем пользователя
    const user = users.find((u) => u.id === chat.userId);
    if (!user) {
      console.error("User not found for direct chat:", chat.userId);
      return;
    }

    currentChatName.textContent = user.name || "Unknown User";

    // Проверяем статус пользователя
    const userStatus = user.status || "offline";
    chatStatus.textContent = userStatus === "online" ? "Online" : "Offline";
    chatStatus.className = "";
    chatStatus.classList.add(
      userStatus === "online" ? "status-online" : "status-offline"
    );

    addUserToChat.classList.add("hidden");
  } else if (currentChat.type === "group") {
    // Найдем полную информацию о групповом чате
    const chat = groupChats.find((c) => c.id === currentChat.id);
    if (!chat) {
      console.error("Group chat not found:", currentChat.id);
      return;
    }

    currentChatName.textContent = chat.name || "Group Chat";

    // Получим список членов группы
    const members = chat.members || [];

    // Обновляем статус с информацией об активных участниках
    const onlineMembers = members.filter((memberId) => {
      const user = users.find((u) => u.id == memberId);
      return user?.status === "online";
    });

    chatStatus.textContent = `${onlineMembers.length} of ${members.length} members online`;
    chatStatus.className = "";

    // Показываем кнопку добавления пользователей для групповых чатов
    addUserToChat.classList.remove("hidden");
  }
}

// Load chat messages
async function loadMessages(chatId) {
  if (!chatId) return;

  try {
    // Mark messages as read when loading
    markMessagesAsRead(chatId);

    const response = await fetch(
      `./api/chat-api.php?action=get_messages&chat_id=${chatId}`
    );

    if (!response.ok) {
      throw new Error(`Failed to load messages: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to load messages");
    }

    if (result.messages) {
      // Pre-fetch user photos for participants in this chat
      if (result.messages.length > 0) {
        // Get unique sender IDs
        const senderIds = Array.from(
          new Set(result.messages.map((msg) => msg.sender))
        );

        // Pre-load all photos asynchronously
        const photoPromises = senderIds.map(async (senderId) => {
          // Skip if we already have it cached
          if (userPhotoCache[senderId]) return;

          const sender = users.find((u) => u.id === senderId);
          if (sender && !sender.photoUrl) {
            const photoUrl = await getUserPhotoUrl(senderId);
            if (photoUrl) {
              sender.photoUrl = photoUrl;
            }
          }
        });

        // Wait for all photos to load but don't block rendering
        Promise.all(photoPromises)
          .then(() => {
            // Re-render messages if already rendered to apply photos
            if (messages[chatId] && messages[chatId].length > 0) {
              renderMessages(chatId);
            }
          })
          .catch((error) => {
            console.error("Error pre-loading user photos:", error);
          });
      }

      // Fetch file information for messages that have files
      const messagesWithFiles = result.messages.filter((msg) => msg.has_file);

      if (messagesWithFiles.length > 0) {
        // Fetch file data for each message with has_file flag
        const filePromises = messagesWithFiles.map(async (msg) => {
          try {
            const fileResponse = await fetch(
              `./api/chat-api.php?action=get_file_by_message&message_id=${msg.id}`
            );

            if (!fileResponse.ok) {
              throw new Error(`Failed to load file: ${fileResponse.status}`);
            }

            const fileResult = await fileResponse.json();
            if (fileResult.success && fileResult.file) {
              // Attach file data to the message object
              return {
                messageId: msg.id,
                file: fileResult.file,
              };
            }
          } catch (err) {
            console.error(`Error loading file for message ${msg.id}:`, err);
          }
          return null;
        });

        // Wait for all file data requests to complete
        const fileResults = await Promise.all(filePromises);

        // Attach file data to corresponding messages
        fileResults.forEach((fileData) => {
          if (fileData) {
            const msgIndex = result.messages.findIndex(
              (msg) => msg.id === fileData.messageId
            );
            if (msgIndex !== -1) {
              result.messages[msgIndex].file = fileData.file;
            }
          }
        });
      }

      messages[chatId] = result.messages;
      renderMessages(chatId);
    }
  } catch (error) {
    console.error("Error loading messages:", error);
  }
}

// Helper function to render messages without API fetch
function renderMessages(chatId) {
  if (!messages[chatId] || messages[chatId].length === 0) {
    messagesContainer.innerHTML = `
      <div class="welcome-message">
        <h3>No messages yet</h3>
        <p>Start the conversation by sending a message!</p>
      </div>
    `;
    return;
  }

  messagesContainer.innerHTML = "";
  let lastSenderId = null;
  let lastMessageTime = null;

  messages[chatId].forEach((message, index) => {
    const isCurrentUser = message.sender === currentUser.id;
    const isPending = message.pending === true;

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isCurrentUser ? "outgoing" : "incoming"}`;

    // Добавляем атрибуты для группировки сообщений
    messageDiv.setAttribute("data-sender-id", message.sender);

    // Проверка, это первое сообщение от пользователя или нет
    const isSameSender = lastSenderId === message.sender;

    // Проверка времени сообщений для группировки
    const messageTime = new Date(message.timestamp);
    const isTimeClose =
      lastMessageTime && messageTime - lastMessageTime < 5 * 60 * 1000; // 5 минут

    // Добавляем классы для группировки
    if (isSameSender && isTimeClose) {
      messageDiv.classList.add("same-sender");
    } else {
      const messageHeader = document.createElement("div");
      messageHeader.className = "message-header";

      // Get user info for the sender
      const sender = users.find((user) => user.id === message.sender);
      if (sender) {
        // Check if message has sender_photo_url directly
        const hasSenderPhotoUrl =
          message.sender_photo_url && message.sender_photo_url.length > 0;

        // If message has photo URL, use it and also cache it
        if (hasSenderPhotoUrl) {
          // Cache the URL for future use
          userPhotoCache[sender.id] = message.sender_photo_url;
          sender.photoUrl = message.sender_photo_url;

          // Create avatar with the photo URL directly from message
          const avatar = document.createElement("div");
          avatar.className = `chat-avatar chat-avatar-small`;

          const img = document.createElement("img");
          img.src = message.sender_photo_url;
          img.alt = sender.name || message.sender_name;
          img.style.objectFit = "cover";
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.borderRadius = "50%";
          img.style.position = "absolute";
          img.style.top = "0";
          img.style.left = "0";

          // In case the photo URL is invalid, fallback to initials
          img.onerror = function () {
            const initials = (sender.name || message.sender_name || "")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();
            avatar.textContent = initials;

            // Remove from caches
            delete userPhotoCache[sender.id];
            delete sender.photoUrl;
          };

          avatar.appendChild(img);
          messageHeader.appendChild(avatar);
        } else {
          // Use the standard avatar element creator which will use cached photo if available
          const avatar = createAvatarElement(sender, "small");
          messageHeader.appendChild(avatar);
        }

        // Add sender name
        const senderName = document.createElement("div");
        senderName.className = "message-sender";
        senderName.textContent =
          sender.fullName || message.sender_name || `User ${sender.id}`;
        messageHeader.appendChild(senderName);

        messageDiv.appendChild(messageHeader);
      }
    }

    const messageBubble = document.createElement("div");
    messageBubble.className = "message-bubble";
    if (isPending) {
      messageBubble.classList.add("pending");
    }
    if (message.failed) {
      messageBubble.classList.add("failed");
    }
    messageBubble.textContent = message.text;
    messageDiv.appendChild(messageBubble);

    // Handle file attachments if the message has a file
    if (message.has_file && message.file) {
      const fileAttachment = createFileAttachment(message.file);
      messageDiv.appendChild(fileAttachment);
    }

    const messageTimeElement = document.createElement("div");
    messageTimeElement.className = "message-time";
    messageTimeElement.textContent = formatTime(message.timestamp);
    messageDiv.appendChild(messageTimeElement);

    messagesContainer.appendChild(messageDiv);

    // Update tracking for message grouping
    lastSenderId = message.sender;
    lastMessageTime = messageTime;
  });

  // Scroll to the bottom of the messages container
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show new chat options (when clicking "New Conversation")
// This function is kept for compatibility but is no longer directly accessed from the UI
function showNewChatOptions() {
  // Display a modal or dropdown with user list to start a new conversation
  const userList = document.createElement("div");
  userList.className = "user-selection";

  users.forEach((user) => {
    // Check if there's already a direct chat with this user
    const existingChat = directChats.find((chat) => chat.userId === user.id);

    const userItem = document.createElement("div");
    userItem.className = "user-selection-item";

    // Create avatar with photo if available
    const avatarElement = createAvatarElement(user, "small");

    // Create user name element
    const userNameDiv = document.createElement("div");
    userNameDiv.className = "user-selection-name";
    userNameDiv.textContent = user.name;

    // Add to user item
    userItem.appendChild(avatarElement);
    userItem.appendChild(userNameDiv);

    userItem.addEventListener("click", () => {
      if (existingChat) {
        // If chat exists, select it
        selectChat(existingChat.id, "direct");
      } else {
        // Create new chat
        createNewDirectChat(user);
      }

      overlay.classList.add("hidden");
      document.querySelector(".modal").remove();
    });

    userList.appendChild(userItem);
  });

  // Close button
  const closeBtn = document.createElement("div");
  closeBtn.className = "close-modal";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
    document.querySelector(".modal").remove();
  });

  // Create container
  const container = document.createElement("div");
  container.className = "modal";
  container.style.display = "block";
  container.appendChild(closeBtn);

  const header = document.createElement("h2");
  header.textContent = "Start a Conversation";

  const content = document.createElement("div");
  content.className = "modal-content";
  content.appendChild(header);
  content.appendChild(userList);

  container.appendChild(content);

  // Show overlay and modal
  overlay.classList.remove("hidden");
  document.body.appendChild(container);
}

// Create a new direct chat
async function createNewDirectChat(user) {
  try {
    console.log("Creating new direct chat with user:", user);

    // First check if there's an existing chat with this user
    let existingChat = directChats.find((chat) => chat.userId === user.id);
    if (existingChat) {
      console.log("Chat already exists, selecting it:", existingChat);
      selectChat(existingChat.id, "direct");
      return;
    }

    // Make API call to get or create direct chat
    const response = await fetch(`./api/chat-api.php?action=get_direct_chats`);
    if (!response.ok) {
      throw new Error(`Failed to create direct chat: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to create direct chat");
    }

    console.log("Direct chat response:", result);

    // Find the chat with this user
    if (result.directChats && Array.isArray(result.directChats)) {
      const existingChat = result.directChats.find(
        (chat) => chat.userId === user.id
      );
      if (existingChat) {
        // Chat already exists in the API results, update local data
        directChats = result.directChats;
        selectChat(existingChat.id, "direct");
        return;
      }
    }

    // If we didn't find an existing chat, create one
    const createResponse = await fetch(
      `/corporate-chat/api/chat-api.php?action=create_direct_chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
        }),
      }
    );

    if (!createResponse.ok) {
      throw new Error(`Failed to create chat: ${createResponse.status}`);
    }

    const createResult = await createResponse.json();
    if (!createResult.success) {
      throw new Error(createResult.error || "Failed to create chat");
    }

    console.log("New direct chat created:", createResult);

    // Refresh chats to get the new chat
    await fetchChats();
    renderDirectMessages();

    // Find and select the new chat
    const newChat = directChats.find((chat) => chat.userId === user.id);
    if (newChat) {
      selectChat(newChat.id, "direct");
    }
  } catch (error) {
    console.error("Error creating direct chat:", error);
    alert("Failed to create chat: " + error.message);
  }
}

// Send a message
async function sendMessage() {
  if (!currentChat || !messageInput.value.trim()) return;

  const messageText = messageInput.value.trim();
  const originalMessage = messageText;

  try {
    // Clear input right away for better UX
    messageInput.value = "";

    // Optimistically add message to UI
    if (!messages[currentChat.id]) {
      messages[currentChat.id] = [];
    }

    // Add temporary message with pending status
    const tempMessageId = `temp-${Date.now()}`;
    const newMessage = {
      id: tempMessageId,
      sender: currentUser.id,
      text: messageText,
      timestamp: new Date().toISOString(),
      pending: true,
    };

    // Optimistically add message to local array
    messages[currentChat.id].push(newMessage);

    // Update UI without full re-render of all messages
    // (just append the new message to avoid flashing)
    const lastSenderId =
      messages[currentChat.id].length > 1
        ? messages[currentChat.id][messages[currentChat.id].length - 2].sender
        : null;

    const isCurrentUser = true; // This is always the current user's message when sending
    const messageDiv = document.createElement("div");
    messageDiv.className = `message outgoing`;
    if (lastSenderId === currentUser.id) {
      messageDiv.classList.add("same-sender");
    }

    messageDiv.setAttribute("data-sender-id", currentUser.id);
    messageDiv.setAttribute("data-message-id", tempMessageId);

    if (lastSenderId !== currentUser.id) {
      const messageHeader = document.createElement("div");
      messageHeader.className = "message-header";

      // Create avatar with currentUser info (should already be cached)
      const avatar = createAvatarElement(
        { id: currentUser.id, name: currentUser.fullName || "You" },
        "small"
      );
      messageHeader.appendChild(avatar);

      const senderName = document.createElement("div");
      senderName.className = "message-sender";
      senderName.textContent = currentUser.fullName || "You";
      messageHeader.appendChild(senderName);

      messageDiv.appendChild(messageHeader);
    }

    const messageBubble = document.createElement("div");
    messageBubble.className = "message-bubble pending";
    messageBubble.textContent = messageText;
    messageDiv.appendChild(messageBubble);

    const messageTimeElement = document.createElement("div");
    messageTimeElement.className = "message-time";
    messageTimeElement.textContent = formatTime(new Date().toISOString());
    messageDiv.appendChild(messageTimeElement);

    messagesContainer.appendChild(messageDiv);

    // Scroll to the bottom of the messages container
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Actually send the message to the server
    const chatId = currentChat.id;
    const chatType = currentChat.type;

    // Generate API endpoint for file upload if file is attached
    // (skipped for brevity)

    // Send the message to the server
    const response = await fetch(
      `/Maintenance_P/corporate-chat/api/chat-api.php?action=send_message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          message: messageText,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to send message");
    }

    console.log("Message sent successfully:", result);

    // Update the temporary message with the actual message ID and remove pending status
    const messageIndex = messages[chatId].findIndex(
      (msg) => msg.id === tempMessageId
    );

    if (messageIndex !== -1) {
      messages[chatId][messageIndex] = {
        ...messages[chatId][messageIndex],
        id: result.message_id,
        pending: false,
      };

      // Update existing message in DOM to remove pending status
      const pendingMessageElement = document.querySelector(
        `[data-message-id="${tempMessageId}"]`
      );
      if (pendingMessageElement) {
        pendingMessageElement.setAttribute(
          "data-message-id",
          result.message_id
        );
        const messageBubble =
          pendingMessageElement.querySelector(".message-bubble");
        if (messageBubble) {
          messageBubble.classList.remove("pending");
        }
      }
    }

    // Update last message in chat list
    if (chatType === "direct") {
      // Find the direct chat in the list
      const directChatIndex = directChats.findIndex(
        (chat) => chat.id === chatId
      );
      if (directChatIndex !== -1) {
        directChats[directChatIndex].lastMessage = messageText;
        directChats[directChatIndex].timestamp = Date.now();

        // Update UI for direct chat list without full re-render
        const chatItem = directMessagesList.querySelector(
          `[data-chat-id="${chatId}"]`
        );
        if (chatItem) {
          const lastMessageElement =
            chatItem.querySelector(".chat-last-message");
          if (lastMessageElement) {
            lastMessageElement.textContent = messageText;
          }

          const chatTimeElement = chatItem.querySelector(".chat-time");
          if (chatTimeElement) {
            chatTimeElement.textContent = formatTime(new Date().toISOString());
          }
        }
      }
    } else if (chatType === "group") {
      // Find the group chat in the list
      const groupChatIndex = groupChats.findIndex((chat) => chat.id === chatId);
      if (groupChatIndex !== -1) {
        groupChats[groupChatIndex].lastMessage = messageText;
        groupChats[groupChatIndex].timestamp = Date.now();

        // Update UI for group chat list without full re-render
        const chatItem = groupsList.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatItem) {
          const lastMessageElement =
            chatItem.querySelector(".chat-last-message");
          if (lastMessageElement) {
            lastMessageElement.textContent = messageText;
          }

          const chatTimeElement = chatItem.querySelector(".chat-time");
          if (chatTimeElement) {
            chatTimeElement.textContent = formatTime(new Date().toISOString());
          }
        }
      }
    }
  } catch (error) {
    console.error("Error sending message:", error);

    // Handle failure by marking the message as failed
    const messageIndex = messages[currentChat.id].findIndex(
      (msg) => msg.text === originalMessage && msg.pending === true
    );

    if (messageIndex !== -1) {
      messages[currentChat.id][messageIndex].failed = true;

      // Update UI to indicate failed message
      const pendingMessages = document.querySelectorAll(
        ".message-bubble.pending"
      );
      for (const pendingMsg of pendingMessages) {
        if (pendingMsg.textContent === originalMessage) {
          pendingMsg.classList.add("failed");
          break;
        }
      }
    }

    // Notify user
    alert("Failed to send message: " + error.message);
  }
}

// Show chat info panel
function showChatInfo() {
  if (!currentChat) return;

  infoPanelContent.innerHTML = "";

  if (currentChat.type === "direct") {
    const chat = directChats.find((c) => c.id === currentChat.id);
    if (chat) {
      const user = users.find((u) => u.id === chat.userId);
      if (user) {
        console.log("User info panel:", user);

        // Create member item with photo
        const memberItem = document.createElement("div");
        memberItem.className = "member-item";

        // Create avatar with photo if available
        const avatarElement = createAvatarElement(user);
        avatarElement.className = "member-avatar"; // Use member-avatar class for styling

        const memberInfo = document.createElement("div");
        memberInfo.className = "member-info";
        memberInfo.innerHTML = `<div class="member-name">${user.name}</div>`;

        memberItem.appendChild(avatarElement);
        memberItem.appendChild(memberInfo);

        // Добавляем кнопку удаления пользователя для всех пользователей
        const deleteUserBtn = document.createElement("button");
        deleteUserBtn.className = "delete-user-btn";
        deleteUserBtn.textContent = "Delete User";
        deleteUserBtn.onclick = () => confirmDeleteUser(user.id, user.name);
        memberItem.appendChild(deleteUserBtn);

        infoPanelContent.appendChild(memberItem);
      }
    }
  } else {
    const chat = groupChats.find((c) => c.id === currentChat.id);
    if (chat) {
      // Group info and members
      const membersList = document.createElement("div");
      membersList.className = "members-list";

      // Add group creator info
      if (chat.created_by && chat.creator_name) {
        const creatorInfo = document.createElement("div");
        creatorInfo.className = "creator-info";
        creatorInfo.innerHTML = `<strong>Group created by:</strong> ${chat.creator_name}`;
        infoPanelContent.appendChild(creatorInfo);
      }

      // Debug log
      console.log("Group members:", chat.members);

      // Add header with correct member count
      const header = document.createElement("h4");
      header.textContent = `${chat.members.length} Members`;
      infoPanelContent.appendChild(header);

      // Add members - ensure we're properly getting each member's info
      const memberPromises = chat.members.map(async (memberId) => {
        let member;
        if (memberId === currentUser.id) {
          member = {
            id: currentUser.id,
            name: currentUser.fullName || "You",
          };
        } else {
          member = users.find((u) => u.id === memberId);

          // If member not found in existing users array, try to fetch user data
          if (!member) {
            console.log(
              `Member ID ${memberId} not found in users array, attempting to fetch user data`
            );
            try {
              const response = await fetch(
                `./api/chat-api.php?action=get_user_details&user_id=${memberId}`
              );
              if (response.ok) {
                const userData = await response.json();
                if (userData.success && userData.user) {
                  member = {
                    id: userData.user.id,
                    name: userData.user.name || userData.user.full_name,
                  };
                  // Add to users array to cache for future use
                  if (!users.find((u) => u.id === member.id)) {
                    users.push(member);
                  }
                }
              }
            } catch (error) {
              console.error(
                `Error fetching user data for ID ${memberId}:`,
                error
              );
            }
          }
        }

        if (member) {
          const memberItem = document.createElement("div");
          memberItem.className = "member-item";

          // Create avatar with photo if available
          const avatarElement = createAvatarElement(member);
          avatarElement.className = "member-avatar"; // Use member-avatar class for styling

          // Check if this member is the creator/admin
          const isCreator = chat.created_by === member.id;

          const memberInfo = document.createElement("div");
          memberInfo.className = "member-info";
          memberInfo.innerHTML = `
            <div class="member-name">
              ${member.name}${member.id === currentUser.id ? " (You)" : ""} 
              ${isCreator ? '<span class="admin-badge">Admin</span>' : ""}
            </div>
          `;

          memberItem.appendChild(avatarElement);
          memberItem.appendChild(memberInfo);

          // Добавляем кнопку удаления пользователя для всех пользователей
          const deleteUserBtn = document.createElement("button");
          deleteUserBtn.className = "delete-user-btn";
          deleteUserBtn.textContent = "Delete User";
          deleteUserBtn.onclick = () =>
            confirmDeleteUser(member.id, member.name);
          memberItem.appendChild(deleteUserBtn);

          return memberItem;
        }
        return null;
      });

      // Wait for all member items to be created, then add them to the list
      Promise.all(memberPromises).then((memberItems) => {
        memberItems
          .filter((item) => item !== null)
          .forEach((item) => {
            membersList.appendChild(item);
          });
        infoPanelContent.appendChild(membersList);
      });
    }
  }

  infoPanel.classList.remove("hidden");
}

// Show create group modal
function showCreateGroupModal() {
  // Clear previous values
  groupNameInput.value = "";
  userSelection.innerHTML = "";

  // Clear the filter input
  const userFilterInput = document.getElementById("userFilter");
  if (userFilterInput) {
    userFilterInput.value = "";
  }

  // Add user checkboxes
  populateUserSelection(users);

  // Отображаем модальное окно
  overlay.classList.remove("hidden");
  createGroupModal.classList.remove("hidden");
  createGroupModal.style.visibility = "visible";
  createGroupModal.style.opacity = "1";

  // Для отладки добавляем информацию о видимости модального окна
  console.log("Create Group Modal visibility:", {
    overlayHidden: overlay.classList.contains("hidden"),
    modalHidden: createGroupModal.classList.contains("hidden"),
    modalDisplay: window.getComputedStyle(createGroupModal).display,
    modalOpacity: window.getComputedStyle(createGroupModal).opacity,
    modalVisibility: window.getComputedStyle(createGroupModal).visibility,
  });
}

// Populate user selection with filtered users
function populateUserSelection(usersToShow) {
  userSelection.innerHTML = "";

  if (usersToShow.length === 0) {
    const noResults = document.createElement("div");
    noResults.className = "no-results";
    noResults.textContent = "No users found matching your search.";
    userSelection.appendChild(noResults);
    return;
  }

  usersToShow.forEach((user) => {
    const userItem = document.createElement("div");
    userItem.className = "user-selection-item";
    userItem.dataset.userId = user.id;

    // Create user info container (avatar + name)
    const userInfo = document.createElement("div");
    userInfo.className = "user-info";

    // Create avatar
    const avatarElement = createAvatarElement(user, "small");

    // Create label
    const userName = document.createElement("div");
    userName.className = "user-selection-name";
    userName.textContent = user.name;

    // Add avatar and name to user info
    userInfo.appendChild(avatarElement);
    userInfo.appendChild(userName);

    // Add to user item
    userItem.appendChild(userInfo);

    // Add click handler to toggle selection
    userItem.addEventListener("click", function () {
      this.classList.toggle("selected");
    });

    userSelection.appendChild(userItem);
  });
}

// Filter users in the selection based on search term
function filterUserSelection(searchTerm) {
  searchTerm = searchTerm.toLowerCase().trim();

  if (!searchTerm) {
    // Show all users if search term is empty
    populateUserSelection(users);
    return;
  }

  // Filter users by name
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm)
  );

  populateUserSelection(filteredUsers);
}

// Create a new group
async function createGroup() {
  const groupName = groupNameInput.value.trim();
  if (!groupName) {
    alert("Please enter a group name");
    return;
  }

  const selectedUsers = Array.from(
    userSelection.querySelectorAll(".user-selection-item.selected")
  ).map((item) => parseInt(item.dataset.userId));

  if (selectedUsers.length === 0) {
    alert("Please select at least one user");
    return;
  }

  try {
    // Make API call to create group
    const response = await fetch("./api/chat-api.php?action=create_group", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: groupName,
        members: selectedUsers,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create group: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to create group");
    }

    console.log("Group created successfully:", result);

    // Hide modal
    overlay.classList.add("hidden");
    createGroupModal.classList.add("hidden");

    // Refresh chats to get the new group
    await fetchChats();
    renderChats();

    // Select the new group
    if (result.group && result.group.id) {
      selectChat(result.group.id, "group");
    }
  } catch (error) {
    console.error("Error creating group:", error);
    alert("Failed to create group: " + error.message);
  }
}

// Show add user to chat modal
function showAddUserModal() {
  if (!currentChat || currentChat.type !== "group") {
    console.error("Cannot add users: No active group chat selected");
    return;
  }

  const chat = groupChats.find((c) => c.id === currentChat.id);
  if (!chat) {
    console.error("Cannot add users: Group chat not found", currentChat.id);
    return;
  }

  // Проверка наличия DOM-элементов
  if (!addUserSelection || !overlay || !addUserModal) {
    console.error("Required DOM elements not found:", {
      addUserSelection: !!addUserSelection,
      overlay: !!overlay,
      addUserModal: !!addUserModal,
    });
    return;
  }

  // Clear previous values
  addUserSelection.innerHTML = "";

  // Clear the filter input
  const addUserFilterInput = document.getElementById("addUserFilter");
  if (addUserFilterInput) {
    addUserFilterInput.value = "";
  }

  // Проверяем, есть ли доступные пользователи
  const availableUsers = users.filter(
    (user) => !chat.members.includes(user.id)
  );

  console.log("Available users to add:", availableUsers.length);

  // Populate the user selection
  populateAddUserSelection(availableUsers);

  // Сначала отображаем overlay, затем модальное окно
  overlay.classList.remove("hidden");
  addUserModal.classList.remove("hidden");

  // Убеждаемся, что модальное окно получило все необходимые стили
  addUserModal.style.visibility = "visible";
  addUserModal.style.opacity = "1";

  // Для отладки добавляем информацию о видимости модального окна
  console.log("Modal visibility:", {
    overlayHidden: overlay.classList.contains("hidden"),
    modalHidden: addUserModal.classList.contains("hidden"),
    modalDisplay: window.getComputedStyle(addUserModal).display,
    modalOpacity: window.getComputedStyle(addUserModal).opacity,
    modalVisibility: window.getComputedStyle(addUserModal).visibility,
  });
}

// Populate add user selection with filtered users
function populateAddUserSelection(usersToShow) {
  addUserSelection.innerHTML = "";

  if (usersToShow.length === 0) {
    addUserSelection.innerHTML = "<p>No users available to add</p>";
    return;
  }

  usersToShow.forEach((user) => {
    const userItem = document.createElement("div");
    userItem.className = "user-selection-item";
    userItem.dataset.userId = user.id;

    // Create user info container (avatar + name)
    const userInfo = document.createElement("div");
    userInfo.className = "user-info";

    // Create avatar
    const avatarElement = createAvatarElement(user, "small");

    // Create label
    const userName = document.createElement("div");
    userName.className = "user-selection-name";
    userName.textContent = user.name;

    // Add avatar and name to user info
    userInfo.appendChild(avatarElement);
    userInfo.appendChild(userName);

    // Добавляем индикатор выбора
    const selectionIndicator = document.createElement("div");
    selectionIndicator.className = "selection-indicator";
    selectionIndicator.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

    // Add to user item
    userItem.appendChild(userInfo);
    userItem.appendChild(selectionIndicator);

    // Add click handler to toggle selection
    userItem.addEventListener("click", function () {
      this.classList.toggle("selected");
      // Для отладки
      console.log(
        `User ${user.name} (${user.id}) selected: ${this.classList.contains(
          "selected"
        )}`
      );
    });

    addUserSelection.appendChild(userItem);
  });
}

// Filter users in the add user selection based on search term
function filterAddUserSelection(searchTerm) {
  if (!currentChat || currentChat.type !== "group") return;

  const chat = groupChats.find((c) => c.id === currentChat.id);
  if (!chat) return;

  searchTerm = searchTerm.toLowerCase().trim();

  // Get users not in the group
  const availableUsers = users.filter(
    (user) => !chat.members.includes(user.id)
  );

  if (!searchTerm) {
    // Show all available users if search term is empty
    populateAddUserSelection(availableUsers);
    return;
  }

  // Filter users by name
  const filteredUsers = availableUsers.filter((user) =>
    user.name.toLowerCase().includes(searchTerm)
  );

  populateAddUserSelection(filteredUsers);
}

// Add users to existing chat
async function addUsersToChat() {
  if (!currentChat || currentChat.type !== "group") return;

  const chat = groupChats.find((c) => c.id === currentChat.id);
  if (!chat) return;

  const selectedUsers = Array.from(
    addUserSelection.querySelectorAll(".user-selection-item.selected")
  ).map((item) => parseInt(item.dataset.userId));

  if (selectedUsers.length === 0) {
    alert("Please select at least one user");
    return;
  }

  try {
    // Отправляем запрос к API для добавления пользователей на сервере
    const response = await fetch(
      "./api/chat-api.php?action=add_users_to_group",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          group_id: currentChat.id,
          user_ids: selectedUsers,
        }),
      }
    );

    const result = await response.json();

    // Проверяем код ответа и сообщение об ошибке
    if (!response.ok) {
      console.error("API Error:", result);
      throw new Error(
        `Failed to add users to group: ${response.status}${
          result.error ? " - " + result.error : ""
        }`
      );
    }

    if (!result.success) {
      console.error("API Error:", result);
      throw new Error(result.error || "Failed to add users to group");
    }

    console.log("Users added to group successfully:", result);

    // Обновляем локальные данные
    // Используем только тех пользователей, которых фактически добавили
    if (result.added_users && Array.isArray(result.added_users)) {
      chat.members.push(...result.added_users);

      // Получаем имена добавленных пользователей для сообщения
      const userNames = result.added_users
        .map((userId) => {
          const user = users.find((u) => u.id === userId);
          return user ? user.name : "Unknown User";
        })
        .join(", ");

      // Создаем сообщение о добавлении пользователей только если были добавлены пользователи
      if (result.added_users.length > 0) {
        const newMessage = {
          sender: currentUser.id,
          text: `Added ${userNames} to the group`,
          timestamp: new Date(),
        };

        if (!messages[currentChat.id]) {
          messages[currentChat.id] = [];
        }

        messages[currentChat.id].push(newMessage);

        // Обновляем последнее сообщение группы
        chat.lastMessage = newMessage.text;
        chat.timestamp = new Date();
      }
    }

    // Скрываем модальное окно
    overlay.classList.add("hidden");
    addUserModal.classList.add("hidden");

    // Обновляем UI
    renderGroups();
    await loadMessages(currentChat.id);
    updateChatHeader();

    // Если панель информации открыта, обновляем её
    if (!infoPanel.classList.contains("hidden")) {
      showChatInfo();
    }
  } catch (error) {
    console.error("Error adding users to group:", error);
    alert("Failed to add users to group: " + error.message);
  }
}

// Switch between Direct Messages and Groups tabs
function switchTab(tabName) {
  tabButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.tab === tabName) {
      btn.classList.add("active");
    }
  });

  if (tabName === "direct") {
    directMessagesList.classList.remove("hidden");
    groupsList.classList.add("hidden");
  } else {
    directMessagesList.classList.add("hidden");
    groupsList.classList.remove("hidden");
  }
}

// Filter chats by search term
function filterChats(searchTerm) {
  if (!searchTerm || searchTerm.trim() === "") {
    // Show all chats if search term is empty
    fetchChats().then(() => {
      renderChats();
    });
    return;
  }

  // Show loading state
  directMessagesList.innerHTML =
    '<div class="chat-item"><div class="chat-name">Searching...</div></div>';
  groupsList.innerHTML =
    '<div class="chat-item"><div class="chat-name">Searching...</div></div>';

  // Call the search API
  fetch(
    `./api/chat-api.php?action=search&query=${encodeURIComponent(searchTerm)}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!data.success) {
        throw new Error(data.error || "Search failed");
      }

      console.log("Search results:", data);

      // Render search results
      renderSearchResults(data);
    })
    .catch((error) => {
      console.error("Search error:", error);
      directMessagesList.innerHTML = `<div class="chat-item"><div class="chat-name">Search error: ${error.message}</div></div>`;
      groupsList.innerHTML = "";
    });
}

// Render search results
function renderSearchResults(data) {
  // Clear current lists
  directMessagesList.innerHTML = "";
  groupsList.innerHTML = "";

  // Render users in direct messages tab
  if (data.users && data.users.length > 0) {
    data.users.forEach((user) => {
      const chatItem = document.createElement("div");
      chatItem.className = "chat-item";
      chatItem.dataset.userId = user.id;

      // Create avatar
      const userObj = {
        id: user.id,
        name: user.name,
      };
      const avatarElement = createAvatarElement(userObj);

      const infoDiv = document.createElement("div");
      infoDiv.className = "chat-info-preview";
      infoDiv.innerHTML = `
        <div class="chat-name">${user.name}</div>
        <div class="chat-preview">${
          user.department || user.role || "Start a new conversation"
        }</div>
      `;

      chatItem.appendChild(avatarElement);
      chatItem.appendChild(infoDiv);

      // Add click handler to start new chat
      chatItem.addEventListener("click", () => {
        createNewDirectChat(user);
      });

      directMessagesList.appendChild(chatItem);
    });
  } else {
    directMessagesList.innerHTML =
      '<div class="chat-item"><div class="chat-name">No users found</div></div>';
  }

  // Render groups
  if (data.groups && data.groups.length > 0) {
    data.groups.forEach((group) => {
      const chatItem = document.createElement("div");
      chatItem.className = "chat-item";
      chatItem.dataset.chatId = group.id;
      chatItem.dataset.chatType = "group";

      // Create group avatar (first two letters of group name)
      const avatarDiv = document.createElement("div");
      avatarDiv.className = "chat-avatar";
      avatarDiv.textContent = group.name.substring(0, 2).toUpperCase();

      const infoDiv = document.createElement("div");
      infoDiv.className = "chat-info-preview";
      infoDiv.innerHTML = `
        <div class="chat-name">${group.name}</div>
        <div class="chat-preview">${group.memberCount} members • Created by ${group.creator_name}</div>
      `;

      chatItem.appendChild(avatarDiv);
      chatItem.appendChild(infoDiv);

      // Add click handler
      chatItem.addEventListener("click", () => {
        selectChat(group.id, "group");
      });

      groupsList.appendChild(chatItem);
    });
  } else {
    groupsList.innerHTML =
      '<div class="chat-item"><div class="chat-name">No groups found</div></div>';
  }

  // Switch to the appropriate tab if we have results in one but not the other
  if (data.users.length > 0 && data.groups.length === 0) {
    switchTab("direct");
  } else if (data.users.length === 0 && data.groups.length > 0) {
    switchTab("groups");
  }
}

// Set up event listeners
function setupEventListeners() {
  // Tab switching
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Search functionality
  searchUsersInput.addEventListener("input", () => {
    filterChats(searchUsersInput.value);
  });

  // Add search placeholder to guide users
  searchUsersInput.placeholder = "Search for users or groups...";

  // Create group button
  createGroupBtn.addEventListener("click", showCreateGroupModal);

  // User filter in the Create Group modal
  document.getElementById("userFilter")?.addEventListener("input", (e) => {
    filterUserSelection(e.target.value);
  });

  // User filter in the Add Users to Chat modal
  document.getElementById("addUserFilter")?.addEventListener("input", (e) => {
    filterAddUserSelection(e.target.value);
  });

  // Send message
  sendMessageBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", (e) => {
    // При нажатии Enter без Shift отправляем сообщение
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // При нажатии Enter с Shift просто добавляем перенос строки
  });

  // Добавляем автоматическую регулировку высоты текстового поля
  messageInput.addEventListener("input", function () {
    // Сохраняем прокрутку
    const scrollTop = this.scrollTop;

    // Если пользователь набрал слишком много текста, прокрутка будет работать
    if (this.scrollHeight > 80) {
      this.style.overflowY = "auto";
    } else {
      this.style.overflowY = "hidden";
    }

    // Восстанавливаем прокрутку
    this.scrollTop = scrollTop;
  });

  // View chat info
  viewChatInfoBtn.addEventListener("click", showChatInfo);

  // Close info panel
  closeInfoPanelBtn.addEventListener("click", () => {
    infoPanel.classList.add("hidden");
  });

  // Add user to chat
  addUserToChat.addEventListener("click", showAddUserModal);

  // Modal buttons
  closeGroupModalBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeAllModals();
  });

  createGroupConfirmBtn.addEventListener("click", createGroup);

  closeAddUserModalBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeAllModals();
  });

  addUserConfirmBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await addUsersToChat();
  });

  // Дополнительные обработчики клавиатуры для модальных окон
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllModals();
    }
  });

  // Close modals when clicking overlay
  overlay.addEventListener("click", (e) => {
    // Проверяем, что клик был именно на оверлее, а не на контенте модального окна
    if (e.target === overlay) {
      closeAllModals();
    }
  });

  // Функция для закрытия всех модальных окон
  function closeAllModals() {
    overlay.classList.add("hidden");

    // Закрываем известные модальные окна
    if (createGroupModal) {
      createGroupModal.classList.add("hidden");
      createGroupModal.style.visibility = "hidden";
      createGroupModal.style.opacity = "0";
    }

    if (addUserModal) {
      addUserModal.classList.add("hidden");
      addUserModal.style.visibility = "hidden";
      addUserModal.style.opacity = "0";
    }

    // Закрываем другие модальные окна
    const openModals = document.querySelectorAll(".modal:not(.hidden)");
    openModals.forEach((modal) => {
      modal.classList.add("hidden");
      modal.style.visibility = "hidden";
      modal.style.opacity = "0";
    });

    // Удаляем динамически созданные модальные окна
    const dynamicModals = document.querySelectorAll(
      ".modal:not(#createGroupModal):not(#addUserModal)"
    );
    dynamicModals.forEach((modal) => modal.remove());
  }

  // Back to main menu button event
  // backToMainMenuBtn.addEventListener("click", () => {
  //   // Add a small animation effect
  //   backToMainMenuBtn.classList.add("clicked");

  //   // Wait for animation to finish before redirecting
  //   setTimeout(() => {
  //     window.location.href = "../main.html";
  //   }, 200);
  // });
}

// Create API file to handle chat functionality
// This will be implemented later when we create the server-side functionality

// Confirm delete user
function confirmDeleteUser(userId, userName) {
  // Проверяем, в каком контексте происходит удаление
  if (currentChat && currentChat.type === "group") {
    // Удаление пользователя из группы
    if (
      confirm(`Are you sure you want to remove ${userName} from this group?`)
    ) {
      removeUserFromGroup(userId, currentChat.id);
    }
  } else {
    // Удаление пользователя из системы (для индивидуального чата)
    if (
      confirm(
        `Are you sure you want to delete ${
          userId === currentUser.id ? "your account" : "chat with " + userName
        }? This will delete all messages and chat history with this user.`
      )
    ) {
      deleteUser(userId);
    }
  }
}

// Delete user from the chat system
async function deleteUser(userId) {
  try {
    const response = await fetch("./api/chat-api.php?action=delete_user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to delete user");
    }

    console.log("User deleted successfully:", result);

    // If current user was deleted, redirect to login
    if (userId === currentUser.id) {
      alert("Your account has been deleted.");
      localStorage.removeItem("currentUser");
      window.location.href = "../loginUser.html";
      return;
    }

    // Otherwise, refresh the chat data
    await fetchUsers();
    await fetchChats();
    renderChats();

    // Close the info panel
    infoPanel.classList.add("hidden");

    // If current chat was with deleted user, clear current chat
    if (
      currentChat &&
      currentChat.type === "direct" &&
      directChats.find((c) => c.id === currentChat.id && c.userId === userId)
    ) {
      currentChat = null;
      messagesContainer.innerHTML = "";
      currentChatName.textContent = "";
      chatStatus.textContent = "";
      viewChatInfoBtn.classList.add("hidden"); // Скрываем кнопку Info
      addUserToChat.classList.add("hidden");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    alert("Failed to delete user: " + error.message);
  }
}

// Удаление пользователя из группы
async function removeUserFromGroup(userId, groupId) {
  try {
    console.log(`Removing user ${userId} from group ${groupId}`);

    // Проверяем, имеет ли groupId префикс 'g'
    const formattedGroupId = groupId.startsWith("g") ? groupId : `g${groupId}`;
    console.log(`Formatted group ID: ${formattedGroupId}`);

    // Build a clear URL
    const url = `./api/chat-api.php?action=removeuserfromgroup`;
    console.log(`Making request to: ${url}`);

    const payload = {
      user_id: userId,
      group_id: formattedGroupId,
    };
    console.log(`Request payload:`, payload);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Log the response status
    console.log(`Response status: ${response.status} ${response.statusText}`);

    // Get the raw response text for debugging
    const responseText = await response.text();
    console.log(`Raw response: ${responseText}`);

    // Parse the response
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (err) {
      console.error("Error parsing response:", err);
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    if (!result.success) {
      throw new Error(result.error || "Failed to remove user from group");
    }

    console.log("User removed from group successfully:", result);

    // Обновляем данные группы
    const chat = groupChats.find((c) => c.id === groupId);
    if (chat && !result.group_deleted) {
      // Удаляем пользователя из списка участников
      chat.members = chat.members.filter((id) => id !== userId);

      // Добавляем сообщение об удалении пользователя
      const removedUser = users.find((u) => u.id === userId);
      const userName = removedUser ? removedUser.name : "Unknown User";

      const newMessage = {
        sender: currentUser.id,
        text: `${userName} has been removed from the group`,
        timestamp: new Date(),
      };

      if (!messages[groupId]) {
        messages[groupId] = [];
      }

      messages[groupId].push(newMessage);

      // Обновляем последнее сообщение группы
      chat.lastMessage = newMessage.text;
      chat.timestamp = new Date();
    }

    // Если группа была удалена после удаления пользователя
    if (result.group_deleted) {
      // Удаляем группу из списка
      groupChats = groupChats.filter((g) => g.id !== groupId);

      // Если текущая группа была удалена, очищаем текущий чат
      if (currentChat && currentChat.id === groupId) {
        currentChat = null;
        messagesContainer.innerHTML = "";
        currentChatName.textContent = "";
        chatStatus.textContent = "";
        viewChatInfoBtn.classList.add("hidden"); // Скрываем кнопку Info, когда нет активного чата
        addUserToChat.classList.add("hidden");
      }
    } else {
      // Обновляем UI
      renderGroups();
      if (currentChat && currentChat.id === groupId) {
        loadMessages(groupId);
        updateChatHeader();
      }
    }

    // Если панель информации открыта, обновляем её
    if (!infoPanel.classList.contains("hidden")) {
      showChatInfo();
    }
  } catch (error) {
    console.error("Error removing user from group:", error);
    alert("Failed to remove user from group: " + error.message);
  }
}

/**
 * Start periodic updates for user online status
 */
function startStatusUpdates() {
  // Сначала обновляем статус
  updateUserStatus();

  // Устанавливаем интервал обновления статуса каждые 30 секунд
  onlineStatusInterval = setInterval(() => {
    updateUserStatus();
    fetchOnlineUsers();
  }, 30000); // 30 секунд

  // Устанавливаем интервал обновления блока онлайн-пользователей каждые 2 минуты
  onlineUsersRefreshInterval = setInterval(() => {
    // Обновляем список случайных онлайн-пользователей
    updateOnlineUsersSection();
  }, 120000); // 2 минуты

  // Первоначальное получение статусов пользователей
  fetchOnlineUsers();

  // Добавляем обработчик для обновления статуса при активности пользователя
  document.addEventListener("click", updateUserStatus);
  document.addEventListener("keypress", updateUserStatus);
}

/**
 * Update current user's online status
 */
async function updateUserStatus() {
  try {
    const response = await fetch(
      "./api/chat-api.php?action=update_user_status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Error updating user status:", response.statusText);
    }
  } catch (error) {
    console.error("Error updating user status:", error);
  }
}

/**
 * Fetch online users and update UI
 */
async function fetchOnlineUsers() {
  try {
    const response = await fetch("./api/chat-api.php?action=get_users");

    if (!response.ok) {
      console.error("Error fetching users status:", response.statusText);
      return;
    }

    const data = await response.json();
    if (!data.success) {
      console.error("Error in users status response:", data.error);
      return;
    }

    // Обновляем список пользователей с их статусами
    users = data.users;

    // Обновляем отображение статусов в списке контактов
    updateStatusIndicators();

    // Обновляем раздел онлайн-пользователей
    updateOnlineUsersSection();
  } catch (error) {
    console.error("Error fetching online users:", error);
  }
}

/**
 * Обновляет раздел онлайн-пользователей случайной выборкой из 30 человек
 */
function updateOnlineUsersSection() {
  if (!onlineUsersContainer) return;

  // Отбираем только пользователей со статусом "online"
  const onlineUsers = users.filter((user) => user.status === "online");

  // Если нет пользователей онлайн, показываем сообщение
  if (onlineUsers.length === 0) {
    onlineUsersContainer.innerHTML =
      '<div class="no-online-users">No users online</div>';
    return;
  }

  // Выбираем случайных 30 пользователей (или меньше, если онлайн меньше 30)
  let displayUsers = [...onlineUsers];
  if (displayUsers.length > 30) {
    // Перемешиваем массив и берем первые 30 элементов
    displayUsers = shuffleArray(displayUsers).slice(0, 30);
  }

  // Очищаем контейнер
  onlineUsersContainer.innerHTML = "";

  // Добавляем пользователей
  displayUsers.forEach((user) => {
    const userItem = createOnlineUserItem(user);
    onlineUsersContainer.appendChild(userItem);
  });

  // Настраиваем навигацию, если есть много пользователей
  setupOnlineUsersNavigation();
}

/**
 * Создает элемент для отображения онлайн-пользователя
 */
function createOnlineUserItem(user) {
  const userItem = document.createElement("div");
  userItem.className = "online-user-item";
  userItem.setAttribute("data-user-id", user.id);

  // Создаем аватар
  const avatarContainer = document.createElement("div");
  avatarContainer.className = "online-user-avatar";

  // Инициалы (будут показаны, если нет фото)
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  avatarContainer.textContent = initials;

  // Пробуем добавить фото, если есть
  if (user.photoUrl) {
    const img = document.createElement("img");
    img.src = user.photoUrl;
    img.alt = user.name;

    // Очищаем контейнер и добавляем фото
    avatarContainer.textContent = "";
    avatarContainer.appendChild(img);
  } else {
    // Пытаемся загрузить фото
    getUserPhotoUrl(user.id).then((photoUrl) => {
      if (photoUrl) {
        user.photoUrl = photoUrl;
        const img = document.createElement("img");
        img.src = photoUrl;
        img.alt = user.name;

        avatarContainer.textContent = "";
        avatarContainer.appendChild(img);
      }
    });
  }

  // Добавляем индикатор статуса к элементу пользователя (не к аватару)
  const statusIndicator = document.createElement("div");
  statusIndicator.className = "online-status-indicator";
  userItem.appendChild(statusIndicator);

  // Добавляем только имя пользователя (первое слово)
  const userName = document.createElement("div");
  userName.className = "online-user-name";

  // Получаем только первое слово (имя) из полного имени
  const firstName = user.name.split(" ")[0];
  userName.textContent = firstName;

  // Собираем всё вместе
  userItem.appendChild(avatarContainer);
  userItem.appendChild(userName);

  // Добавляем обработчик клика для открытия чата с этим пользователем
  userItem.addEventListener("click", () => {
    createOrSelectDirectChat(user);
  });

  return userItem;
}

/**
 * Настраивает навигацию для онлайн-пользователей
 */
function setupOnlineUsersNavigation() {
  if (!onlineUsersContainer || !prevOnlineUsersBtn || !nextOnlineUsersBtn)
    return;

  // Скрываем кнопки на устройствах с тач-интерфейсом (они могут свайпать)
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (!isTouch) {
    prevOnlineUsersBtn.addEventListener("click", () => {
      // Прокручиваем влево на ширину 5 пользователей
      onlineUsersContainer.scrollBy({
        left: -300, // примерно 5 пользователей
        behavior: "smooth",
      });
    });

    nextOnlineUsersBtn.addEventListener("click", () => {
      // Прокручиваем вправо на ширину 5 пользователей
      onlineUsersContainer.scrollBy({
        left: 300, // примерно 5 пользователей
        behavior: "smooth",
      });
    });
  }
}

/**
 * Создает или выбирает существующий прямой чат с пользователем
 */
function createOrSelectDirectChat(user) {
  // Проверяем, существует ли уже чат с этим пользователем
  const existingChat = directChats.find((chat) => chat.userId === user.id);

  if (existingChat) {
    // Если чат уже существует, выбираем его
    selectChat(existingChat.id, "direct");
  } else {
    // Если чата нет, создаем новый
    createNewDirectChat(user);
  }
}

/**
 * Функция для перемешивания массива (алгоритм Фишера–Йетса)
 */
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Update status indicators for all users in the UI
 */
function updateStatusIndicators() {
  // Обновляем индикаторы в списке прямых сообщений
  const userElements = document.querySelectorAll(
    '.chat-item[data-chat-type="direct"]'
  );
  userElements.forEach((element) => {
    const userId = element.getAttribute("data-chat-id");
    const user = users.find((u) => u.id == userId);

    if (user) {
      // Находим или создаем элемент статуса
      let statusIndicator = element.querySelector(".status-indicator");
      if (!statusIndicator) {
        statusIndicator = document.createElement("span");
        statusIndicator.className = "status-indicator";

        // Найдем имя пользователя и вставим индикатор после него
        const nameElement = element.querySelector(".chat-name");
        if (nameElement) {
          nameElement.appendChild(statusIndicator);
        } else {
          element.appendChild(statusIndicator);
        }
      }

      // Устанавливаем класс в зависимости от статуса
      statusIndicator.className =
        "status-indicator " + (user.status === "online" ? "online" : "offline");
    }
  });

  // Если открыт чат, обновляем статус в заголовке
  if (currentChat) {
    updateChatHeader();
  }
}

// Clean up when unloading the page
window.addEventListener("beforeunload", () => {
  // Clear the status update interval
  if (onlineStatusInterval) {
    clearInterval(onlineStatusInterval);
  }

  // Clear the online users refresh interval
  if (onlineUsersRefreshInterval) {
    clearInterval(onlineUsersRefreshInterval);
  }
});

// Добавляем функцию для обновления счетчиков непрочитанных сообщений в заголовках разделов
function updateTabCounters() {
  // Подсчет непрочитанных сообщений в личных чатах
  const directUnreadCount = directChats.reduce(
    (sum, chat) => sum + (chat.unread || 0),
    0
  );

  // Подсчет непрочитанных сообщений в групповых чатах
  const groupUnreadCount = groupChats.reduce(
    (sum, chat) => sum + (chat.unread || 0),
    0
  );

  // Обновляем значки для разделов
  updateTabCounter("direct", directUnreadCount);
  updateTabCounter("groups", groupUnreadCount);
}

// Функция для обновления счетчика на конкретной вкладке
function updateTabCounter(tabName, count) {
  const tabButton = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (!tabButton) return;

  // Удаляем старый счетчик, если он существует
  const existingCounter = tabButton.querySelector(".tab-counter");
  if (existingCounter) {
    existingCounter.remove();
  }

  // Добавляем новый счетчик, если есть непрочитанные сообщения
  if (count > 0) {
    const counter = document.createElement("span");
    counter.className = "tab-counter";
    counter.textContent = count;

    // Добавляем всплывающую подсказку с количеством непрочитанных сообщений
    let tooltipText = "";
    if (tabName === "direct") {
      tooltipText = `${count} непрочитанных личных сообщений`;
    } else {
      tooltipText = `${count} непрочитанных групповых сообщений`;
    }
    counter.setAttribute("title", tooltipText);

    tabButton.appendChild(counter);
  }
}

// Функция для обработки новых сообщений (добавить её, если она ещё не существует)
function handleNewMessage(chatData) {
  // Код обработки уведомления о новом сообщении

  // Обновляем счетчики в заголовках после получения новых сообщений
  updateTabCounters();
}

// Добавляем вызов updateTabCounters в функцию для обновления непрочитанных сообщений
function markMessagesAsRead(chatId) {
  if (!chatId || !currentUser) return;

  // Обновляем счетчик непрочитанных сообщений
  if (chatId.startsWith("d")) {
    const chat = directChats.find((c) => c.id === chatId);
    if (chat) {
      chat.unread = 0;
    }
  } else if (chatId.startsWith("g")) {
    const chat = groupChats.find((c) => c.id === chatId);
    if (chat) {
      chat.unread = 0;
    }
  }

  // Отправляем запрос к API для обновления статуса чтения сообщений
  const chatDbId = parseInt(chatId.substring(1));
  const chatType = chatId.startsWith("d") ? "direct" : "group";

  const data = {
    chat_id: chatDbId,
    chat_type: chatType,
    user_id: currentUser.id,
  };

  fetch("./api/chat-api.php?action=mark_messages_read", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        console.log("Messages marked as read successfully");
      } else {
        console.error("Error marking messages as read:", result.error);
      }
    })
    .catch((error) => {
      console.error("Error marking messages as read:", error);
    });

  // Обновляем UI
  renderChats();

  // Обновляем счетчики на вкладках
  updateTabCounters();
}

// Функция для сброса счетчика непрочитанных сообщений
function resetUnreadMessagesCount() {
  // Обнуляем счетчик непрочитанных сообщений
  // При открытии чата считаем, что пользователь просмотрел все сообщения
  // Внутри чата markMessagesAsRead обрабатывает прочтение сообщений

  // Отправляем запрос для получения обновленного количества непрочитанных сообщений
  try {
    const userId = currentUser ? currentUser.id : null;
    if (!userId) return;

    // Делаем запрос к API, чтобы убедиться, что у нас актуальное значение
    fetch(`./api/chat-api.php?action=get_unread_count&user_id=${userId}`)
      .then((response) => response.json())
      .then((data) => {
        console.log("Updated unread messages count:", data);
      })
      .catch((error) => {
        console.error("Error updating unread count:", error);
      });
  } catch (error) {
    console.error("Error in resetUnreadMessagesCount:", error);
  }
}
