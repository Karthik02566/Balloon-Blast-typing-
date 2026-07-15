import React from 'react';
import Game from './components/Game';
import Leaderboard from './components/Leaderboard';
import { Cloud, Zap, Target } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  return (
    <div className="min-h-screen bg-sky-50 font-sans selection:bg-sky-200 selection:text-sky-900">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <motion.div 
          animate={{ x: [100, 200, 0], y: [0, 100, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-[10%] text-sky-400"
        >
          <Cloud className="w-32 h-32 fill-current" />
        </motion.div>
        <motion.div 
          animate={{ x: [100, -150, 0], y: [0, 350, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-40 right-[15%] text-sky-300"
        >
          <Cloud className="w-48 h-48 fill-current" />
        </motion.div>
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-20">
        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="h-0.5 w-12 bg-sky-300"></span>
            <span className="text-xs font-black text-sky-400 uppercase tracking-[0.3em] flex items-center gap-2">
              <Zap className="w-3 h-3 fill-current" />
              Pulse-Pounding Action
            </span>
            <span className="h-0.5 w-12 bg-sky-300"></span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-sky-950 tracking-tighter mb-4 flex items-center justify-center gap-4">
            Balloon <span className="text-sky-500 drop-shadow-[0_4px_0_rgb(3,105,161)]">Blast</span>
          </h1>
          <p className="text-xl text-sky-600 font-medium max-w-2xl mx-auto flex items-center justify-center gap-3">
            <Target className="w-5 h-5" />
            The ultimate typing agility challenge for speed demons.
          </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-12 items-start">
          <section className="lg:col-span-2">
            <div className="mb-6 flex items-center justify-between px-2">
              <h3 className="text-sm font-black text-sky-900 uppercase tracking-widest">Training Range</h3>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
              </div>
            </div>
            <Game />
            <div className="mt-8 bg-sky-100/50 rounded-2xl p-6 border-2 border-sky-100 text-sky-700 text-sm italic text-center font-medium">
              Pro Tip: Balloons speed up as they fly higher. Blast them early to maximize your precision!
            </div>
          </section>

          <aside className="space-y-8">
            <Leaderboard />
            
            <div className="bg-sky-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="relative z-10">
                <h4 className="text-xl font-black mb-2 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  Speed Limit?
                </h4>
                <p className="text-sky-300 text-sm font-medium leading-relaxed mb-6">
                  Top players often reach 100+ WPM. Can you blast your way into the top three today?
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Agile', 'Focused', 'Precise'].map(tag => (
                    <span key={tag} className="px-3 py-1 bg-sky-800 rounded-full text-[10px] font-black uppercase tracking-widest text-sky-400 border border-sky-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <Cloud className="absolute -bottom-10 -right-10 w-40 h-40 text-sky-800 opacity-20 pointer-events-none group-hover:scale-125 transition-transform duration-700" />
            </div>
          </aside>
        </div>

        <footer className="mt-24 text-center border-t border-sky-100 pt-12">
          <div className="text-[10px] font-black text-sky-300 uppercase tracking-[0.5em]">
            Built with Antigravity & Firebase
          </div>
          <p className="text-sky-400 mt-2 text-sm">© 2026 Balloon Blast Typing Pro. No balloons were harmed in the making of this game.</p>
        </footer>
      </main>
    </div>
  );
}
