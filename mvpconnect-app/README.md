# MVPConnect Mobile App

A React Native application for MVPConnect - connecting musicians, venues, and promoters.

## 🎨 Features

- **Dark Mode UI** - Modern, music-industry-aligned aesthetic
- **Multi-User Type Support** - Separate signup flows for Musicians, Venues, and Promoters
- **Secure Authentication** - JWT-based authentication with password validation
- **Beautiful UI Components** - Custom components following the MVPConnect design system
- **Cross-Platform** - Works on iOS, Android, and Web (via React Native Web)

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- For iOS development: Xcode (macOS only)
- For Android development: Android Studio

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd mvpconnect-app
npm install
```

### 2. Configure Backend URL

Update the API base URL in `src/services/api.ts`:

```typescript
const API_BASE_URL = 'http://localhost:8080'; // Change to your backend URL
```

For testing on a physical device, replace `localhost` with your computer's IP address:
```typescript
const API_BASE_URL = 'http://192.168.1.XXX:8080';
```

### 3. Start the Development Server

```bash
npm start
```

This will start the Expo development server and display a QR code.

### 4. Run on Device/Emulator

#### iOS (macOS only)
```bash
npm run ios
```

#### Android
```bash
npm run android
```

#### Web
```bash
npm run web
```

#### Using Expo Go App
1. Install Expo Go on your iOS or Android device
2. Scan the QR code from the terminal
3. The app will load on your device

## 📱 App Structure

```
mvpconnect-app/
├── App.tsx                          # Main app entry point
├── app.json                         # Expo configuration
├── src/
│   ├── components/
│   │   ├── Button.tsx              # Reusable button component
│   │   └── Input.tsx               # Reusable input component
│   ├── screens/
│   │   ├── LoginScreen.tsx         # Login screen
│   │   └── SignupScreen.tsx        # Signup with user type selection
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Navigation configuration
│   ├── services/
│   │   └── api.ts                  # API service & authentication
│   └── theme/
│       └── theme.ts                # Design tokens & color palette
└── package.json
```

## 🎯 User Flows

### Login Flow
1. User enters email and password
2. App calls `POST /auth/login`
3. On success, JWT token is stored locally
4. User is redirected to appropriate home screen based on user type

### Signup Flow
1. User selects account type (Musician, Venue, or Promoter)
2. User fills in registration form
3. App calls appropriate signup endpoint:
   - `POST /auth/signup/musician`
   - `POST /auth/signup/venue`
   - `POST /auth/signup/promoter`
4. On success, JWT token is stored locally
5. User is redirected to onboarding/home screen

## 🎨 Design System

### Color Palette

```typescript
Primary Background: #1a1a1a
Secondary Background: #262626
Primary Text: #e5e5e5
Secondary Text: #a3a3a3
Primary Accent: #0ea5e9 (Electric Blue)
Secondary Accent: #8b5cf6 (Purple)
Success: #10b981
Error: #ef4444
```

### Typography

- **Heading 1**: 32px Bold
- **Heading 2**: 24px Bold
- **Heading 3**: 20px Semibold
- **Body Large**: 16px Regular
- **Body Regular**: 14px Regular
- **Body Small**: 12px Regular

## 🔧 API Integration

The app connects to your backend API with these endpoints:

### Authentication Endpoints

```typescript
POST /auth/signup/musician
POST /auth/signup/venue
POST /auth/signup/promoter
POST /auth/login
```

### Expected Response Format

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userType": "MUSICIAN",
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

## 📦 Key Dependencies

- **React Native**: Core framework
- **Expo**: Development platform
- **React Navigation**: Navigation library
- **AsyncStorage**: Local data persistence
- **Axios**: HTTP client for API calls

## 🔐 Authentication Storage

The app uses AsyncStorage to persist authentication data:

- `authToken`: JWT token
- `userType`: User type (MUSICIAN, VENUE, or PROMOTER)

## 🧪 Testing

### Test Accounts

You can use these test accounts (after creating them via signup):

**Musician:**
- Email: jazztrio@test.com
- Password: password123

**Venue:**
- Email: bluenote@test.com
- Password: password123

**Promoter:**
- Email: nycevents@test.com
- Password: password123

## 🚧 Next Steps

### Immediate TODOs
- [ ] At the end of onboarding development, disable `ONBOARDING_PLACEHOLDER_SAVE_BYPASS` and restore backend-confirmed save/completion as the navigation gate
- [ ] Implement home screens for each user type
- [ ] Add profile completion/onboarding flow
- [ ] Implement token refresh mechanism
- [ ] Add form validation feedback
- [ ] Implement "Remember Me" functionality
- [ ] Add password reset flow

### Future Enhancements
- [ ] Social login (Google, Apple)
- [ ] Biometric authentication
- [ ] Push notifications
- [ ] In-app messaging
- [ ] Media upload (photos, videos)
- [ ] Real-time updates

## 🐛 Troubleshooting

### Common Issues

**"Network Error" when trying to login/signup:**
- Ensure your backend server is running on port 8080
- If testing on a physical device, update the API_BASE_URL to your computer's IP
- Check that your device/emulator can reach the backend server

**"Unable to resolve module" errors:**
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Metro bundler cache: `npx expo start -c`

**TypeScript errors:**
- Ensure all dependencies are installed
- Run `npx tsc --noEmit` to check for type errors

## 📝 License

This project is part of MVPConnect.

## 👥 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📞 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for the music industry**
