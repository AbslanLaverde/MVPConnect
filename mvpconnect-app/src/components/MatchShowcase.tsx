import React from 'react';
import { Text, View } from 'react-native';
import { MatchProfileCard } from './MatchProfileCard';
import { styles } from './MatchShowcase.styles';

interface MatchShowcaseProps {
  compact?: boolean;
}

export const MatchShowcase: React.FC<MatchShowcaseProps> = ({ compact = false }) => {
  return (
    <View style={[styles.showcase, compact && styles.showcaseCompact]}>
      <View style={styles.glowBlue} />
      <View style={styles.glowViolet} />

      <View style={[styles.venueCard, compact && styles.venueCardCompact]}>
        <MatchProfileCard
          role="VENUE"
          name="The Marlowe Room"
          details="Lower East Side · 250 capacity"
          tags={['Indie Rock', 'Live Music']}
          imageSource={require('../../assets/matches/marlowe-room.jpg')}
          accent="violet"
          compact={compact}
        />
      </View>

      {compact ? (
        <View style={styles.connectBadgeCompact}>
          <ConnectBadge />
        </View>
      ) : (
        <View pointerEvents="none" style={styles.connectBadgeDesktop}>
          <ConnectBadge />
        </View>
      )}

      <View style={[styles.artistCard, compact && styles.artistCardCompact]}>
        <MatchProfileCard
          role="ARTIST"
          name="Glass Houses"
          details="Brooklyn · Draws 150–250"
          tags={['Indie Rock', 'Energetic']}
          imageSource={require('../../assets/matches/glass-houses.jpg')}
          accent="blue"
          compact={compact}
        />
      </View>
    </View>
  );
};

const ConnectBadge = () => (
  <View style={styles.connectBadge}>
    <Text style={styles.spark}>✦</Text>
    <Text style={styles.connectLabel}>MVP CONNECT</Text>
      <Text style={styles.spark2}>✦</Text>

      <Text style={styles.connectReasons}>Sound · Location · Draw</Text>
  </View>
);
