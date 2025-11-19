
import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState } from './types';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [isInvincible, setIsInvincible] = useState(false);
  const [triggerJump, setTriggerJump] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('samuraiJump_highScore');
    return saved ? parseFloat(saved) : 0;
  });
  
  // Prevent instant restart by tracking logic
  const [canRestart, setCanRestart] = useState(false);

  useEffect(() => {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('samuraiJump_highScore', score.toString());
      }
  }, [score, highScore]);

  // Manage Input Cooldown
  useEffect(() => {
      if (gameState === GameState.GAME_OVER) {
          setCanRestart(false);
          const timer = setTimeout(() => setCanRestart(true), 1000); // 1 second cooldown
          return () => clearTimeout(timer);
      } else if (gameState === GameState.START) {
          setCanRestart(true);
      }
  }, [gameState]);

  const handleJumpInput = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      setTriggerJump(true);
    } else if (gameState === GameState.START) {
       setGameState(GameState.PLAYING);
    } else if (gameState === GameState.GAME_OVER && canRestart) {
       // Return to START first to ensure clean reset
       setGameState(GameState.START);
    }
  }, [gameState, canRestart]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        handleJumpInput();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJumpInput]);

  // Transition Logic: Cycle every 60 seconds (0-60 Day, 60-120 Night, 120-180 Day)
  const isNight = Math.floor(score / 60) % 2 !== 0;
  
  // Custom transition style for extra smooth 5s color change
  const smoothTransition = {
      transitionProperty: 'color, background-color, border-color',
      transitionDuration: '5000ms',
      transitionTimingFunction: 'linear'
  };

  return (
    <div className="relative w-full h-screen overflow-hidden font-samurai select-none bg-stone-100">
      
      {/* Game Layer */}
      <div className="absolute inset-0 z-0">
        <GameCanvas 
          gameState={gameState}
          setGameState={setGameState}
          setScore={setScore}
          setIsInvincible={setIsInvincible}
          isInvincible={isInvincible}
          triggerJump={triggerJump}
          onJumpHandled={() => setTriggerJump(false)}
        />
      </div>

      {/* HUD */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
         <div className="flex flex-col gap-3">
            <div className="flex flex-col items-start">
               <div 
                 className={`backdrop-blur-sm px-4 py-2 border-l-4 border-red-600 ${isNight ? 'bg-stone-900/50' : 'bg-stone-900/5'}`}
                 style={smoothTransition}
               >
                  <p 
                    className={`text-xs uppercase tracking-widest ${isNight ? 'text-stone-400' : 'text-stone-500'}`}
                    style={smoothTransition}
                  >
                    Time
                  </p>
                  <p 
                    className={`text-4xl font-bold ${isNight ? 'text-stone-100' : 'text-stone-900'}`}
                    style={smoothTransition}
                  >
                    {score.toFixed(1)}<span className="text-sm ml-1 font-normal">s</span>
                  </p>
               </div>
            </div>
            
             <div 
                className={`backdrop-blur-sm px-3 py-1 border-l-4 border-stone-400 ${isNight ? 'bg-stone-900/50' : 'bg-stone-900/5'}`}
                style={smoothTransition}
             >
                 <p 
                    className={`text-xs ${isNight ? 'text-stone-300' : 'text-stone-600'}`}
                    style={smoothTransition}
                 >
                    Best: {highScore.toFixed(1)}s
                 </p>
             </div>

            {isInvincible && (
               <div className="animate-pulse bg-amber-500/90 text-white px-4 py-2 shadow-lg border border-amber-400 mt-2">
                 <p className="text-sm uppercase font-bold tracking-widest">Invincible Mode</p>
               </div>
            )}
         </div>
      </div>

      {/* Start Screen */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stone-100/90 backdrop-blur-sm animate-fade-in">
           <div className="text-center space-y-8 max-w-md p-8 border-y-4 border-stone-900">
             <div>
               <h1 className="text-5xl md:text-7xl font-black text-stone-900 tracking-tighter">
                 SAMURAI<br/><span className="text-red-600">JUMP</span>
               </h1>
             </div>

             <button 
               onClick={() => setGameState(GameState.PLAYING)}
               className="mt-8 px-10 py-4 bg-stone-900 hover:bg-red-700 text-stone-50 font-bold text-xl shadow-2xl transition-all border border-stone-900"
             >
               START RUN
             </button>
           </div>
           <p className="mt-8 text-stone-400 text-sm">Spacebar or Tap to Jump</p>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stone-900/90 backdrop-blur-md animate-in fade-in zoom-in duration-300">
           <div className="text-center space-y-8 p-10 bg-stone-100 border-4 border-red-600 shadow-2xl max-w-lg w-full mx-4">
             <h2 className="text-5xl font-black text-stone-900 uppercase">Defeated</h2>
             
             <div className="py-6 border-t border-b border-stone-200 space-y-2">
               <p className="text-stone-500 text-sm uppercase tracking-widest">Survival Time</p>
               <p className="text-6xl font-bold text-red-600">{score.toFixed(2)}s</p>
             </div>

             <button 
               onClick={() => { if(canRestart) setGameState(GameState.START); }}
               className={`w-full px-8 py-4 font-bold text-xl transition-all ${canRestart ? 'bg-stone-900 hover:bg-stone-800 text-white scale-100' : 'bg-stone-400 text-stone-200 cursor-not-allowed'}`}
               disabled={!canRestart}
             >
               {canRestart ? "TRY AGAIN" : "..."}
             </button>
           </div>
        </div>
      )}

      {/* Mobile Jump Button */}
      <div className="absolute bottom-6 left-0 w-full px-6 flex justify-center z-10 pb-safe">
        <button
          className="w-full max-w-lg h-24 bg-red-700/90 backdrop-blur active:bg-red-600 rounded-sm shadow-[0_4px_0_rgb(69,10,10)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center group touch-manipulation border-2 border-red-800"
          onPointerDown={(e) => {
              e.preventDefault(); 
              handleJumpInput();
          }}
        >
          <span className="text-3xl font-serif font-bold text-white tracking-[0.2em] group-active:scale-95 transition-transform">JUMP</span>
        </button>
      </div>

    </div>
  );
}
