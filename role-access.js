/**
 * Role-based Access Control System
 * This file manages access to different parts of the application based on user roles
 */

// On page load, apply role-based access control
document.addEventListener("DOMContentLoaded", function () {
  applyRoleBasedAccess();
});

// Apply access controls based on the user's role
function applyRoleBasedAccess() {
  const userRole = getUserRole();

  if (!userRole) {
    // User is not logged in
    showPublicContent();
    hideRestrictedContent();
    return;
  }

  // Show/hide elements based on role
  const adminOnlyElements = document.querySelectorAll(".admin-only");
  const supportOnlyElements = document.querySelectorAll(".support-only");
  const userOnlyElements = document.querySelectorAll(".user-only");
  // Restoring maintenance staff portal visibility check to show only for admin and support
  const maintenanceElements = document.querySelectorAll(".maintenance-staff");
  const eventPortalElements = document.querySelectorAll(".event-portal");

  // Process admin-only elements
  adminOnlyElements.forEach((element) => {
    if (userRole === "admin") {
      element.style.display = "";
    } else {
      element.style.display = "none";
    }
  });

  // Process support-only elements
  supportOnlyElements.forEach((element) => {
    if (userRole === "support" || userRole === "admin") {
      element.style.display = "";
    } else {
      element.style.display = "none";
    }
  });

  // Process maintenance staff elements - only visible to admin and support roles
  maintenanceElements.forEach((element) => {
    if (userRole === "admin" || userRole === "support") {
      element.style.display = "";
    } else {
      element.style.display = "none";
    }
  });

  // Process user-only elements
  userOnlyElements.forEach((element) => {
    if (userRole === "user" || userRole === "admin" || userRole === "support") {
      element.style.display = "";
    } else {
      element.style.display = "none";
    }
  });

  // Process event portal elements - now accessible to all authenticated users
  eventPortalElements.forEach((element) => {
    if (userRole) {
      element.style.display = "";
    } else {
      element.style.display = "none";
    }
  });
}

// Redirect user if they don't have the required role
function checkRoleAccess(requiredRoles) {
  const userRole = getUserRole();

  if (!userRole || !requiredRoles.includes(userRole)) {
    // User doesn't have the required role, redirect to appropriate page
    if (!userRole) {
      window.location.href = "loginUser.html";
    } else {
      window.location.href = "main.html";
      alert("You do not have permission to access this page.");
    }
    return false;
  }

  return true;
}

// Show only public content
function showPublicContent() {
  const publicElements = document.querySelectorAll(".public");
  publicElements.forEach((element) => {
    element.style.display = "";
  });
}

// Hide restricted content
function hideRestrictedContent() {
  // Removing maintenance-staff from the list of hidden elements to make it visible for all users
  const restrictedElements = document.querySelectorAll(
    ".admin-only, .support-only, .user-only"
  );
  restrictedElements.forEach((element) => {
    element.style.display = "none";
  });
}

// Check if the current page requires a specific role and redirect if needed
function enforceRoleForPage(requiredRoles) {
  return checkRoleAccess(requiredRoles);
}
