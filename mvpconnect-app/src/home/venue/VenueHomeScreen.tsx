import React from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useGetSelfAccountQuery } from '../../onboarding/onboardingApi';
import { theme } from '../../theme/theme';
import { AttentionSection } from '../shared/AttentionSection';
import { HomeHeader, getGreetingForHour } from '../shared/HomeHeader';
import { HomeIdentityError } from '../shared/HomeIdentityError';
import { HomeShell } from '../shared/HomeShell';

type Props = StackScreenProps<RootStackParamList, 'VenueHome'>;

export const VenueHomeScreen: React.FC<Props> = () => {
  const selfQuery = useGetSelfAccountQuery();
  const venueIdentity = selfQuery.data?.persona === 'VENUE' ? selfQuery.data : undefined;
  const identityLoading = selfQuery.isLoading && !selfQuery.data;
  const identityError = selfQuery.isError
    || Boolean(selfQuery.data && selfQuery.data.persona !== 'VENUE');
  const greeting = getGreetingForHour(new Date().getHours());

  return (
    <HomeShell>
      <HomeHeader
        contextLabel="VENUE"
        greeting={greeting}
        displayName={venueIdentity?.displayName}
        profileImageUrl={venueIdentity?.profileImage?.url}
        supportingCopy="Here’s what’s happening with your room."
        avatarTestIDPrefix="venue-home"
        loading={identityLoading}
        accentStart={theme.personas.venue.accent}
        accentEnd={theme.personas.venue.accent}
        avatarBorderColor={theme.colors.venueBorder}
      />

      {identityError ? (
        <HomeIdentityError
          personaLabel="Venue"
          retrying={selfQuery.isFetching}
          onRetry={() => void selfQuery.refetch()}
        />
      ) : null}

      <AttentionSection />
    </HomeShell>
  );
};
