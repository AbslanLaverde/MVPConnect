import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../theme/theme';
import { musicianAPI, MusicianProfile } from '../services/api';

const GENRE_OPTIONS = [
  'Jazz', 'Blues', 'Rock', 'Classical', 'Electronic', 'Folk',
  'Indie', 'Pop', 'Soul', 'Funk', 'Alternative', 'Ambient',
  'Hip Hop', 'R&B', 'Country', 'Latin', 'Reggae', 'Metal',
];

const VIBE_OPTIONS = [
  'Energetic', 'Chill', 'Sophisticated', 'Raw', 'Romantic',
  'Dreamy', 'Elegant', 'Loud', 'Intimate', 'Upscale', 'Funky',
];

interface ProfileScreenProps {
  navigation: any;
  route: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, route }) => {
  const { userId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [vibes, setVibes] = useState<string[]>([]);
  const [minimumFee, setMinimumFee] = useState('');
  const [willingToTravel, setWillingToTravel] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const profile = await musicianAPI.getProfile(userId);
        setName(profile.name || '');
        setBio(profile.bio || '');
        setLocation(profile.location || '');
        setGenres(profile.genres || []);
        setVibes(profile.vibes || []);
        setMinimumFee(profile.minimumFee || '');
        setWillingToTravel(profile.willingToTravel || false);
        setWebsiteUrl(profile.websiteUrl || '');
        setInstagramHandle(profile.instagramHandle || '');
      } catch (error) {
        console.error('Failed to load profile:', error);
        Alert.alert('Error', 'Could not load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const toggleGenre = (genre: string) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const toggleVibe = (vibe: string) => {
    setVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await musicianAPI.updateProfile(userId, {
        bio,
        location,
        genres,
        vibes,
        minimumFee,
        willingToTravel,
        websiteUrl,
        instagramHandle,
      });
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primaryAccent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Name Display */}
        <View style={styles.nameSection}>
          <Text style={styles.nameEmoji}>🎸</Text>
          <Text style={styles.nameText}>{name}</Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About You</Text>

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={styles.textArea}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell venues about your music..."
            placeholderTextColor={theme.colors.disabledText}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Brooklyn, NY"
            placeholderTextColor={theme.colors.disabledText}
          />
        </View>

        {/* Genres */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Genres</Text>
          <Text style={styles.hint}>Select the genres you play</Text>
          <View style={styles.chipContainer}>
            {GENRE_OPTIONS.map((genre) => (
              <TouchableOpacity
                key={genre}
                style={[styles.chip, genres.includes(genre) && styles.chipActive]}
                onPress={() => toggleGenre(genre)}
              >
                <Text style={[styles.chipText, genres.includes(genre) && styles.chipTextActive]}>
                  {genre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Vibes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vibe</Text>
          <Text style={styles.hint}>Describe your performance style</Text>
          <View style={styles.chipContainer}>
            {VIBE_OPTIONS.map((vibe) => (
              <TouchableOpacity
                key={vibe}
                style={[styles.chip, vibes.includes(vibe) && styles.chipActive]}
                onPress={() => toggleVibe(vibe)}
              >
                <Text style={[styles.chipText, vibes.includes(vibe) && styles.chipTextActive]}>
                  {vibe}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Booking Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          <Text style={styles.label}>Minimum Fee</Text>
          <TextInput
            style={styles.input}
            value={minimumFee}
            onChangeText={setMinimumFee}
            placeholder="e.g. $500"
            placeholderTextColor={theme.colors.disabledText}
          />

          <TouchableOpacity
            style={[styles.toggleRow, willingToTravel && styles.toggleRowActive]}
            onPress={() => setWillingToTravel(!willingToTravel)}
          >
            <Text style={styles.toggleEmoji}>{willingToTravel ? '✅' : '❌'}</Text>
            <Text style={[styles.toggleText, willingToTravel && styles.toggleTextActive]}>
              Willing to travel for gigs
            </Text>
          </TouchableOpacity>
        </View>

        {/* Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Links</Text>

          <Text style={styles.label}>Website</Text>
          <TextInput
            style={styles.input}
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            placeholder="https://yoursite.com"
            placeholderTextColor={theme.colors.disabledText}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Instagram</Text>
          <TextInput
            style={styles.input}
            value={instagramHandle}
            onChangeText={setInstagramHandle}
            placeholder="@yourhandle"
            placeholderTextColor={theme.colors.disabledText}
            autoCapitalize="none"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>💾 Save Profile</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primaryBg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  nameSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.secondaryBg,
    marginBottom: theme.spacing.md,
  },
  nameEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  nameText: {
    fontSize: theme.fontSizes.h2,
    fontWeight: 'bold',
    color: theme.colors.primaryText,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.h3,
    fontWeight: 'bold',
    color: theme.colors.primaryText,
    marginBottom: theme.spacing.xs,
  },
  hint: {
    fontSize: theme.fontSizes.bodySmall,
    color: theme.colors.secondaryText,
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSizes.bodyRegular,
    color: theme.colors.primaryText,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.secondaryBg,
    color: theme.colors.primaryText,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSizes.bodyRegular,
    borderWidth: 2,
    borderColor: theme.colors.border,
    minHeight: 48,
  },
  textArea: {
    backgroundColor: theme.colors.secondaryBg,
    color: theme.colors.primaryText,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSizes.bodyRegular,
    borderWidth: 2,
    borderColor: theme.colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: theme.colors.secondaryBg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primaryAccent + '33',
    borderColor: theme.colors.primaryAccent,
  },
  chipText: {
    fontSize: theme.fontSizes.bodySmall,
    color: theme.colors.primaryText,
  },
  chipTextActive: {
    color: theme.colors.primaryAccent,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondaryBg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  toggleRowActive: {
    borderColor: theme.colors.success,
  },
  toggleEmoji: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  toggleText: {
    fontSize: theme.fontSizes.bodyRegular,
    color: theme.colors.primaryText,
  },
  toggleTextActive: {
    color: theme.colors.success,
  },
  saveButton: {
    backgroundColor: theme.colors.primaryAccent,
    marginHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSizes.bodyLarge,
  },
});
