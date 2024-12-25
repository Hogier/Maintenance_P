const buildingRooms = {
  westWing: ["Room 101", "Room 102", "Room 103"],
  southWing: ["Room 201", "Room 202", "Room 203"],
  northWing: ["Room 301", "Room 302", "Room 303"],
  upperSchool: ["Class 401", "Class 402", "Class 403"],
  GFB: ["Lab 1", "Lab 2", "Lab 3"],
  WLFA: ["Studio 1", "Studio 2", "Studio 3"],
  Administration: ["Office 1", "Office 2", "Office 3"],
};

document
  .getElementById("buildingSelect")
  .addEventListener("change", function () {
    const roomSelection = document.getElementById("roomSelection");
    const roomSelect = document.getElementById("roomSelect");
    const selectedBuilding = this.value;

    if (selectedBuilding) {
      // Clear existing options
      roomSelect.innerHTML = "";

      // Add new options based on selected building
      buildingRooms[selectedBuilding].forEach((room) => {
        const option = document.createElement("option");
        option.value = room;
        option.textContent = room;
        roomSelect.appendChild(option);
      });

      // Show room selection
      roomSelection.style.display = "block";
    } else {
      // Hide room selection if no building is selected
      roomSelection.style.display = "none";
    }
  });
