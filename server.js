const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const multer = require("multer");
const basicAuth = require("express-basic-auth");
const geolib = require("geolib");
const pointInPolygon = require("point-in-polygon");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error(
    "MongoDB URI is not set. Please set the MONGODB_URI environment variable."
  );
  process.exit(1);
}
let db;

// Connect to MongoDB
MongoClient.connect(MONGODB_URI)
  .then((client) => {
    console.log("Connected to MongoDB");
    db = client.db("iAttend");

    // Initialize collections and seed data if needed
    initializeDatabase();
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Trust proxy for correct IP detection
app.set("trust proxy", true);

// Initialize database with sample data
async function initializeDatabase() {
  try {
    // Check if halls collection exists and seed if empty
    const hallsCount = await db.collection("halls").countDocuments();
    if (hallsCount === 0) {
      await db.collection("halls").insertMany([
        {
          name: "ENG HALL A",
          polygon: [
            { lat: 6.472552, lng: 3.198862 },
            { lat: 6.472552, lng: 3.198988 },
            { lat: 6.472627, lng: 3.198988 },
            { lat: 6.472627, lng: 3.198862 },
          ],
        },
        {
          name: "ENG HALL B",
          polygon: [
            { lat: 6.4727, lng: 3.199 },
            { lat: 6.4727, lng: 3.19912 },
            { lat: 6.4728, lng: 3.19912 },
            { lat: 6.4728, lng: 3.199 },
          ],
        },
        {
          name: "SCIENCE HALL",
          polygon: [
            { lat: 6.473, lng: 3.1992 },
            { lat: 6.473, lng: 3.19935 },
            { lat: 6.47315, lng: 3.19935 },
            { lat: 6.47315, lng: 3.1992 },
          ],
        },
        {
          name: "BASE",
          polygon: [
            { lat: 6.506791408381259, lng: 3.1989491628486872 },
            { lat: 6.5067167902985465, lng: 3.1989370929089223 },
            { lat: 6.506703465639764, lng: 3.1990323113226204 },
            { lat: 6.506774086327322, lng: 3.1990423696057575 },
          ],
        },
      ]);
      console.log("Halls collection seeded");
    }

    // Check if courses collection exists and has sample data
    const coursesCount = await db.collection("Courses").countDocuments();
    if (coursesCount === 0) {
      await db.collection("Courses").insertMany([
        {
          code: "CSC102",
          title: "Introduction to Computer Science",
          lecturer: "Dr. Bolu",
        },
        {
          code: "ENG201",
          title: "English Language II",
          lecturer: "Prof. Smith",
        },
        {
          code: "MTH101",
          title: "Mathematics I",
          lecturer: "Dr. Johnson",
        },
      ]);
      console.log("Courses collection seeded");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Get client IP address
app.get("/api/get-ip", (req, res) => {
  const clientIP =
    req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  res.json({ ip: clientIP });
});

// Get all courses
app.get("/api/courses", async (req, res) => {
  try {
    const courses = await db.collection("Courses").find({}).toArray();
    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// Create new course
app.post("/api/courses", async (req, res) => {
  try {
    const { code, title, lecturer } = req.body;

    // Check if course code already exists
    const existingCourse = await db
      .collection("Courses")
      .findOne({ code: code.toUpperCase() });
    if (existingCourse) {
      return res.status(400).json({ error: "Course code already exists" });
    }

    const newCourse = {
      code: code.toUpperCase(),
      title,
      lecturer,
      createdAt: new Date(),
    };

    const result = await db.collection("Courses").insertOne(newCourse);
    res.json({ ...newCourse, _id: result.insertedId });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
});

// Get all halls
app.get("/api/halls", async (req, res) => {
  try {
    const halls = await db.collection("halls").find({}).toArray();
    res.json(halls);
  } catch (error) {
    console.error("Error fetching halls:", error);
    res.status(500).json({ error: "Failed to fetch halls" });
  }
});

// Create attendance event
app.post("/api/attendance/create", async (req, res) => {
  try {
    const { courseId, hallName, duration } = req.body;

    // Check if course exists
    const course = await db
      .collection("Courses")
      .findOne({ _id: new ObjectId(courseId) });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Check if there's already an active attendance for this course
    const currentTime = new Date();
    const activeAttendance = await db.collection("attendances").findOne({
      courseId: new ObjectId(courseId),
      isActive: true,
      endTime: { $gt: currentTime }, // Only consider truly active (not expired) attendances
    });

    if (activeAttendance) {
      return res.status(400).json({
        error: "There is already an active attendance for this course",
      });
    }

    // Close any expired attendances for this course
    await db.collection("attendances").updateMany(
      {
        courseId: new ObjectId(courseId),
        isActive: true,
        endTime: { $lte: currentTime },
      },
      {
        $set: { isActive: false, closedAt: currentTime },
      }
    );

    // Get hall details
    const hall = await db.collection("halls").findOne({ name: hallName });
    if (!hall) {
      return res.status(404).json({ error: "Hall not found" });
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 60000); // duration in minutes

    // Generate unique event ID
    const eventId = `${course.code.toLowerCase()}-${now
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "")}-${Math.floor(Math.random() * 1000)}`;

    const attendanceEvent = {
      courseId: new ObjectId(courseId),
      eventId,
      courseName: `${course.code} - ${course.title}`,
      hall: hallName,
      polygon: hall.polygon,
      startTime: now,
      endTime,
      isActive: true,
      students: [],
      createdBy: course.lecturer,
    };

    const result = await db
      .collection("attendances")
      .insertOne(attendanceEvent);
    res.json({ ...attendanceEvent, _id: result.insertedId });
  } catch (error) {
    console.error("Error creating attendance:", error);
    res.status(500).json({ error: "Failed to create attendance event" });
  }
});

// Get active attendance event
app.get("/api/attendance/active", async (req, res) => {
  try {
    const now = new Date();
    const activeAttendance = await db.collection("attendances").findOne({
      isActive: true,
      endTime: { $gt: now },
    });

    if (!activeAttendance) {
      return res.json({ active: false });
    }

    res.json({
      active: true,
      eventId: activeAttendance.eventId,
      courseName: activeAttendance.courseName,
      hall: activeAttendance.hall,
      endTime: activeAttendance.endTime,
    });
  } catch (error) {
    console.error("Error fetching active attendance:", error);
    res.status(500).json({ error: "Failed to fetch active attendance" });
  }
});

// Submit attendance
app.post("/api/attendance/submit", async (req, res) => {
  try {
    const { eventId, name, matric, ip, location } = req.body;

    // Validate matric number format (example: 230153035)
    const matricRegex = /^\d{9}$/;
    if (!matricRegex.test(matric)) {
      return res.status(400).json({ error: "Invalid matric number format" });
    }

    // Find the attendance event
    const attendance = await db.collection("attendances").findOne({ eventId });
    if (!attendance) {
      return res.status(404).json({ error: "Attendance event not found" });
    }

    // Check if event is still active
    const now = new Date();
    if (!attendance.isActive || now > attendance.endTime) {
      return res.status(400).json({ error: "Attendance is closed" });
    }

    // Check if IP is already used
    const existingIPSubmission = attendance.students.find(
      (student) => student.ip === ip
    );
    if (existingIPSubmission) {
      return res
        .status(400)
        .json({ error: "This device has already been used for attendance" });
    }

    // Check if matric number is already used
    const existingMatricSubmission = attendance.students.find(
      (student) => student.matric === matric
    );
    if (existingMatricSubmission) {
      return res
        .status(400)
        .json({ error: "You have already signed in for this attendance" });
    }

    // Check if location is within geofence
    const polygon = attendance.polygon.map((point) => [point.lat, point.lng]);
    const isInside = pointInPolygon([location.lat, location.lng], polygon);

    // Debug logging
    console.log("Location validation:", {
      userLocation: [location.lat, location.lng],
      polygon: polygon,
      isInside: isInside,
      eventId: eventId,
    });

    // For development/testing, be more lenient with location validation
    if (!isInside) {
      // Check if this is a test location or manual entry
      if (location.accuracy === "test" || location.accuracy === "manual") {
        console.log("Allowing test/manual location for development");
      } else {
        return res.status(400).json({
          error: "You are outside the lecture hall zone",
          debug: {
            userLocation: [location.lat, location.lng],
            requiredArea: polygon,
            distance: this.calculateDistanceToPolygon
              ? this.calculateDistanceToPolygon(
                  [location.lat, location.lng],
                  polygon
                )
              : "unknown",
          },
        });
      }
    }

    // Add student to attendance
    const studentSubmission = {
      name,
      matric,
      ip,
      lat: location.lat,
      lng: location.lng,
      signedAt: now,
    };

    await db
      .collection("attendances")
      .updateOne({ eventId }, { $push: { students: studentSubmission } });

    res.json({ success: true, message: "Attendance recorded successfully" });
  } catch (error) {
    console.error("Error submitting attendance:", error);
    res.status(500).json({
      error: "There was an issue recording your attendance. Please try again.",
    });
  }
});

// Close attendance event
app.post("/api/attendance/close/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await db
      .collection("attendances")
      .updateOne(
        { eventId },
        { $set: { isActive: false, closedAt: new Date() } }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Attendance event not found" });
    }

    res.json({ success: true, message: "Attendance closed successfully" });
  } catch (error) {
    console.error("Error closing attendance:", error);
    res.status(500).json({ error: "Failed to close attendance" });
  }
});

// Get attendance history for a course
app.get("/api/attendance/history/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    const attendances = await db
      .collection("attendances")
      .find({ courseId: new ObjectId(courseId) })
      .sort({ startTime: -1 })
      .toArray();

    res.json(attendances);
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    res.status(500).json({ error: "Failed to fetch attendance history" });
  }
});

// Get all attendance records with search and filter
app.get("/api/attendance/all", async (req, res) => {
  try {
    const { course, hall, date, search } = req.query;
    let query = {};

    if (course) {
      query.courseName = { $regex: course, $options: "i" };
    }

    if (hall) {
      query.hall = hall;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.startTime = { $gte: startDate, $lt: endDate };
    }

    let attendances = await db
      .collection("attendances")
      .find(query)
      .sort({ startTime: -1 })
      .toArray();

    // Apply search filter if provided
    if (search) {
      attendances = attendances.filter((attendance) =>
        attendance.students.some(
          (student) =>
            student.name.toLowerCase().includes(search.toLowerCase()) ||
            student.matric.includes(search)
        )
      );
    }

    res.json(attendances);
  } catch (error) {
    console.error("Error fetching all attendance records:", error);
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
});

// Serve static files
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/attend", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "attend.html"));
});

app.get("/attendance", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "attendance.html"));
});

app.get("/", (req, res) => {
  res.redirect("/admin");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
