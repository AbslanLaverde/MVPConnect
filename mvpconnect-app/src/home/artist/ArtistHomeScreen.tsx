import React from 'react';
import { Text, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { Button } from '../../components/Button';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useGetSelfAccountQuery } from '../../onboarding/onboardingApi';
import { AttentionSection } from '../shared/AttentionSection';
import { HomeHeader, getGreetingForHour } from '../shared/HomeHeader';
import { HomeShell } from '../shared/HomeShell';
import { artistHomeStyles } from './ArtistHomeScreen.styles';

type Props = StackScreenProps<RootStackParamList, 'ArtistHome'>;

export const ArtistHomeScreen: React.FC<Props> = () => {
  const selfQuery = useGetSelfAccountQuery();
  const artistIdentity = selfQuery.data?.persona === 'MUSICIAN' ? selfQuery.data : undefined;
  const identityLoading = selfQuery.isLoading && !selfQuery.data;
  const identityError = selfQuery.isError
    || Boolean(selfQuery.data && selfQuery.data.persona !== 'MUSICIAN');
  const greeting = getGreetingForHour(new Date().getHours());

  return (
    <HomeShell>
      <HomeHeader
        contextLabel="ARTIST"
        greeting={greeting}
        displayName={artistIdentity?.displayName}
        profileImageUrl={artistIdentity?.profileImage?.url}
        supportingCopy="Here’s what’s happening around your music career."
        loading={identityLoading}
      />

      {identityError ? (
        <View style={artistHomeStyles.errorState} accessible accessibilityRole="alert">
          <Text style={artistHomeStyles.errorTitle}>WE COULDN’T LOAD YOUR HOME</Text>
          <Text style={artistHomeStyles.errorBody}>Try again.</Text>
          <Button
            title="RETRY"
            onPress={() => void selfQuery.refetch()}
            loading={selfQuery.isFetching}
            disabled={selfQuery.isFetching}
            accessibilityLabel="Retry loading Artist Home"
            style={artistHomeStyles.retry}
            brandTypography
          />
        </View>
      ) : null}

      <AttentionSection />
    </HomeShell>
  );
};
