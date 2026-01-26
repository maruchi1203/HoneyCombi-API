import { Module } from '@nestjs/common';
import { AppController } from './domains/app.controller';
import { AppService } from './domains/app.service';
import { AuthModule } from './domains/auth/auth.module';
import { PostsModule } from './domains/posts/posts.module';
import { UsersModule } from './domains/users/users.module';

@Module({
  imports: [UsersModule, PostsModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
