// The browser owns the HttpOnly cookie. No getter, setter, or JavaScript secret storage exists.
export const credentialStore = { kind: 'web' } as const;
