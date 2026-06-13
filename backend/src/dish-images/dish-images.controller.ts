import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { createReadStream } from 'fs';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.guard';
import { DishImagesService } from './dish-images.service';

type SessionRequest = Request & {
  session: Request['session'] & {
    userId: string;
    workspaceId: string;
  };
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller()
@UseGuards(AuthGuard)
export class DishImagesController {
  constructor(private readonly dishImagesService: DishImagesService) {}

  @Get('dishes/:dishId/images')
  list(@Req() request: SessionRequest, @Param('dishId') dishId: string) {
    return this.dishImagesService.list(request.session.userId, request.session.workspaceId, dishId);
  }

  @Post('dishes/:dishId/images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    }),
  )
  upload(
    @Req() request: SessionRequest,
    @Param('dishId') dishId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.dishImagesService.upload(request.session.userId, request.session.workspaceId, dishId, file);
  }

  @Patch('dish-images/:id/cover')
  setCover(@Req() request: SessionRequest, @Param('id') id: string) {
    return this.dishImagesService.setCover(request.session.userId, request.session.workspaceId, id);
  }

  @Delete('dish-images/:id')
  delete(@Req() request: SessionRequest, @Param('id') id: string) {
    return this.dishImagesService.delete(request.session.userId, request.session.workspaceId, id);
  }

  @Get('dish-images/:id/file')
  async getFile(
    @Req() request: SessionRequest,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.dishImagesService.getFile(request.session.userId, request.session.workspaceId, id);

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', String(file.size));

    return new StreamableFile(createReadStream(file.path));
  }
}
