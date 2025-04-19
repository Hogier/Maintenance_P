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
const userNameElement = document.getElementById("userName");
const userDepartmentElement = document.querySelector(".user-department");
const userAvatarElement = document.getElementById("userAvatar");
const logoutButton = document.getElementById("logoutButton");

// State variables
let currentUser = null;
let currentChat = null;
let users = [];
let directChats = [];
let groupChats = [];
let messages = {};

// Check if user is logged in
document.addEventListener("DOMContentLoaded", async () => {
  try {
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
  } catch (error) {
    console.error("Error creating session:", error);
  }

  await fetchUsers();
  await fetchChats();
  renderChats();
  setupEventListeners();
}

// Display user info in header
function displayUserInfo() {
  if (!currentUser) return;

  console.log("Current user data:", currentUser);

  // Set user name and department
  userNameElement.textContent = currentUser.fullName || "User";

  // Remove role/department display
  userDepartmentElement.textContent = "";

  // Load user photo if available
  loadUserPhoto();
}

// Load user photo
async function loadUserPhoto() {
  try {
    if (!currentUser || !currentUser.id) {
      console.log("Current user not available for photo loading");
      userAvatarElement.textContent = "👤";
      return;
    }

    console.log("Loading photo for user:", currentUser.id);
    const userPhoto = await getUserPhotoFromServer();
    console.log("User photo response:", userPhoto);

    if (userPhoto) {
      // Create image element
      const img = document.createElement("img");

      // Check if the URL is relative or absolute
      if (userPhoto.startsWith("/") || userPhoto.startsWith("http")) {
        img.src = userPhoto;
      } else {
        // For relative URLs, construct the path relative to current page location
        img.src = userPhoto;
      }

      console.log("Loading image from:", img.src);

      // Add load/error event handlers to debug image loading
      img.onload = function () {
        console.log("✅ Image loaded successfully:", img.src);
      };

      img.onerror = function () {
        console.error("❌ Image failed to load:", img.src);
        console.log("Trying alternate URL format...");

        // Try lowercase version of the URL as a fallback
        const lowerCaseUrl = img.src.replace(
          /\/Maintenance_P\//i,
          "/maintenance_p/"
        );
        if (lowerCaseUrl !== img.src) {
          console.log("Trying lowercase URL:", lowerCaseUrl);
          img.src = lowerCaseUrl;
        } else {
          // Fall back to initials
          if (currentUser && currentUser.fullName) {
            const initials = currentUser.fullName
              .split(" ")
              .map((name) => name.charAt(0))
              .join("")
              .substring(0, 2)
              .toUpperCase();
            userAvatarElement.textContent = initials;
          } else {
            userAvatarElement.textContent = "👤";
          }
        }
      };

      img.alt = "User Avatar";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.borderRadius = "50%";
      img.style.objectFit = "cover";

      // Replace text avatar with image
      userAvatarElement.textContent = "";
      console.log("Adding image to avatar element:", userAvatarElement);
      userAvatarElement.appendChild(img);
      console.log("Avatar element after append:", userAvatarElement.innerHTML);
    } else {
      console.log("No photo URL returned, using initials");
      // If no photo, show initials
      if (currentUser && currentUser.fullName) {
        const initials = currentUser.fullName
          .split(" ")
          .map((name) => name.charAt(0))
          .join("")
          .substring(0, 2)
          .toUpperCase();
        userAvatarElement.textContent = initials;
      } else {
        userAvatarElement.textContent = "👤";
      }
    }
  } catch (error) {
    console.error("Error loading user photo:", error);
    userAvatarElement.textContent = "👤";
  }
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

// Setup logout button
function setupLogoutButton() {
  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      // Clear local storage
      localStorage.removeItem("currentUser");
      localStorage.removeItem("maintenanceStaffAuth");

      // Also clear server-side session by redirecting to logout script
      window.location.href = "./php/logout.php";
    });
  }
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

// Fetch user chats
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
}

// Get photo URL for a specific user
async function getUserPhotoUrl(userId) {
  try {
    const response = await fetch(`./php/get_user_photo.php?user_id=${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.photo_url) {
      // Convert to absolute URL if needed
      let photoUrl = data.photo_url;
      if (photoUrl.startsWith("/") && !photoUrl.startsWith("//")) {
        const baseUrl = window.location.origin;
        photoUrl = baseUrl + photoUrl;
      }
      return photoUrl;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching photo for user ${userId}:`, error);
    return null;
  }
}

// Create avatar element (photo or initials)
function createAvatarElement(user, size = "normal") {
  const avatarDiv = document.createElement("div");
  avatarDiv.className = `chat-avatar ${
    size === "small" ? "chat-avatar-small" : ""
  }`;

  // Use initials as default/fallback
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Try to use photo if available
  if (user.photoUrl) {
    const img = document.createElement("img");
    img.src = user.photoUrl;
    img.alt = user.name;
    img.style.objectFit = "cover";
    img.style.width = "100%";
    img.style.height = "100%";
    img.onerror = function () {
      avatarDiv.textContent = initials;
    };
    avatarDiv.textContent = ""; // Clear any existing content
    avatarDiv.appendChild(img);
  } else {
    avatarDiv.textContent = initials;

    // Try to fetch and cache the photo
    getUserPhotoUrl(user.id).then((photoUrl) => {
      if (photoUrl) {
        user.photoUrl = photoUrl; // Cache the URL
        const img = document.createElement("img");
        img.src = photoUrl;
        img.alt = user.name;
        img.style.objectFit = "cover";
        img.style.width = "100%";
        img.style.height = "100%";
        img.onerror = function () {
          avatarDiv.textContent = initials;
        };
        avatarDiv.textContent = ""; // Clear any existing content
        avatarDiv.appendChild(img);
      }
    });
  }

  return avatarDiv;
}

// Render direct messages list
function renderDirectMessages() {
  directMessagesList.innerHTML = "";

  directChats
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach((chat) => {
      const user = users.find((u) => u.id === chat.userId);
      if (!user) return;

      const chatItem = document.createElement("div");
      chatItem.className = "chat-item";
      chatItem.dataset.chatId = chat.id;
      chatItem.dataset.chatType = "direct";

      // Create avatar with photo if available
      const avatarElement = createAvatarElement(user);

      const infoDiv = document.createElement("div");
      infoDiv.className = "chat-info-preview";
      infoDiv.innerHTML = `
        <div class="chat-name">${user.name}</div>
        <div class="chat-preview">${chat.lastMessage}</div>
      `;

      const metaDiv = document.createElement("div");
      metaDiv.className = "chat-meta";
      metaDiv.innerHTML = `
        <div class="chat-time">${formatTime(chat.timestamp)}</div>
        ${chat.unread > 0 ? `<div class="chat-badge">${chat.unread}</div>` : ""}
      `;

      chatItem.appendChild(avatarElement);
      chatItem.appendChild(infoDiv);
      chatItem.appendChild(metaDiv);

      chatItem.addEventListener("click", () => {
        selectChat(chat.id, "direct");
      });

      directMessagesList.appendChild(chatItem);
    });

  // Add option to start new chat
  const newChatItem = document.createElement("div");
  newChatItem.className = "chat-item";
  newChatItem.innerHTML = `
    <div class="chat-avatar">+</div>
    <div class="chat-info-preview">
      <div class="chat-name">New Conversation</div>
      <div class="chat-preview">Start a new direct message</div>
    </div>
  `;
  newChatItem.addEventListener("click", showNewChatOptions);
  directMessagesList.appendChild(newChatItem);
}

// Render groups list
function renderGroups() {
  groupsList.innerHTML = "";

  groupChats
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach((chat) => {
      const chatItem = document.createElement("div");
      chatItem.className = "chat-item";
      chatItem.dataset.chatId = chat.id;
      chatItem.dataset.chatType = "group";

      // Create group avatar
      const avatarDiv = document.createElement("div");
      avatarDiv.className = "chat-avatar";

      // Use initials as default
      const initials = chat.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

      avatarDiv.textContent = initials;

      // Add info and meta elements
      const infoDiv = document.createElement("div");
      infoDiv.className = "chat-info-preview";
      infoDiv.innerHTML = `
        <div class="chat-name">${chat.name}</div>
        <div class="chat-preview">${chat.lastMessage}</div>
      `;

      const metaDiv = document.createElement("div");
      metaDiv.className = "chat-meta";
      metaDiv.innerHTML = `
        <div class="chat-time">${formatTime(chat.timestamp)}</div>
        ${chat.unread > 0 ? `<div class="chat-badge">${chat.unread}</div>` : ""}
      `;

      chatItem.appendChild(avatarDiv);
      chatItem.appendChild(infoDiv);
      chatItem.appendChild(metaDiv);

      chatItem.addEventListener("click", () => {
        selectChat(chat.id, "group");
      });

      groupsList.appendChild(chatItem);
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
  // Update UI to show selected chat
  document.querySelectorAll(".chat-item").forEach((item) => {
    item.classList.remove("active");
  });

  const chatItem = document.querySelector(
    `.chat-item[data-chat-id="${chatId}"][data-chat-type="${chatType}"]`
  );
  if (chatItem) {
    chatItem.classList.add("active");
  }

  // Update current chat
  currentChat = { id: chatId, type: chatType };

  // Update chat header
  updateChatHeader();

  // Load messages
  loadMessages(chatId);

  // Enable message input
  messageInput.disabled = false;
  sendMessageBtn.disabled = false;

  // Clear unread count
  if (chatType === "direct") {
    const chat = directChats.find((c) => c.id === chatId);
    if (chat) {
      chat.unread = 0;
      renderDirectMessages();
    }
  } else {
    const chat = groupChats.find((c) => c.id === chatId);
    if (chat) {
      chat.unread = 0;
      renderGroups();
    }
  }
}

// Update chat header
function updateChatHeader() {
  if (!currentChat) return;

  if (currentChat.type === "direct") {
    const chat = directChats.find((c) => c.id === currentChat.id);
    if (chat) {
      const user = users.find((u) => u.id === chat.userId);
      if (user) {
        console.log("User in chat:", user);
        currentChatName.textContent = user.name;

        // Remove role/department display
        chatStatus.textContent = "";

        addUserToChat.classList.add("hidden");
      }
    }
  } else {
    const chat = groupChats.find((c) => c.id === currentChat.id);
    if (chat) {
      currentChatName.textContent = chat.name;
      const memberCount = chat.members.length;
      chatStatus.textContent = `${memberCount} members`;
      addUserToChat.classList.remove("hidden");
    }
  }
}

// Load chat messages
async function loadMessages(chatId) {
  try {
    // Make API call to get messages from server
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

    console.log("Messages loaded successfully:", result);

    // Update local messages data
    if (result.messages && Array.isArray(result.messages)) {
      messages[chatId] = result.messages;
    }

    // Render messages
    renderMessages(chatId);
  } catch (error) {
    console.error("Error loading messages:", error);
    messagesContainer.innerHTML = `
      <div class="error-message">
        <h3>Error loading messages</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Show new chat options (when clicking "New Conversation")
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
      `./api/chat-api.php?action=send_message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: `dnew_${user.id}`,
          message: "Hello!", // Initial message to create chat
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

    messages[currentChat.id].push(newMessage);
    renderMessages(currentChat.id);

    // Make API call to server
    const response = await fetch("./api/chat-api.php?action=send_message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: currentChat.id,
        message: messageText,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status}`);
    }

    // Log raw response text for debugging
    const responseText = await response.text();
    console.log("Raw API response:", responseText);

    // Проверяем наличие ответа
    if (!responseText || responseText.trim() === "") {
      console.error("Empty response from server");
      throw new Error("Server returned an empty response");
    }

    let result;
    try {
      // Try to parse the response as JSON
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.log("Response that caused error:", responseText);
      throw new Error("Invalid response from server: " + parseError.message);
    }

    if (!result.success) {
      throw new Error(result.error || "Failed to send message");
    }

    console.log("Message sent successfully:", result);

    // Update the temporary message with real data
    const messageIndex = messages[currentChat.id].findIndex(
      (msg) => msg.id === tempMessageId
    );
    if (messageIndex !== -1) {
      messages[currentChat.id][messageIndex] = {
        id: result.message?.id || messages[currentChat.id][messageIndex].id,
        sender: currentUser.id,
        text: messageText,
        timestamp: result.message?.timestamp || new Date().toISOString(),
        pending: false,
      };
    }

    // Update UI
    if (currentChat.type === "direct") {
      const chat = directChats.find((c) => c.id === currentChat.id);
      if (chat) {
        chat.lastMessage = messageText;
        chat.timestamp = new Date();
      }
      renderDirectMessages();
    } else {
      const chat = groupChats.find((c) => c.id === currentChat.id);
      if (chat) {
        chat.lastMessage = messageText;
        chat.timestamp = new Date();
      }
      renderGroups();
    }

    // Render the updated messages
    renderMessages(currentChat.id);

    // Обновляем сообщения из API только если успешно отправили сообщение
    loadMessages(currentChat.id);
  } catch (error) {
    console.error("Error sending message:", error);

    // Remove the temporary message
    if (messages[currentChat.id]) {
      messages[currentChat.id] = messages[currentChat.id].filter(
        (msg) => !msg.pending
      );
      renderMessages(currentChat.id);
    }

    // Show error notification
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-notification";
    errorDiv.textContent = "Failed to send message: " + error.message;
    document.body.appendChild(errorDiv);

    // Restore the message to the input
    messageInput.value = originalMessage;

    // Remove notification after delay
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
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

  messages[chatId].forEach((message) => {
    const isCurrentUser = message.sender === currentUser.id;
    const isPending = message.pending === true;

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isCurrentUser ? "outgoing" : "incoming"}`;

    // Get sender info for avatar and name
    let sender = null;
    let senderName = "";

    if (!isCurrentUser) {
      if (currentChat.type === "direct") {
        sender = users.find((u) => u.id === message.sender);
        senderName = sender ? sender.name : "Unknown User";
      } else {
        const chat = groupChats.find((c) => c.id === currentChat.id);
        if (chat) {
          sender = users.find((u) => u.id === message.sender);
          senderName = sender ? sender.name : "Unknown User";
        }
      }
    } else {
      sender = {
        id: currentUser.id,
        name: currentUser.fullName || "You",
        photoUrl: null, // We'll set this if needed
      };
    }

    // Create message container with avatar for incoming messages
    if (!isCurrentUser) {
      // Show sender name only on first message from this sender
      const showSenderInfo = message.sender !== lastSenderId;

      // Create avatar if new sender or after a gap
      if (showSenderInfo && sender) {
        const headerDiv = document.createElement("div");
        headerDiv.className = "message-header";

        // Add avatar
        if (sender) {
          const avatarElement = createAvatarElement(sender, "small");
          headerDiv.appendChild(avatarElement);
        }

        // Add sender name
        const senderNameDiv = document.createElement("div");
        senderNameDiv.className = "message-sender";
        senderNameDiv.textContent = senderName;
        headerDiv.appendChild(senderNameDiv);

        messageDiv.appendChild(headerDiv);
      }
    }

    // Add message content
    const bubbleDiv = document.createElement("div");
    bubbleDiv.className = `message-bubble ${isPending ? "pending" : ""}`;
    bubbleDiv.textContent = message.text;
    messageDiv.appendChild(bubbleDiv);

    // Add timestamp
    const timeDiv = document.createElement("div");
    timeDiv.className = "message-time";
    timeDiv.textContent = isPending
      ? "Sending..."
      : formatTime(message.timestamp);
    messageDiv.appendChild(timeDiv);

    messagesContainer.appendChild(messageDiv);
    lastSenderId = message.sender;
  });

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

        // Add delete button for admin users or for self-delete
        if (currentUser.role === "admin" || user.id === currentUser.id) {
          const deleteUserBtn = document.createElement("button");
          deleteUserBtn.className = "delete-user-btn";
          deleteUserBtn.textContent = "Delete User";
          deleteUserBtn.onclick = () => confirmDeleteUser(user.id, user.name);
          memberItem.appendChild(deleteUserBtn);
        }

        infoPanelContent.appendChild(memberItem);
      }
    }
  } else {
    const chat = groupChats.find((c) => c.id === currentChat.id);
    if (chat) {
      // Group info and members
      const membersList = document.createElement("div");
      membersList.className = "members-list";

      // Add header
      const header = document.createElement("h4");
      header.textContent = `${chat.members.length} Members`;
      infoPanelContent.appendChild(header);

      // Add members
      chat.members.forEach((memberId) => {
        let member;
        if (memberId === currentUser.id) {
          member = {
            id: currentUser.id,
            name: currentUser.fullName || "You",
          };
        } else {
          member = users.find((u) => u.id === memberId);
        }

        if (member) {
          const memberItem = document.createElement("div");
          memberItem.className = "member-item";

          // Create avatar with photo if available
          const avatarElement = createAvatarElement(member);
          avatarElement.className = "member-avatar"; // Use member-avatar class for styling

          const memberInfo = document.createElement("div");
          memberInfo.className = "member-info";
          memberInfo.innerHTML = `
            <div class="member-name">
              ${member.name}${member.id === currentUser.id ? " (You)" : ""}
            </div>
          `;

          memberItem.appendChild(avatarElement);
          memberItem.appendChild(memberInfo);

          // Add delete button for admin users or for self-delete
          if (currentUser.role === "admin" || member.id === currentUser.id) {
            const deleteUserBtn = document.createElement("button");
            deleteUserBtn.className = "delete-user-btn";
            deleteUserBtn.textContent = "Delete User";
            deleteUserBtn.onclick = () =>
              confirmDeleteUser(member.id, member.name);
            memberItem.appendChild(deleteUserBtn);
          }

          membersList.appendChild(memberItem);
        }
      });

      infoPanelContent.appendChild(membersList);
    }
  }

  infoPanel.classList.remove("hidden");
}

// Show create group modal
function showCreateGroupModal() {
  // Clear previous values
  groupNameInput.value = "";
  userSelection.innerHTML = "";

  // Add user checkboxes
  users.forEach((user) => {
    const userItem = document.createElement("div");
    userItem.className = "user-selection-item";

    // Create checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "user-selection-checkbox";
    checkbox.id = `user-${user.id}`;
    checkbox.value = user.id;

    // Create label
    const label = document.createElement("label");
    label.htmlFor = `user-${user.id}`;
    label.className = "user-selection-name";
    label.textContent = user.name;

    // Create avatar
    const avatarElement = createAvatarElement(user, "small");

    // Add to user item
    userItem.appendChild(checkbox);
    userItem.appendChild(avatarElement);
    userItem.appendChild(label);

    userSelection.appendChild(userItem);
  });

  // Show modal
  overlay.classList.remove("hidden");
  createGroupModal.classList.remove("hidden");
}

// Create a new group
async function createGroup() {
  const groupName = groupNameInput.value.trim();
  if (!groupName) {
    alert("Please enter a group name");
    return;
  }

  const selectedUsers = Array.from(
    userSelection.querySelectorAll('input[type="checkbox"]:checked')
  ).map((checkbox) => parseInt(checkbox.value));

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
  if (!currentChat || currentChat.type !== "group") return;

  const chat = groupChats.find((c) => c.id === currentChat.id);
  if (!chat) return;

  // Clear previous values
  addUserSelection.innerHTML = "";

  // Add user checkboxes (exclude existing members)
  users
    .filter((user) => !chat.members.includes(user.id))
    .forEach((user) => {
      const userItem = document.createElement("div");
      userItem.className = "user-selection-item";

      // Create checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "user-selection-checkbox";
      checkbox.id = `add-user-${user.id}`;
      checkbox.value = user.id;

      // Create label
      const label = document.createElement("label");
      label.htmlFor = `add-user-${user.id}`;
      label.className = "user-selection-name";
      label.textContent = user.name;

      // Create avatar
      const avatarElement = createAvatarElement(user, "small");

      // Add to user item
      userItem.appendChild(checkbox);
      userItem.appendChild(avatarElement);
      userItem.appendChild(label);

      addUserSelection.appendChild(userItem);
    });

  // Show message if no users to add
  if (addUserSelection.children.length === 0) {
    addUserSelection.innerHTML = "<p>All users are already in this group</p>";
  }

  // Show modal
  overlay.classList.remove("hidden");
  addUserModal.classList.remove("hidden");
}

// Add users to existing chat
function addUsersToChat() {
  if (!currentChat || currentChat.type !== "group") return;

  const chat = groupChats.find((c) => c.id === currentChat.id);
  if (!chat) return;

  const selectedUsers = Array.from(
    addUserSelection.querySelectorAll('input[type="checkbox"]:checked')
  ).map((checkbox) => parseInt(checkbox.value));

  if (selectedUsers.length === 0) {
    alert("Please select at least one user");
    return;
  }

  // Add users to members
  chat.members.push(...selectedUsers);

  // Add message
  const userNames = selectedUsers
    .map((userId) => {
      const user = users.find((u) => u.id === userId);
      return user ? user.name : "Unknown User";
    })
    .join(", ");

  const newMessage = {
    sender: currentUser.id,
    text: `Added ${userNames} to the group`,
    timestamp: new Date(),
  };

  messages[currentChat.id].push(newMessage);

  // Update last message
  chat.lastMessage = newMessage.text;
  chat.timestamp = new Date();

  // Hide modal
  overlay.classList.add("hidden");
  addUserModal.classList.add("hidden");

  // Update UI
  renderGroups();
  loadMessages(currentChat.id);
  updateChatHeader();

  // If info panel is open, update it
  if (!infoPanel.classList.contains("hidden")) {
    showChatInfo();
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
  searchTerm = searchTerm.toLowerCase();

  // Filter direct messages
  const directElements = directMessagesList.querySelectorAll(".chat-item");
  directElements.forEach((element) => {
    if (element.querySelector(".chat-name")) {
      const name = element
        .querySelector(".chat-name")
        .textContent.toLowerCase();
      if (name.includes(searchTerm) || name === "New Conversation") {
        element.style.display = "";
      } else {
        element.style.display = "none";
      }
    }
  });

  // Filter groups
  const groupElements = groupsList.querySelectorAll(".chat-item");
  groupElements.forEach((element) => {
    if (element.querySelector(".chat-name")) {
      const name = element
        .querySelector(".chat-name")
        .textContent.toLowerCase();
      if (name.includes(searchTerm)) {
        element.style.display = "";
      } else {
        element.style.display = "none";
      }
    }
  });
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

  // Create group button
  createGroupBtn.addEventListener("click", showCreateGroupModal);

  // Send message
  sendMessageBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
  closeGroupModalBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
    createGroupModal.classList.add("hidden");
  });

  createGroupConfirmBtn.addEventListener("click", createGroup);

  closeAddUserModalBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
    addUserModal.classList.add("hidden");
  });

  addUserConfirmBtn.addEventListener("click", addUsersToChat);

  // Close modals when clicking overlay
  overlay.addEventListener("click", () => {
    overlay.classList.add("hidden");
    createGroupModal.classList.add("hidden");
    addUserModal.classList.add("hidden");

    // Also close any other modal that might be open
    const openModals = document.querySelectorAll(".modal:not(.hidden)");
    openModals.forEach((modal) => {
      modal.classList.add("hidden");
    });

    // Remove any dynamically created modals
    const dynamicModals = document.querySelectorAll(
      ".modal:not(#createGroupModal):not(#addUserModal)"
    );
    dynamicModals.forEach((modal) => modal.remove());
  });
}

// Create API file to handle chat functionality
// This will be implemented later when we create the server-side functionality

// Confirm delete user
function confirmDeleteUser(userId, userName) {
  if (
    confirm(
      `Are you sure you want to delete ${
        userId === currentUser.id ? "your account" : userName
      }? This will delete all chats and messages.`
    )
  ) {
    deleteUser(userId);
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
      ((currentChat.type === "direct" &&
        directChats.find(
          (c) => c.id === currentChat.id && c.userId === userId
        )) ||
        (currentChat.type === "group" &&
          !groupChats.find((c) => c.id === currentChat.id)))
    ) {
      currentChat = null;
      messagesContainer.innerHTML = "";
      currentChatName.textContent = "";
      chatStatus.textContent = "";
      viewChatInfoBtn.classList.add("hidden");
      addUserToChat.classList.add("hidden");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    alert("Failed to delete user: " + error.message);
  }
}
