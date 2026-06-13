import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { imageSize } from 'image-size';
import heicConvert from 'heic-convert';
import { PrismaService } from '../prisma/prisma.service';

const MAX_IMAGES_PER_DISH = 9;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const IMAGE_TYPE_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

@Injectable()
export class DishImagesService {
  private readonly uploadsRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.uploadsRoot = path.resolve(configService.get<string>('UPLOADS_DIR') ?? 'uploads');
  }

  async list(userId: string, dishId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.ensureDish(workspaceId, dishId);

    const images = await this.prisma.dishImage.findMany({
      where: { workspaceId, dishId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return images.map((image) => this.toResponse(image));
  }

  async upload(userId: string, dishId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('缺少图片文件');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('仅支持 JPEG、PNG、WebP、HEIC 图片');
    }

    let processedBuffer = file.buffer;
    let processedMimeType = file.mimetype;
    let processedSize = file.size;

    if (file.mimetype === 'image/heic' || file.mimetype === 'image/heif') {
      try {
        const convertedBuffer = await heicConvert({
          buffer: file.buffer,
          format: 'JPEG',
          quality: 0.9,
        });
        processedBuffer = Buffer.from(convertedBuffer);
        processedMimeType = 'image/jpeg';
        processedSize = processedBuffer.length;
      } catch {
        throw new BadRequestException('HEIC 图片转换失败');
      }
    }

    const dimensions = this.readDimensions(processedBuffer, processedMimeType);
    const workspaceId = await this.getWorkspaceId(userId);
    await this.ensureDish(workspaceId, dishId);

    const extension = this.getExtension(dimensions.mimeType);
    const storageKey = path.posix.join('dish-images', workspaceId, dishId, `${randomUUID()}.${extension}`);
    const absolutePath = this.getAbsolutePath(storageKey);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, processedBuffer);

    try {
      const image = await this.prisma.$transaction(async (tx) => {
        const count = await tx.dishImage.count({ where: { workspaceId, dishId } });
        if (count >= MAX_IMAGES_PER_DISH) {
          throw new BadRequestException(`每道菜最多上传 ${MAX_IMAGES_PER_DISH} 张图片`);
        }

        return tx.dishImage.create({
          data: {
            workspaceId,
            dishId,
            storageKey,
            mimeType: dimensions.mimeType,
            size: processedSize,
            width: dimensions.width,
            height: dimensions.height,
            sortOrder: count,
            isCover: count === 0,
          },
        });
      });

      return this.toResponse(image);
    } catch (error) {
      await this.deleteFileQuietly(absolutePath);
      throw error;
    }
  }

  async setCover(userId: string, id: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const image = await this.findImage(workspaceId, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.dishImage.updateMany({
        where: { workspaceId, dishId: image.dishId, isCover: true },
        data: { isCover: false },
      });

      return tx.dishImage.update({
        where: { id: image.id },
        data: { isCover: true },
      });
    });

    return this.toResponse(updated);
  }

  async delete(userId: string, id: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const image = await this.findImage(workspaceId, id);
    const absolutePath = this.getAbsolutePath(image.storageKey);

    await this.prisma.$transaction(async (tx) => {
      await tx.dishImage.delete({ where: { id: image.id } });

      if (image.isCover) {
        const nextCover = await tx.dishImage.findFirst({
          where: { workspaceId, dishId: image.dishId },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });

        if (nextCover) {
          await tx.dishImage.update({
            where: { id: nextCover.id },
            data: { isCover: true },
          });
        }
      }
    });

    await this.deleteFileQuietly(absolutePath);

    return { ok: true };
  }

  async getFile(userId: string, id: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const image = await this.findImage(workspaceId, id);
    const absolutePath = this.getAbsolutePath(image.storageKey);

    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException();
    }

    return {
      path: absolutePath,
      mimeType: image.mimeType,
      size: image.size,
    };
  }

  private readDimensions(buffer: Buffer, mimeType: string) {
    try {
      const dimensions = imageSize(buffer);
      const actualMimeType = dimensions.type ? IMAGE_TYPE_TO_MIME[dimensions.type] : undefined;

      if (!dimensions.width || !dimensions.height || !actualMimeType || actualMimeType !== mimeType) {
        throw new BadRequestException('图片格式不符合要求');
      }

      return {
        width: dimensions.width,
        height: dimensions.height,
        mimeType: actualMimeType,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('无法读取图片尺寸');
    }
  }

  private getExtension(mimeType: string) {
    if (mimeType === 'image/jpeg') {
      return 'jpg';
    }
    if (mimeType === 'image/png') {
      return 'png';
    }
    return 'webp';
  }

  private async ensureDish(workspaceId: string, dishId: string) {
    const dish = await this.prisma.dish.findFirst({
      where: { id: dishId, workspaceId },
      select: { id: true },
    });

    if (!dish) {
      throw new NotFoundException();
    }
  }

  private async findImage(workspaceId: string, id: string) {
    const image = await this.prisma.dishImage.findFirst({
      where: { id, workspaceId },
    });

    if (!image) {
      throw new NotFoundException();
    }

    return image;
  }

  private async getWorkspaceId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { workspaceId: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user.workspaceId;
  }

  private getAbsolutePath(storageKey: string) {
    const absolutePath = path.resolve(this.uploadsRoot, storageKey);

    if (!absolutePath.startsWith(`${this.uploadsRoot}${path.sep}`)) {
      throw new BadRequestException('图片路径非法');
    }

    return absolutePath;
  }

  private async deleteFileQuietly(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch {
      // 文件缺失不阻断数据库结果。
    }
  }

  private toResponse(image: Prisma.DishImageGetPayload<object>) {
    return {
      ...image,
      fileUrl: `/api/dish-images/${image.id}/file`,
    };
  }
}
