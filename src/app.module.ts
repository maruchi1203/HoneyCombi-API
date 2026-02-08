import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RecipeModule } from './domains/recipes/recipe.module';
import { UsersModule } from './domains/users/users.module';

@Module({
  imports: [UsersModule, RecipeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
