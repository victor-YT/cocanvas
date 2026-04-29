import { EventEmitter } from "node:events";
import type { CanvasEvent } from "./types.ts";

type CanvasEventListener = (event: CanvasEvent) => void;

export class CanvasEventBus {
  private emitter = new EventEmitter();

  publish(event: CanvasEvent) {
    this.emitter.emit("canvas-event", event);
  }

  subscribe(listener: CanvasEventListener) {
    this.emitter.on("canvas-event", listener);

    return () => {
      this.emitter.off("canvas-event", listener);
    };
  }
}

export const eventBus = new CanvasEventBus();
