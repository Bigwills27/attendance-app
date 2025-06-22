// Add Hall Admin UI JavaScript
class AddHallAdmin {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Form submission
    document
      .getElementById("hallForm")
      .addEventListener("submit", this.handleSubmit.bind(this));

    // Validation button
    document
      .getElementById("validateBtn")
      .addEventListener("click", this.validateCoordinates.bind(this));

    // Success screen buttons
    document
      .getElementById("addAnotherBtn")
      .addEventListener("click", this.resetForm.bind(this));
    document.getElementById("backToAdminBtn").addEventListener("click", () => {
      window.location.href = "admin.html";
    });

    // Error screen buttons
    document
      .getElementById("retryBtn")
      .addEventListener("click", this.showForm.bind(this));
    document
      .getElementById("backToFormBtn")
      .addEventListener("click", this.showForm.bind(this));

    // Input validation
    this.bindInputValidation();
  }

  bindInputValidation() {
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach((input) => {
      input.addEventListener("input", this.validateInput.bind(this));
      input.addEventListener("blur", this.validateInput.bind(this));
    });
  }

  validateInput(e) {
    const input = e.target;
    const value = parseFloat(input.value);

    if (input.value && isNaN(value)) {
      input.style.borderColor = "#e74c3c";
      input.style.backgroundColor = "#fdf2f2";
    } else {
      input.style.borderColor = "#e1e8ed";
      input.style.backgroundColor = "#ffffff";
    }
  }

  validateCoordinates() {
    const coordinates = this.getCoordinates();
    const validationResult = document.getElementById("validationResult");

    if (!coordinates) {
      this.showValidationResult(
        "error",
        "Please fill in all coordinate fields with valid numbers."
      );
      return;
    }

    // Basic validation checks
    const issues = [];

    // Check if all coordinates are within reasonable bounds for Nigeria
    coordinates.forEach((coord, index) => {
      if (coord.lat < 4 || coord.lat > 14) {
        issues.push(
          `Point ${index + 1} latitude (${
            coord.lat
          }) seems outside Nigeria bounds`
        );
      }
      if (coord.lng < 2 || coord.lng > 15) {
        issues.push(
          `Point ${index + 1} longitude (${
            coord.lng
          }) seems outside Nigeria bounds`
        );
      }
    });

    // Check if points form a reasonable polygon (not all the same)
    const uniquePoints = new Set(coordinates.map((c) => `${c.lat},${c.lng}`));
    if (uniquePoints.size < 4) {
      issues.push("All 4 points must be different coordinates");
    }

    // Calculate approximate area to ensure it's reasonable for a lecture hall
    const area = this.calculatePolygonArea(coordinates);
    if (area < 50) {
      // Less than 50 square meters
      issues.push("The area seems too small for a lecture hall");
    } else if (area > 10000) {
      // More than 1 hectare
      issues.push("The area seems too large for a lecture hall");
    }

    if (issues.length > 0) {
      this.showValidationResult(
        "warning",
        "Validation Issues Found:<br>• " + issues.join("<br>• ")
      );
    } else {
      this.showValidationResult(
        "success",
        `✅ Coordinates look good! Approximate area: ${area.toFixed(
          0
        )} square meters`
      );
    }
  }

  calculatePolygonArea(coordinates) {
    // Simple polygon area calculation using shoelace formula
    let area = 0;
    const n = coordinates.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += coordinates[i].lat * coordinates[j].lng;
      area -= coordinates[j].lat * coordinates[i].lng;
    }

    area = Math.abs(area) / 2;

    // Convert from degrees to approximate square meters
    // This is a rough approximation for small areas
    const latToMeters = 111000; // Approximate meters per degree latitude
    const lngToMeters = 111000 * Math.cos((coordinates[0].lat * Math.PI) / 180);

    return area * latToMeters * lngToMeters;
  }

  showValidationResult(type, message) {
    const validationResult = document.getElementById("validationResult");
    validationResult.className = `status-message ${type}`;
    validationResult.innerHTML = message;
    validationResult.classList.remove("hidden");

    // Auto-hide after 10 seconds for success messages
    if (type === "success") {
      setTimeout(() => {
        validationResult.classList.add("hidden");
      }, 10000);
    }
  }

  getCoordinates() {
    const coordinates = [];

    for (let i = 1; i <= 4; i++) {
      const lat = parseFloat(document.getElementById(`lat${i}`).value);
      const lng = parseFloat(document.getElementById(`lng${i}`).value);

      if (isNaN(lat) || isNaN(lng)) {
        return null;
      }

      coordinates.push({ lat, lng });
    }

    return coordinates;
  }

  async handleSubmit(e) {
    e.preventDefault();

    const hallName = document.getElementById("hallName").value.trim();
    const coordinates = this.getCoordinates();

    // Validation
    if (!hallName) {
      this.showValidationResult("error", "Please enter a hall name.");
      return;
    }

    if (!coordinates) {
      this.showValidationResult(
        "error",
        "Please fill in all coordinate fields with valid numbers."
      );
      return;
    }

    try {
      this.showLoading("Adding hall to database...");

      const response = await fetch("/api/halls/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: hallName.toUpperCase(),
          polygon: coordinates,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        this.showSuccessScreen(hallName, coordinates);
      } else {
        this.showErrorScreen(
          "Failed to Add Hall",
          result.error || "An error occurred while adding the hall."
        );
      }
    } catch (error) {
      console.error("Error adding hall:", error);
      this.showErrorScreen(
        "Network Error",
        "Unable to connect to the server. Please check your internet connection and try again."
      );
    } finally {
      this.hideLoading();
    }
  }

  showSuccessScreen(hallName, coordinates) {
    this.hideAllScreens();
    document.getElementById("successScreen").classList.remove("hidden");

    const area = this.calculatePolygonArea(coordinates);
    document.getElementById("successDetails").innerHTML = `
            <div class="success-details">
                <p><strong>Hall Name:</strong> ${hallName}</p>
                <p><strong>Coordinates:</strong> ${
                  coordinates.length
                } points defined</p>
                <p><strong>Approximate Area:</strong> ${area.toFixed(
                  0
                )} square meters</p>
                <p><strong>Status:</strong> Hall is now active and ready for attendance events</p>
            </div>
        `;
  }

  showErrorScreen(title, message) {
    this.hideAllScreens();
    document.getElementById("errorScreen").classList.remove("hidden");
    document.getElementById("errorTitle").textContent = title;
    document.getElementById("errorMessage").textContent = message;
  }

  showForm() {
    this.hideAllScreens();
    document.getElementById("addHallForm").classList.remove("hidden");
    document.getElementById("validationResult").classList.add("hidden");
  }

  hideAllScreens() {
    document.getElementById("addHallForm").classList.add("hidden");
    document.getElementById("successScreen").classList.add("hidden");
    document.getElementById("errorScreen").classList.add("hidden");
  }

  resetForm() {
    // Clear all form fields
    document.getElementById("hallForm").reset();

    // Reset input styles
    const inputs = document.querySelectorAll("input");
    inputs.forEach((input) => {
      input.style.borderColor = "#e1e8ed";
      input.style.backgroundColor = "#ffffff";
    });

    // Show form
    this.showForm();

    // Focus on hall name
    document.getElementById("hallName").focus();
  }

  showLoading(text = "Loading...") {
    document.getElementById("loadingText").textContent = text;
    document.getElementById("loadingOverlay").classList.remove("hidden");
  }

  hideLoading() {
    document.getElementById("loadingOverlay").classList.add("hidden");
  }
}

// Initialize the add hall admin when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new AddHallAdmin();
});
