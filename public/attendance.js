// Attendance Management JavaScript
class AttendanceManagement {
  constructor() {
    this.attendanceRecords = [];
    this.filteredRecords = [];
    this.currentDetailRecord = null;
    this.recordToDelete = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadHalls();
    this.loadAttendanceRecords();
  }

  bindEvents() {
    // Back to dashboard
    document.getElementById("backToDashboard").addEventListener("click", () => {
      window.location.href = "/admin";
    });

    // Filter controls
    document
      .getElementById("applyFilters")
      .addEventListener("click", this.applyFilters.bind(this));
    document
      .getElementById("clearFilters")
      .addEventListener("click", this.clearFilters.bind(this));

    // Real-time search
    document
      .getElementById("courseFilter")
      .addEventListener(
        "input",
        this.debounce(this.applyFilters.bind(this), 300)
      );
    document
      .getElementById("searchFilter")
      .addEventListener(
        "input",
        this.debounce(this.applyFilters.bind(this), 300)
      );

    // Date and hall filters
    document
      .getElementById("dateFilter")
      .addEventListener("change", this.applyFilters.bind(this));
    document
      .getElementById("hallFilter")
      .addEventListener("change", this.applyFilters.bind(this));

    // Detail modal
    document
      .getElementById("closeDetailModal")
      .addEventListener("click", this.hideDetailModal.bind(this));
    document
      .getElementById("exportPdfBtn")
      .addEventListener("click", this.exportCurrentRecordToPDF.bind(this));

    // Modal backdrop click
    document
      .getElementById("attendanceDetailModal")
      .addEventListener("click", (e) => {
        if (e.target === e.currentTarget) this.hideDetailModal();
      });

    // Delete confirmation modal
    document
      .getElementById("cancelDeleteBtn")
      .addEventListener("click", this.hideDeleteConfirm.bind(this));
    document
      .getElementById("confirmDeleteBtn")
      .addEventListener("click", this.confirmDelete.bind(this));
    document
      .getElementById("deleteConfirmModal")
      .addEventListener("click", (e) => {
        if (e.target === e.currentTarget) this.hideDeleteConfirm();
      });
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async loadHalls() {
    try {
      const response = await fetch("/api/halls");
      const halls = await response.json();
      const select = document.getElementById("hallFilter");

      halls.forEach((hall) => {
        const option = document.createElement("option");
        option.value = hall.name;
        option.textContent = hall.name;
        select.appendChild(option);
      });
    } catch (error) {
      console.error("Error loading halls:", error);
    }
  }

  async loadAttendanceRecords() {
    try {
      this.showLoading();
      const response = await fetch("/api/attendance/all");
      const records = await response.json();

      this.attendanceRecords = records;
      this.filteredRecords = records;
      this.renderAttendanceList();
    } catch (error) {
      console.error("Error loading attendance records:", error);
      this.showError("Failed to load attendance records");
    } finally {
      this.hideLoading();
    }
  }

  applyFilters() {
    const courseFilter = document
      .getElementById("courseFilter")
      .value.toLowerCase();
    const hallFilter = document.getElementById("hallFilter").value;
    const dateFilter = document.getElementById("dateFilter").value;
    const searchFilter = document
      .getElementById("searchFilter")
      .value.toLowerCase();

    this.filteredRecords = this.attendanceRecords.filter((record) => {
      // Course filter
      if (
        courseFilter &&
        !record.courseName.toLowerCase().includes(courseFilter)
      ) {
        return false;
      }

      // Hall filter
      if (hallFilter && record.hall !== hallFilter) {
        return false;
      }

      // Date filter
      if (dateFilter) {
        const recordDate = new Date(record.startTime)
          .toISOString()
          .split("T")[0];
        if (recordDate !== dateFilter) {
          return false;
        }
      }

      // Search filter (student name or matric)
      if (searchFilter) {
        const hasMatchingStudent = record.students.some(
          (student) =>
            student.name.toLowerCase().includes(searchFilter) ||
            student.matric.includes(searchFilter)
        );
        if (!hasMatchingStudent) {
          return false;
        }
      }

      return true;
    });

    this.renderAttendanceList();
  }

  clearFilters() {
    document.getElementById("courseFilter").value = "";
    document.getElementById("hallFilter").value = "";
    document.getElementById("dateFilter").value = "";
    document.getElementById("searchFilter").value = "";

    this.filteredRecords = this.attendanceRecords;
    this.renderAttendanceList();
  }

  renderAttendanceList() {
    const container = document.getElementById("attendanceList");

    if (this.filteredRecords.length === 0) {
      container.innerHTML = `
                <div class="attendance-item">
                    <div class="attendance-header">
                        <div class="attendance-course">No attendance records found</div>
                    </div>
                    <p>Try adjusting your filters or create some attendance events first.</p>
                </div>
            `;
      return;
    }

    container.innerHTML = this.filteredRecords
      .map((record) => {
        const startTime = new Date(record.startTime);
        const endTime = new Date(record.endTime);
        const isActive = record.isActive && new Date() < endTime;

        return `
                <div class="attendance-item" onclick="attendanceManagement.showDetailModal('${
                  record._id
                }')">
                    <button class="delete-btn" onclick="event.stopPropagation(); attendanceManagement.showDeleteConfirm('${record._id}')" title="Delete this attendance record">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="attendance-header">
                        <div class="attendance-course">${
                          record.courseName
                        }</div>
                        <div class="attendance-status ${
                          isActive ? "status-active" : "status-closed"
                        }">
                            ${isActive ? "Active" : "Closed"}
                        </div>
                    </div>
                    <div class="attendance-meta">
                        <div class="meta-item">
                            <span class="meta-label">Event ID</span>
                            <span>${record.eventId}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Hall</span>
                            <span>${record.hall}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Date</span>
                            <span>${startTime.toLocaleDateString()}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Time</span>
                            <span>${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Students</span>
                            <span>${record.students.length} signed in</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Created By</span>
                            <span>${record.createdBy || "Unknown"}</span>
                        </div>
                    </div>
                </div>
            `;
      })
      .join("");
  }

  showDetailModal(recordId) {
    const record = this.attendanceRecords.find((r) => r._id === recordId);
    if (!record) return;

    this.currentDetailRecord = record;

    // Update modal title
    document.getElementById(
      "modalTitle"
    ).textContent = `${record.courseName} - Attendance Details`;

    // Update summary
    this.renderAttendanceSummary(record);

    // Update students table
    this.renderStudentsTable(record);

    // Show modal
    document.getElementById("attendanceDetailModal").classList.remove("hidden");
  }

  renderAttendanceSummary(record) {
    const startTime = new Date(record.startTime);
    const endTime = new Date(record.endTime);
    const duration = Math.round((endTime - startTime) / 60000); // minutes
    const isActive = record.isActive && new Date() < endTime;

    document.getElementById("attendanceSummary").innerHTML = `
            <div class="summary-card">
                <div class="summary-number">${record.students.length}</div>
                <div class="summary-label">Students Present</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${duration}</div>
                <div class="summary-label">Duration (minutes)</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${record.hall}</div>
                <div class="summary-label">Location</div>
            </div>
            <div class="summary-card">
                <div class="summary-number ${
                  isActive ? "text-success" : "text-danger"
                }">${isActive ? "Active" : "Closed"}</div>
                <div class="summary-label">Status</div>
            </div>
        `;
  }

  renderStudentsTable(record) {
    const tbody = document.getElementById("studentsTableBody");

    if (record.students.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #7f8c8d; padding: 2rem;">
                        No students have signed in yet
                    </td>
                </tr>
            `;
      return;
    }

    tbody.innerHTML = record.students
      .map((student, index) => {
        const signedAt = new Date(student.signedAt);
        return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${student.name}</td>
                    <td>${student.matric}</td>
                    <td>${signedAt.toLocaleTimeString()}</td>
                    <td>
                        <small>
                            ${student.lat.toFixed(6)}, ${student.lng.toFixed(6)}
                        </small>
                    </td>
                </tr>
            `;
      })
      .join("");
  }

  hideDetailModal() {
    document.getElementById("attendanceDetailModal").classList.add("hidden");
    this.currentDetailRecord = null;
  }

  exportCurrentRecordToPDF() {
    if (!this.currentDetailRecord) return;

    try {
      this.showLoading();

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const record = this.currentDetailRecord;
      const startTime = new Date(record.startTime);
      const endTime = new Date(record.endTime);

      // Header
      doc.setFontSize(20);
      doc.text("Attendance Report", 20, 20);

      // Course info
      doc.setFontSize(12);
      doc.text(`Course: ${record.courseName}`, 20, 35);
      doc.text(`Event ID: ${record.eventId}`, 20, 45);
      doc.text(`Hall: ${record.hall}`, 20, 55);
      doc.text(`Date: ${startTime.toLocaleDateString()}`, 20, 65);
      doc.text(
        `Time: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`,
        20,
        75
      );
      doc.text(`Total Students: ${record.students.length}`, 20, 85);

      // Students table
      if (record.students.length > 0) {
        const tableData = record.students.map((student, index) => [
          index + 1,
          student.name,
          student.matric,
          new Date(student.signedAt).toLocaleTimeString(),
          `${student.lat.toFixed(4)}, ${student.lng.toFixed(4)}`,
        ]);

        doc.autoTable({
          head: [["#", "Name", "Matric Number", "Time Signed", "Location"]],
          body: tableData,
          startY: 95,
          styles: {
            fontSize: 10,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [102, 126, 234],
            textColor: 255,
          },
        });
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
          20,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width - 40,
          doc.internal.pageSize.height - 10
        );
      }

      // Save the PDF
      const fileName = `attendance-${record.eventId}-${
        startTime.toISOString().split("T")[0]
      }.pdf`;
      doc.save(fileName);

      this.showSuccess("PDF exported successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      this.showError("Failed to export PDF");
    } finally {
      this.hideLoading();
    }
  }

  showDeleteConfirm(recordId) {
    const record = this.attendanceRecords.find((r) => r._id === recordId);
    if (!record) return;

    this.recordToDelete = record;

    // Populate record info
    const startTime = new Date(record.startTime);
    document.getElementById("deleteRecordInfo").innerHTML = `
      <p><strong>Course:</strong> ${record.courseName}</p>
      <p><strong>Hall:</strong> ${record.hall}</p>
      <p><strong>Date:</strong> ${startTime.toLocaleDateString()}</p>
      <p><strong>Students:</strong> ${record.students.length} records</p>
    `;

    // Show modal
    document.getElementById("deleteConfirmModal").classList.remove("hidden");
  }

  hideDeleteConfirm() {
    document.getElementById("deleteConfirmModal").classList.add("hidden");
    this.recordToDelete = null;
  }

  async confirmDelete() {
    if (!this.recordToDelete) return;

    try {
      this.showLoading("Deleting attendance record...");

      const response = await fetch(`/api/attendance/${this.recordToDelete._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.showToast("Attendance record deleted successfully", "success");
        this.hideDeleteConfirm();
        // Remove from local array
        this.attendanceRecords = this.attendanceRecords.filter(
          record => record._id !== this.recordToDelete._id
        );
        this.applyFilters(); // Refresh the display
      } else {
        const result = await response.json();
        this.showError(result.error || "Failed to delete attendance record");
      }
    } catch (error) {
      console.error("Error deleting attendance record:", error);
      this.showError("Network error occurred while deleting the record");
    } finally {
      this.hideLoading();
    }
  }

  showLoading(message = "Loading...") {
    const loadingOverlay = document.getElementById("loadingOverlay");
    loadingOverlay.classList.remove("hidden");
    loadingOverlay.querySelector(".loading-message").textContent = message;
  }

  hideLoading() {
    document.getElementById("loadingOverlay").classList.add("hidden");
  }

  showSuccess(message) {
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
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  }

  showError(message) {
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
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 5000);
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add styles
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 3000;
      max-width: 350px;
      animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.style.animation = "slideOutRight 0.3s ease-in";
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
      }
    }, 5000);
  }
}

// Initialize the attendance management system when the page loads
const attendanceManagement = new AttendanceManagement();
