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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { styles } from './LoginScreen.styles';
import { theme } from '../theme/theme';
import { fetchOnboardingState, onboardingApi } from '../onboarding/onboardingApi';
import { resolveAuthenticatedEntryRoute } from '../onboarding/onboardingRoutes';
import { store } from '../store/store';

const connectionGradientWebStyle = {
  backgroundImage: `linear-gradient(90deg, ${theme.colors.brandBlue}, ${theme.colors.brandViolet})`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
} as any;

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
    let authenticated = false;
    try {
      const response = await authAPI.login({
        email: email.toLowerCase().trim(),
        password,
      });
      authenticated = true;

      // Save auth data
      await storageHelpers.saveAuthData(response.accessToken, response.userType);
      store.dispatch(onboardingApi.util.resetApiState());

      const onboardingState = await fetchOnboardingState();
      await store.dispatch(
        onboardingApi.util.upsertQueryData('getOnboarding', undefined, onboardingState),
      );
      const destination = resolveAuthenticatedEntryRoute(onboardingState);

      if (destination.screen === 'onboarding') {
        navigation.replace('Onboarding', {
          persona: destination.persona,
          step: destination.step,
        });
        return;
      }

      // Persona-specific home screens are still TBD. Preserve the existing home
      // destination, but only after the backend confirms onboarding is complete.
      navigation.replace('MusicianHome', {
        userId: response.userId,
        userName: response.name || email.trim(),
        userType: response.userType,
      });
    } catch (error: any) {
      console.error(authenticated ? 'Post-login routing error:' : 'Login error:', error);

      if (authenticated) {
        await storageHelpers.clearAuthData();
        store.dispatch(onboardingApi.util.resetApiState());
        Alert.alert(
          'Error',
          "We couldn't load your onboarding progress. Please sign in again.",
        );
        return;
      }

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
    <View style={[styles.brand, isDesktop && styles.brandDesktop]}>
      <BrandLogo
        width={isDesktop ? 184 : isCompact ? 152 : 168}
        height={isDesktop ? 39 : isCompact ? 32 : 35}
      />
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
      {Platform.OS !== 'web' && isCompact ? (
        <View
          style={styles.headlineNativeCompact}
          accessible
          accessibilityRole="header"
          accessibilityLabel="Your next show starts with the right connect."
        >
          <Text style={[styles.headline, styles.headlineCompact, styles.headlineNativeLead]}>
            YOUR NEXT SHOW STARTS WITH THE RIGHT
          </Text>
          <Svg width={240} height={40} accessibilityElementsHidden>
            <Defs>
              <LinearGradient
                id="connectionGradient"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="240"
                y2="0"
              >
                <Stop offset="0%" stopColor={theme.colors.brandBlue} />
                <Stop offset="100%" stopColor={theme.colors.brandViolet} />
              </LinearGradient>
            </Defs>
            <SvgText
              x="120"
              y="32"
              textAnchor="middle"
              fill="url(#connectionGradient)"
              fontFamily={theme.typography.fontFamily.bodyBold}
              fontSize="32"
              letterSpacing="-0.8"
            >
              CONNECT.
            </SvgText>
          </Svg>
        </View>
      ) : (
        <Text
          style={[
          styles.headline,
          isDesktop && styles.headlineDesktop,
          !isDesktop && styles.centeredText,
            isCompact && styles.headlineCompact,
          ]}
        >
          YOUR NEXT SHOW STARTS WITH THE RIGHT{' '}
          <Text
            style={[
              styles.connectionText,
              Platform.OS === 'web' && connectionGradientWebStyle,
            ]}
          >
            CONNECT.
          </Text>
        </Text>
      )}
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
        <View style={styles.sectionMarker}>
          <Text style={[styles.sectionLabel, styles.sectionLabelActive]}>SIGN IN</Text>
        </View>
        <Text style={styles.title}>WELCOME BACK.</Text>
        <Text style={styles.subtitle}>Sign in to continue building your network.</Text>
        <View style={styles.formHeaderRule} />

        <Input
          label="EMAIL"
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
          brandTypography
        />

        <Input
          label="PASSWORD"
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
          brandTypography
        />

        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => Alert.alert('Info', 'Password reset coming soon!')}
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
        >
          <Text style={styles.forgotPasswordText}>FORGOT PASSWORD?</Text>
        </TouchableOpacity>

        <Button
          title="SIGN IN →"
          onPress={handleLogin}
          loading={loading}
          fullWidth
          size="large"
          style={styles.loginButton}
          accessibilityLabel="Sign in to your account"
          brandTypography
        />

        <View style={styles.divider} />

        <View style={styles.signupPrompt}>
          <View style={styles.sectionMarkerSecondary}>
            <Text style={styles.sectionLabel}>NEW HERE?</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            accessibilityRole="button"
            accessibilityLabel="Create your MVPConnect profile"
          >
            <Text style={styles.signupLink}>CREATE YOUR PROFILE →</Text>
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
        Platform.OS !== 'web' && {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
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
