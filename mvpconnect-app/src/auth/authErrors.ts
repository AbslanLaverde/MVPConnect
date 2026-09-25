export class StaleSessionError extends Error {
  constructor() { super('This request belongs to a previous session.'); this.name = 'StaleSessionError'; }
}

/** No Axios request config, body, headers, native credential or raw server error is retained. */
export class AuthRequestError extends Error {
  readonly response: { status?: number; data: { code: string; message: string } };
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'AuthRequestError';
    this.response = { status, data: { code, message } };
  }
}

export const isTerminalRefreshError = (error: unknown): boolean =>
  error instanceof AuthRequestError && error.response.status === 401
    && error.response.data.code === 'SESSION_INVALID';
