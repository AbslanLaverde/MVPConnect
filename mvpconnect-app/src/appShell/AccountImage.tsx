import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { styles } from './AuthenticatedApp.styles';

export const accountInitials = (name?: string): string =>
  name?.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word.charAt(0)).join('').toUpperCase() ?? '';

export const AccountImage = ({ name, url, testID }: { name?: string; url?: string; testID: string }) => {
  const [failedUrl, setFailedUrl] = useState<string>();
  if (url && url !== failedUrl) return <Image testID={`${testID}-image`} source={{ uri: url }}
    resizeMode="cover" style={styles.avatar} accessible={false} onError={() => setFailedUrl(url)} />;
  const initials = accountInitials(name);
  return <View testID={`${testID}-${initials ? 'initials' : 'neutral'}`} style={styles.avatar}
    aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {initials ? <Text style={styles.initials}>{initials}</Text> : null}
  </View>;
};
