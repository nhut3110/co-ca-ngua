import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { biomes, maps, skins, skies, diceStyles } from '@skyhoof/catalog';
import { DEFAULT_CONFIG } from '@skyhoof/game-core';
import { RoomController } from './rooms/room-controller.js';
import { RoomService } from './rooms/room-service.js';
import { roomRateLimiter } from './rooms/rate-limit.js';
import { MemoryRoomStore, SupabaseRoomStore } from './rooms/room-store.js';

@Controller()
class AppController {
  @Get('health') health() {
    return {
      status: 'ok',
      service: 'skyhoof-api',
      multiplayer: true,
      persistence: process.env.SUPABASE_URL ? 'supabase' : 'memory',
    };
  }
  @Get('catalog') catalog() {
    return { version: 2, skins, biomes, maps, skies, diceStyles };
  }
  @Get('rules/default') rules() {
    return DEFAULT_CONFIG;
  }
}
@Module({
  controllers: [AppController, RoomController],
  providers: [
    {
      provide: RoomService,
      useFactory: () => {
        const url = process.env.SUPABASE_URL,
          key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!!url !== !!key)
          throw new Error('Both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
        if (process.env.NODE_ENV === 'production' && !url)
          throw new Error('Persistent room storage is required in production');
        return new RoomService(
          url && key ? new SupabaseRoomStore(url, key) : new MemoryRoomStore(),
        );
      },
    },
  ],
})
class AppModule {}
const app = await NestFactory.create(AppModule);
if (process.env.NODE_ENV === 'production') app.getHttpAdapter().getInstance().set('trust proxy', 1);
app.use(roomRateLimiter());
const origins = (process.env.WEB_ORIGIN ?? 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.enableCors({ origin: origins });
app.enableShutdownHooks();
// Hosted services supply PORT and require a public bind; local development stays loopback-only.
const host = process.env.HOST ?? (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
await app.listen(Number(process.env.PORT ?? 3001), host);
