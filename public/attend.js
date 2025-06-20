// Student Attendance JavaScript
class StudentAttendance {
  constructor() {
    this.currentAttendance = null;
    this.userLocation = null;
    this.userIP = null;
    this.timeInterval = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkActiveAttendance();
    this.getUserIP();
    this.showLocationPrompt();
  }

  bindEvents() {
    // Form submission
    document
      .getElementById("attendanceForm")
      .addEventListener("submit", this.handleSubmitAttendance.bind(this));

    // Refresh button
    document
      .getElementById("refreshBtn")
      .addEventListener("click", this.checkActiveAttendance.bind(this));

    // Navigation buttons
    document
      .getElementById("backToForm")
      .addEventListener("click", this.showFormScreen.bind(this));
    document
      .getElementById("retryBtn")
      .addEventListener("click", this.showFormScreen.bind(this));
    document
      .getElementById("refreshPageBtn")
      .addEventListener("click", () => window.location.reload());

    // Matric number validation
    document
      .getElementById("matricNumber")
      .addEventListener("input", this.validateMatricNumber.bind(this));
  }

  async checkActiveAttendance() {
    try {
      this.showLoading("Checking for active attendance...");
      const response = await fetch("/api/attendance/active");
      const result = await response.json();

      if (result.active) {
        this.currentAttendance = result;
        this.showAttendanceForm();
        this.startTimeCountdown();
      } else {
        this.showNoAttendanceScreen();
      }
    } catch (error) {
      console.error("Error checking active attendance:", error);
      this.showErrorScreen(
        "Failed to check attendance status",
        "There was an issue connecting to the server. Please check your internet connection and try again."
      );
    } finally {
      this.hideLoading();
    }
  }

  async getUserIP() {
    try {
      const response = await fetch("/api/get-ip");
      const result = await response.json();
      this.userIP = result.ip;
    } catch (error) {
      console.error("Error getting IP address:", error);
    }
  }

  showLocationPrompt() {
    const locationStatus = document.getElementById("locationStatus");
    
    locationStatus.innerHTML = `
      <div class="location-icon">📍</div>
      <div style="flex: 1;">
        <div style="margin-bottom: 10px;">
          <strong>Location Required</strong><br>
          <small>We need your location to verify you're in the lecture hall</small>
        </div>
        
        <button id="getLocationBtn" class="btn btn-primary" style="font-size: 0.875rem; padding: 0.75rem 1.5rem; margin-right: 0.5rem;">
          📍 Get My Location
        </button>
        
        <button id="manualLocationBtn" class="btn btn-secondary" style="font-size: 0.875rem; padding: 0.75rem 1.5rem;">
          ✏️ Enter Manually
        </button>
      </div>
    `;
    
    locationStatus.className = 'location-status';
    
    // Bind button events
    document.getElementById('getLocationBtn').addEventListener('click', () => {
      this.getUserLocation();
    });
    
    document.getElementById('manualLocationBtn').addEventListener('click', () => {
      this.showManualLocationForm();
    });
  }

  getUserLocation() {
    const locationStatus = document.getElementById("locationStatus");

    if (!navigator.geolocation) {
      this.showLocationAlternatives("Geolocation is not supported by this browser");
      return;
    }

    this.updateLocationStatus("loading", "📍", "Getting your location...");
    this.attemptLocationWithFallbacks();
  }

  async attemptLocationWithFallbacks() {
    // Method 1: High accuracy GPS
    try {
      await this.tryGetLocation({
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000
      });
      return;
    } catch (error) {
      console.log("High accuracy failed:", error);
    }

    // Method 2: Standard GPS with longer timeout
    try {
      this.updateLocationStatus("loading", "📍", "Trying alternative location method...");
      await this.tryGetLocation({
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000
      });
      return;
    } catch (error) {
      console.log("Standard GPS failed:", error);
    }

    // Method 3: Use cached location if available
    try {
      this.updateLocationStatus("loading", "📍", "Checking for recent location...");
      await this.tryGetLocation({
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000 // 5 minutes
      });
      return;
    } catch (error) {
      console.log("Cached location failed:", error);
    }

    // Method 4: Show alternatives
    this.showLocationAlternatives("Unable to get your location automatically");
  }

  tryGetLocation(options) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          
          const accuracyText = position.coords.accuracy < 100 ? 
            "High accuracy" : position.coords.accuracy < 500 ? 
            "Medium accuracy" : "Low accuracy";
            
          this.updateLocationStatus(
            "success",
            "✅",
            `Location obtained (${accuracyText})`
          );
          this.enableSubmitButton();
          resolve(position);
        },
        (error) => {
          reject(error);
        },
        options
      );
    });
  }

  showLocationAlternatives(initialMessage) {
    const locationStatus = document.getElementById("locationStatus");
    
    let message = initialMessage;
    switch (true) {
      case navigator.userAgent.toLowerCase().indexOf('mobile') === -1:
        message = "Location services may not work well on desktop browsers";
        break;
      case !window.isSecureContext:
        message = "Location requires HTTPS. Try refreshing or use a different browser";
        break;
    }

    locationStatus.innerHTML = `
      <div class="location-alternatives">
        <div class="location-icon">📍</div>
        <div style="flex: 1;">
          <div style="margin-bottom: 10px;">
            <strong>Location Required</strong><br>
            <small>${message}</small>
          </div>
          
          <div class="location-buttons">
            <button id="retryLocation" class="btn btn-secondary" style="font-size: 0.875rem; padding: 0.5rem 1rem; margin-right: 0.5rem;">
              🔄 Try Again
            </button>
            
            <button id="manualLocation" class="btn btn-secondary" style="font-size: 0.875rem; padding: 0.5rem 1rem;">
              📍 Enter Manually
            </button>
            
            ${this.shouldShowDevBypass() ? `
            <button id="useTestLocation" class="btn btn-outline" style="font-size: 0.875rem; padding: 0.5rem 1rem; margin-top: 0.5rem;">
              🔧 Dev Mode
            </button>
            ` : ''}
          </div>
          
          <div id="manualLocationForm" class="manual-location-form hidden" style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
            <div style="margin-bottom: 0.5rem;">
              <label style="font-size: 0.875rem; font-weight: 500;">Latitude:</label>
              <input type="number" id="manualLat" step="0.000001" placeholder="e.g., 6.472590" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; margin-top: 0.25rem;">
            </div>
            <div style="margin-bottom: 0.5rem;">
              <label style="font-size: 0.875rem; font-weight: 500;">Longitude:</label>
              <input type="number" id="manualLng" step="0.000001" placeholder="e.g., 3.198925" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; margin-top: 0.25rem;">
            </div>
            <button id="useManualLocation" class="btn btn-primary" style="font-size: 0.875rem; padding: 0.5rem 1rem;">
              Use This Location
            </button>
            <small style="display: block; margin-top: 0.5rem; color: #666;">
              Use GPS coordinates app or Google Maps to get your exact location
            </small>
          </div>
        </div>
      </div>
    `;
    
    locationStatus.className = 'location-status warning';
    
    // Bind events
    document.getElementById('retryLocation').addEventListener('click', () => {
      this.getUserLocation();
    });
    
    document.getElementById('manualLocation').addEventListener('click', () => {
      const form = document.getElementById('manualLocationForm');
      form.classList.toggle('hidden');
    });
    
    document.getElementById('useManualLocation').addEventListener('click', () => {
      const lat = parseFloat(document.getElementById('manualLat').value);
      const lng = parseFloat(document.getElementById('manualLng').value);
      
      if (isNaN(lat) || isNaN(lng)) {
        alert('Please enter valid latitude and longitude values');
        return;
      }
      
      this.userLocation = { lat, lng, accuracy: 'manual' };
      this.updateLocationStatus("success", "📍", "Manual location set");
      this.enableSubmitButton();
    });
    
    if (this.shouldShowDevBypass()) {
      document.getElementById('useTestLocation').addEventListener('click', () => {
        this.userLocation = {
          lat: 6.472590,  // Within ENG HALL A bounds
          lng: 3.198925,
          accuracy: 'test'
        };
        this.updateLocationStatus("success", "🔧", "Using test location (Development Mode)");
        this.enableSubmitButton();
      });
    }
  }

  showManualLocationForm() {
    const locationStatus = document.getElementById("locationStatus");
    
    locationStatus.innerHTML = `
      <div class="location-icon">📍</div>
      <div style="flex: 1;">
        <div style="margin-bottom: 10px;">
          <strong>Enter Your Location Manually</strong><br>
          <small>Get coordinates from your GPS app or Google Maps</small>
        </div>
        
        <div style="margin-bottom: 0.5rem;">
          <label style="font-size: 0.875rem; font-weight: 500;">Latitude:</label>
          <input type="number" id="manualLat" step="0.000001" placeholder="e.g., 6.472590" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; margin-top: 0.25rem;">
        </div>
        <div style="margin-bottom: 0.5rem;">
          <label style="font-size: 0.875rem; font-weight: 500;">Longitude:</label>
          <input type="number" id="manualLng" step="0.000001" placeholder="e.g., 3.198925" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; margin-top: 0.25rem;">
        </div>
        
        <button id="useManualLocation" class="btn btn-primary" style="font-size: 0.875rem; padding: 0.5rem 1rem; margin-right: 0.5rem;">
          Use This Location
        </button>
        <button id="backToLocationOptions" class="btn btn-outline" style="font-size: 0.875rem; padding: 0.5rem 1rem;">
          Back
        </button>
        
        ${this.shouldShowDevBypass() ? `
        <button id="useTestLocationBtn" class="btn btn-outline" style="font-size: 0.875rem; padding: 0.5rem 1rem; margin-top: 0.5rem;">
          🔧 Use Test Location
        </button>
        ` : ''}
      </div>
    `;
    
    locationStatus.className = 'location-status warning';
    
    // Bind events
    document.getElementById('useManualLocation').addEventListener('click', () => {
      const lat = parseFloat(document.getElementById('manualLat').value);
      const lng = parseFloat(document.getElementById('manualLng').value);
      
      if (isNaN(lat) || isNaN(lng)) {
        alert('Please enter valid latitude and longitude values');
        return;
      }
      
      this.userLocation = { lat, lng, accuracy: 'manual' };
      this.updateLocationStatus("success", "📍", "Manual location set");
      this.enableSubmitButton();
    });
    
    document.getElementById('backToLocationOptions').addEventListener('click', () => {
      this.showLocationPrompt();
    });
    
    if (this.shouldShowDevBypass()) {
      document.getElementById('useTestLocationBtn').addEventListener('click', () => {
        this.userLocation = {
          lat: 6.472590,
          lng: 3.198925,
          accuracy: 'test'
        };
        this.updateLocationStatus("success", "🔧", "Using test location (Development Mode)");
        this.enableSubmitButton();
      });
    }
  }

  shouldShowDevBypass() {
    return (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1') && 
           navigator.userAgent.toLowerCase().indexOf('mobile') === -1;
  }

  updateLocationStatus(type, icon, text) {
    const locationStatus = document.getElementById("locationStatus");
    
    // Check if we have the new structure with alternatives
    const existingIcon = locationStatus.querySelector(".location-icon");
    const existingText = locationStatus.querySelector("span");
    
    if (existingIcon && existingText && !locationStatus.querySelector(".location-alternatives")) {
      // Simple update for basic structure
      locationStatus.className = `location-status ${type}`;
      existingIcon.textContent = icon;
      existingText.textContent = text;
    } else {
      // Create new basic structure
      locationStatus.innerHTML = `
        <div class="location-icon">${icon}</div>
        <span>${text}</span>
      `;
      locationStatus.className = `location-status ${type}`;
    }
  }

  enableSubmitButton() {
    const submitBtn = document.getElementById("submitBtn");
    const name = document.getElementById("studentName").value.trim();
    const matric = document.getElementById("matricNumber").value.trim();

    if (
      name &&
      matric &&
      this.userLocation &&
      this.validateMatricFormat(matric)
    ) {
      submitBtn.disabled = false;
    }
  }

  validateMatricNumber(e) {
    const matric = e.target.value;
    const isValid = this.validateMatricFormat(matric);

    if (matric && !isValid) {
      e.target.style.borderColor = "#e74c3c";
    } else {
      e.target.style.borderColor = "#e1e8ed";
    }

    this.enableSubmitButton();
  }

  validateMatricFormat(matric) {
    const matricRegex = /^\d{9}$/;
    return matricRegex.test(matric);
  }

  startTimeCountdown() {
    this.updateTimeRemaining();
    this.timeInterval = setInterval(() => {
      this.updateTimeRemaining();
    }, 1000);
  }

  updateTimeRemaining() {
    if (!this.currentAttendance) return;

    const now = new Date();
    const endTime = new Date(this.currentAttendance.endTime);
    const timeLeft = endTime - now;

    const timeRemainingEl = document.getElementById("timeRemaining");

    if (timeLeft <= 0) {
      timeRemainingEl.textContent = "Attendance Closed";
      timeRemainingEl.className = "time-remaining expired";
      this.disableForm();
      clearInterval(this.timeInterval);
      return;
    }

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    timeRemainingEl.textContent = `${minutes}:${seconds
      .toString()
      .padStart(2, "0")} remaining`;

    if (minutes < 2) {
      timeRemainingEl.className = "time-remaining";
    } else if (minutes < 5) {
      timeRemainingEl.className = "time-remaining warning";
    } else {
      timeRemainingEl.className = "time-remaining safe";
    }
  }

  disableForm() {
    document.getElementById("submitBtn").disabled = true;
    document.getElementById("studentName").disabled = true;
    document.getElementById("matricNumber").disabled = true;
  }

  async handleSubmitAttendance(e) {
    e.preventDefault();

    const name = document.getElementById("studentName").value.trim();
    const matric = document.getElementById("matricNumber").value.trim();
    const errorDiv = document.getElementById("attendanceError");

    // Validation
    if (!name || !matric) {
      this.showFormError("Please fill in all required fields");
      return;
    }

    if (!this.validateMatricFormat(matric)) {
      this.showFormError("Please enter a valid 9-digit matric number");
      return;
    }

    if (!this.userLocation) {
      this.showFormError(
        "Location is required. Please enable location services and try again"
      );
      return;
    }

    if (!this.userIP) {
      this.showFormError("Unable to verify your connection. Please try again");
      return;
    }

    try {
      this.showLoading("Submitting your attendance...");

      const response = await fetch("/api/attendance/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: this.currentAttendance.eventId,
          name,
          matric,
          ip: this.userIP,
          location: this.userLocation,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        this.showSuccessScreen(name, matric);
        clearInterval(this.timeInterval);
      } else {
        this.showErrorScreen(
          "Attendance Failed",
          result.error || "An error occurred while submitting your attendance"
        );
      }
    } catch (error) {
      console.error("Error submitting attendance:", error);
      this.showErrorScreen(
        "Submission Failed",
        "There was an issue submitting your attendance. Please check your internet connection and try again."
      );
    } finally {
      this.hideLoading();
    }
  }

  showFormError(message) {
    const errorDiv = document.getElementById("attendanceError");
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");

    setTimeout(() => {
      errorDiv.classList.add("hidden");
    }, 5000);
  }

  showNoAttendanceScreen() {
    this.hideAllScreens();
    document.getElementById("noAttendanceScreen").classList.remove("hidden");
  }

  showAttendanceForm() {
    this.hideAllScreens();
    document.getElementById("attendanceFormScreen").classList.remove("hidden");

    // Update course information
    document.getElementById("courseName").textContent =
      this.currentAttendance.courseName;
    document.getElementById("hallName").textContent =
      this.currentAttendance.hall;

    // Focus on name field
    document.getElementById("studentName").focus();

    // Bind input events for real-time validation
    document
      .getElementById("studentName")
      .addEventListener("input", this.enableSubmitButton.bind(this));
    document
      .getElementById("matricNumber")
      .addEventListener("input", this.enableSubmitButton.bind(this));
  }

  showFormScreen() {
    this.hideAllScreens();
    document.getElementById("attendanceFormScreen").classList.remove("hidden");
    document.getElementById("attendanceError").classList.add("hidden");
  }

  showSuccessScreen(name, matric) {
    this.hideAllScreens();
    document.getElementById("successScreen").classList.remove("hidden");

    document.getElementById("successDetails").innerHTML = `
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Matric:</strong> ${matric}</p>
            <p><strong>Course:</strong> ${this.currentAttendance.courseName}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
        `;
  }

  showErrorScreen(title, message) {
    this.hideAllScreens();
    document.getElementById("errorScreen").classList.remove("hidden");
    document.getElementById("errorTitle").textContent = title;
    document.getElementById("errorMessage").textContent = message;
  }

  hideAllScreens() {
    document.getElementById("noAttendanceScreen").classList.add("hidden");
    document.getElementById("attendanceFormScreen").classList.add("hidden");
    document.getElementById("successScreen").classList.add("hidden");
    document.getElementById("errorScreen").classList.add("hidden");
  }

  showLoading(text = "Loading...") {
    document.getElementById("loadingText").textContent = text;
    document.getElementById("loadingOverlay").classList.remove("hidden");
  }

  hideLoading() {
    document.getElementById("loadingOverlay").classList.add("hidden");
  }

  // ...existing code...
}

// Initialize the attendance system when the page loads
const studentAttendance = new StudentAttendance();
