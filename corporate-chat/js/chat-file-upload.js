/**
 * File Upload Functionality for Corporate Chat
 */

// DOM Elements
const fileUploadInput = document.getElementById("fileUpload");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileUploadProgressBar = document.querySelector(
  ".file-upload-progress-bar"
);

/**
 * Initialize file upload functionality
 */
function initFileUpload() {
  if (!fileUploadInput) return;

  fileUploadInput.addEventListener("change", handleFileSelect);
}

/**
 * Handle file selection
 */
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showErrorNotification(
      `File size exceeds the limit of 10MB. Current file: ${formatFileSize(
        file.size
      )}`
    );
    fileUploadInput.value = ""; // Reset file input
    return;
  }

  // Validate file type
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];

  if (!allowedTypes.includes(file.type)) {
    showErrorNotification(
      "File type not allowed. Please upload images, PDFs, Word documents, Excel files, or text files."
    );
    fileUploadInput.value = ""; // Reset file input
    return;
  }

  // Show upload preview
  updateUploadPreview(file);

  // If chat is selected, proceed with upload
  if (currentChat) {
    uploadFile(file);
  } else {
    showErrorNotification("Please select a chat before uploading files.");
    fileUploadInput.value = ""; // Reset file input
  }
}

/**
 * Update upload preview with file info
 */
function updateUploadPreview(file) {
  const previewName = document.querySelector(".upload-preview-name");
  const previewSize = document.querySelector(".upload-preview-size");
  const previewIcon = document.querySelector(".upload-preview-icon");

  if (previewName && previewSize && previewIcon) {
    previewName.textContent = file.name;
    previewSize.textContent = formatFileSize(file.size);

    // Set icon based on file type
    if (file.type.startsWith("image/")) {
      previewIcon.textContent = "🖼️";
    } else if (file.type.includes("pdf")) {
      previewIcon.textContent = "📄";
    } else if (file.type.includes("word") || file.type.includes("document")) {
      previewIcon.textContent = "📝";
    } else if (file.type.includes("excel") || file.type.includes("sheet")) {
      previewIcon.textContent = "📊";
    } else if (file.type.includes("text")) {
      previewIcon.textContent = "📋";
    } else {
      previewIcon.textContent = "📎";
    }
  }
}

/**
 * Upload file to the server
 */
function uploadFile(file) {
  if (!currentChat) return;

  // Create FormData to send file
  const formData = new FormData();
  formData.append("file", file);
  formData.append("chat_id", currentChat.id);
  formData.append("chat_type", currentChat.type);
  formData.append("message", ""); // Empty message by default, can be modified to include text

  // Show upload progress UI
  fileUploadWrapper.classList.add("uploading");
  fileUploadProgressBar.style.width = "0%";

  // Create and configure XMLHttpRequest
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "./api/chat-files-api.php?action=upload_file", true);

  // Track upload progress
  xhr.upload.addEventListener("progress", (event) => {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      fileUploadProgressBar.style.width = percentComplete + "%";
    }
  });

  // Handle upload completion
  xhr.addEventListener("load", () => {
    fileUploadWrapper.classList.remove("uploading");
    fileUploadInput.value = ""; // Reset file input

    // Process response
    try {
      const response = JSON.parse(xhr.responseText);
      if (response.success) {
        console.log("File uploaded successfully:", response);

        // Refresh messages to show the new file
        loadMessages(currentChat.id);
      } else {
        showErrorNotification(
          "Upload failed: " + (response.error || "Unknown error")
        );
        console.error("File upload failed:", response);
      }
    } catch (e) {
      showErrorNotification("Failed to process server response");
      console.error("Error parsing response:", e, xhr.responseText);
    }
  });

  // Handle upload error
  xhr.addEventListener("error", () => {
    fileUploadWrapper.classList.remove("uploading");
    fileUploadInput.value = ""; // Reset file input
    showErrorNotification("Network error during file upload");
    console.error("Upload network error");
  });

  // Handle upload abort
  xhr.addEventListener("abort", () => {
    fileUploadWrapper.classList.remove("uploading");
    fileUploadInput.value = ""; // Reset file input
    console.log("Upload aborted");
  });

  // Send the request
  xhr.send(formData);
}

/**
 * Create file attachment element to display in message
 */
function createFileAttachment(file) {
  const attachmentDiv = document.createElement("div");
  attachmentDiv.className = "message-attachment";

  // Determine if file is an image
  const isImage = file.file_type.startsWith("image/");

  // Create preview element
  const previewDiv = document.createElement("div");
  previewDiv.className = "attachment-preview";

  if (isImage) {
    // For images, show the image
    const img = document.createElement("img");
    img.src = file.thumbnail_path || file.file_path;
    img.alt = file.original_name;
    img.addEventListener("click", () => {
      // Open full image on click
      window.open(file.file_path, "_blank");
    });
    previewDiv.appendChild(img);
  } else {
    // For documents, show an icon
    const iconDiv = document.createElement("div");
    iconDiv.className = "document-icon";

    // Set icon based on file type
    let iconContent = "📎"; // Default icon
    if (file.file_type.includes("pdf")) {
      iconContent = "📄";
    } else if (
      file.file_type.includes("word") ||
      file.file_type.includes("document")
    ) {
      iconContent = "📝";
    } else if (
      file.file_type.includes("excel") ||
      file.file_type.includes("sheet")
    ) {
      iconContent = "📊";
    } else if (file.file_type.includes("text")) {
      iconContent = "📋";
    }

    iconDiv.textContent = iconContent;
    previewDiv.appendChild(iconDiv);
  }

  attachmentDiv.appendChild(previewDiv);

  // Create file info section
  const infoDiv = document.createElement("div");
  infoDiv.className = "attachment-info";

  const nameDiv = document.createElement("div");
  nameDiv.className = "attachment-name";
  nameDiv.textContent = file.original_name;

  const sizeDiv = document.createElement("div");
  sizeDiv.className = "attachment-size";
  sizeDiv.textContent = formatFileSize(file.file_size);

  infoDiv.appendChild(nameDiv);
  infoDiv.appendChild(sizeDiv);

  attachmentDiv.appendChild(infoDiv);

  // Create actions section
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "attachment-actions";

  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "Download";
  downloadBtn.addEventListener("click", () => {
    window.open(file.file_path, "_blank");
  });

  actionsDiv.appendChild(downloadBtn);

  // Add delete button if current user is the sender
  if (file.sender_id === currentUser.id) {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      deleteFile(file.id);
    });
    actionsDiv.appendChild(deleteBtn);
  }

  attachmentDiv.appendChild(actionsDiv);

  return attachmentDiv;
}

/**
 * Delete a file
 */
async function deleteFile(fileId) {
  if (!confirm("Are you sure you want to delete this file?")) {
    return;
  }

  try {
    const formData = new FormData();
    formData.append("file_id", fileId);

    const response = await fetch(
      "./api/chat-files-api.php?action=delete_file",
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (result.success) {
      // Refresh messages to update UI
      loadMessages(currentChat.id);
    } else {
      showErrorNotification(
        "Failed to delete file: " + (result.error || "Unknown error")
      );
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    showErrorNotification("Error deleting file");
  }
}

/**
 * Format file size to human-readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Show error notification
 */
function showErrorNotification(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-notification";
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);

  // Remove notification after delay
  setTimeout(() => {
    errorDiv.remove();
  }, 3000);
}

// Initialize file upload when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initFileUpload();
});
