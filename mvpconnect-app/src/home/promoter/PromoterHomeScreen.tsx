import React from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import type { AuthenticatedStackParamList } from '../../navigation/authenticatedRoutes';
import { useGetSelfAccountQuery } from '../../onboarding/onboardingApi';
import { theme } from '../../theme/theme';
import { AttentionSection } from '../shared/AttentionSection';
import { HomeHeader, getGreetingForHour } from '../shared/HomeHeader';
import { HomeIdentityError } from '../shared/HomeIdentityError';
import { HomeShell } from '../shared/HomeShell';

type Props = StackScreenProps<AuthenticatedStackParamList, 'PromoterHome'>;

export const PromoterHomeScreen: React.FC<Props> = () => {
  const selfQuery = useGetSelfAccountQuery();
  const promoterIdentity = selfQuery.data?.persona === 'PROMOTER' ? selfQuery.data : undefined;
  const identityLoading = selfQuery.isLoading && !selfQuery.data;
  const identityError = selfQuery.isError
    || Boolean(selfQuery.data && selfQuery.data.persona !== 'PROMOTER');
  const greeting = getGreetingForHour(new Date().getHours());

  return (
    <HomeShell>
      <HomeHeader
        contextLabel="PROMOTER"
        greeting={greeting}
        displayName={promoterIdentity?.displayName}
        profileImageUrl={promoterIdentity?.profileImage?.url}
        supportingCopy="Here’s what’s happening across your network."
        avatarTestIDPrefix="promoter-home"
        loading={identityLoading}
        accentStart={theme.personas.promoter.accent}
        accentEnd={theme.personas.promoter.accent}
        avatarBorderColor={theme.colors.promoterBorder}
      />

      {identityError ? (
        <HomeIdentityError
          personaLabel="Promoter"
          retrying={selfQuery.isFetching}
          onRetry={() => void selfQuery.refetch()}
        />
      ) : null}

      <AttentionSection />
    </HomeShell>
  );
};
