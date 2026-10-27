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
  createLeaseSchema,
  leaseStatusSchema,
  queryBooleanSchema,
  updateLeaseSchema,
  uuidSchema,
  type CreateLeaseInput,
  type LeaseListQuery,
  type UpdateLeaseInput,
} from '@immo/shared';
import {
  CurrentAuth,
  type AuthContext,
  type AuthenticatedRequest,
} from '../common/current-auth.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LeasesService } from './leases.service';

const listQuerySchema = z.object({
  entityId: uuidSchema.optional(),
  propertyId: uuidSchema.optional(),
  tenantId: uuidSchema.optional(),
  status: leaseStatusSchema.optional(),
  archived: queryBooleanSchema,
});

@Controller('leases')
export class LeasesController {
  constructor(private readonly service: LeasesService) {}

  @Get()
  async list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(listQuerySchema))
    query: LeaseListQuery & { archived?: boolean },
  ) {
    return this.service.list(auth.user.id, {
      ...query,
      includeArchived: query.archived,
    });
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
    @Body(new ZodValidationPipe(createLeaseSchema)) body: CreateLeaseInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.create(auth.user.id, body, request);
  }

  @Patch(':id')
  async update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', new ZodValidationPipe(uuidSchema)) id: string,
    @Body(new ZodValidationPipe(updateLeaseSchema)) body: UpdateLeaseInput,
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
