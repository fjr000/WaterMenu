import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { getSessionCookieName, getSessionCookieOptions } from '../session/session.config';

type SessionRequest = Request & {
  session: Request['session'] & {
    userId?: string;
    workspaceId?: string;
    regenerate: (callback: (error?: Error) => void) => void;
    destroy: (callback: (error?: Error) => void) => void;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto, @Req() request: SessionRequest) {
    const me = await this.authService.validateUser(body.email, body.password);

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

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() request: SessionRequest, @Res({ passthrough: true }) response: Response) {
    await new Promise<void>((resolve, reject) => {
      if (!request.session) {
        resolve();
        return;
      }

      request.session.destroy((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    response.clearCookie(getSessionCookieName(), getSessionCookieOptions());
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() request: SessionRequest) {
    return this.authService.getMe(request.session.userId!, request.session.workspaceId);
  }
}
