import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RecipeModule } from './domains/recipes/recipe.module';
import { UsersModule } from './domains/users/users.module';
import { DatabaseModule } from './common/database/database.module';

@Module({
  imports: [DatabaseModule, UsersModule, RecipeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
