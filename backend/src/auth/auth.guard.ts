import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionData } from './session.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const session = request.session as SessionData | undefined;

    if (!session?.userId) {
      throw new UnauthorizedException();
    }

    if (!session.workspaceId) {
      // Get user's first workspace
      const membership = await this.prisma.workspaceMember.findFirst({
        where: { userId: session.userId },
        select: { workspaceId: true },
      });

      if (!membership) {
        throw new UnauthorizedException('User is not a member of any workspace');
      }

      session.workspaceId = membership.workspaceId;
    }

    return true;
  }
}
