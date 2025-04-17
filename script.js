const buildingRooms = {
  Administration: [
    "Reception",
    "Nurse's Office",
    "Office 1.1",
    "Office 1.2",
    "Office 1.3",
    "Office 1.4",
    "Office 1.5",
    "Office 2.1",
    "Office 2.2",
    "Office 2.3",
    "Office 2.4",
    "Office 2.5",
    "Office 2.6",
  ],
  westWing: ["Room 601", "Room 602", "Room 603", "Office 1", "Office 2"],
  southWing: [
    "Room 300",
    "Room 301",
    "Room 302",
    "Room 202",
    "Room 203",
    "Room 206",
    "Room 207",
    "Room 210",
    "Room 211",
    "Tech Office",
  ],
  northWing: [
    "Room 102",
    "Room 103",
    "Room 105",
    "Room 106",
    "Room 107",
    "Room 108",
    "Room 109",
    "Room 110",
  ],
  upperSchool: [
    "1st floor",
    "2nd floor",
    "Office 1.1",
    "Office 1.2",
    "Office 2.1",
    "Office 2.2",
    "Maintenance Office 2.3",
  ],
  Underhill: ["library", "MotorDevLab", "GYM", "Room 1E", "Room 2C", "Room 3W"],
  GFB: [
    "Office 1.1",
    "Office 1.2",
    "Office 1.3",
    "Office 1.4",
    "Room 112",
    "Room 114",
    "Room 117",
    "Room 122",
    "Room 127",
    "Room 128",
    "Room 131",
    "Room 132",
    "2nd floor",
  ],
  WLFA: ["1st floor", "2nd floor"],
  Gym: ["Office 0.1", "Office 0.2", "Office 0.3"],
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
