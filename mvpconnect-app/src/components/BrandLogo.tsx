import React from 'react';
import { Image, Platform, View } from 'react-native';
import MVPConnectLogo from '../../assets/branding/mvpconnect-logo.svg';

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
    {Platform.OS === 'web' ? (
      <MVPConnectLogo width={width} height={height} />
    ) : (
      <Image
        source={nativeLogo}
        resizeMode="contain"
        style={{ width, height }}
      />
    )}
  </View>
);
