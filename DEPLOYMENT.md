# Smart Attendance System - Deployment Guide

## Quick Deploy to Render (Recommended for HTTPS + Mobile Testing)

### 1. Prepare for Deployment

```bash
# Make sure all files are saved and committed
git init
git add .
git commit -m "Initial attendance system"
```

### 2. Deploy to Render

1. **Create account** at [render.com](https://render.com)
2. **Connect GitHub** - Push your code to GitHub first
3. **Create Web Service**:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`

### 3. Environment Variables (Optional)
In Render dashboard, set:
```
PORT=10000
MONGODB_URI=mongodb+srv://yudtkme:yudtkme20@tabmc.zhquyvw.mongodb.net/iAttend
```

### 4. Alternative: Quick Deploy Script

Create a `deploy.sh` file:

```bash
#!/bin/bash
echo "Preparing for deployment..."
npm install
echo "Ready to deploy to Render!"
echo "Your app will run on HTTPS which enables mobile location services"
```

## Local Testing vs Production

### Local (HTTP) - Limited Location Access
- ✅ Desktop browsers (with dev bypass)
- ❌ Mobile location services (security restriction)
- 🔗 Access: `http://localhost:3000`

### Production (HTTPS) - Full Location Access
- ✅ All devices with GPS
- ✅ Mobile browsers
- ✅ Secure location services
- 🔗 Access: `https://your-app.onrender.com`

## Testing Strategy

1. **Local Development**: Use dev bypass for basic testing
2. **Mobile Testing**: Deploy to Render for full GPS functionality
3. **Production**: Deploy with proper SSL for security

## Quick Render Deployment Steps

1. Push code to GitHub
2. Connect GitHub to Render
3. Create Web Service
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Deploy!

Your app will be available at `https://your-app-name.onrender.com` with full HTTPS support for mobile location services.

## URLs After Deployment

Replace `your-app-name` with your actual Render app name:

- **Lecturer Dashboard**: `https://your-app-name.onrender.com/admin`
- **Student Attendance**: `https://your-app-name.onrender.com/attend`
- **Attendance Management**: `https://your-app-name.onrender.com/attendance`

The HTTPS deployment will solve the mobile location access issues!
