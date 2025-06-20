// Admin Dashboard JavaScript
class AdminDashboard {
  constructor() {
    this.currentCourseId = null;
    this.currentEventId = null;
    this.isLoggedIn = false;
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkLoginStatus();
  }

  bindEvents() {
    // Login form
    document
      .getElementById("loginForm")
      .addEventListener("submit", this.handleLogin.bind(this));

    // Logout
    document
      .getElementById("logoutBtn")
      .addEventListener("click", this.handleLogout.bind(this));

    // New course modal
    document
      .getElementById("newCourseBtn")
      .addEventListener("click", this.showNewCourseModal.bind(this));
    document
      .getElementById("closeNewCourseModal")
      .addEventListener("click", this.hideNewCourseModal.bind(this));
    document
      .getElementById("cancelNewCourse")
      .addEventListener("click", this.hideNewCourseModal.bind(this));
    document
      .getElementById("newCourseForm")
      .addEventListener("submit", this.handleCreateCourse.bind(this));

    // Attendance modal
    document
      .getElementById("closeAttendanceModal")
      .addEventListener("click", this.hideAttendanceModal.bind(this));
    document
      .getElementById("cancelAttendance")
      .addEventListener("click", this.hideAttendanceModal.bind(this));
    document
      .getElementById("createAttendanceForm")
      .addEventListener("submit", this.handleCreateAttendance.bind(this));

    // Success modal
    document
      .getElementById("closeSuccessModal")
      .addEventListener("click", this.hideSuccessModal.bind(this));
    document
      .getElementById("backToDashboard")
      .addEventListener("click", this.hideSuccessModal.bind(this));
    document
      .getElementById("closeAttendanceBtn")
      .addEventListener("click", this.handleCloseAttendance.bind(this));
    document
      .getElementById("copyAnnouncement")
      .addEventListener("click", this.copyAnnouncement.bind(this));

    // Attendance history
    document
      .getElementById("attendanceHistoryBtn")
      .addEventListener("click", this.goToAttendanceHistory.bind(this));

    // Modal backdrop clicks
    document.getElementById("newCourseModal").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) this.hideNewCourseModal();
    });
    document
      .getElementById("createAttendanceModal")
      .addEventListener("click", (e) => {
        if (e.target === e.currentTarget) this.hideAttendanceModal();
      });
    document.getElementById("successModal").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) this.hideSuccessModal();
    });
  }

  checkLoginStatus() {
    const isLoggedIn = sessionStorage.getItem("adminLoggedIn");
    if (isLoggedIn === "true") {
      this.isLoggedIn = true;
      this.showDashboard();
    } else {
      this.showLoginScreen();
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const passcode = document.getElementById("passcode").value;
    const errorDiv = document.getElementById("loginError");

    // Simple passcode check (can be enhanced later)
    if (passcode === "123456") {
      sessionStorage.setItem("adminLoggedIn", "true");
      this.isLoggedIn = true;
      this.showDashboard();
      errorDiv.classList.add("hidden");
    } else {
      errorDiv.textContent = "Invalid passcode. Please try again.";
      errorDiv.classList.remove("hidden");
    }
  }

  handleLogout() {
    sessionStorage.removeItem("adminLoggedIn");
    this.isLoggedIn = false;
    this.showLoginScreen();
  }

  showLoginScreen() {
    document.getElementById("loginScreen").classList.remove("hidden");
    document.getElementById("dashboardScreen").classList.add("hidden");
    document.getElementById("passcode").value = "";
  }

  async showDashboard() {
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("dashboardScreen").classList.remove("hidden");
    await this.loadCourses();
    await this.loadHalls();
  }

  async loadCourses() {
    try {
      this.showLoading();
      const response = await fetch("/api/courses");
      const courses = await response.json();
      this.renderCourses(courses);
    } catch (error) {
      console.error("Error loading courses:", error);
      this.showError("Failed to load courses");
    } finally {
      this.hideLoading();
    }
  }

  renderCourses(courses) {
    const grid = document.getElementById("coursesGrid");

    if (courses.length === 0) {
      grid.innerHTML = `
                <div class="course-card">
                    <div class="course-header">
                        <div class="course-code">No Courses Yet</div>
                        <div class="course-title">Create your first course to get started</div>
                    </div>
                    <div class="course-actions">
                        <button class="btn btn-primary" onclick="adminDashboard.showNewCourseModal()">
                            Create Course
                        </button>
                    </div>
                </div>
            `;
      return;
    }

    grid.innerHTML = courses
      .map(
        (course) => `
            <div class="course-card">
                <div class="course-header">
                    <div class="course-code">${course.code}</div>
                    <div class="course-title">${course.title}</div>
                    <div class="course-lecturer">Lecturer: ${course.lecturer}</div>
                </div>
                <div class="course-actions">
                    <button class="btn btn-primary" onclick="adminDashboard.createAttendance('${course._id}', '${course.code}', '${course.title}')">
                        Create Attendance
                    </button>
                    <button class="btn btn-secondary" onclick="adminDashboard.viewCourseHistory('${course._id}')">
                        View History
                    </button>
                </div>
            </div>
        `
      )
      .join("");
  }

  async loadHalls() {
    try {
      const response = await fetch("/api/halls");
      const halls = await response.json();
      const select = document.getElementById("hallSelect");
      select.innerHTML =
        '<option value="">Choose a hall...</option>' +
        halls
          .map((hall) => `<option value="${hall.name}">${hall.name}</option>`)
          .join("");
    } catch (error) {
      console.error("Error loading halls:", error);
    }
  }

  showNewCourseModal() {
    document.getElementById("newCourseModal").classList.remove("hidden");
    document.getElementById("courseCode").focus();
  }

  hideNewCourseModal() {
    document.getElementById("newCourseModal").classList.add("hidden");
    document.getElementById("newCourseForm").reset();
  }

  async handleCreateCourse(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const courseData = {
      code:
        formData.get("courseCode") ||
        document.getElementById("courseCode").value,
      title:
        formData.get("courseTitle") ||
        document.getElementById("courseTitle").value,
      lecturer:
        formData.get("lecturerName") ||
        document.getElementById("lecturerName").value,
    };

    try {
      this.showLoading();
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData),
      });

      const result = await response.json();

      if (response.ok) {
        this.hideNewCourseModal();
        await this.loadCourses();
        this.showSuccess("Course created successfully!");
      } else {
        this.showError(result.error || "Failed to create course");
      }
    } catch (error) {
      console.error("Error creating course:", error);
      this.showError("Failed to create course");
    } finally {
      this.hideLoading();
    }
  }

  createAttendance(courseId, courseCode, courseTitle) {
    this.currentCourseId = courseId;
    document.getElementById("selectedCourseInfo").innerHTML = `
            <strong>${courseCode}</strong> - ${courseTitle}
        `;
    document.getElementById("createAttendanceModal").classList.remove("hidden");
    document.getElementById("attendanceError").classList.add("hidden");
  }

  hideAttendanceModal() {
    document.getElementById("createAttendanceModal").classList.add("hidden");
    document.getElementById("createAttendanceForm").reset();
    this.currentCourseId = null;
  }

  async handleCreateAttendance(e) {
    e.preventDefault();
    const hallName = document.getElementById("hallSelect").value;
    const duration = parseInt(document.getElementById("duration").value);
    const errorDiv = document.getElementById("attendanceError");

    if (!hallName) {
      errorDiv.textContent = "Please select a lecture hall";
      errorDiv.classList.remove("hidden");
      return;
    }

    try {
      this.showLoading();
      const response = await fetch("/api/attendance/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: this.currentCourseId,
          hallName,
          duration,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        this.currentEventId = result.eventId;
        this.hideAttendanceModal();
        this.showSuccessModal(result);
      } else {
        errorDiv.textContent = result.error || "Failed to create attendance";
        errorDiv.classList.remove("hidden");
      }
    } catch (error) {
      console.error("Error creating attendance:", error);
      errorDiv.textContent = "Failed to create attendance event";
      errorDiv.classList.remove("hidden");
    } finally {
      this.hideLoading();
    }
  }

  showSuccessModal(attendanceData) {
    const modal = document.getElementById("successModal");
    const details = document.getElementById("successDetails");
    const announcement = document.getElementById("announcementText");

    const endTime = new Date(attendanceData.endTime);
    details.innerHTML = `
            <p><strong>Event ID:</strong> ${attendanceData.eventId}</p>
            <p><strong>Hall:</strong> ${attendanceData.hall}</p>
            <p><strong>Active until:</strong> ${endTime.toLocaleTimeString()}</p>
        `;

    const announcementText = `Go to: ${window.location.origin}/attend now for ${attendanceData.courseName} attendance`;
    announcement.textContent = announcementText;

    modal.classList.remove("hidden");
  }

  hideSuccessModal() {
    document.getElementById("successModal").classList.add("hidden");
    this.currentEventId = null;
  }

  async handleCloseAttendance() {
    if (!this.currentEventId) return;

    try {
      this.showLoading();
      const response = await fetch(
        `/api/attendance/close/${this.currentEventId}`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        this.hideSuccessModal();
        this.showSuccess("Attendance closed successfully");
      } else {
        this.showError("Failed to close attendance");
      }
    } catch (error) {
      console.error("Error closing attendance:", error);
      this.showError("Failed to close attendance");
    } finally {
      this.hideLoading();
    }
  }

  copyAnnouncement() {
    const text = document.getElementById("announcementText").textContent;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        const btn = document.getElementById("copyAnnouncement");
        const originalText = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text:", err);
      });
  }

  async viewCourseHistory(courseId) {
    window.location.href = `/attendance?course=${courseId}`;
  }

  goToAttendanceHistory() {
    window.location.href = "/attendance";
  }

  showLoading() {
    document.getElementById("loadingOverlay").classList.remove("hidden");
  }

  hideLoading() {
    document.getElementById("loadingOverlay").classList.add("hidden");
  }

  showSuccess(message) {
    // Simple success notification
    const toast = document.createElement("div");
    toast.className = "success-message";
    toast.textContent = message;
    toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 3000;
            max-width: 300px;
        `;
    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  }

  showError(message) {
    // Simple error notification
    const toast = document.createElement("div");
    toast.className = "error-message";
    toast.textContent = message;
    toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 3000;
            max-width: 300px;
        `;
    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 5000);
  }
}

// Initialize the dashboard when the page loads
const adminDashboard = new AdminDashboard();
