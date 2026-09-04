import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { styles } from './ProfileScreen.styles';

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
        setLocation(profile.location?.displayName || '');
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

