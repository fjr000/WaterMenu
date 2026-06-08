import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { MembersService } from './members.service';

type SessionRequest = Request & {
  session: Request['session'] & {
    userId: string;
  };
};

@Controller('members')
@UseGuards(AuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  list(@Req() request: SessionRequest) {
    return this.membersService.list(request.session.userId);
  }
}
