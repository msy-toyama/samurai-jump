
import React, { useEffect, useRef, useCallback } from 'react';
import { THEME, COLORS, CONFIG, PLAYER_DIMS } from '../constants';
import { GameState, Obstacle, Star, Particle, ObstacleType } from '../types';
import { audioManager } from '../utils/audio';
import { lerpColor } from '../utils/color';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  setIsInvincible: (invincible: boolean) => void;
  isInvincible: boolean;
  triggerJump: boolean;
  onJumpHandled: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  setGameState,
  setScore,
  setIsInvincible,
  isInvincible,
  triggerJump,
  onJumpHandled,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Game Loop State Refs
  const frameCountRef = useRef(0);
  const scoreRef = useRef(0);
  const speedRef = useRef(CONFIG.baseSpeed);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const invincibilityEndTimeRef = useRef(0);
  
  // Player Physics Refs
  const playerYRef = useRef(0);
  const playerDyRef = useRef(0);
  const isJumpingRef = useRef(false);
  const groundYRef = useRef(0);

  // Helper: Get current theme colors based on score cycle
  const getCurrentTheme = useCallback((score: number) => {
    // Cycle every 60 seconds. 0-60 Day, 60-120 Night, 120-180 Day...
    const cycleLength = 60;
    const transitionDuration = 5;
    
    const cycleIndex = Math.floor(score / cycleLength);
    const isNightTarget = cycleIndex % 2 !== 0; // Odd cycles are Night
    const timeInCycle = score % cycleLength;

    let t = 0; // 0 = Day, 1 = Night

    // Special case for the very first cycle (Game Start).
    // We start at Day, so no transition is needed for the first few seconds.
    if (cycleIndex === 0) {
        t = 0;
    } else if (timeInCycle < transitionDuration) {
        // We are transitioning
        const progress = timeInCycle / transitionDuration;
        if (isNightTarget) {
            // Transitioning Day -> Night
            t = progress;
        } else {
            // Transitioning Night -> Day
            t = 1 - progress;
        }
    } else {
        // Stable state
        t = isNightTarget ? 1 : 0;
    }

    // Optimization: If t is exactly 0 or 1, avoid lerp calculations by returning exact references
    if (t <= 0.01) {
      return { colors: THEME.day, t: 0 };
    }
    if (t >= 0.99) {
      return { colors: THEME.night, t: 1 };
    }

    // Interpolate colors
    return {
      colors: {
        background: lerpColor(THEME.day.background, THEME.night.background, t),
        ground: lerpColor(THEME.day.ground, THEME.night.ground, t),
        player: lerpColor(THEME.day.player, THEME.night.player, t),
        playerInvincible: lerpColor(THEME.day.playerInvincible, THEME.night.playerInvincible, t),
        obstacleGround: lerpColor(THEME.day.obstacleGround, THEME.night.obstacleGround, t),
        obstacleAir: lerpColor(THEME.day.obstacleAir, THEME.night.obstacleAir, t),
        sun: THEME.day.sun,
        moon: THEME.night.moon,
        text: lerpColor(THEME.day.text, THEME.night.text, t),
        accent: lerpColor(THEME.day.accent, THEME.night.accent, t),
      },
      t: t
    };
  }, []);

  // Initialize Game State
  const resetGame = useCallback(() => {
    scoreRef.current = 0;
    speedRef.current = CONFIG.baseSpeed;
    obstaclesRef.current = [];
    starsRef.current = [];
    particlesRef.current = [];
    playerDyRef.current = 0;
    isJumpingRef.current = false;
    invincibilityEndTimeRef.current = 0;
    setScore(0);
    setIsInvincible(false);
    frameCountRef.current = 0;
    
    // Initial harmless obstacle
    obstaclesRef.current.push({
      id: Date.now(),
      x: window.innerWidth + 600,
      y: 0, 
      width: 40,
      height: 40,
      passed: false,
      type: 'GROUND'
    });
  }, [setScore, setIsInvincible]);

  // Handle Jump
  const performJump = useCallback(() => {
    if (!isJumpingRef.current) {
      playerDyRef.current = -CONFIG.jumpStrength;
      isJumpingRef.current = true;
      audioManager.playJump();
      
      const canvas = canvasRef.current;
      if (canvas) {
         const { colors } = getCurrentTheme(scoreRef.current);
         const px = 100; 
         const py = groundYRef.current;
         for (let i = 0; i < 8; i++) {
           particlesRef.current.push({
             x: px + (Math.random() - 0.5) * 20,
             y: py,
             vx: (Math.random() - 0.5) * 4,
             vy: -(Math.random() * 3),
             life: 1.0,
             color: colors.player,
             size: Math.random() * 4 + 2
           });
         }
      }
    }
  }, [getCurrentTheme]);

  useEffect(() => {
    if (triggerJump && gameState === GameState.PLAYING) {
      performJump();
      onJumpHandled();
    }
  }, [triggerJump, gameState, performJump, onJumpHandled]);

  // Setup & Reset
  useEffect(() => {
    if (gameState === GameState.START) {
        resetGame();
        // Draw initial frame
        const canvas = canvasRef.current;
        if (canvas) {
             const ctx = canvas.getContext('2d');
             if(ctx) {
                 drawGame(ctx, canvas.width, canvas.height, true);
             }
        }
    }
  }, [gameState, resetGame]);

  const spawnObstacle = (canvasWidth: number) => {
    const time = scoreRef.current;
    
    // Difficulty Scaling
    let minGapBase = 350;
    let spawnChance = 0.015;

    if (time > 60) {
        minGapBase = 200;
        spawnChance = 0.04;
    } else if (time > 40) {
        minGapBase = 250;
        spawnChance = 0.03;
    } else if (time > 20) {
        minGapBase = 300;
        spawnChance = 0.02;
    }

    const minGap = minGapBase + (speedRef.current * 15); 
    const lastObstacle = obstaclesRef.current[obstaclesRef.current.length - 1];
    
    if (!lastObstacle || (canvasWidth - lastObstacle.x > minGap)) {
      if (Math.random() < spawnChance) {
         let type: ObstacleType = 'GROUND';
         // Air obstacles appear after 40s
         if (time > 40 && Math.random() > 0.6) {
             type = 'AIR';
         }
         const size = type === 'AIR' ? 50 : (30 + Math.random() * 40);
         
         obstaclesRef.current.push({
           id: Date.now() + Math.random(),
           x: canvasWidth + 50,
           y: 0,
           width: size,
           height: size,
           passed: false,
           type: type
         });
      }
    }
  };

  const spawnStar = (canvasWidth: number) => {
      const hasActiveStar = starsRef.current.some(s => s.active);
      // Rare spawn for stars
      if (!hasActiveStar && Math.random() < 0.0008) {
         const yPos = groundYRef.current - (60 + Math.random() * 100); 
         starsRef.current.push({
             id: Date.now() + Math.random(),
             x: canvasWidth + 50,
             y: yPos,
             width: 30,
             height: 30,
             active: true,
             rotation: 0
         });
      }
  };

  const createExplosion = (x: number, y: number, color: string, count: number = 15) => {
      for (let i = 0; i < count; i++) {
          particlesRef.current.push({
              x: x,
              y: y,
              vx: (Math.random() - 0.5) * 12,
              vy: (Math.random() - 0.5) * 12,
              life: 1.0,
              color: color,
              size: Math.random() * 6 + 2
          });
      }
  };

  const updateGame = (timestamp: number, ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (gameState !== GameState.PLAYING) return;

    frameCountRef.current++;
    scoreRef.current += 1/60; 
    const time = scoreRef.current;
    const { colors } = getCurrentTheme(time);

    // Speed Logic
    let targetSpeed = CONFIG.baseSpeed;
    if (time < 20) {
        targetSpeed = 5 + (time / 20) * 2;
    } else if (time < 40) {
        targetSpeed = 8;
    } else if (time < 60) {
        targetSpeed = 8 + ((time - 40) / 20) * 3;
    } else {
        targetSpeed = 12 + ((time - 60) * 0.05); 
    }
    speedRef.current = speedRef.current * 0.95 + targetSpeed * 0.05;

    // Physics
    playerDyRef.current += CONFIG.gravity;
    playerYRef.current += playerDyRef.current;

    if (playerYRef.current > groundYRef.current) {
        playerYRef.current = groundYRef.current;
        playerDyRef.current = 0;
        isJumpingRef.current = false;
    }

    const playerRect = {
        x: 100 - PLAYER_DIMS.width / 2,
        y: playerYRef.current - PLAYER_DIMS.height,
        width: PLAYER_DIMS.width,
        height: PLAYER_DIMS.height
    };

    // Invincibility
    const now = Date.now();
    const isInvincibleNow = now < invincibilityEndTimeRef.current;
    if (isInvincible !== isInvincibleNow) {
        setIsInvincible(isInvincibleNow);
    }

    // Obstacles
    spawnObstacle(width);
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obs = obstaclesRef.current[i];
        obs.x -= speedRef.current;
        
        if (obs.type === 'GROUND') {
            obs.y = groundYRef.current - obs.height;
        } else {
            obs.y = groundYRef.current - 110; // Head height trap
        }

        // Collision
        const hitX = obs.x + 5;
        const hitY = obs.y + 5;
        const hitW = obs.width - 10;
        const hitH = obs.height - 10;

        if (
            playerRect.x < hitX + hitW &&
            playerRect.x + playerRect.width > hitX &&
            playerRect.y < hitY + hitH &&
            playerRect.height + playerRect.y > hitY
        ) {
            if (!isInvincibleNow) {
                audioManager.playCrash();
                createExplosion(playerRect.x, playerRect.y, colors.player, 30);
                setGameState(GameState.GAME_OVER);
                return;
            } 
        }

        if (obs.x + obs.width < -100) {
            obstaclesRef.current.splice(i, 1);
        }
    }

    // Stars
    spawnStar(width);
    for (let i = starsRef.current.length - 1; i >= 0; i--) {
        const star = starsRef.current[i];
        star.x -= speedRef.current;
        star.rotation += 0.05;

        if (
            star.active &&
            playerRect.x < star.x + star.width &&
            playerRect.x + playerRect.width > star.x &&
            playerRect.y < star.y + star.height &&
            playerRect.height + playerRect.y > star.y
        ) {
            star.active = false;
            invincibilityEndTimeRef.current = Date.now() + CONFIG.starDuration;
            audioManager.playCollect();
            createExplosion(star.x, star.y, COLORS.star);
        }
        if (star.x < -50) {
            starsRef.current.splice(i, 1);
        }
    }

    // Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) {
            particlesRef.current.splice(i, 1);
        }
    }

    if (frameCountRef.current % 5 === 0) {
        setScore(scoreRef.current);
    }
  };

  const drawSamurai = (ctx: CanvasRenderingContext2D, x: number, y: number, isRunning: boolean, isInvincible: boolean, themeColors: any) => {
      ctx.save();
      ctx.translate(x, y);

      let fillColor = themeColors.player;
      if (isInvincible) {
          fillColor = themeColors.playerInvincible;
          const timeLeft = invincibilityEndTimeRef.current - Date.now();
          // Blinking effect in last 5 seconds
          if (timeLeft < 5000) {
              if (Math.floor(Date.now() / 100) % 2 === 0) {
                   ctx.globalAlpha = 0.5;
              }
          }
          ctx.shadowBlur = 15;
          ctx.shadowColor = themeColors.playerInvincible;
      }

      ctx.strokeStyle = fillColor;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Head
      ctx.beginPath();
      ctx.arc(0, -50, 8, 0, Math.PI * 2); 
      ctx.fill();

      // Headband (animated in wind)
      ctx.lineWidth = 2;
      const wind = isRunning ? Math.sin(Date.now() / 50) * 5 : 0;
      ctx.beginPath();
      ctx.moveTo(-6, -52); 
      ctx.quadraticCurveTo(-20, -55 + wind, -30, -45 + wind);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6, -52);
      ctx.quadraticCurveTo(-20, -50 + wind, -28, -58 + wind);
      ctx.stroke();
      ctx.lineWidth = 4;

      // Body
      ctx.beginPath();
      ctx.moveTo(0, -42);
      ctx.lineTo(0, -20);
      ctx.stroke();

      // Legs
      const cycle = (Date.now() / 100 * (speedRef.current / 5)) % Math.PI;
      const legOffset = isRunning ? Math.sin(cycle) * 12 : 0;

      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(-8 + legOffset, -10);
      ctx.lineTo(-4 + (legOffset * 1.5), 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(8 - legOffset, -10);
      ctx.lineTo(4 - (legOffset * 1.5), 0);
      ctx.stroke();

      // Arms & Sword
      const armCycle = isRunning ? Math.cos(cycle) * 10 : 0;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-2, -25);
      ctx.lineTo(-20, -30);
      ctx.stroke();

      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -38);
      ctx.lineTo(-10 - armCycle, -20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -38);
      ctx.lineTo(10 + armCycle, -20);
      ctx.stroke();

      ctx.restore();
  };

  const drawGame = (ctx: CanvasRenderingContext2D, width: number, height: number, staticRender: boolean = false) => {
      const { colors, t } = getCurrentTheme(scoreRef.current);

      // Background
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, height);

      // Celestial Bodies
      
      // 1. Sun (Day)
      // Only draw if visible (t < 1)
      if (t < 1) {
        const sunRadius = Math.min(width, height) * 0.25;
        ctx.save();
        ctx.globalAlpha = 1 - t; // Fade out 
        ctx.fillStyle = THEME.day.sun;
        ctx.beginPath();
        ctx.arc(width / 2, height * 0.6, sunRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. Moon (Night)
      // Only draw if visible (t > 0)
      if (t > 0) {
        const moonX = width / 2;
        const moonY = height * 0.25; // Higher in sky
        const moonRadius = Math.min(width, height) * 0.1;
        
        ctx.save();
        ctx.globalAlpha = t; 
        
        // Draw Moon Base (Bright)
        ctx.fillStyle = THEME.night.moon;
        ctx.shadowBlur = 15;
        ctx.shadowColor = THEME.night.moon;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw Shadow (to create Crescent)
        // CRITICAL FIX: Use colors.background explicitly.
        // Offset: Shift Right (+) and Up (-) to create crescent on Left-Bottom
        const shadowOffsetX = moonRadius * 0.3;
        const shadowOffsetY = -moonRadius * 0.1;
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = colors.background;
        ctx.beginPath();
        ctx.arc(moonX + shadowOffsetX, moonY + shadowOffsetY, moonRadius * 0.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Ground
      ctx.fillStyle = colors.ground;
      ctx.fillRect(0, groundYRef.current, width, height - groundYRef.current);
      
      // Ground Texture (Strokes)
      ctx.strokeStyle = t > 0.5 ? '#a3a3a3' : '#44403c';
      ctx.lineWidth = 3;
      const groundOffset = staticRender ? 0 : (frameCountRef.current * speedRef.current) % 200;
      for (let gx = -groundOffset; gx < width; gx += 200) {
          ctx.beginPath();
          ctx.moveTo(gx, groundYRef.current + 5);
          ctx.lineTo(gx + 50, groundYRef.current + 15);
          ctx.stroke();
      }

      // Obstacles
      obstaclesRef.current.forEach(obs => {
          if (obs.type === 'GROUND') {
            ctx.fillStyle = colors.obstacleGround;
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            // Detail dot
            ctx.fillStyle = colors.background; // Match background for "hole" look
            ctx.fillRect(obs.x + 5, obs.y + 5, 4, 4);
          } else {
            // Air Obstacle (Trap)
            ctx.fillStyle = colors.obstacleAir;
            ctx.shadowColor = colors.obstacleAir;
            ctx.shadowBlur = 10;
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            ctx.shadowBlur = 0;
            // Detail border
            ctx.strokeStyle = t > 0.5 ? '#ef4444' : '#fca5a5';
            ctx.strokeRect(obs.x + 4, obs.y + 4, obs.width - 8, obs.height - 8);
          }
      });

      // Stars
      starsRef.current.forEach(star => {
          if (!star.active) return;
          ctx.save();
          ctx.translate(star.x + star.width/2, star.y + star.height/2);
          ctx.rotate(star.rotation);
          ctx.fillStyle = COLORS.star;
          
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
             ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 15, 
                        -Math.sin((18 + i * 72) * Math.PI / 180) * 15);
             ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * 7, 
                        -Math.sin((54 + i * 72) * Math.PI / 180) * 7);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
      });

      // Particles
      particlesRef.current.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
      });

      // Player
      const isRunning = !isJumpingRef.current;
      let isInvincibleDraw = invincibilityEndTimeRef.current > Date.now();
      drawSamurai(ctx, 100, playerYRef.current, isRunning, isInvincibleDraw, colors);
  };

  const loop = useCallback((timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          groundYRef.current = canvas.height - CONFIG.groundHeight;
      }

      updateGame(timestamp, ctx, canvas.width, canvas.height);
      drawGame(ctx, canvas.width, canvas.height);

      if (gameState === GameState.PLAYING) {
        requestRef.current = requestAnimationFrame(loop);
      }
  }, [gameState, setGameState, setScore, setIsInvincible, getCurrentTheme]);

  useEffect(() => {
      if (gameState === GameState.PLAYING) {
          requestRef.current = requestAnimationFrame(loop);
      }
      return () => {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
  }, [gameState, loop]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
    />
  );
};

export default GameCanvas;
