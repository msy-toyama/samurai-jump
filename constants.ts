import { GameConfig } from './types';

export const CONFIG: GameConfig = {
  gravity: 0.6,
  jumpStrength: 13,
  groundHeight: 120,
  baseSpeed: 5,
  speedMultiplier: 0.001,
  starDuration: 15000, // 15 seconds
};

export const THEME = {
  day: {
    background: '#f5f5f4', // stone-100 (Rice paper)
    ground: '#1c1917', // stone-900 (Ink)
    player: '#1c1917', // stone-900
    playerInvincible: '#d97706', // amber-600
    obstacleGround: '#1c1917', // Ink Black
    obstacleAir: '#7f1d1d', // Red-900
    sun: '#ef4444', // red-500
    // Added to ensure type compatibility with night theme
    moon: 'transparent', 
    text: '#1c1917',
    accent: '#ef4444'
  },
  night: {
    background: '#09090b', // zinc-950 (Deep Night)
    ground: '#e5e5e5', // neutral-200 (White Ink)
    player: '#e5e5e5', // White Ink
    playerInvincible: '#fbbf24', // amber-400 (Bright Gold)
    obstacleGround: '#e5e5e5', // White Ink
    obstacleAir: '#f87171', // red-400 (Lighter Red)
    // Added to ensure type compatibility with day theme
    sun: 'transparent', 
    moon: '#fef3c7', // amber-100 (Moonlight)
    text: '#e5e5e5',
    accent: '#f87171'
  }
};

export const COLORS = {
  star: '#fbbf24', // amber-400
  ...THEME.day // Default fallback
};

export const PLAYER_DIMS = {
  width: 30,
  height: 60,
  headRadius: 8,
};