export type AuthenticatedPersona = 'MUSICIAN' | 'VENUE' | 'PROMOTER';

export interface AuthenticatedHomeIdentity {
  id: string;
  displayName: string;
  persona: AuthenticatedPersona;
}

export type AuthenticatedHomeRoute =
  | { name: 'ArtistHome' }
  | {
      name: 'MusicianHome';
      params: {
        userId: string;
        userName: string;
        userType: AuthenticatedPersona;
      };
    };

/**
 * Resolves the completed-account destination without coupling callers to a
 * persona-specific screen. Venue and Promoter deliberately retain the legacy
 * destination until their dedicated Home compositions are implemented.
 */
export const resolveAuthenticatedHomeRoute = (
  identity: AuthenticatedHomeIdentity,
): AuthenticatedHomeRoute => {
  if (identity.persona === 'MUSICIAN') {
    return { name: 'ArtistHome' };
  }

  return {
    name: 'MusicianHome',
    params: {
      userId: identity.id,
      userName: identity.displayName,
      userType: identity.persona,
    },
  };
};
