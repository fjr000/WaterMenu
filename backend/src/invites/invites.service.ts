import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';

const INVITE_DAYS = 7;
const INVITE_TTL_MS = INVITE_DAYS * 24 * 60 * 60 * 1000;
const MAX_PENDING_INVITES = 10;

type InviteReason = 'EXPIRED' | 'USED' | 'REVOKED' | 'UNAVAILABLE';

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, workspaceId: string) {
    await this.requireAdmin(userId, workspaceId);
    const now = new Date();

    return this.prisma.workspaceInvite.findMany({
      where: this.pendingInviteWhere(workspaceId, now),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
      },
    });
  }

  async create(userId: string, workspaceId: string, origin: string) {
    await this.requireAdmin(userId, workspaceId);
    const now = new Date();
    const pendingCount = await this.prisma.workspaceInvite.count({
      where: this.pendingInviteWhere(workspaceId, now),
    });

    if (pendingCount >= MAX_PENDING_INVITES) {
      throw new ConflictException('待处理邀请已达到上限');
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    const invite = await this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        createdByUserId: userId,
        tokenHash,
        expiresAt,
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return {
      ...invite,
      inviteLink: `${origin}/invite/${token}`,
    };
  }

  async revoke(userId: string, workspaceId: string, id: string) {
    await this.requireAdmin(userId, workspaceId);
    const invite = await this.prisma.workspaceInvite.findFirst({
      where: {
        id,
        ...this.pendingInviteWhere(workspaceId),
      },
      select: { id: true },
    });

    if (!invite) {
      throw new NotFoundException();
    }

    await this.prisma.workspaceInvite.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }

  async preview(token: string) {
    const invite = await this.findInviteByToken(token);
    const reason = this.getInvalidReason(invite);

    if (!invite || reason) {
      return {
        canAccept: false,
        reason: reason ?? 'UNAVAILABLE',
      };
    }

    return {
      canAccept: true,
      workspaceName: invite.workspace.name,
      expiresAt: invite.expiresAt,
    };
  }

  async accept(token: string, body: AcceptInviteDto, loggedInUserId?: string) {
    if (loggedInUserId) {
      throw new ConflictException('请先退出当前账号，再接受邀请');
    }

    const tokenHash = this.hashToken(token);
    const email = body.email.toLowerCase();
    const name = body.name.trim();

    if (!name) {
      throw new BadRequestException('姓名不能为空');
    }

    const passwordHash = await argon2.hash(body.password);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const invite = await tx.workspaceInvite.findUnique({
          where: { tokenHash },
          include: { workspace: true },
        });
        const reason = this.getInvalidReason(invite);

        if (!invite || reason) {
          throw new BadRequestException(reason ?? 'UNAVAILABLE');
        }

        const user = await tx.user.create({
          data: {
            email,
            name,
            passwordHash,
          },
        });

        // Create workspace membership
        await tx.workspaceMember.create({
          data: {
            userId: user.id,
            workspaceId: invite.workspaceId,
            role: UserRole.MEMBER,
          },
        });

        const usedAt = new Date();
        const updateResult = await tx.workspaceInvite.updateMany({
          where: {
            id: invite.id,
            workspaceId: invite.workspaceId,
            usedAt: null,
            revokedAt: null,
            expiresAt: { gt: usedAt },
          },
          data: {
            usedAt,
            usedByUserId: user.id,
          },
        });

        if (updateResult.count !== 1) {
          throw new BadRequestException('UNAVAILABLE');
        }

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: UserRole.MEMBER,
          },
          workspace: {
            id: invite.workspace.id,
            name: invite.workspace.name,
          },
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('邮箱已被使用');
      }

      throw error;
    }
  }

  private pendingInviteWhere(workspaceId: string, now = new Date()) {
    return {
      workspaceId,
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
    };
  }

  private async requireAdmin(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      throw new UnauthorizedException();
    }

    if (membership.role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
  }

  private async findInviteByToken(token: string) {
    return this.prisma.workspaceInvite.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { workspace: true },
    });
  }

  private getInvalidReason(
    invite:
      | {
          usedAt: Date | null;
          revokedAt: Date | null;
          expiresAt: Date;
        }
      | null,
  ): InviteReason | null {
    if (!invite) {
      return 'UNAVAILABLE';
    }

    if (invite.revokedAt) {
      return 'REVOKED';
    }

    if (invite.usedAt) {
      return 'USED';
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      return 'EXPIRED';
    }

    return null;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
