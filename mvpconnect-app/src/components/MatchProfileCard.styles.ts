import { StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export const styles = StyleSheet.create({
  card: {
    width: 300,
    overflow: 'hidden',
    backgroundColor: theme.colors.elevatedSurface,
    borderWidth: 1,
    borderRadius: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  cardCompact: {
    width: 300,
  },
  imageFrame: {
    height: 150,
    overflow: 'hidden',
    backgroundColor: theme.colors.secondaryBg,
  },
  imageFrameCompact: {
    height: 100,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    opacity: 0.72,
  },
  placeholderLight: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -28,
    top: -80,
    backgroundColor: theme.colors.warmWhite,
    opacity: 0.16,
  },
  placeholderShade: {
    position: 'absolute',
    width: 220,
    height: 140,
    left: -60,
    bottom: -78,
    backgroundColor: theme.colors.pageBg,
    transform: [{ rotate: '-12deg' }],
    opacity: 0.75,
  },
  placeholderLabel: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.sm,
    color: theme.colors.warmWhite,
    fontSize: theme.fontSizes.caption,
    fontWeight: '700',
    letterSpacing: 2.2,
    opacity: 0.72,
  },
  rolePill: {
    position: 'absolute',
    left: theme.spacing.md,
    top: theme.spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(12, 14, 19, 0.82)',
    borderWidth: 1,
    borderRadius: 2,
  },
  rolePillCompact: {
    left: 12,
    top: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  roleText: {
    fontFamily: theme.typography.fontFamily.bodySemiBold,
    fontSize: theme.fontSizes.caption,
    fontWeight: 'normal',
    letterSpacing: 1.5,
  },
  content: {
    padding: theme.spacing.md,
  },
  contentCompact: {
    padding: 12,
  },
  name: {
    fontFamily: theme.typography.fontFamily.displaySemiBold,
    color: theme.colors.primaryText,
    fontSize: theme.fontSizes.h3,
    fontWeight: 'normal',
    letterSpacing: -0.35,
    marginBottom: theme.spacing.xs,
  },
  nameCompact: {
    fontSize: 18,
  },
  details: {
    fontFamily: theme.typography.fontFamily.bodyRegular,
    color: theme.colors.secondaryText,
    fontSize: theme.fontSizes.bodySmall,
    marginBottom: 12,
  },
  detailsCompact: {
    marginBottom: theme.spacing.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    marginRight: theme.spacing.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: theme.colors.tagSurface,
    borderRadius: 2,
  },
  tagCompact: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  tagText: {
    fontFamily: theme.typography.fontFamily.bodySemiBold,
    color: theme.colors.mutedText,
    fontSize: theme.fontSizes.caption,
    fontWeight: 'normal',
  },
});
