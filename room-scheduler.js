// Room Scheduler JavaScript
document.addEventListener("DOMContentLoaded", function () {
  // Check if we're on the page with the sidebar
  const sidebar = document.querySelector(".sidebar-navigation");
  if (!sidebar) return;

  // Initialize Room Scheduler when the tab is clicked
  const roomSchedulerTab = document.querySelector(
    '.sidebar-menu-item[data-section="room-scheduler"]'
  );
  if (roomSchedulerTab) {
    roomSchedulerTab.addEventListener("click", initRoomScheduler);
  }

  // Function to initialize the Room Scheduler UI
  function initRoomScheduler() {
    let roomSchedulerContainer = document.querySelector(
      ".room-scheduler-container"
    );

    // If the container already exists with content, don't reinitialize
    if (
      roomSchedulerContainer &&
      roomSchedulerContainer.querySelector(".room-grid")
    ) {
      return;
    }

    // If container exists but is empty (has only the coming soon message)
    if (roomSchedulerContainer) {
      roomSchedulerContainer.innerHTML = createRoomSchedulerHTML();
      initRoomSchedulerEvents();
    } else {
      // Create container if it doesn't exist
      roomSchedulerContainer = document.createElement("div");
      roomSchedulerContainer.className = "room-scheduler-container";
      roomSchedulerContainer.innerHTML = createRoomSchedulerHTML();
      document.querySelector(".events-container").after(roomSchedulerContainer);

      // Apply margin for proper layout
      roomSchedulerContainer.style.marginLeft = "280px";
      roomSchedulerContainer.style.padding = "20px";

      // Adjust for mobile
      if (window.innerWidth <= 768) {
        roomSchedulerContainer.style.marginLeft = "0";
      }
      initRoomSchedulerEvents();
    }
  }

  // Create HTML structure for Room Scheduler
  function createRoomSchedulerHTML() {
    return `
            <h1>Room Scheduler</h1>
            <p>Schedule and manage room reservations for meetings, events, and activities.</p>
            
            <div class="filter-container">
                <div class="filter-group">
                    <label for="building-filter">Building:</label>
                    <select id="building-filter">
                        <option value="all">All Buildings</option>
                        <option value="westWing">West Wing</option>
                        <option value="southWing">South Wing</option>
                        <option value="northWing">North Wing</option>
                        <option value="upperSchool">Upper School</option>
                        <option value="GFB">GFB</option>
                        <option value="WLFA">WLFA</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="room-type-filter">Room Type:</label>
                    <select id="room-type-filter">
                        <option value="all">All Types</option>
                        <option value="classroom">Classroom</option>
                        <option value="conference">Conference Room</option>
                        <option value="auditorium">Auditorium</option>
                        <option value="gym">Gymnasium</option>
                        <option value="lab">Laboratory</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="capacity-filter">Minimum Capacity:</label>
                    <input type="number" id="capacity-filter" min="1" value="1">
                </div>
                <button id="apply-filters">Apply Filters</button>
            </div>
            
            <div class="room-grid">
                <!-- Placeholder data - replace with actual room data -->
                <div class="room-card">
                    <div class="room-image">
                        <img src="images/placeholder-room.jpg" alt="Conference Room A">
                    </div>
                    <div class="room-details">
                        <h3 class="room-name">Conference Room A</h3>
                        <p class="room-location">West Wing, Floor 2</p>
                        <div class="room-capacity">
                            <i class="fas fa-users"></i> Capacity: 20 people
                        </div>
                        <div class="room-amenities">
                            <span class="amenity-tag projector">Projector</span>
                            <span class="amenity-tag whiteboard">Whiteboard</span>
                            <span class="amenity-tag video-conf">Video Conference</span>
                        </div>
                        <button class="book-room-btn" data-room-id="room1">Book This Room</button>
                    </div>
                </div>
                
                <div class="room-card">
                    <div class="room-image">
                        <img src="images/placeholder-room.jpg" alt="Classroom 101">
                    </div>
                    <div class="room-details">
                        <h3 class="room-name">Classroom 101</h3>
                        <p class="room-location">South Wing, Floor 1</p>
                        <div class="room-capacity">
                            <i class="fas fa-users"></i> Capacity: 30 people
                        </div>
                        <div class="room-amenities">
                            <span class="amenity-tag projector">Projector</span>
                            <span class="amenity-tag whiteboard">Whiteboard</span>
                            <span class="amenity-tag smartboard">SmartBoard</span>
                        </div>
                        <button class="book-room-btn" data-room-id="room2">Book This Room</button>
                    </div>
                </div>
                
                <div class="room-card">
                    <div class="room-image">
                        <img src="images/placeholder-room.jpg" alt="Auditorium">
                    </div>
                    <div class="room-details">
                        <h3 class="room-name">Main Auditorium</h3>
                        <p class="room-location">North Wing, Floor 1</p>
                        <div class="room-capacity">
                            <i class="fas fa-users"></i> Capacity: 200 people
                        </div>
                        <div class="room-amenities">
                            <span class="amenity-tag stage">Stage</span>
                            <span class="amenity-tag sound">Sound System</span>
                            <span class="amenity-tag lighting">Lighting</span>
                            <span class="amenity-tag projector">Projector</span>
                        </div>
                        <button class="book-room-btn" data-room-id="room3">Book This Room</button>
                    </div>
                </div>
            </div>
            
            <div class="scheduler-calendar">
                <div class="scheduler-header">
                    <h2 class="scheduler-title">Room Availability</h2>
                    <div class="scheduler-controls">
                        <button id="prevWeek"><i class="fas fa-chevron-left"></i></button>
                        <button id="nextWeek"><i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
                <div class="time-slots">
                    <div class="day-header"></div>
                    <div class="day-header">Monday</div>
                    <div class="day-header">Tuesday</div>
                    <div class="day-header">Wednesday</div>
                    <div class="day-header">Thursday</div>
                    <div class="day-header">Friday</div>
                    <div class="day-header">Saturday</div>
                    <div class="day-header">Sunday</div>
                    
                    <!-- Time slots - 8:00 AM to 5:00 PM -->
                    ${generateTimeSlots()}
                </div>
            </div>
            
            <!-- Room Booking Modal -->
            <div id="roomBookingModal" class="room-booking-modal">
                <div class="room-booking-content">
                    <div class="room-booking-header">
                        <h3>Book a Room</h3>
                        <button class="close-booking-modal">&times;</button>
                    </div>
                    <form id="roomBookingForm">
                        <input type="hidden" id="roomId" name="roomId">
                        
                        <div class="booking-form-group">
                            <label for="bookingTitle">Event Title</label>
                            <input type="text" id="bookingTitle" name="bookingTitle" required>
                        </div>
                        
                        <div class="booking-form-group">
                            <label for="bookingDate">Date</label>
                            <input type="date" id="bookingDate" name="bookingDate" required>
                        </div>
                        
                        <div class="booking-form-group">
                            <label for="startTime">Start Time</label>
                            <input type="time" id="startTime" name="startTime" required>
                        </div>
                        
                        <div class="booking-form-group">
                            <label for="endTime">End Time</label>
                            <input type="time" id="endTime" name="endTime" required>
                        </div>
                        
                        <div class="booking-form-group">
                            <label for="attendees">Number of Attendees</label>
                            <input type="number" id="attendees" name="attendees" min="1" required>
                        </div>
                        
                        <div class="booking-form-group">
                            <label for="bookingDescription">Description</label>
                            <textarea id="bookingDescription" name="bookingDescription"></textarea>
                        </div>
                        
                        <div class="booking-form-group">
                            <label for="contactPerson">Contact Person</label>
                            <input type="text" id="contactPerson" name="contactPerson" required>
                        </div>
                        
                        <div class="booking-form-group">
                            <label for="contactEmail">Contact Email</label>
                            <input type="email" id="contactEmail" name="contactEmail" required>
                        </div>
                        
                        <div class="booking-form-actions">
                            <button type="button" class="booking-cancel-btn">Cancel</button>
                            <button type="submit" class="booking-submit-btn">Submit Booking</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
  }

  // Generate time slots for the scheduler
  function generateTimeSlots() {
    let html = "";
    const startHour = 8; // 8:00 AM
    const endHour = 17; // 5:00 PM

    for (let hour = startHour; hour <= endHour; hour++) {
      const displayHour = hour > 12 ? hour - 12 : hour;
      const amPm = hour >= 12 ? "PM" : "AM";

      html += `
                <div class="time-slot time-label">${displayHour}:00 ${amPm}</div>
                <div class="time-slot"></div>
                <div class="time-slot"></div>
                <div class="time-slot"></div>
                <div class="time-slot"></div>
                <div class="time-slot"></div>
                <div class="time-slot"></div>
                <div class="time-slot"></div>
            `;
    }

    return html;
  }

  // Initialize event listeners for Room Scheduler
  function initRoomSchedulerEvents() {
    // Room booking buttons
    const bookButtons = document.querySelectorAll(".book-room-btn");
    const bookingModal = document.getElementById("roomBookingModal");
    const closeModalButton = document.querySelector(".close-booking-modal");
    const cancelButton = document.querySelector(".booking-cancel-btn");
    const bookingForm = document.getElementById("roomBookingForm");

    // Set minimum date for booking date input to today
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];
    const dateInput = document.getElementById("bookingDate");
    if (dateInput) {
      dateInput.min = formattedDate;
    }

    // Open booking modal when clicking on a book button
    if (bookButtons) {
      bookButtons.forEach((button) => {
        button.addEventListener("click", function () {
          const roomId = this.getAttribute("data-room-id");
          const roomName =
            this.closest(".room-card").querySelector(".room-name").textContent;

          document.getElementById("roomId").value = roomId;
          document.querySelector(
            ".room-booking-header h3"
          ).textContent = `Book ${roomName}`;

          bookingModal.style.display = "block";
        });
      });
    }

    // Close modal
    if (closeModalButton) {
      closeModalButton.addEventListener("click", function () {
        bookingModal.style.display = "none";
      });
    }

    // Cancel button
    if (cancelButton) {
      cancelButton.addEventListener("click", function () {
        bookingModal.style.display = "none";
      });
    }

    // Submit booking
    if (bookingForm) {
      bookingForm.addEventListener("submit", function (e) {
        e.preventDefault();

        // Here you would normally send the data to a server
        // For now, just close the modal and show a success message
        alert(
          "Room booking submitted successfully! This is a placeholder message."
        );
        bookingModal.style.display = "none";

        // Add a sample reservation to the calendar (for demonstration)
        const date = new Date(document.getElementById("bookingDate").value);
        const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
        const dayIndex = dayOfWeek === 0 ? 7 : dayOfWeek; // Adjust to match our grid (Monday is 1)

        const startHour = parseInt(
          document.getElementById("startTime").value.split(":")[0]
        );
        const rowIndex = startHour - 7; // Adjust based on our start time (8:00 AM is row 1)

        if (rowIndex > 0 && dayIndex > 0) {
          const timeSlots = document.querySelectorAll(
            ".time-slots .time-slot:not(.time-label)"
          );
          const slotIndex = (rowIndex - 1) * 7 + (dayIndex - 1);

          if (timeSlots[slotIndex]) {
            timeSlots[slotIndex].classList.add("reserved");
            timeSlots[slotIndex].setAttribute(
              "data-reservation",
              document.getElementById("bookingTitle").value
            );
          }
        }
      });
    }

    // Filter buttons
    const applyFiltersButton = document.getElementById("apply-filters");
    if (applyFiltersButton) {
      applyFiltersButton.addEventListener("click", function () {
        // In a real application, this would filter the rooms based on selection
        alert("Filters applied! This is a placeholder message.");
      });
    }

    // Week navigation
    const prevWeekButton = document.getElementById("prevWeek");
    const nextWeekButton = document.getElementById("nextWeek");

    if (prevWeekButton) {
      prevWeekButton.addEventListener("click", function () {
        // In a real application, this would show the previous week
        alert("Previous week! This is a placeholder message.");
      });
    }

    if (nextWeekButton) {
      nextWeekButton.addEventListener("click", function () {
        // In a real application, this would show the next week
        alert("Next week! This is a placeholder message.");
      });
    }
  }
});
