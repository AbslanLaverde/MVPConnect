import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { BrandLogo } from '../../components/BrandLogo';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { storageHelpers } from '../../services/api';
import { theme } from '../../theme/theme';
import { SignupAccountConfig } from './signupAccountConfig';
import { styles } from './SignupAccountScreen.styles';

interface SignupAccountScreenProps {
  config: SignupAccountConfig;
  navigation: any;
}

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

const DUPLICATE_EMAIL_CODE = 'EMAIL_ALREADY_REGISTERED';
const DUPLICATE_EMAIL_MESSAGE =
  'This email is already registered.\nPlease sign in instead.';
const GENERIC_ERROR_MESSAGE =
  "We couldn't create your account.\nPlease try again.";

const emailLooksValid = (email: string) => /\S+@\S+\.\S+/.test(email);

const ConnectionAccentRule = () => (
  <Svg width={48} height={2}>
    <Defs>
      <LinearGradient
        id="signupConnectionRuleGradient"
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="0"
        x2="48"
        y2="0"
      >
        <Stop offset="0%" stopColor={theme.personas.artist.accentStart} />
        <Stop offset="100%" stopColor={theme.personas.artist.accentEnd} />
      </LinearGradient>
    </Defs>
    <Rect width="48" height="2" fill="url(#signupConnectionRuleGradient)" />
  </Svg>
);

const ConnectionGradientDivider = ({ height = 1 }: { height?: number }) => (
  <Svg width="100%" height={height}>
    <Defs>
      <LinearGradient id="signupPageGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor={theme.personas.artist.accentStart} />
        <Stop offset="100%" stopColor={theme.personas.artist.accentEnd} />
      </LinearGradient>
    </Defs>
    <Rect width="100%" height={height} fill="url(#signupPageGradient)" />
  </Svg>
);

const ConnectionGradientEyebrow = ({ text }: { text: string }) => (
  <View
    accessible
    accessibilityLabel={text}
    style={styles.gradientEyebrow}
  >
    <Svg width={180} height={18}>
      <Defs>
        <LinearGradient
          id="signupEyebrowGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <Stop offset="0%" stopColor={theme.personas.artist.accentStart} />
          <Stop offset="100%" stopColor={theme.personas.artist.accentEnd} />
        </LinearGradient>
      </Defs>
      <SvgText
        x="0"
        y="13"
        fill="url(#signupEyebrowGradient)"
        fontFamily={theme.typography.fontFamily.bodyBold}
        fontSize={theme.fontSizes.bodySmall}
        letterSpacing="1.8"
      >
        {text}
      </SvgText>
    </Svg>
  </View>
);

const ConnectionGradientSignInText = () => (
  <View style={styles.gradientSignInText}>
    <Svg width={100} height={24}>
      <Defs>
        <LinearGradient
          id="signupSignInGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <Stop offset="0%" stopColor={theme.personas.artist.accentStart} />
          <Stop offset="100%" stopColor={theme.personas.artist.accentEnd} />
        </LinearGradient>
      </Defs>
      <SvgText
        x="0"
        y="18"
        fill="url(#signupSignInGradient)"
        fontFamily={theme.typography.fontFamily.bodyBold}
        fontSize={theme.fontSizes.bodyRegular}
        letterSpacing="1.1"
      >
        SIGN IN →
      </SvgText>
    </Svg>
  </View>
);

interface ConnectionGradientButtonProps {
  title: string;
  loading: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

const ConnectionGradientButton: React.FC<ConnectionGradientButtonProps> = ({
  title,
  loading,
  onPress,
  accessibilityLabel,
}) => (
  <View style={styles.gradientCtaFrame}>
    <Svg
      width="100%"
      height="100%"
      style={styles.gradientCtaArtwork}
    >
      <Defs>
        <LinearGradient
          id="signupArtistButtonGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <Stop offset="0%" stopColor={theme.personas.artist.accentStart} />
          <Stop offset="100%" stopColor={theme.personas.artist.accentEnd} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#signupArtistButtonGradient)" />
    </Svg>
    <Button
      title={title}
      onPress={onPress}
      loading={loading}
      disabled={loading}
      fullWidth
      size="large"
      style={[styles.cta, styles.gradientCtaButton] as any}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Submits the account form"
      brandTypography
    />
  </View>
);

export const SignupAccountScreen: React.FC<SignupAccountScreenProps> = ({
  config,
  navigation,
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 600;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();

  const clearFieldError = (field: keyof FieldErrors) => {
    setErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  };

  const goToLogin = () => navigation.navigate('Login');

  const validate = () => {
    const nextErrors: FieldErrors = {};
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) nextErrors.name = config.nameRequiredError;
    if (!normalizedEmail) {
      nextErrors.email = 'Email is required.';
    } else if (!emailLooksValid(normalizedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(nextErrors);
    return {
      valid: Object.keys(nextErrors).length === 0,
      normalizedName,
      normalizedEmail,
    };
  };

  const handleSignup = async () => {
    if (loading) return;

    setFormError(undefined);
    setDuplicateEmail(false);
    const { valid, normalizedName, normalizedEmail } = validate();
    if (!valid) return;

    setLoading(true);
    try {
      const response = await config.submit(normalizedName, normalizedEmail, password);
      await storageHelpers.saveAuthData(response.accessToken, response.userType);
      navigation.replace('MusicianHome', {
        userId: response.userId,
        userName: response.name || normalizedName,
        userType: response.userType,
      });
    } catch (error: any) {
      if (error.response?.data?.code === DUPLICATE_EMAIL_CODE) {
        setDuplicateEmail(true);
        setErrors((current) => ({ ...current, email: DUPLICATE_EMAIL_MESSAGE }));
      } else {
        setFormError(GENERIC_ERROR_MESSAGE);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isMobile && styles.scrollContentMobile,
          { paddingTop: Math.max(insets.top, theme.spacing.md) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageFrame}>
          <View style={styles.brandRow}>
            <BrandLogo width={isMobile ? 152 : 184} height={isMobile ? 32 : 39} />
          </View>
          <View style={styles.pageAccentRule}>
            {config.usesConnectionGradient ? (
              <ConnectionGradientDivider />
            ) : (
              <View
                style={[
                  styles.pageAccentRuleSolid,
                  { backgroundColor: config.accent },
                ]}
              />
            )}
          </View>

          <TouchableOpacity
            style={styles.changeRole}
            onPress={() => navigation.navigate('Signup')}
            accessibilityRole="button"
            accessibilityLabel="Change account role"
            accessibilityHint="Returns to role selection"
          >
            <Text style={styles.changeRoleText}>← CHANGE ROLE</Text>
          </TouchableOpacity>

          <View style={styles.intro}>
            {config.usesConnectionGradient ? (
              <ConnectionGradientEyebrow text={config.eyebrow} />
            ) : (
              <Text style={[styles.eyebrow, { color: config.accent }]}>
                {config.eyebrow}
              </Text>
            )}
            <Text
              accessibilityRole="header"
              style={[styles.headline, isMobile && styles.headlineMobile]}
            >
              {config.headline}
            </Text>
            <View style={styles.accentRule}>
              {config.usesConnectionGradient ? (
                <ConnectionAccentRule />
              ) : (
                <View style={[styles.accentRuleSolid, { backgroundColor: config.accent }]} />
              )}
            </View>
            <Text style={styles.support}>{config.support}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={config.nameLabel}
              placeholder={config.namePlaceholder}
              value={name}
              onChangeText={(text) => {
                setName(text);
                clearFieldError('name');
              }}
              error={errors.name}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              required
              brandTypography
              focusColor={config.accent}
              focusGradientColors={
                config.usesConnectionGradient
                  ? [
                      theme.personas.artist.accentStart,
                      theme.personas.artist.accentEnd,
                    ]
                  : undefined
              }
              containerStyle={styles.input}
            />

            <Input
              label="EMAIL"
              placeholder="you@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearFieldError('email');
                if (duplicateEmail) setDuplicateEmail(false);
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              required
              brandTypography
              focusColor={config.accent}
              focusGradientColors={
                config.usesConnectionGradient
                  ? [
                      theme.personas.artist.accentStart,
                      theme.personas.artist.accentEnd,
                    ]
                  : undefined
              }
              containerStyle={styles.input}
            />
            {duplicateEmail ? (
              <TouchableOpacity
                style={styles.duplicateAction}
                onPress={goToLogin}
                accessibilityRole="button"
                accessibilityLabel="Sign in with this email instead"
              >
                <Text style={styles.duplicateActionText}>SIGN IN →</Text>
              </TouchableOpacity>
            ) : null}

            <Input
              label="PASSWORD"
              placeholder="Create a password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearFieldError('password');
              }}
              error={errors.password}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleSignup}
              required
              helperText="6+ characters"
              brandTypography
              focusColor={config.accent}
              focusGradientColors={
                config.usesConnectionGradient
                  ? [
                      theme.personas.artist.accentStart,
                      theme.personas.artist.accentEnd,
                    ]
                  : undefined
              }
              containerStyle={styles.input}
            />

            {formError ? (
              <Text style={styles.formError} accessibilityLiveRegion="polite">
                {formError}
              </Text>
            ) : null}

            {config.usesConnectionGradient ? (
              <ConnectionGradientButton
                title={config.cta}
                onPress={handleSignup}
                loading={loading}
                accessibilityLabel={`Create ${config.persona} account`}
              />
            ) : (
              <Button
                title={config.cta}
                onPress={handleSignup}
                loading={loading}
                disabled={loading}
                fullWidth
                size="large"
                style={[styles.cta, { backgroundColor: config.accent }] as any}
                accessibilityLabel={`Create ${config.persona} account`}
                accessibilityHint="Submits the account form"
                brandTypography
              />
            )}
          </View>

          <View style={styles.memberSection}>
            <Text style={styles.memberLabel}>ALREADY A MEMBER?</Text>
            <TouchableOpacity
              style={styles.signIn}
              onPress={goToLogin}
              accessibilityRole="button"
              accessibilityLabel="Sign in to MVPConnect"
            >
              {config.usesConnectionGradient ? (
                <ConnectionGradientSignInText />
              ) : (
                <Text style={[styles.signInText, { color: config.accent }]}>SIGN IN →</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.legal}>
            By creating an account, you agree to our{'\n'}
            <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
