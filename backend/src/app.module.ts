import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DishesModule } from './dishes/dishes.module';
import { FeedbackModule } from './feedback/feedback.module';
import { MealRecordsModule } from './meal-records/meal-records.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DishesModule,
    MealRecordsModule,
    FeedbackModule,
  ],
})
export class AppModule {}
