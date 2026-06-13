import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { InvitesService } from './invites.service';

type SessionRequest = Request & {
  session: Request['session'] & {
    userId?: string;
    workspaceId?: string;
    regenerate: (callback: (error?: Error) => void) => void;
  };
};

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get()
  @UseGuards(AuthGuard)
  list(@Req() request: SessionRequest) {
    return this.invitesService.list(request.session.userId!, request.session.workspaceId!);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Req() request: SessionRequest) {
    return this.invitesService.create(request.session.userId!, request.session.workspaceId!, this.getOrigin(request));
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  revoke(@Req() request: SessionRequest, @Param('id') id: string) {
    return this.invitesService.revoke(request.session.userId!, request.session.workspaceId!, id);
  }

  @Get(':token/preview')
  preview(@Param('token') token: string) {
    return this.invitesService.preview(token);
  }

  @Post(':token/accept')
  @HttpCode(200)
  async accept(
    @Req() request: SessionRequest,
    @Param('token') token: string,
    @Body() body: AcceptInviteDto,
  ) {
    const me = await this.invitesService.accept(token, body, request.session.userId);

    await new Promise<void>((resolve, reject) => {
      request.session.regenerate((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        request.session.userId = me.user.id;
        request.session.workspaceId = me.workspace.id;
        resolve();
      });
    });

    return me;
  }

  private getOrigin(request: Request) {
    const headerOrigin = request.get('origin');
    if (headerOrigin) {
      return headerOrigin;
    }

    return `${request.protocol}://${request.get('host')}`;
  }
}
