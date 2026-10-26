import { Module } from '@nestjs/common';
import { OwnerEntitiesController } from './owner-entities.controller';
import { OwnerEntitiesService } from './owner-entities.service';

@Module({
  controllers: [OwnerEntitiesController],
  providers: [OwnerEntitiesService],
  exports: [OwnerEntitiesService],
})
export class OwnerEntitiesModule {}
