import React from 'react';
import { Mic, Activity, CheckCircle2, History, Flame, Zap, User, LogOut } from 'lucide-react';

export default function Header({
  isBackendOnline,
  onOpenHistory,
  historyCount = 0,
  currentUser = null,
  onOpenAuth,
  onLogout
}) {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                EchoPronounce
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30">
                React AI Coach
              </span>
            </div>
            <p className="text-xs text-slate-400">AI Pronunciation & Speech Feedback System</p>
          </div>
        </div>

        {/* Actions & Status */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
          {/* Gamification Stats (if logged in) */}
          {currentUser ? (
            <div className="flex items-center space-x-2">
              {/* Streak */}
              <div
                title={`${currentUser.streak_count} day practice streak!`}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold"
              >
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{currentUser.streak_count}d</span>
              </div>

              {/* Level & XP */}
              <div
                title={`Level ${currentUser.level} • ${currentUser.xp} XP total`}
                className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold"
              >
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Lvl {currentUser.level}</span>
                <span className="text-[10px] text-slate-400 font-normal">({currentUser.xp} XP)</span>
              </div>

              {/* User Avatar & Logout */}
              <div className="flex items-center space-x-1 pl-1">
                <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg">
                  {currentUser.username}
                </span>
                <button
                  onClick={onLogout}
                  title="Log out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition active:scale-95 shadow-md shadow-indigo-600/20"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition font-medium active:scale-95"
            title="View Database Practice History, Score Progression & Badges"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-indigo-600 text-white text-[10px] rounded-full font-mono">
                {historyCount}
              </span>
            )}
          </button>

          {/* Backend Status Indicator */}
          <div
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border transition-all ${
              isBackendOnline
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
            }`}
          >
            {isBackendOnline ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline font-medium">FastAPI Server Connected</span>
                <span className="md:hidden font-medium">Server Online</span>
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span className="hidden md:inline font-medium">Hybrid Browser AI Mode</span>
                <span className="md:hidden font-medium">Hybrid AI</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

