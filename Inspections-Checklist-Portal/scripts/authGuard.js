/**
 * Auth Guard for Inspections & Checklist Portal
 *
 * This file ensures that only users with admin role can access the portal.
 * If a user is not logged in, they will be redirected to the login page.
 * If a user is logged in but doesn't have admin role, they will be redirected to the login page.
 */

// Check if the user is authenticated and has the required role
function checkPortalAccess() {
  // Get the current user from localStorage
  const user = JSON.parse(localStorage.getItem("currentUser"));

  // If no user is logged in, redirect to login page
  if (!user) {
    window.location.href =
      "/loginUser.html?redirect=/Inspections-Checklist-Portal/";
    return false;
  }

  // If user is logged in but doesn't have admin role, redirect to login page
  if (user.role !== "admin") {
    // Redirect directly to login page instead of showing an alert
    window.location.href =
      "/loginUser.html?redirect=/Inspections-Checklist-Portal/";
    return false;
  }

  // User is authenticated and has admin role
  return true;
}

// Execute access check when the script loads
document.addEventListener("DOMContentLoaded", function () {
  checkPortalAccess();
});

// Export the function for use in other files
export default checkPortalAccess;
