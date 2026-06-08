import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { workspace: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const ok = await argon2.verify(user.passwordHash, password);

    if (!ok) {
      throw new UnauthorizedException();
    }

    return this.toMe(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { workspace: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.toMe(user);
  }

  private toMe(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    workspace: { id: string; name: string };
  }) {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      workspace: {
        id: user.workspace.id,
        name: user.workspace.name,
      },
    };
  }
}
