# MVPConnect - Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Install Dependencies
```bash
cd mvpconnect-app
npm install
```

### Step 2: Start Backend Server
Make sure your backend server is running on `http://localhost:8081`

### Step 3: Start the App
```bash
npm start
```

### Step 4: Choose Your Platform
- Press `i` for iOS simulator (macOS only)
- Press `a` for Android emulator
- Press `w` for web browser
- Scan QR code with Expo Go app on your phone

## 📱 Test the App

### Create an Account
1. Tap "Sign Up"
2. Select user type (Musician, Venue, or Promoter)
3. Fill in the form:
   - Name: Test Band
   - Email: testband@example.com
   - Password: password123
4. Tap "Create Account"

### Login
1. Enter your email and password
2. Tap "Sign In"
3. You'll be logged in with a JWT token

## 🎯 What's Working

✅ User type selection (Musician, Venue, Promoter)
✅ Signup with validation
✅ Login with validation
✅ JWT token storage
✅ Error handling
✅ Dark mode UI
✅ Responsive design
✅ Password visibility toggle
✅ Form validation with error messages

## 🔄 API Endpoints Used

### Signup
- `POST http://localhost:8081/auth/signup/musician`
- `POST http://localhost:8081/auth/signup/venue`
- `POST http://localhost:8081/auth/signup/promoter`

### Login
- `POST http://localhost:8081/auth/login`

## 📝 Sample Request Bodies

### Musician Signup
```json
{
  "name": "Jazz Trio",
  "email": "jazztrio@test.com",
  "password": "password123"
}
```

### Venue Signup
```json
{
  "venueName": "Blue Note Jazz Club",
  "email": "bluenote@test.com",
  "password": "password123"
}
```

### Promoter Signup
```json
{
  "businessName": "NYC Events",
  "email": "nycevents@test.com",
  "password": "password123"
}
```

### Login
```json
{
  "email": "jazztrio@test.com",
  "password": "password123"
}
```

## 🎨 UI Features

### Login Screen
- Clean, modern dark mode design
- Email and password inputs with icons
- Password visibility toggle
- "Forgot Password?" link
- Sign up prompt
- Loading states

### Signup Screen
- User type selection cards with descriptions
- Back button to change user type
- Dynamic form labels based on user type
- Password confirmation
- Terms of service acknowledgment
- Login prompt

### Design Elements
- Electric blue accent color (#0ea5e9)
- Dark backgrounds (#1a1a1a, #262626)
- Smooth animations
- Proper spacing and typography
- Accessible touch targets (48px minimum)

## 🔧 Customization

### Change API URL
Edit `src/services/api.ts`:
```typescript
const API_BASE_URL = 'http://YOUR_IP:8081';
```

### Update Colors
Edit `src/theme/theme.ts`:
```typescript
colors: {
  primaryAccent: '#0ea5e9', // Change this
  // ... other colors
}
```

### Add New Fields
Edit signup screens and API interfaces in `src/services/api.ts`

## 🐛 Common Issues

### Can't connect to backend
- Check backend is running: `curl http://localhost:8081/auth/login`
- Update API_BASE_URL if testing on device

### Metro bundler issues
```bash
npx expo start -c  # Clear cache
```

### TypeScript errors
```bash
npm install --save-dev @types/react @types/react-native
```

## 📱 Testing on Physical Device

1. Install Expo Go from App Store/Play Store
2. Connect to same WiFi as your computer
3. Update API URL to your computer's IP:
   ```typescript
   const API_BASE_URL = 'http://192.168.1.XXX:8081';
   ```
4. Scan QR code from terminal

## ✨ Next Features to Build

- [ ] Profile completion screens
- [ ] Home screens for each user type
- [ ] Password reset functionality
- [ ] Remember me checkbox
- [ ] Social login
- [ ] Profile photo upload
- [ ] Venue/musician discovery
- [ ] Booking inquiries

## 📖 Documentation

- Full README: See `README.md`
- UI Design Doc: See uploaded design document
- API Documentation: See Insomnia collection

---

**Happy Coding! 🎸🎤🎭**
