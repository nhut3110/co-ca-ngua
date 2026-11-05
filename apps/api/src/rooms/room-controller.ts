import { Body, Controller, Get, Headers, Inject, Param, Post } from '@nestjs/common';
import type { GameConfig } from '@skyhoof/game-core';
import { RoomService } from './room-service.js';

@Controller('rooms')
export class RoomController {
  constructor(@Inject(RoomService) private readonly rooms: RoomService) {}
  @Post() create(@Body() body: { config: GameConfig; name: string; botCount?: number }) {
    return this.rooms.create(body?.config, body?.name, body?.botCount);
  }
  @Post(':code/join') join(@Param('code') code: string, @Body() body: { name: string }) {
    return this.rooms.join(code.toUpperCase(), body?.name);
  }
  @Get(':code') read(@Param('code') code: string, @Headers('x-room-token') token: string) {
    return this.rooms.snapshot(code.toUpperCase(), token);
  }
  @Post(':code/leave') leave(@Param('code') code: string, @Headers('x-room-token') token: string) {
    return this.rooms.leaveWaiting(code.toUpperCase(), token);
  }
  @Post(':code/start') start(@Param('code') code: string, @Headers('x-room-token') token: string) {
    return this.rooms.start(code.toUpperCase(), token);
  }
  @Post(':code/actions') action(
    @Param('code') code: string,
    @Headers('x-room-token') token: string,
    @Body() body: { version: number; action: unknown },
  ) {
    return this.rooms.action(code.toUpperCase(), token, body?.version, body?.action);
  }
}
