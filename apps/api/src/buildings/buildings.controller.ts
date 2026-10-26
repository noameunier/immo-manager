import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { z } from 'zod';
import {
  createBuildingSchema,
  queryBooleanSchema,
  updateBuildingSchema,
  uuidSchema,
  type CreateBuildingInput,
  type UpdateBuildingInput,
} from '@immo/shared';
import { CurrentAuth, type AuthContext, type AuthenticatedRequest } from '../common/current-auth.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { BuildingsService } from './buildings.service';

const listQuerySchema = z.object({
  entityId: uuidSchema.optional(),
  includeArchived: queryBooleanSchema,
  search: z.string().trim().max(120).optional(),
});

@Controller('buildings')
export class BuildingsController {
  constructor(private readonly service: BuildingsService) {}

  @Get()
  async list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(listQuerySchema))
    query: { entityId?: string; includeArchived?: boolean; search?: string },
  ) {
    return this.service.list(auth.user.id, query);
  }

  @Get(':id')
  async get(
    @CurrentAuth() auth: AuthContext,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
  ) {
    return this.service.get(auth.user.id, id);
  }

  @Post()
  @HttpCode(201)
  async create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createBuildingSchema)) body: CreateBuildingInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.create(auth.user.id, body, request);
  }

  @Patch(':id')
  async update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateBuildingSchema)) body: UpdateBuildingInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.update(auth.user.id, id, body, request);
  }

  @Delete(':id')
  @HttpCode(200)
  async archive(
    @CurrentAuth() auth: AuthContext,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.archive(auth.user.id, id, request);
  }

  @Post(':id/restore')
  @HttpCode(200)
  async restore(
    @CurrentAuth() auth: AuthContext,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.restore(auth.user.id, id, request);
  }
}
