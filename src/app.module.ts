import { Module } from '@nestjs/common';
import { AppController } from './domains/app.controller';
import { AppService } from './domains/app.service';
import { AuthModule } from './domains/auth/auth.module';
import { RecipeModule } from './domains/recipes/recipe.module';
import { UsersModule } from './domains/users/users.module';

@Module({
  imports: [UsersModule, RecipeModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
