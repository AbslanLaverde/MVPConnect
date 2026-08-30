import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { MatchShowcase } from '../components/MatchShowcase';
import { BrandLogo } from '../components/BrandLogo';
import { authAPI, storageHelpers } from '../services/api';
import { styles } from './LoginScreen.styles';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isCompact = width < 720;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({
        email: email.toLowerCase().trim(),
        password,
      });

      // Save auth data
      await storageHelpers.saveAuthData(response.token, response.userType);

      // Navigate to appropriate home screen
      if (response.userType === 'MUSICIAN') {
        navigation.replace('MusicianHome', {
          userId: response.userId,
          userName: response.displayName || email.trim(),
          userType: response.userType,
        });
      } else {
        // For now, all types go to MusicianHome (venue/promoter screens TBD)
        navigation.replace('MusicianHome', {
          userId: response.userId,
          userName: response.displayName || email.trim(),
          userType: response.userType,
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.response?.status === 401) {
        Alert.alert('Error', 'Invalid email or password');
      } else if (error.response?.data?.message) {
        Alert.alert('Error', error.response.data.message);
      } else {
        Alert.alert('Error', 'Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const brand = (
    <View style={styles.brand}>
      <BrandLogo />
    </View>
  );

  const story = (
    <View
      style={[
        styles.storyContent,
        isDesktop && styles.storyContentDesktop,
        isCompact && styles.storyContentCompact,
      ]}
    >
      <Text style={[styles.eyebrow, !isDesktop && styles.centeredText]}>
        BUILT FOR LIVE MUSIC
      </Text>
      <Text
        style={[
          styles.headline,
          !isDesktop && styles.centeredText,
          isCompact && styles.headlineCompact,
        ]}
      >
        Your next show starts with the right connection.
      </Text>
      <Text
        style={[
          styles.storyCopy,
          !isDesktop && styles.centeredText,
          isCompact && styles.storyCopyCompact,
        ]}
      >
        Discover musicians, venues, and promoters who fit your sound, goals, and scene.
      </Text>

      <MatchShowcase compact={isCompact} />
    </View>
  );

  const auth = (
    <View
      style={[
        styles.authPanel,
        isDesktop && styles.authPanelDesktop,
        !isDesktop && styles.authPanelStacked,
        isCompact && styles.authPanelCompact,
      ]}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue building your network.</Text>

        <Input
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errors.email) setErrors({ ...errors, email: undefined });
          }}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
          required
        />

        <Input
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errors.password) setErrors({ ...errors, password: undefined });
          }}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          required
        />

        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => Alert.alert('Info', 'Password reset coming soon!')}
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
        >
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>

        <Button
          title="Sign In"
          onPress={handleLogin}
          loading={loading}
          fullWidth
          size="large"
          style={styles.loginButton}
          accessibilityLabel="Sign in to your account"
        />

        <View style={styles.divider} />

        <View style={styles.signupPrompt}>
          <Text style={styles.signupPromptText}>New to MVPConnect?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            accessibilityRole="button"
            accessibilityLabel="Create your MVPConnect profile"
          >
            <Text style={styles.signupLink}>Create your profile →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        Platform.OS === 'web' && {
          height,
          maxHeight: height,
          flexGrow: 0,
          flexShrink: 0,
          flexBasis: 'auto',
        },
      ]}
      behavior={
        Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined
      }
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
          isCompact && styles.scrollContentCompact,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.shell,
            isDesktop && styles.shellDesktop,
            isCompact && styles.shellCompact,
          ]}
        >
          {isDesktop ? (
            <>
              <View style={[styles.storyPanel, styles.storyPanelDesktop]}>
                {brand}
                {story}
              </View>
              {auth}
            </>
          ) : (
            <>
              <View style={[styles.stackedBrand, isCompact && styles.stackedBrandCompact]}>
                {brand}
              </View>
              {auth}
              <View
                style={[
                  styles.storyPanel,
                  styles.storyPanelStacked,
                  isCompact && styles.storyPanelCompact,
                ]}
              >
                {story}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
