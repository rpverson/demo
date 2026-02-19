import { Injectable, UnauthorizedException } from '@nestjs/common';
import { issueAuthToken, UserRole } from '../../common/auth-token';
import { LoginDto } from './dto';

@Injectable()
export class AuthService {
  login(dto: LoginDto) {
    const username = dto.username.trim();
    const password = dto.password;
    const tenantId = dto.tenantId?.trim() || 'demo-tenant';

    const adminUsername = process.env.AUTH_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.AUTH_ADMIN_PASSWORD || 'admin123';
    const userUsername = process.env.AUTH_USER_USERNAME || 'usuario';
    const userPassword = process.env.AUTH_USER_PASSWORD || 'user123';
    const ttlMs = (Number(process.env.AUTH_TOKEN_TTL_SECONDS || 43200) || 43200) * 1000;

    let role: UserRole | null = null;
    if (username === adminUsername && password === adminPassword) role = 'ADMIN';
    if (username === userUsername && password === userPassword) role = 'USER';
    if (!role) throw new UnauthorizedException('Credenciales invalidas');

    const token = issueAuthToken({
      tenantId,
      userId: username,
      role,
      exp: Date.now() + ttlMs,
    });

    return {
      token,
      role,
      tenantId,
      userId: username,
      expiresInSeconds: Math.floor(ttlMs / 1000),
    };
  }
}
