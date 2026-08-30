import { StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export const styles = StyleSheet.create({
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
