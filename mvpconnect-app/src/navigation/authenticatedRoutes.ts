export type AuthenticatedPersona = 'MUSICIAN' | 'VENUE' | 'PROMOTER';

export interface AuthenticatedHomeIdentity {
  id: string;
  displayName: string;
  persona: AuthenticatedPersona;
}

export type AuthenticatedHomeRoute =
  | { name: 'ArtistHome' }
  | { name: 'VenueHome' }
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
 * persona-specific screen. Promoter deliberately retains the legacy
 * destination until its dedicated Home composition is implemented.
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

  return {
    name: 'MusicianHome',
    params: {
      userId: identity.id,
      userName: identity.displayName,
      userType: identity.persona,
    },
  };
};
