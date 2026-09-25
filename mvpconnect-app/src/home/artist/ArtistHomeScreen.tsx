import React from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import type { AuthenticatedStackParamList } from '../../navigation/authenticatedRoutes';
import { useGetSelfAccountQuery } from '../../onboarding/onboardingApi';
import { AttentionSection } from '../shared/AttentionSection';
import { HomeHeader, getGreetingForHour } from '../shared/HomeHeader';
import { HomeIdentityError } from '../shared/HomeIdentityError';
import { HomeShell } from '../shared/HomeShell';

type Props = StackScreenProps<AuthenticatedStackParamList, 'ArtistHome'>;

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
        avatarTestIDPrefix="artist-home"
        loading={identityLoading}
      />

      {identityError ? (
        <HomeIdentityError
          personaLabel="Artist"
          retrying={selfQuery.isFetching}
          onRetry={() => void selfQuery.refetch()}
        />
      ) : null}

      <AttentionSection />
    </HomeShell>
  );
};
