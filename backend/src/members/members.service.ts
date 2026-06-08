import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { workspaceId: true, role: true },
    });

    if (!currentUser) {
      throw new UnauthorizedException();
    }

    const members = await this.prisma.user.findMany({
      where: { workspaceId: currentUser.workspaceId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return members.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      createdAt: member.createdAt,
      ...(currentUser.role === UserRole.ADMIN ? { email: member.email } : {}),
    }));
  }
}
