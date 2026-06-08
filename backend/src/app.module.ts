import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DishImagesModule } from './dish-images/dish-images.module';
import { DishesModule } from './dishes/dishes.module';
import { FeedbackModule } from './feedback/feedback.module';
import { InvitesModule } from './invites/invites.module';
import { MealRecordsModule } from './meal-records/meal-records.module';
import { MembersModule } from './members/members.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecipesModule } from './recipes/recipes.module';
import { RecommendationsModule } from './recommendations/recommendations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DishesModule,
    DishImagesModule,
    MealRecordsModule,
    FeedbackModule,
    RecipesModule,
    MembersModule,
    InvitesModule,
    RecommendationsModule,
  ],
})
export class AppModule {}
