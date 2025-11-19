export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Point {
  x: number;
  y: number;
}

export interface Entity extends Point {
  width: number;
  height: number;
}

export type ObstacleType = 'GROUND' | 'AIR';

export interface Obstacle extends Entity {
  id: number;
  passed: boolean;
  type: ObstacleType;
}

export interface Star extends Entity {
  id: number;
  active: boolean;
  rotation: number;
}

export interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface GameConfig {
  gravity: number;
  jumpStrength: number;
  groundHeight: number;
  baseSpeed: number;
  speedMultiplier: number;
  starDuration: number; // seconds
}