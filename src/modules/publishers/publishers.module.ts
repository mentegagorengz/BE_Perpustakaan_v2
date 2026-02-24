// src/modules/publishers/publishers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublishersService } from './publishers.service';
import { PublishersController } from './publishers.controller';
import { Publisher } from './entities/publisher.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Publisher])],
  controllers: [PublishersController],
  providers: [PublishersService],
  exports: [PublishersService],
})
export class PublishersModule {}
