import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole, verifyAuthToken } from './auth-token';

export interface RequestContext {
  tenantId: string;
  userId: string;
  role: UserRole;
}

export function getRequestContext(headers: Record<string, string | string[] | undefined>): RequestContext {
  const authToken = (headers['x-auth-token'] as string) || '';
  if (!authToken) {
    throw new UnauthorizedException('Missing required header: x-auth-token');
  }

  const token = verifyAuthToken(authToken);
  if (!token) {
    throw new UnauthorizedException('Invalid or expired auth token');
  }

  if (!token.tenantId || !token.userId) {
    throw new BadRequestException('Invalid auth token payload');
  }

  return { tenantId: token.tenantId, userId: token.userId, role: token.role };
}

export function assertRole(ctx: RequestContext, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(ctx.role)) {
    throw new ForbiddenException(`Role ${ctx.role} is not allowed for this operation`);
  }
}
