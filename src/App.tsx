/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  Music, 
  Trophy, 
  RotateCcw,
  Ghost,
  Gamepad2,
  Terminal,
  Activity,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants & Types ---

const GRID_SIZE = 20;
const CELL_SIZE = 25;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };

type Point = { x: number; y: number };

interface Track {
  id: number;
  title: string;
  artist: string;
  duration: number;
  color: string;
}

const TRACKS: Track[] = [
  { id: 1, title: "DATA_PULSE.EXE", artist: "NEURAL_LINK_01", duration: 184, color: "from-cyan-500 to-blue-600" },
  { id: 2, title: "VOID_GLITCH.MD", artist: "USER_SYS_ERROR", duration: 210, color: "from-pink-500 to-purple-600" },
  { id: 3, title: "HORIZON_NULL", artist: "CORE_DUMP_V3", duration: 156, color: "from-emerald-500 to-teal-600" },
];

export default function App() {
  // --- Game State ---
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Use refs for values that change frequently but shouldn't restart the game loop
  const directionRef = useRef<Point>(INITIAL_DIRECTION);
  const nextDirectionRef = useRef<Point>(INITIAL_DIRECTION);
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  
  const scoreRef = useRef(0);
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE);

  // --- Music State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const currentTrack = TRACKS[currentTrackIndex];

  // --- Game Logic ---

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isOnSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const moveSnake = useCallback(() => {
    // Update direction from buffer
    directionRef.current = nextDirectionRef.current;
    
    const head = snakeRef.current[0];
    const newHead = {
      x: (head.x + directionRef.current.x + GRID_SIZE) % GRID_SIZE,
      y: (head.y + directionRef.current.y + GRID_SIZE) % GRID_SIZE,
    };

    // Collision with self
    if (snakeRef.current.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      setIsGameOver(true);
      setGameStarted(false);
      return;
    }

    const newSnake = [newHead, ...snakeRef.current];

    // Eating food
    if (newHead.x === food.x && newHead.y === food.y) {
      const newScore = scoreRef.current + 10;
      scoreRef.current = newScore;
      setScore(newScore);
      if (newScore > highScore) setHighScore(newScore);
      setFood(generateFood(newSnake));
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
    setSnake(newSnake);
  }, [food, highScore, generateFood]);

  const gameLoop = useCallback((timestamp: number) => {
    const snakeSpeed = Math.max(60, 150 - scoreRef.current * 1.5);
    if (timestamp - lastUpdateTimeRef.current > snakeSpeed) {
      moveSnake();
      lastUpdateTimeRef.current = timestamp;
    }
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [moveSnake]);

  useEffect(() => {
    if (gameStarted && !isGameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameStarted, isGameOver, gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted && e.key === ' ') {
        resetGame();
        return;
      }

      const currentDir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
          if (currentDir.y !== 1) nextDirectionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          if (currentDir.y !== -1) nextDirectionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          if (currentDir.x !== 1) nextDirectionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          if (currentDir.x !== -1) nextDirectionRef.current = { x: 1, y: 0 };
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted]);

  const resetGame = () => {
    snakeRef.current = INITIAL_SNAKE;
    setSnake(INITIAL_SNAKE);
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    scoreRef.current = 0;
    setScore(0);
    setIsGameOver(false);
    setGameStarted(true);
    setFood(generateFood(INITIAL_SNAKE));
  };

  // --- Music Logic ---

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= currentTrack.duration) {
            handleNext();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack]);

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  
  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setProgress(0);
  };

  const handlePrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setProgress(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- UI Components ---

  return (
    <div className="min-h-screen bg-[#0d0208] text-neon-cyan font-mono selection:bg-neon-magenta/30 overflow-hidden flex flex-col items-center justify-center p-4 relative">
      <div className="crt-overlay" />
      <div className="scanline" />

      {/* Retro Header */}
      <div className="relative z-10 w-full max-w-5xl mb-6">
        <div className="flex justify-between items-end border-b-2 border-neon-cyan pb-2 mb-1">
          <div>
            <h1 className="text-4xl font-black italic glitch-text tracking-tighter uppercase" data-text="RHYTHM_SNAKE">RHYTHM_SNAKE</h1>
            <div className="flex gap-4 mt-2">
              <span className="text-[10px] flex items-center gap-1"><Terminal size={12}/> SYSTEM: ONLINE</span>
              <span className="text-[10px] flex items-center gap-1"><Activity size={12}/> UPLINK: UNSTABLE</span>
              <span className="text-[10px] flex items-center gap-1 text-neon-magenta animate-pulse"><Cpu size={12}/> CORE_HEAT: NOMINAL</span>
            </div>
          </div>
          <div className="text-right flex flex-col gap-1">
             <div className="text-xs text-white/40 uppercase tracking-widest">ENCRYPTED_SESSION_ID: AI_X_776</div>
             <div className="text-2xl font-bold bg-neon-cyan text-black px-2 py-0">V1.0.4.GLITCH</div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Game Canvas */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div 
            className="relative bg-black/80 rounded-sm border-4 border-neon-cyan overflow-hidden shadow-[0_0_20px_rgba(0,243,255,0.2)]"
            style={{ 
              width: GRID_SIZE * CELL_SIZE + 8, 
              height: GRID_SIZE * CELL_SIZE + 8,
            }}
          >
            {/* Grid Pattern */}
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to right, #00f3ff 1px, transparent 1px), linear-gradient(to bottom, #00f3ff 1px, transparent 1px)`,
                backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`
              }}
            />

            {/* Snake Body */}
            {snake.map((segment, i) => (
              <motion.div
                key={`${i}-${segment.x}-${segment.y}`}
                initial={false}
                animate={{ x: segment.x * CELL_SIZE, y: segment.y * CELL_SIZE }}
                transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
                className="absolute"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  background: i === 0 ? 'var(--color-neon-cyan)' : 'transparent',
                  border: `2px solid ${i === 0 ? 'white' : 'var(--color-neon-cyan)'}`,
                  boxShadow: i === 0 ? '0 0 10px var(--color-neon-cyan)' : 'none',
                  zIndex: snake.length - i,
                }}
              >
                {i > 0 && (
                  <div className="w-full h-full opacity-50 flex items-center justify-center">
                    <div className="w-[4px] h-[4px] bg-neon-cyan" />
                  </div>
                )}
              </motion.div>
            ))}

            {/* Food */}
            <motion.div
              animate={{ 
                opacity: [1, 0, 1],
                boxShadow: ['0 0 5px #ff00ff', '0 0 20px #ff00ff', '0 0 5px #ff00ff']
              }}
              transition={{ repeat: Infinity, duration: 0.2 }}
              className="absolute bg-neon-magenta"
              style={{
                left: food.x * CELL_SIZE + 4,
                top: food.y * CELL_SIZE + 4,
                width: CELL_SIZE - 8,
                height: CELL_SIZE - 8,
              }}
            />

            {/* Overlays */}
            <AnimatePresence>
              {!gameStarted && !isGameOver && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90"
                >
                  <p className="text-neon-cyan/60 mb-6 uppercase tracking-[0.5em] text-sm animate-pulse glitch-text" data-text="INITIATE_PROTOCCOL">INITIATE_PROTOCCOL</p>
                  <motion.button 
                    whileHover={{ x: [0, -2, 2, -2, 0] }}
                    onClick={resetGame}
                    className="px-12 py-4 bg-neon-cyan text-black font-black text-xl uppercase tracking-widest border-4 border-white hover:bg-white transition-colors"
                  >
                    RUN_EXE
                  </motion.button>
                  <div className="mt-8 grid grid-cols-2 gap-4 text-[10px] text-white/30 uppercase tracking-[0.2em]">
                    <div className="text-right">INPUT: ARROW_KEYS</div>
                    <div className="text-left">REBOOT: SPACEBAR</div>
                  </div>
                </motion.div>
              )}

              {isGameOver && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95"
                >
                  <div className="p-4 bg-neon-magenta/20 mb-4 neon-magenta-border border-4">
                    <Ghost className="w-16 h-16 text-neon-magenta" />
                  </div>
                  <h2 className="text-6xl font-black italic tracking-tighter text-neon-magenta mb-1 glitch-text" data-text="CRITICAL_FAILURE">CRITICAL_FAILURE</h2>
                  <p className="text-neon-magenta/60 uppercase tracking-[0.4em] text-xs mb-8">STACK_OVERFLOW / MEMORY_LEAK_DETECTION</p>
                  
                  <button 
                    onClick={resetGame}
                    className="px-10 py-3 border-4 border-neon-magenta text-neon-magenta font-black uppercase hover:bg-neon-magenta hover:text-black transition-all flex items-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    FORCE_RESTART
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Machine Info Panels */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black/60 border-2 border-neon-cyan/30 p-2 flex flex-col items-center">
              <span className="text-[8px] text-white/40 uppercase mb-1 w-full text-left">Segment_Count</span>
              <span className="text-xl font-bold">{snake.length.toString().padStart(3, '0')}</span>
            </div>
            <div className="bg-black/60 border-2 border-neon-cyan/30 p-2 flex flex-col items-center">
              <span className="text-[8px] text-white/40 uppercase mb-1 w-full text-left">Sync_Frequency</span>
              <span className="text-xl font-bold">{(150 - scoreRef.current * 1.5).toFixed(0)}HZ</span>
            </div>
            <div className="bg-black/60 border-2 border-neon-cyan/30 p-2 flex flex-col items-center">
              <span className="text-[8px] text-white/40 uppercase mb-1 w-full text-left">Buffer_Status</span>
              <span className="text-xl font-bold text-neon-magenta">STABLE</span>
            </div>
          </div>
        </div>

        {/* Right Column: Audio Interface */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-black/80 border-4 border-neon-cyan/40 p-6 flex flex-col gap-6 shadow-[0_0_20px_rgba(0,243,255,0.1)] relative overflow-hidden">
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-[0.3em] bg-neon-cyan text-black px-1 font-bold">AUDIO_UPLINK</span>
              <Activity className="w-4 h-4 text-neon-magenta animate-pulse" />
            </div>

            {/* Visualizer Block */}
            <div className="h-48 w-full bg-black border-2 border-neon-magenta/30 flex items-center justify-center p-4 relative">
               <div className="absolute inset-0 opacity-10 flex flex-col justify-between p-2 pointer-events-none">
                  {[...Array(6)].map((_, i) => <div key={i} className="w-full h-[1px] bg-white"/>)}
               </div>
              <div className="flex items-end gap-1.5 h-32">
                {[...Array(16)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: isPlaying ? [10, Math.random() * 80 + 20, 10] : 4,
                      backgroundColor: isPlaying ? ['#00f3ff', '#ff00ff', '#00f3ff'] : '#333'
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 0.3 + Math.random() * 0.4,
                      ease: 'easeInOut'
                    }}
                    className="w-2.5 rounded-sm"
                  />
                ))}
              </div>
            </div>

            <div className="text-left border-l-4 border-neon-magenta pl-4 py-1">
              <h3 className="text-xl font-black tracking-tight mb-0 uppercase text-neon-magenta glitch-text" data-text={currentTrack.title}>{currentTrack.title}</h3>
              <p className="text-[10px] opacity-60 uppercase tracking-[0.2em]">{currentTrack.artist}</p>
            </div>

            {/* Audio Signal Control */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="h-6 w-full bg-black border-2 border-neon-cyan/30 p-1 flex items-center relative">
                   <div className="absolute inset-0 bg-neon-cyan/5 pointer-events-none" />
                  <motion.div 
                    className="h-full bg-neon-cyan shadow-[0_0_10px_var(--color-neon-cyan)] relative z-10"
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress / currentTrack.duration) * 100}%` }}
                  >
                    <div className="absolute right-0 top-0 h-full w-[2px] bg-white animate-pulse" />
                  </motion.div>
                </div>
                <div className="flex justify-between text-[10px] text-neon-cyan/50 italic">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(currentTrack.duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button onClick={handlePrev} className="p-3 border-2 border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all">
                  <SkipBack className="w-6 h-6 fill-current" />
                </button>
                <button 
                  onClick={handlePlayPause}
                  className="w-20 h-20 bg-neon-cyan text-black flex items-center justify-center hover:bg-white transition-all shadow-[0_0_20px_rgba(0,243,255,0.4)] border-4 border-white"
                >
                  {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current translate-x-1" />}
                </button>
                <button onClick={handleNext} className="p-3 border-2 border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all">
                  <SkipForward className="w-6 h-6 fill-current" />
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-black/60 border border-neon-cyan/20 p-3 relative overflow-hidden">
                <div className="text-[8px] uppercase text-white/30 mb-2">Score_Archive</div>
                <div className="text-2xl font-bold text-neon-cyan">{score.toString().padStart(4, '0')}</div>
                <div className="absolute bottom-0 right-0 p-1">
                   <Trophy size={14} className="opacity-20 translate-x-2 translate-y-2"/>
                </div>
              </div>
              <div className="bg-black/60 border border-neon-magenta/20 p-3 relative overflow-hidden">
                <div className="text-[8px] uppercase text-white/30 mb-2">Record_Dump</div>
                <div className="text-2xl font-bold text-neon-magenta">{highScore.toString().padStart(4, '0')}</div>
                <div className="absolute bottom-0 right-0 p-1">
                   <Gamepad2 size={14} className="opacity-20 translate-x-2 translate-y-2"/>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neon-cyan text-black p-4 font-black flex items-center justify-between uppercase italic text-sm border-4 border-white">
            <span>Uptime: {Math.floor(performance.now() / 1000).toString().padStart(5, '0')}S</span>
            <div className="flex gap-1">
               <div className="w-2 h-2 bg-black animate-ping" />
               <div className="w-2 h-2 bg-black opacity-50" />
               <div className="w-2 h-2 bg-black opacity-25" />
            </div>
          </div>
        </div>

      </div>

      {/* Background Static Layer */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1] overflow-hidden">
         <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-white blur-[100px] animate-pulse" />
         <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-neon-magenta blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

    </div>
  );
}
