import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import {
  authAPI,
  storageHelpers,
  SignupMusicianData,
  SignupVenueData,
  SignupPromoterData,
} from '../services/api';
import { styles } from './SignupScreen.styles';

interface SignupScreenProps {
  navigation: any;
}

type UserType = 'MUSICIAN' | 'VENUE' | 'PROMOTER';

export const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState(''); // For musician name, venue name, or business name
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // User type validation
    if (!selectedUserType) {
      Alert.alert('Error', 'Please select an account type');
      return false;
    }

    // Name validation
    if (!name) {
      newErrors.name = `${getUserTypeLabel(selectedUserType)} name is required`;
    }

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getUserTypeLabel = (type: UserType): string => {
    switch (type) {
      case 'MUSICIAN':
        return 'Artist/Band';
      case 'VENUE':
        return 'Venue';
      case 'PROMOTER':
        return 'Promoter/Business';
    }
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let response;

      switch (selectedUserType) {
        case 'MUSICIAN':
          const musicianData: SignupMusicianData = {
            name,
            email: email.toLowerCase().trim(),
            password,
          };
          response = await authAPI.signupMusician(musicianData);
          break;

        case 'VENUE':
          const venueData: SignupVenueData = {
            venueName: name,
            email: email.toLowerCase().trim(),
            password,
          };
          response = await authAPI.signupVenue(venueData);
          break;

        case 'PROMOTER':
          const promoterData: SignupPromoterData = {
            businessName: name,
            email: email.toLowerCase().trim(),
            password,
          };
          response = await authAPI.signupPromoter(promoterData);
          break;

        default:
          throw new Error('Invalid user type');
      }

      // Save auth data
      await storageHelpers.saveAuthData(response.token, response.userType);

      // Navigate to home screen
      navigation.replace('MusicianHome', {
        userId: response.userId,
        userName: response.displayName || name,
        userType: response.userType,
      });
    } catch (error: any) {
      console.error('Signup error:', error);

      if (error.response?.status === 400) {
        Alert.alert('Error', 'Email already registered');
      } else if (error.response?.data?.message) {
        Alert.alert('Error', error.response.data.message);
      } else {
        Alert.alert('Error', 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // User type selection view
  if (!selectedUserType) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.logo}>MVPConnect</Text>
            <Text style={styles.tagline}>Connect. Collaborate. Create Moments.</Text>
          </View>

          <View style={styles.userTypeSelection}>
            <Text style={styles.title}>Join MVPConnect</Text>
            <Text style={styles.subtitle}>Select your account type</Text>

            <TouchableOpacity
              style={styles.userTypeCard}
              onPress={() => setSelectedUserType('MUSICIAN')}
              activeOpacity={0.7}
            >
              <Text style={styles.userTypeIcon}>🎸</Text>
              <View style={styles.userTypeContent}>
                <Text style={styles.userTypeName}>Musician / Band</Text>
                <Text style={styles.userTypeDescription}>
                  Get booked more. AI-powered venue matching and direct booking inquiries.
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.userTypeCard}
              onPress={() => setSelectedUserType('VENUE')}
              activeOpacity={0.7}
            >
              <Text style={styles.userTypeIcon}>🎤</Text>
              <View style={styles.userTypeContent}>
                <Text style={styles.userTypeName}>Venue</Text>
                <Text style={styles.userTypeDescription}>
                  Find perfect performers. Smart recommendations and easy booking management.
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.userTypeCard}
              onPress={() => setSelectedUserType('PROMOTER')}
              activeOpacity={0.7}
            >
              <Text style={styles.userTypeIcon}>🎭</Text>
              <View style={styles.userTypeContent}>
                <Text style={styles.userTypeName}>Promoter</Text>
                <Text style={styles.userTypeDescription}>
                  Connect artists & venues. Manage rosters and grow your network.
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Signup form view
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setSelectedUserType(null)}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Sign up as {getUserTypeLabel(selectedUserType)}
          </Text>

          <Input
            label={`${getUserTypeLabel(selectedUserType)} Name`}
            placeholder={`Enter your ${getUserTypeLabel(selectedUserType).toLowerCase()} name`}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            error={errors.name}
            required
            leftIcon={<Text style={styles.icon}>✏️</Text>}
          />

          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            required
            leftIcon={<Text style={styles.icon}>📧</Text>}
          />

          <Input
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: undefined });
            }}
            error={errors.password}
            secureTextEntry
            autoCapitalize="none"
            required
            leftIcon={<Text style={styles.icon}>🔒</Text>}
            helperText="Must be at least 6 characters"
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword)
                setErrors({ ...errors, confirmPassword: undefined });
            }}
            error={errors.confirmPassword}
            secureTextEntry
            autoCapitalize="none"
            required
            leftIcon={<Text style={styles.icon}>🔒</Text>}
          />

          <Button
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            fullWidth
            size="large"
            style={styles.signupButton}
            accessibilityLabel="Create your account"
          />

          <Text style={styles.termsText}>
            By signing up, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

