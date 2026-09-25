export type AuthenticatedPersona = 'MUSICIAN' | 'VENUE' | 'PROMOTER';

export type AuthenticatedStackParamList = {
  ArtistHome: undefined;
  VenueHome: undefined;
  PromoterHome: undefined;
};

export interface AuthenticatedHomeIdentity {
  id: string;
  displayName: string;
  persona: AuthenticatedPersona;
}

export type AuthenticatedHomeRoute =
  | { name: 'ArtistHome' }
  | { name: 'VenueHome' }
  | { name: 'PromoterHome' };

/**
 * Resolves the completed-account destination without coupling callers to a
 * persona-specific caller logic.
 */
export const resolveAuthenticatedHomeRoute = <Identity extends Pick<AuthenticatedHomeIdentity, 'persona'>>(
  identity: Identity,
): AuthenticatedHomeRoute => {
  if (identity.persona === 'MUSICIAN') {
    return { name: 'ArtistHome' };
  }

  if (identity.persona === 'VENUE') {
    return { name: 'VenueHome' };
  }

  return { name: 'PromoterHome' };
};

/** All completed-account entry points use this one root/child boundary. */
export const authenticatedAppRoute = (home: AuthenticatedHomeRoute) => ({
  name: 'AuthenticatedApp' as const,
  params: { screen: home.name },
});
