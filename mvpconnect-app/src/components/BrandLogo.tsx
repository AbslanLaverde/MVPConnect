import React from 'react';
import { View } from 'react-native';
import MVPConnectLogo from '../../assets/branding/mvpconnect-logo.svg';

interface BrandLogoProps {
  width?: number;
  height?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  width = 180,
  height = 38,
}) => (
  <View
    accessibilityRole="image"
    accessibilityLabel="MVPConnect"
    style={{ width, height }}
  >
    <MVPConnectLogo width={width} height={height} />
  </View>
);
