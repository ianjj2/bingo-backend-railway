import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('system')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({
    summary: 'Health Check',
    description: 'Endpoint público para verificar se o servidor está online.',
  })
  @ApiResponse({
    status: 200,
    description: 'Servidor está funcionando',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 123.456 },
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Root endpoint',
    description: 'Endpoint raiz da API.',
  })
  @ApiResponse({
    status: 200,
    description: 'API está funcionando',
  })
  getRoot() {
    return {
      message: 'Bingo Live API está funcionando! 🎮 [FORCE REDEPLOY]',
      version: '1.0.1',
      docs: '/api/docs',
      timestamp: new Date().toISOString(),
      status: 'WORKING'
    };
  }
}
