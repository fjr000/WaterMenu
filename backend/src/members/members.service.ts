import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, workspaceId: string) {
    // Get current user's role in this workspace
    const currentMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      select: { role: true },
    });

    if (!currentMembership) {
      throw new UnauthorizedException();
    }

    // Get all members in this workspace
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
    });

    const isAdmin = currentMembership.role === UserRole.ADMIN;

    return members.map((member) => {
      const result: {
        id: string;
        name: string;
        role: UserRole;
        createdAt: Date;
        email?: string;
      } = {
        id: member.user.id,
        name: member.user.name,
        role: member.role,
        createdAt: member.user.createdAt,
      };

      if (isAdmin) {
        result.email = member.user.email;
      }

      return result;
    });
  }
}
