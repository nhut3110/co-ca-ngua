import { chooseBotAction, type GameState } from '@skyhoof/game-core';
self.onmessage = (event: MessageEvent<GameState>) => {
  self.postMessage(chooseBotAction(event.data));
};
