import React, { useEffect, useState } from 'react';
import { subscribeLeaderboard, LeaderboardEntry } from '../lib/firebase';
import { Trophy, Clock, Medal, Target } from 'lucide-react';
import { motion } from 'motion/react';

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeLeaderboard(
      (data) => {
        setEntries(data);
        setLoading(false);
      },
      (error) => {
        console.error("Leaderboard subscription error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8 animate-pulse text-sky-400 font-bold">Loading amazing scores...</div>;
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border-4 border-sky-100 overflow-hidden">
      <div className="bg-sky-500 p-6 flex items-center justify-between">
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 fill-yellow-400 text-yellow-400" />
          Hall of Fame
        </h2>
        <span className="text-sky-100 text-sm font-bold">Top 10 BlastMasters</span>
      </div>

      <div className="p-4">
        {entries.length === 0 ? (
          <div className="text-center py-12 text-sky-300 font-medium">No records yet. Be the first to blast!</div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                key={index}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                  index === 0 ? 'bg-yellow-50 border-yellow-200' : 
                  index === 1 ? 'bg-slate-50 border-slate-200' :
                  index === 2 ? 'bg-orange-50 border-orange-200' : 'bg-white border-sky-50'
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center font-black text-lg">
                  {index === 0 && <Medal className="w-6 h-6 text-yellow-500" />}
                  {index === 1 && <Medal className="w-6 h-6 text-slate-400" />}
                  {index === 2 && <Medal className="w-6 h-6 text-orange-500" />}
                  {index > 2 && <span className="text-sky-300">#{index + 1}</span>}
                </div>

                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <div className="font-black text-sky-900">{entry.playerName}</div>
                    {entry.difficulty && (
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest leading-none ${
                        entry.difficulty === 'Beginner' ? 'bg-green-100 text-green-700 border border-green-200' :
                        entry.difficulty === 'Intermediate' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                        'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {entry.difficulty}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-sky-400 uppercase tracking-tighter">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {entry.wpm} WPM</span>
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {entry.accuracy}% ACC</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-sky-600 leading-none">{entry.score}</div>
                  <div className="text-[10px] font-bold text-sky-300 uppercase">PTS</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
