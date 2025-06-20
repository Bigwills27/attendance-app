// Attendance Management JavaScript
class AttendanceManagement {
  constructor() {
    this.attendanceRecords = [];
    this.filteredRecords = [];
    this.currentDetailRecord = null;
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

  showLoading() {
    document.getElementById("loadingOverlay").classList.remove("hidden");
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
}

// Initialize the attendance management system when the page loads
const attendanceManagement = new AttendanceManagement();
