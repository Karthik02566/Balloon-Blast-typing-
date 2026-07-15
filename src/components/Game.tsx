import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WORDS, BALLOON_COLORS, BalloonStyle } from '../constants';
import { saveScore, auth, loginWithGoogle } from '../lib/firebase';
import { Trophy, RefreshCw, Play, LogIn, LogOut, User, Flame, Pause, Home, Clock } from 'lucide-react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

interface BalloonData {
  id: number;
  word: string;
  x: number;
  y: number;
  speed: number;
  style: BalloonStyle;
  isBlasted: boolean;
}

interface ParticleData {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

export default function Game() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Pro'>('Beginner');
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [balloons, setBalloons] = useState<BalloonData[]>([]);
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [wordsTyped, setWordsTyped] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [accuracy, setAccuracy] = useState(100);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [correctKeystrokes, setCorrectKeystrokes] = useState(0);
  
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [personalBest, setPersonalBest] = useState(0);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);

  // Synchronize Firebase Auth User reactively
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.displayName) {
          setPlayerName(currentUser.displayName);
        } else if (currentUser.email) {
          setPlayerName(currentUser.email.split('@')[0]);
        }
      } else {
        setPlayerName('');
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Personal Best whenever the active user changes
  useEffect(() => {
    const key = user ? `balloon_blast_pb_${user.uid}` : 'balloon_blast_pb_anonymous';
    const saved = localStorage.getItem(key);
    if (saved) {
      setPersonalBest(parseInt(saved, 10));
    } else {
      setPersonalBest(0);
    }
  }, [user]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const spawnTimer = useRef<NodeJS.Timeout | null>(null);
  const gameLoopTimer = useRef<number | null>(null);
  const finishGameRef = useRef<() => void>(() => {});

  const startGame = () => {
    setGameState('playing');
    setIsPaused(false);
    setTimeLeft(60);
    setBalloons([]);
    setParticles([]);
    setScore(0);
    setWordsTyped(0);
    setStartTime(Date.now());
    setInput('');
    setTotalKeystrokes(0);
    setCorrectKeystrokes(0);
    setAccuracy(100);
    setIsNewPersonalBest(false);
  };

  const createExplosion = (x: number, y: number, colorAccent: string) => {
    const newParticles: ParticleData[] = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const speed = Math.random() * 1.5 + 1.2;
      newParticles.push({
        id: Date.now() + Math.random() + i,
        x,
        y,
        vx: Math.cos(angle) * speed * 0.6,
        vy: Math.sin(angle) * speed * 0.6 - 0.4, // float slightly upward
        color: colorAccent,
        size: Math.random() * 5 + 4,
        alpha: 1.0
      });
    }
    setParticles((prev) => [...prev, ...newParticles]);
  };

  const spawnBalloon = () => {
    if (gameState !== 'playing' || isPaused) return;

    const id = Date.now() + Math.random();
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    // Spawn exactly in the middle lane (48% to 52%) so they float up the center beautifully
    const x = Math.random() * 4 + 48; 
    
    // Speed calculation (Distance = 120 units, ~60 frames per second):
    // Beginner: Stays 6 to 8 seconds -> speed range 0.25 to 0.33 per frame
    // Intermediate: Stays 5 to 6 seconds -> speed range 0.33 to 0.40 per frame
    // Pro: Stays 4 to 5 seconds -> speed range 0.40 to 0.50 per frame
    // Ensures ALL balloons stay on the screen for AT LEAST 4 seconds.
    let speedMin = 0.25;
    let speedMax = 0.33;
    if (difficulty === 'Intermediate') {
      speedMin = 0.33;
      speedMax = 0.40;
    } else if (difficulty === 'Pro') {
      speedMin = 0.40;
      speedMax = 0.50;
    }
    const speed = Math.random() * (speedMax - speedMin) + speedMin;
    const style = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];

    setBalloons((prev) => [
      ...prev,
      { id, word, x, y: 110, speed, style, isBlasted: false },
    ]);
  };

  useEffect(() => {
    if (gameState === 'playing' && !isPaused) {
      let spawnInterval = 3000; // Beginner mode (3 sec)
      if (difficulty === 'Intermediate') {
        spawnInterval = 2500; // Intermediate mode (2.5 sec)
      } else if (difficulty === 'Pro') {
        spawnInterval = 2000; // Pro mode (2 sec)
      }

      spawnTimer.current = setInterval(spawnBalloon, spawnInterval);
      
      const updateLoop = () => {
        setBalloons((prev) => {
          return prev
            .map((b) => ({ ...b, y: b.y - b.speed }))
            .filter((b) => b.y > -10);
        });

        setParticles((prev) => {
          return prev
            .map((p) => ({
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              vy: p.vy + 0.08, // gravity
              alpha: p.alpha - 0.03, // decay
              size: Math.max(0, p.size - 0.1) // shrink
            }))
            .filter((p) => p.alpha > 0 && p.size > 0);
        });

        gameLoopTimer.current = requestAnimationFrame(updateLoop);
      };
      gameLoopTimer.current = requestAnimationFrame(updateLoop);
    } else {
      if (spawnTimer.current) clearInterval(spawnTimer.current);
      if (gameLoopTimer.current) cancelAnimationFrame(gameLoopTimer.current);
    }

    return () => {
      if (spawnTimer.current) clearInterval(spawnTimer.current);
      if (gameLoopTimer.current) cancelAnimationFrame(gameLoopTimer.current);
    };
  }, [gameState, difficulty, isPaused]);

  useEffect(() => {
    if (gameState === 'playing') {
      const activeSeconds = 60 - timeLeft;
      if (activeSeconds > 0) {
        setWpm(Math.round((wordsTyped * 60) / activeSeconds));
      } else {
        setWpm(0);
      }
    }
  }, [wordsTyped, timeLeft, gameState]);

  const triggerBlast = (matchingBalloon: BalloonData) => {
    setCorrectKeystrokes(prev => prev + matchingBalloon.word.length);
    setBalloons(prev => prev.map(b => b.id === matchingBalloon.id ? { ...b, isBlasted: true } : b));
    setScore(prev => prev + matchingBalloon.word.length * 10);
    setWordsTyped(prev => prev + 1);
    setInput('');
    
    // Spawn satisfies particle blast explosion at the current visual coordinates (including sway)
    const visualX = matchingBalloon.x + Math.sin(matchingBalloon.y / 10) * 6;
    createExplosion(visualX, matchingBalloon.y - 5, matchingBalloon.style.accent);

    // Remove blasted balloon after animation completes
    setTimeout(() => {
      setBalloons(prev => prev.filter(b => b.id !== matchingBalloon.id));
    }, 300);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    setTotalKeystrokes(prev => prev + 1);

    // Check for case-insensitive match on full typed word
    const typedWord = value.trim().toLowerCase();
    const matchingBalloon = balloons.find(b => b.word.toLowerCase() === typedWord && !b.isBlasted);
    
    if (matchingBalloon) {
      triggerBlast(matchingBalloon);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const typedWord = input.trim().toLowerCase();
      if (!typedWord) return;

      const matchingBalloon = balloons.find(b => b.word.toLowerCase() === typedWord && !b.isBlasted);
      if (matchingBalloon) {
        e.preventDefault();
        triggerBlast(matchingBalloon);
      } else if (e.key === ' ') {
        // If they hit Space but it didn't match, clear the input to type the next word quickly
        e.preventDefault();
        setInput('');
      }
    }
  };

  useEffect(() => {
    if (totalKeystrokes > 0) {
      setAccuracy(Math.round((correctKeystrokes / totalKeystrokes) * 100));
    }
  }, [totalKeystrokes, correctKeystrokes]);

  const finishGame = async () => {
    if (gameState !== 'playing') return;
    setGameState('gameOver');
    const finalScore = score;
    const finalWpm = wpm;
    const finalAccuracy = accuracy;

    // Check & save personal high score
    const currentKey = user ? `balloon_blast_pb_${user.uid}` : 'balloon_blast_pb_anonymous';
    const savedBest = localStorage.getItem(currentKey);
    const existingBest = savedBest ? parseInt(savedBest, 10) : 0;
    
    if (finalScore > existingBest) {
      localStorage.setItem(currentKey, finalScore.toString());
      setPersonalBest(finalScore);
      setIsNewPersonalBest(true);
    } else {
      setIsNewPersonalBest(false);
    }

    const name = user?.displayName || playerName || 'Player';
    await saveScore({
      playerName: name,
      wpm: finalWpm,
      accuracy: finalAccuracy,
      wordsTyped: wordsTyped,
      score: finalScore,
      difficulty: difficulty
    });
  };

  // Sync finishGameRef with the latest finishGame closure on every render
  useEffect(() => {
    finishGameRef.current = finishGame;
  });

  // Game timer countdown that respects pausing
  useEffect(() => {
    if (gameState === 'playing' && !isPaused) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, isPaused]);

  // Handle timer end safely without stale closures
  useEffect(() => {
    if (gameState === 'playing' && timeLeft <= 0) {
      finishGameRef.current();
    }
  }, [timeLeft, gameState]);

  const trimmedInput = input.trim();

  return (
    <div className="relative w-full h-[450px] md:h-[600px] bg-gradient-to-b from-[#0B0F19] via-[#1A1F38] to-[#0A0D14] overflow-hidden rounded-xl md:rounded-3xl shadow-2xl border-4 md:border-8 border-slate-900 group" ref={containerRef}>
      
      {/* Decorative Star/Dust Particles for Space Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-pulse delay-700"></div>
        <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-sky-200 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-pink-200 rounded-full animate-pulse delay-500"></div>
      </div>

      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-3 md:top-5 left-3 md:left-5 right-3 md:right-5 flex justify-between items-center z-20 gap-2">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className={`px-2.5 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider shadow-lg border ${
              difficulty === 'Beginner' ? 'bg-emerald-500/90 text-white border-emerald-400/50' :
              difficulty === 'Intermediate' ? 'bg-amber-500/90 text-white border-amber-400/50' :
              'bg-rose-500/90 text-white border-rose-400/50'
            }`}>
              {difficulty}
            </div>
            <div className="bg-slate-950/80 backdrop-blur-md px-2.5 md:px-4 py-1 md:py-1.5 rounded-full shadow-lg font-black text-slate-100 border border-slate-800/80 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Score:</span> {score}
            </div>
          </div>

          {/* Elegant Center Timer Pill */}
          <div className="flex items-center">
            <div className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full shadow-lg font-black border flex items-center gap-1.5 md:gap-2 text-xs md:text-sm transition-all duration-300 ${
              timeLeft <= 15 
                ? 'bg-rose-950/90 border-rose-500 text-rose-200 animate-pulse' 
                : 'bg-slate-950/80 border-slate-800 text-slate-100'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${timeLeft <= 15 ? 'text-rose-400 animate-spin' : 'text-indigo-400'}`} style={{ animationDuration: timeLeft <= 15 ? '3s' : '0s' }} />
              <span>{timeLeft}s</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="bg-slate-950/80 backdrop-blur-md px-2.5 md:px-4 py-1 md:py-1.5 rounded-full shadow-lg font-black text-slate-100 border border-slate-800/80 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
              <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
              <span className="hidden sm:inline">WPM:</span> {wpm}
            </div>
            <div className="bg-slate-950/80 backdrop-blur-md px-2.5 md:px-4 py-1 md:py-1.5 rounded-full shadow-lg font-black text-slate-100 border border-slate-800/80 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
              {accuracy}% <span className="hidden sm:inline">Acc</span>
            </div>

            {/* Elegant Pause and Back-to-Menu Action Controls */}
            <div className="flex items-center gap-1 border-l border-slate-800 pl-1.5 md:pl-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? "Resume" : "Pause"}
                className="bg-slate-950/80 hover:bg-indigo-600 border border-slate-800 hover:border-indigo-400 text-slate-300 hover:text-white p-1.5 md:p-2 rounded-xl shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to quit to the main menu? Your progress will not be saved.")) {
                    setGameState('menu');
                    setIsPaused(false);
                  }
                }}
                title="Back to Menu"
                className="bg-slate-950/80 hover:bg-rose-950 border border-slate-800 hover:border-rose-600 text-slate-300 hover:text-rose-400 p-1.5 md:p-2 rounded-xl shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center"
              >
                <Home className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Area */}
      <div className="relative w-full h-full">
        <AnimatePresence>
          {balloons.map((balloon) => (
            <motion.div
              key={balloon.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={balloon.isBlasted ? { 
                scale: [1, 1.5, 0], 
                opacity: [1, 0.9, 0],
                rotate: [0, 35, -35],
                filter: 'blur(4px)'
              } : { 
                scale: 1,
                opacity: 1,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
              style={{
                left: `${balloon.x + Math.sin(balloon.y / 10) * 6}%`,
                top: `${balloon.y}%`,
              }}
            >
              <div 
                className={`w-16 h-20 bg-gradient-to-tr ${balloon.style.gradient} rounded-[50%_50%_50%_50%/40%_40%_60%_60%] relative shadow-2xl ${balloon.style.glow} flex flex-col items-center justify-center border border-white/20`}
                style={{
                  boxShadow: '0 10px 25px -5px var(--tw-shadow-color), inset 0 -6px 12px rgba(0,0,0,0.25)'
                }}
              >
                {/* 3D Glass Gloss Refraction Line */}
                <div className="absolute top-1.5 left-2.5 w-3.5 h-5 bg-white/25 rounded-full rotate-[-15deg] blur-[0.5px]"></div>
                
                {/* Active matching highlight feedback */}
                {trimmedInput && balloon.word.startsWith(trimmedInput) && (
                  <div className="absolute inset-[-4px] rounded-[50%_50%_50%_50%/40%_40%_60%_60%] border-2 border-yellow-300 animate-pulse"></div>
                )}

                {/* Word display with elegant character-level typing matching feedback */}
                <span className="text-white font-extrabold drop-shadow-md text-sm px-1.5 text-center leading-tight tracking-wide z-10 select-none">
                  {trimmedInput && balloon.word.toLowerCase().startsWith(trimmedInput.toLowerCase()) ? (
                    <>
                      <span className="text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] font-black">{balloon.word.slice(0, trimmedInput.length)}</span>
                      <span className="text-white opacity-95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">{balloon.word.slice(trimmedInput.length)}</span>
                    </>
                  ) : (
                    balloon.word
                  )}
                </span>

                {/* String Knot */}
                <div className={`absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-3 h-2 bg-gradient-to-tr ${balloon.style.gradient} rounded-t-sm rotate-180`}></div>
                
                {/* Wavy string trailing below */}
                <svg className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-12 text-slate-500/30 fill-none stroke-current" strokeWidth="1.5" strokeDasharray="3,3">
                  <path d="M 8 0 Q 4 10 8 20 T 8 40" />
                </svg>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Floating Particle Blast Explosion Effect */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {particles.map((p) => (
            <div
              key={p.id}
              className={`absolute rounded-full ${p.color}`}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.alpha,
                transform: 'translate(-50%, -50%)',
                filter: 'blur(0.5px)',
                boxShadow: '0 0 12px currentColor'
              }}
            />
          ))}
        </div>
      </div>

      {/* Input Overlay */}
      {gameState === 'playing' && !isPaused && (
        <div className="absolute bottom-5 md:bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-xs z-30">
          <input
            autoFocus
            type="text"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-950/90 backdrop-blur-xl border-2 md:border-4 border-indigo-500/80 rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 text-xl md:text-2xl font-black text-white placeholder-slate-600 shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/30 text-center transition-all tracking-wider uppercase"
            placeholder="Type word..."
          />
        </div>
      )}

      {/* Screens */}
      <AnimatePresence>
        {isPaused && gameState === 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center p-3 md:p-8"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl border-2 border-slate-800/80 max-w-sm w-full text-center text-white relative overflow-y-auto max-h-[92%] scrollbar-thin">
              <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-rose-600/10 rounded-full blur-2xl"></div>

              <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-violet-400 mb-1 md:mb-2 uppercase tracking-wider">
                Paused
              </h2>
              <p className="text-slate-400 mb-4 md:mb-8 text-xs md:text-base font-medium">Take a breath, stretch your fingers!</p>
              
              <div className="space-y-3 md:space-y-4">
                <button 
                  onClick={() => setIsPaused(false)}
                  className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-black text-base md:text-lg text-white shadow-[0_4px_0_rgb(67,56,202)] md:shadow-[0_5px_0_rgb(67,56,202)] hover:shadow-[0_2px_0_rgb(67,56,202)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2 border border-indigo-400/30 cursor-pointer"
                >
                  <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                  RESUME GAME
                </button>

                <button 
                  onClick={startGame}
                  className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 py-2.5 md:py-3 rounded-xl font-bold text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs md:text-base"
                >
                  <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  RESTART
                </button>

                <button 
                  onClick={() => {
                    setGameState('menu');
                    setIsPaused(false);
                  }}
                  className="w-full bg-rose-950/40 hover:bg-rose-900/50 border border-rose-900/50 hover:border-rose-700 py-2.5 md:py-3 rounded-xl font-bold text-rose-300 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs md:text-base"
                >
                  <Home className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  MAIN MENU
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'menu' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-slate-950/60 backdrop-blur-md flex flex-col items-center justify-center p-3 md:p-8"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl border-2 border-slate-800/80 max-w-md w-full text-center text-white relative overflow-y-auto max-h-[92%] scrollbar-thin">
              <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl"></div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400 mb-1 md:mb-2 leading-tight flex items-center justify-center gap-1.5 md:gap-2">
                <Flame className="w-6 h-6 md:w-8 md:h-8 text-orange-400 fill-current animate-bounce" />
                Balloon Blast
              </h1>
              <p className="text-slate-400 mb-3 md:mb-6 text-xs md:text-sm font-medium">Test your typing speed and precision!</p>
              
              <div className="space-y-2.5 md:space-y-4 mb-4 md:mb-6">
                <div className="flex items-center gap-2.5 bg-slate-950/50 p-2.5 md:p-3.5 rounded-xl border border-slate-800/80">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name..."
                    className="bg-transparent border-none focus:outline-none text-slate-100 font-bold w-full placeholder-slate-500 text-sm md:text-base"
                  />
                </div>
                
                {personalBest > 0 && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-950/60 border border-indigo-500/30 rounded-full text-indigo-300 font-extrabold text-[9px] md:text-[11px] uppercase tracking-wider shadow-md">
                    <Trophy className="w-2.5 h-2.5 md:w-3 md:h-3.5 text-yellow-400 fill-yellow-400" />
                    <span>Personal Best: <span className="text-yellow-300 font-black">{personalBest}</span> pts</span>
                  </div>
                )}

                {user ? (
                  <div className="flex flex-col items-center gap-1 bg-slate-950/40 p-2 md:p-3.5 rounded-xl border border-indigo-500/20">
                    <div className="text-[9px] md:text-[10px] text-indigo-400 font-black uppercase tracking-widest">Signed In Account</div>
                    <div className="flex items-center gap-1.5">
                      {user.photoURL && (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName || 'Avatar'} 
                          className="w-5 h-5 md:w-6 md:h-6 rounded-full border border-indigo-500/40"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <span className="text-white font-extrabold text-xs md:text-sm">{user.displayName || user.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await signOut(auth);
                        } catch (err) {
                          console.error("Sign out failed", err);
                        }
                      }}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 transition-colors cursor-pointer mt-0.5 bg-rose-950/20 hover:bg-rose-950/40 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg border border-rose-900/30"
                    >
                      <LogOut className="w-2.5 h-2.5" />
                      Sign Out / Switch Gmail
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={async () => {
                      try {
                        await loginWithGoogle();
                      } catch (err) {
                        console.error("Login failed", err);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 hover:border-slate-750 py-2.5 md:py-3.5 rounded-xl font-bold text-slate-200 transition-all shadow-lg cursor-pointer text-xs md:text-base"
                  >
                    <LogIn className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />
                    Sign in with Google
                  </button>
                )}
              </div>

              {/* Difficulty Selection */}
              <div className="mb-4 md:mb-6 text-left">
                <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 md:mb-3">Select Difficulty</label>
                <div className="grid grid-cols-3 gap-1.5 md:grid-cols-3 md:gap-2">
                  {(['Beginner', 'Intermediate', 'Pro'] as const).map((level) => {
                    const isSelected = difficulty === level;
                    const colorClasses = 
                      level === 'Beginner' ? 'border-emerald-950/80 text-emerald-400 hover:bg-emerald-950/20' :
                      level === 'Intermediate' ? 'border-amber-950/80 text-amber-400 hover:bg-amber-950/20' :
                      'border-rose-950/80 text-rose-400 hover:bg-rose-950/20';
                    const activeClasses = 
                      level === 'Beginner' ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_3px_0_rgb(16,185,129)] md:shadow-[0_4px_0_rgb(16,185,129)]' :
                      level === 'Intermediate' ? 'bg-amber-500 text-white border-amber-400 shadow-[0_3px_0_rgb(245,158,11)] md:shadow-[0_4px_0_rgb(245,158,11)]' :
                      'bg-rose-500 text-white border-rose-400 shadow-[0_3px_0_rgb(244,63,94)] md:shadow-[0_4px_0_rgb(244,63,94)]';
                    
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        className={`py-1.5 px-0.5 rounded-lg md:rounded-xl border font-black text-[10px] md:text-sm tracking-wide transition-all uppercase ${
                          isSelected 
                            ? `${activeClasses} translate-y-[-1px] md:translate-y-[-2px]` 
                            : `${colorClasses} bg-slate-950/40 border-slate-800/80 hover:border-slate-700`
                        }`}
                      >
                        {level}
                        <div className="text-[8px] md:text-[9px] font-bold normal-case mt-0.5 opacity-80 leading-none">
                          {level === 'Beginner' ? '3s / Slow' : level === 'Intermediate' ? '2.5s / Med' : '2s / Fast'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                onClick={startGame}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-indigo-500 to-violet-600 py-2.5 md:py-4 rounded-xl md:rounded-2xl font-black text-lg md:text-2xl text-white shadow-[0_4px_0_rgb(67,56,202)] md:shadow-[0_8px_0_rgb(67,56,202)] hover:shadow-[0_2px_0_rgb(67,56,202)] md:hover:shadow-[0_4px_0_rgb(67,56,202)] hover:translate-y-[2px] md:hover:translate-y-[4px] active:translate-y-[4px] md:active:translate-y-[8px] active:shadow-none transition-all flex items-center justify-center gap-2 md:gap-3 cursor-pointer"
              >
                <Play className="w-4 h-4 md:w-6 md:h-6 fill-current text-white/90" />
                START GAME
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'gameOver' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-xl flex flex-col items-center justify-center p-3 md:p-8"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-2xl border-2 border-slate-850 max-w-md w-full text-center text-white relative overflow-y-auto max-h-[92%] scrollbar-thin">
              <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-1 md:mb-2 uppercase tracking-wider">Game Over!</h2>
              
              {isNewPersonalBest ? (
                <div className="mb-4 md:mb-6 p-2.5 md:p-3.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-yellow-500/50 rounded-xl md:rounded-2xl animate-pulse text-yellow-300 font-black text-xs md:text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                  <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current text-yellow-400" />
                  New Personal Best!
                </div>
              ) : (
                personalBest > 0 && (
                  <div className="mb-4 md:mb-6 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-950/40 border border-indigo-500/20 rounded-full text-indigo-300 font-extrabold text-[10px] md:text-xs uppercase tracking-wider">
                    <Trophy className="w-3 h-3 text-indigo-400" />
                    <span>Personal Best: <span className="text-indigo-300 font-black">{personalBest}</span> pts</span>
                  </div>
                )
              )}

              <div className="grid grid-cols-2 gap-2.5 md:gap-4 mb-4 md:mb-6">
                <div className="bg-slate-950/60 p-2.5 md:p-4 rounded-xl md:rounded-2xl border border-slate-800/80">
                  <div className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5 md:mb-1">Score</div>
                  <div className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">{score}</div>
                </div>
                <div className="bg-slate-950/60 p-2.5 md:p-4 rounded-xl md:rounded-2xl border border-slate-800/80">
                  <div className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5 md:mb-1">WPM</div>
                  <div className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">{wpm}</div>
                </div>
                <div className="bg-slate-950/60 p-2.5 md:p-4 rounded-xl md:rounded-2xl col-span-2 border border-slate-800/80">
                  <div className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5 md:mb-1">Accuracy</div>
                  <div className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">{accuracy}%</div>
                </div>
              </div>

              <div className="flex gap-2.5 md:gap-4">
                <button 
                  onClick={() => setGameState('menu')}
                  className="flex-1 bg-slate-800 border border-slate-750 py-2.5 md:py-4 rounded-xl md:rounded-2xl font-bold text-slate-300 hover:bg-slate-700 transition-all uppercase tracking-wide text-xs md:text-sm cursor-pointer"
                >
                  MENU
                </button>
                <button 
                  onClick={startGame}
                  className="flex-[2] bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 md:py-4 rounded-xl md:rounded-2xl font-black text-sm md:text-xl text-slate-950 shadow-[0_4px_0_rgb(146,64,14)] md:shadow-[0_8px_0_rgb(146,64,14)] hover:shadow-[0_2px_0_rgb(146,64,14)] md:hover:shadow-[0_4px_0_rgb(146,64,14)] hover:translate-y-[2px] md:hover:translate-y-[4px] active:translate-y-[4px] md:active:translate-y-[8px] active:shadow-none transition-all flex items-center justify-center gap-1.5 md:gap-2 border border-amber-400/30 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 md:w-5 md:h-5 stroke-[2.5px] md:stroke-[3px]" />
                  RETRY
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
