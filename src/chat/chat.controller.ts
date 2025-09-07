import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Param, 
  Body, 
  Query, 
  UseGuards,
  Request,
  BadRequestException 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatMessageCreate } from '../types/database.types';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('match/:matchId')
  async getMatchMessages(
    @Param('matchId') matchId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const messages = await this.chatService.getMatchMessages(
      matchId, 
      limit ? parseInt(limit.toString()) : 50, 
      offset ? parseInt(offset.toString()) : 0
    );

    return {
      messages,
      total: await this.chatService.getMessageCount(matchId),
    };
  }

  @Get('match/:matchId/recent')
  async getRecentMessages(
    @Param('matchId') matchId: string,
    @Query('since') since: string,
  ) {
    if (!since) {
      throw new BadRequestException('Parameter "since" is required');
    }

    const messages = await this.chatService.getRecentMessages(matchId, since);
    return { messages };
  }

  @Post('match/:matchId')
  async sendMessage(
    @Param('matchId') matchId: string,
    @Body() body: { message: string; type?: 'text' | 'system' | 'announcement' },
    @Request() req: any,
  ) {
    if (!body.message || body.message.trim().length === 0) {
      throw new BadRequestException('Message cannot be empty');
    }

    if (body.message.length > 500) {
      throw new BadRequestException('Message too long (max 500 characters)');
    }

    // TODO: Buscar dados reais do usuário
    const messageData: ChatMessageCreate = {
      match_id: matchId,
      user_id: req.user.sub,
      user_name: `User-${req.user.sub.slice(-4)}`, // TODO: buscar nome real
      user_tier: 'ouro', // TODO: buscar tier real
      message: body.message.trim(),
      type: body.type || 'text',
    };

    const message = await this.chatService.createMessage(messageData);
    
    return { 
      success: true, 
      message 
    };
  }

  @Delete('message/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Request() req: any,
  ) {
    const deleted = await this.chatService.deleteMessage(messageId, req.user.sub);
    
    if (!deleted) {
      throw new BadRequestException('Message not found or access denied');
    }

    return { success: true };
  }

  @Get('match/:matchId/stats')
  async getMatchStats(@Param('matchId') matchId: string) {
    const messageCount = await this.chatService.getMessageCount(matchId);
    
    return {
      matchId,
      messageCount,
      timestamp: new Date().toISOString(),
    };
  }
}
