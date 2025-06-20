# Smart Web-Based Attendance System

A comprehensive attendance system with GPS geofencing and IP validation to ensure students are physically present in lecture halls.

## Features

- **Lecturer Dashboard**: Create courses and manage attendance events
- **GPS Geofencing**: Validates student location within lecture hall boundaries
- **IP Validation**: Prevents multiple submissions from the same device
- **Real-time Attendance**: Live countdown and status updates
- **Attendance Management**: View, filter, and export attendance records as PDF
- **Mobile-First Design**: Optimized for smartphone usage
- **Anti-Cheat Measures**: Multiple validation layers to prevent attendance fraud

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas
- **Frontend**: Vanilla JavaScript (mobile-optimized)
- **Geolocation**: Browser Geolocation API + point-in-polygon validation
- **PDF Export**: jsPDF + autoTable

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

### 3. Access the System

- **Lecturer Dashboard**: http://localhost:3000/admin
  - Passcode: `123456`
- **Student Attendance**: http://localhost:3000/attend
- **Attendance Management**: http://localhost:3000/attendance

## System Overview

### For Lecturers

1. **Login** with passcode `123456`
2. **Create/View Courses** from the dashboard
3. **Create Attendance Events**:
   - Select a course
   - Choose lecture hall
   - Set duration (5-30 minutes)
4. **Announce to Students**: Share the attendance link
5. **Monitor & Export**: View attendance records and export as PDF

### For Students

1. **Visit Attendance Page**: Go to the provided link
2. **Enter Details**: Full name and 9-digit matric number
3. **Location Verification**: System automatically gets and validates GPS location
4. **Submit Attendance**: One-click submission with real-time validation

### Anti-Cheat Features

| Security Measure    | Description                                    |
| ------------------- | ---------------------------------------------- |
| GPS Geofencing      | Must be physically inside the lecture hall     |
| IP Restriction      | One submission per device per attendance event |
| Matric Validation   | Unique matric number per attendance event      |
| Time Limits         | Attendance expires after set duration          |
| Single Active Event | Only one attendance per course at a time       |

## Database Schema

### Collections

1. **Courses**: Course information (code, title, lecturer)
2. **halls**: Lecture hall GPS polygons
3. **attendances**: Attendance events and student submissions

### Sample Data

The system comes pre-loaded with:

- 3 sample courses (CSC102, ENG201, MTH101)
- 3 sample halls (ENG HALL A, ENG HALL B, SCIENCE HALL)

## API Endpoints

### Course Management

- `GET /api/courses` - List all courses
- `POST /api/courses` - Create new course

### Attendance Management

- `POST /api/attendance/create` - Create attendance event
- `GET /api/attendance/active` - Get active attendance
- `POST /api/attendance/submit` - Submit student attendance
- `POST /api/attendance/close/:eventId` - Close attendance event
- `GET /api/attendance/all` - Get all attendance records (with filters)

### Utility

- `GET /api/get-ip` - Get client IP address
- `GET /api/halls` - List all lecture halls

## Configuration

### Environment Variables (Optional)

```
PORT=3000
MONGODB_URI=your_mongodb_connection_string
```

### Default Settings

- **Passcode**: 123456
- **Database**: MongoDB Atlas (pre-configured)
- **Max Duration**: 30 minutes
- **Location Accuracy**: High accuracy GPS

## Usage Instructions

### Creating Attendance (Lecturer)

1. Login to `/admin` with passcode `123456`
2. Click on a course card
3. Select hall and duration
4. Click "Activate Attendance"
5. Share the announcement text with students

### Taking Attendance (Student)

1. Go to `/attend` (usually shared by lecturer)
2. Enter full name and matric number
3. Allow location access when prompted
4. Click "Sign In to Attendance"
5. Receive confirmation or error message

### Managing Attendance Records

1. From lecturer dashboard, click "View All Attendance"
2. Use filters to search by course, hall, date, or student
3. Click on any attendance record to view details
4. Export individual records as PDF

## Security Features

### Location Validation

- Uses high-accuracy GPS
- Validates against predefined hall polygons
- Prevents location spoofing

### Device Tracking

- IP address logging
- One submission per IP per event
- Prevents device sharing

### Time Management

- Attendance automatically expires
- Real-time countdown for students
- No late submissions allowed

## Troubleshooting

### Common Issues

1. **Location Access Denied**

   - Students must enable location services
   - Use HTTPS in production for location access

2. **"Outside Hall Zone" Error**

   - Verify GPS coordinates are correct
   - Check if hall polygon includes the entire area

3. **"IP Already Used" Error**
   - Each device can only submit once per event
   - Students cannot share devices

### Development Notes

- The system uses sample GPS coordinates for halls
- In production, capture actual hall coordinates using GPS logger
- Consider 9-point grid system for better accuracy
- Test geofencing thoroughly before deployment

## Future Enhancements

- QR code backup for attendance
- Email notifications
- Bulk student import
- Advanced analytics
- Multi-lecturer support
- Role-based access control

## License

MIT License - Feel free to modify and distribute.
