import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Status kesehatan aplikasi dan koneksi PostgreSQL',
  })
  @ResponseMessage('Status kesehatan aplikasi dan database')
  @ApiOkResponse({
    description: 'Aplikasi dan database sehat',
    schema: {
      example: {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Salah satu dependency tidak sehat',
    schema: {
      example: {
        status: 'error',
        info: {},
        error: { database: { status: 'down' } },
        details: { database: { status: 'down' } },
      },
    },
  })
  @HealthCheck()
  check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
