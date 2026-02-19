import { createHmac } from 'crypto';

export type UserRole = 'ADMIN' | 'USER';

export interface AuthTokenPayload {
  tenantId: string;
  userId: string;
  role: UserRole;
  exp: number;
}

function getSecret() {
  return process.env.AUTH_SECRET || 'dev-auth-secret';
}

function sign(input: string) {
  return createHmac('sha256', getSecret()).update(input).digest('base64url');
}

export function issueAuthToken(payload: AuthTokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  if (sign(body) !== signature) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuthTokenPayload;
    if (!parsed?.tenantId || !parsed?.userId || !parsed?.role || !parsed?.exp) return null;
    if (Date.now() >= parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}
