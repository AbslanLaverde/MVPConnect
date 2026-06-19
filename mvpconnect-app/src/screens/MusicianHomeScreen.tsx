import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { theme } from '../theme/theme';
import { musicianAPI, MusicianProfile, VenueMatch } from '../services/api';

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
  welcomeCard: {
    backgroundColor: theme.colors.secondaryBg,
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  welcomeTitle: {
    fontSize: theme.fontSizes.h2,
    fontWeight: 'bold',
    color: theme.colors.primaryText,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: theme.fontSizes.bodyRegular,
    color: theme.colors.secondaryText,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.secondaryBg,
    marginHorizontal: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statNumber: {
    fontSize: theme.fontSizes.h2,
    fontWeight: 'bold',
    color: theme.colors.primaryAccent,
  },
  statLabel: {
    fontSize: theme.fontSizes.caption,
    color: theme.colors.secondaryText,
    marginTop: theme.spacing.xs,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.h3,
    fontWeight: 'bold',
    color: theme.colors.primaryText,
  },
  sectionCount: {
    fontSize: theme.fontSizes.bodySmall,
    color: theme.colors.primaryAccent,
  },
  matchCard: {
    backgroundColor: theme.colors.secondaryBg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  venueName: {
    fontSize: theme.fontSizes.bodyLarge,
    fontWeight: '600',
    color: theme.colors.primaryText,
    flex: 1,
  },
  matchBadge: {
    backgroundColor: theme.colors.primaryAccent + '33',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.round,
  },
  matchBadgeText: {
    fontSize: theme.fontSizes.caption,
    color: theme.colors.primaryAccent,
    fontWeight: '600',
  },
  venueMeta: {
    fontSize: theme.fontSizes.bodySmall,
    color: theme.colors.secondaryText,
    marginTop: 2,
  },
  ambienceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  ambienceTag: {
    backgroundColor: theme.colors.tertiaryBg || '#333',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  ambienceText: {
    fontSize: theme.fontSizes.caption,
    color: theme.colors.secondaryText,
  },
  emptyCard: {
    backgroundColor: theme.colors.secondaryBg,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSizes.h3,
    fontWeight: 'bold',
    color: theme.colors.primaryText,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.fontSizes.bodyRegular,
    color: theme.colors.secondaryText,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyButton: {
    backgroundColor: theme.colors.primaryAccent,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  emptyButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSizes.bodyRegular,
  },
  actionsSection: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  primaryButton: {
    backgroundColor: theme.colors.primaryAccent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSizes.bodyLarge,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondaryBg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primaryAccent,
  },
  secondaryButtonText: {
    color: theme.colors.primaryAccent,
    fontWeight: '600',
    fontSize: theme.fontSizes.bodyLarge,
  },
});
