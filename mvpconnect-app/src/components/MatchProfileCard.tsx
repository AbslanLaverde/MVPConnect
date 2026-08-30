import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Text,
  View,
} from 'react-native';
import { theme } from '../theme/theme';
import { styles } from './MatchProfileCard.styles';

interface MatchProfileCardProps {
  role: 'ARTIST' | 'VENUE';
  name: string;
  details: string;
  tags: string[];
  imageSource?: ImageSourcePropType;
  accent: 'blue' | 'violet';
  compact?: boolean;
}

export const MatchProfileCard: React.FC<MatchProfileCardProps> = ({
  role,
  name,
  details,
  tags,
  imageSource,
  accent,
  compact = false,
}) => {
  const accentColor =
    accent === 'blue' ? theme.colors.connectionBlue : theme.colors.connectionViolet;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={[styles.imageFrame, compact && styles.imageFrameCompact]}>
        {imageSource ? (
          <Image source={imageSource} resizeMode="cover" style={styles.image} />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: accentColor }]}>
            <View style={styles.placeholderLight} />
            <View style={styles.placeholderShade} />
            <Text style={styles.placeholderLabel}>{role}</Text>
          </View>
        )}
        <View
          style={[
            styles.rolePill,
            compact && styles.rolePillCompact,
            { borderColor: accentColor },
          ]}
        >
          <Text style={styles.roleText}>{role}</Text>
        </View>
      </View>

      <View style={[styles.content, compact && styles.contentCompact]}>
        <Text numberOfLines={1} style={[styles.name, compact && styles.nameCompact]}>
          {name}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.details, compact && styles.detailsCompact]}
        >
          {details}
        </Text>
        <View style={styles.tags}>
          {tags.map((tag) => (
            <View key={tag} style={[styles.tag, compact && styles.tagCompact]}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};
