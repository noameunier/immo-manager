import { Controller, Get } from '@nestjs/common';
import { CurrentAuth, type AuthContext } from '../common/current-auth.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  async summary(@CurrentAuth() auth: AuthContext) {
    return this.service.summary(auth.user.id);
  }
}
