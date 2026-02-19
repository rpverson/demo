import { createHmac } from 'crypto';

export interface CollabTokenPayload {
  tenantId: string;
  callId: string;
  ownerUserId: string;
  exp: number;
}

function getSecret() {
  return process.env.COLLAB_SECRET || process.env.AUTH_SECRET || 'dev-auth-secret';
}

function sign(input: string) {
  return createHmac('sha256', getSecret()).update(input).digest('base64url');
}

export function issueCollabToken(payload: CollabTokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifyCollabToken(token: string): CollabTokenPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  if (sign(body) !== signature) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as CollabTokenPayload;
    if (!parsed?.tenantId || !parsed?.callId || !parsed?.ownerUserId || !parsed?.exp) return null;
    if (Date.now() >= parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}
