export type AuthenticatedPersona = 'MUSICIAN' | 'VENUE' | 'PROMOTER';

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
export const resolveAuthenticatedHomeRoute = (
  identity: AuthenticatedHomeIdentity,
): AuthenticatedHomeRoute => {
  if (identity.persona === 'MUSICIAN') {
    return { name: 'ArtistHome' };
  }

  if (identity.persona === 'VENUE') {
    return { name: 'VenueHome' };
  }

  return { name: 'PromoterHome' };
};
