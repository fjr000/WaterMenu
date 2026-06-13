import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        workspaces: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const ok = await argon2.verify(user.passwordHash, password);

    if (!ok) {
      throw new UnauthorizedException();
    }

    // Get the first workspace (or could return all for user to choose)
    const firstMembership = user.workspaces[0];
    if (!firstMembership) {
      throw new UnauthorizedException('User is not a member of any workspace');
    }

    return this.toMe(user, firstMembership);
  }

  async getMe(userId: string, workspaceId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaces: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    // Find the specific workspace membership
    const membership = workspaceId
      ? user.workspaces.find((m) => m.workspaceId === workspaceId)
      : user.workspaces[0];

    if (!membership) {
      throw new UnauthorizedException('User is not a member of the specified workspace');
    }

    return this.toMe(user, membership);
  }

  private toMe(
    user: {
      id: string;
      email: string;
      name: string;
    },
    membership: {
      role: string;
      workspace: { id: string; name: string };
    },
  ) {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: membership.role,
      },
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
      },
    };
  }
}
