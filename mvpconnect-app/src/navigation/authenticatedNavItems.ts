import { resolveAuthenticatedHomeRoute } from './authenticatedRoutes';
import type { AuthenticatedHomeRoute, AuthenticatedPersona } from './authenticatedRoutes';

export interface AuthenticatedNavItem {
  key: 'home';
  label: string;
  available: boolean;
  resolve: (persona: AuthenticatedPersona) => AuthenticatedHomeRoute;
}

// Only implemented destinations belong here. No placeholder routes or permission engine.
export const homeNavItem: AuthenticatedNavItem = {
  key: 'home', label: 'Home', available: true,
  resolve: (persona) => resolveAuthenticatedHomeRoute({ persona }),
};
export const authenticatedNavItems: readonly AuthenticatedNavItem[] = [homeNavItem];
