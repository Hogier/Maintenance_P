// This is a simplified version of user-profile.js for the chat interface
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Check if the chat-specific elements exist
    const chatContainer = document.querySelector(".chat-container");
    if (!chatContainer) {
      console.log(
        "Not in chat interface - skipping user profile initialization"
      );
      return;
    }

    // Let chat.js handle the user data loading
    console.log(
      "Chat interface detected - deferring to chat.js for profile handling"
    );
  } catch (error) {
    console.error("Error in user profile initialization:", error);
  }
});
