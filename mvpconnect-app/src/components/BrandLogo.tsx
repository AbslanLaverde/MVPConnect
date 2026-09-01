import React from 'react';
import { Image, View } from 'react-native';

const nativeLogo = require('../../assets/branding/mvpconnect-logo-native.png');

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
    <Image
      source={nativeLogo}
      resizeMode="contain"
      style={{ width, height }}
    />
  </View>
);
