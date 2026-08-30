import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { theme } from '../theme/theme';
import { musicianAPI, MusicianProfile, VenueMatch } from '../services/api';
import { styles } from './MusicianHomeScreen.styles';

interface MusicianHomeScreenProps {
  navigation: any;
  route: any;
}

export const MusicianHomeScreen: React.FC<MusicianHomeScreenProps> = ({ navigation, route }) => {
  const { userId, userName } = route.params || {};
  const [profile, setProfile] = useState<MusicianProfile | null>(null);
  const [matches, setMatches] = useState<VenueMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [profileData, matchData] = await Promise.all([
        musicianAPI.getProfile(userId),
        musicianAPI.getVenueMatches(userId),
      ]);
      setProfile(profileData);
      setMatches(matchData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload when coming back from profile edit
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primaryAccent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Header */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeEmoji}>🎵</Text>
        <Text style={styles.welcomeTitle}>Welcome back, {profile?.name || userName}!</Text>
        <Text style={styles.welcomeSubtitle}>
          {profile?.location || 'Set your location'} • {profile?.genres?.join(', ') || 'Add genres'}
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{matches.length}</Text>
          <Text style={styles.statLabel}>Venue Matches</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{profile?.genres?.length || 0}</Text>
          <Text style={styles.statLabel}>Genres</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{profile?.minimumFee || '—'}</Text>
          <Text style={styles.statLabel}>Min Fee</Text>
        </View>
      </View>

      {/* Matched Venues */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Venue Matches</Text>
          {matches.length > 0 && (
            <Text style={styles.sectionCount}>{matches.length} found</Text>
          )}
        </View>

        {matches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎤</Text>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyText}>
              Add your genres in your profile to get matched with venues that book your style
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Profile', { userId, userName })}
            >
              <Text style={styles.emptyButtonText}>Complete Your Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          matches.slice(0, 10).map((venue) => (
            <View key={venue.id} style={styles.matchCard}>
              <View style={styles.matchHeader}>
                <Text style={styles.venueName}>{venue.venueName}</Text>
                <View style={styles.matchBadge}>
                  <Text style={styles.matchBadgeText}>{venue.matchScore}</Text>
                </View>
              </View>
              <Text style={styles.venueMeta}>
                {venue.location} • Capacity: {venue.capacity}
              </Text>
              <Text style={styles.venueMeta}>
                Genres: {venue.genrePreferences?.join(', ')}
              </Text>
              {venue.typicalBudget && (
                <Text style={styles.venueMeta}>Budget: {venue.typicalBudget}</Text>
              )}
              <View style={styles.ambienceRow}>
                {venue.ambience?.map((a, i) => (
                  <View key={i} style={styles.ambienceTag}>
                    <Text style={styles.ambienceText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Profile', { userId, userName })}
        >
          <Text style={styles.primaryButtonText}>✏️ Edit Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

