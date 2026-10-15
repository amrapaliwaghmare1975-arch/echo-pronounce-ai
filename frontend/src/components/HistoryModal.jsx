import React, { useState } from 'react';
import {
  X,
  History,
  TrendingUp,
  Award,
  Calendar,
  Trash2,
  Database,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Flame,
  Zap,
  Trophy,
  Lock,
  User
} from 'lucide-react';

export default function HistoryModal({
  isOpen,
  onClose,
  history,
  onClearHistory,
  onDeleteItem,
  onSelectSentenceForPractice,
  isBackendOnline,
  currentUser = null,
  onOpenAuth
}) {
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'badges'
  const [filterCategory, setFilterCategory] = useState('All');

  if (!isOpen) return null;

  // Filter items
  const filtered =
    filterCategory === 'All'
      ? history
      : history.filter(
          (item) => item.category?.toLowerCase() === filterCategory.toLowerCase()
        );

  // Statistics calculation
  const totalAttempts = history.length;
  const avgScore = totalAttempts
    ? Math.round(history.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / totalAttempts)
    : 0;

  const highestScore = totalAttempts
    ? Math.max(...history.map((h) => h.overall_score || 0))
    : 0;

  // Progression calculation (compare last attempt vs earliest)
  let trendDirection = 'neutral';
  let trendDifference = 0;
  if (totalAttempts >= 2) {
    const latestScore = history[0]?.overall_score || 0;
    const earliestScore = history[history.length - 1]?.overall_score || 0;
    trendDifference = latestScore - earliestScore;
    if (trendDifference > 0) trendDirection = 'up';
    else if (trendDifference < 0) trendDirection = 'down';
  }

  // Last 10 attempts for score progression chart
  const progressionData = [...history].slice(0, 10).reverse();

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 70) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  const getBarColor = (score) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Badges calculation (supports both logged in and local sessions)
  const defaultBadges = [
    {
      id: 'first_words',
      name: 'First Step',
      description: 'Completed your first speech practice attempt.',
      icon: '🌱',
      unlocked: totalAttempts >= 1
    },
    {
      id: 'accuracy_ace',
      name: 'Accuracy Ace',
      description: 'Achieved a 90%+ pronunciation score on any sentence.',
      icon: '🎯',
      unlocked: history.some((h) => (h.overall_score || 0) >= 90)
    },
    {
      id: 'perfect_100',
      name: 'Native Master',
      description: 'Scored a flawless 100% pronunciation score.',
      icon: '👑',
      unlocked: history.some((h) => (h.overall_score || 0) === 100)
    },
    {
      id: 'twister_tamer',
      name: 'Twister Tamer',
      description: 'Completed a Tongue Twister with 80%+ accuracy.',
      icon: '🌪️',
      unlocked: history.some(
        (h) => (h.category || '').toLowerCase().includes('twister') && (h.overall_score || 0) >= 80
      )
    },
    {
      id: 'speed_master',
      name: 'Natural Flow',
      description: 'Maintained an ideal natural pace of 110-160 WPM.',
      icon: '⚡',
      unlocked: history.some((h) => (h.words_per_minute || 0) >= 110 && (h.words_per_minute || 0) <= 160)
    },
    {
      id: 'xp_500',
      name: 'Century Club',
      description: 'Earned over 500 XP through speech training.',
      icon: '🏆',
      unlocked: currentUser ? currentUser.xp >= 500 : totalAttempts >= 15
    }
  ];

  const badges = currentUser?.badges || defaultBadges;
  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Practice Center & Gamification</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {totalAttempts} {totalAttempts === 1 ? 'attempt' : 'attempts'}
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-400">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {isBackendOnline
                    ? 'Synced with Backend PostgreSQL Database'
                    : 'Saved in Local Browser Database'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2">
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Attempts & Progression</span>
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'badges'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Badges & Level ({unlockedBadgesCount}/{badges.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'history' ? (
            <>
              {/* Top Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
                  <span className="text-[11px] text-slate-400 font-medium">Total Attempts</span>
                  <p className="text-xl font-bold text-white mt-1">{totalAttempts}</p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
                  <span className="text-[11px] text-slate-400 font-medium">Average Score</span>
                  <p
                    className={`text-xl font-bold mt-1 ${
                      avgScore >= 90
                        ? 'text-emerald-400'
                        : avgScore >= 70
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {avgScore}%
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
                  <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Best Score</span>
                  </span>
                  <p className="text-xl font-bold text-amber-400 mt-1">{highestScore}%</p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
                  <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Progression</span>
                  </span>
                  <p
                    className={`text-xl font-bold mt-1 ${
                      trendDirection === 'up'
                        ? 'text-emerald-400'
                        : trendDirection === 'down'
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {trendDirection === 'up'
                      ? `+${trendDifference}%`
                      : trendDirection === 'down'
                      ? `${trendDifference}%`
                      : 'Steady'}
                  </p>
                </div>
              </div>

              {/* Score Progression Visual Bar Chart */}
              {progressionData.length > 0 && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Recent Score Progression (Last {progressionData.length} Attempts)
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-500">Timeline →</span>
                  </div>

                  {/* Bar visualization */}
                  <div className="h-32 flex items-end gap-2 pt-4 px-2 border-b border-slate-800">
                    {progressionData.map((item, idx) => {
                      const heightPercent = Math.max(item.overall_score, 10);
                      return (
                        <div
                          key={item.id || idx}
                          className="flex-1 flex flex-col items-center group relative h-full justify-end"
                        >
                          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 border border-slate-700 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-10">
                            {item.overall_score}% • {item.category}
                          </div>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 group-hover:brightness-125 ${getBarColor(
                              item.overall_score
                            )}`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-1">
                    <span>Earliest</span>
                    <span>Latest Attempt</span>
                  </div>
                </div>
              )}

              {/* History Feed List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Attempt Records
                  </h3>

                  {history.length > 0 && (
                    <button
                      onClick={onClearHistory}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>

                {filtered.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
                    <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-400">No practice attempts recorded yet.</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Read and record a sentence in the studio to start tracking your progress!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 transition hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {item.category || 'Practice'}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(item.timestamp)}</span>
                            </span>
                            {item.xp_earned > 0 && (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                                +{item.xp_earned} XP
                              </span>
                            )}
                          </div>

                          <p className="text-xs sm:text-sm font-medium text-slate-200 line-clamp-2">
                            "{item.sentence}"
                          </p>

                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                            <span>Accuracy: <strong className="text-slate-200">{item.accuracy_percentage}%</strong></span>
                            <span>Completeness: <strong className="text-slate-200">{item.completeness_score}%</strong></span>
                            {item.words_per_minute > 0 && (
                              <span>Pace: <strong className="text-slate-200">{item.words_per_minute} WPM</strong></span>
                            )}
                            {item.mispronounced_count > 0 ? (
                              <span className="text-rose-400 font-medium">
                                {item.mispronounced_count} {item.mispronounced_count === 1 ? 'word missed' : 'words missed'}
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-medium flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>All words enunciated</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Score Badge & Actions */}
                        <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                          <div
                            className={`px-3 py-1.5 rounded-xl border font-bold text-sm text-center ${getScoreColor(
                              item.overall_score
                            )}`}
                          >
                            <span className="text-base">{item.overall_score}</span>
                            <span className="text-[10px] block opacity-80 font-normal">/ 100</span>
                          </div>

                          <button
                            onClick={() => {
                              onSelectSentenceForPractice(item.sentence, item.category);
                              onClose();
                            }}
                            title="Practice this sentence again"
                            className="p-2 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition text-xs flex items-center space-x-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Practice</span>
                          </button>

                          <button
                            onClick={() => onDeleteItem(item.id)}
                            title="Delete attempt"
                            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Badges & Gamification Tab */
            <div className="space-y-6">
              {/* Profile / Level Banner */}
              <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
                      🔥
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-white">
                          {currentUser ? currentUser.username : 'Guest Speaker'}
                        </h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                          Level {currentUser?.level || 1} Speaker
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {currentUser?.streak_count || 1} Day Daily Practice Streak!
                      </p>
                    </div>
                  </div>

                  {!currentUser && (
                    <button
                      onClick={() => { onClose(); onOpenAuth(); }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shrink-0"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Sign In to Save XP</span>
                    </button>
                  )}
                </div>

                {/* Level Progress Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Level Progress: <strong>{currentUser?.xp || totalAttempts * 20} XP</strong></span>
                    <span>Next Level at {currentUser?.next_level_xp || 150} XP</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      style={{
                        width: `${currentUser?.level_progress_percent || Math.min(100, (totalAttempts * 20) % 150)}%`
                      }}
                      className="h-full bg-gradient-to-r from-indigo-500 via-pink-500 to-amber-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              </div>

              {/* Badges Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center space-x-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Speech Achievements ({unlockedBadgesCount} / {badges.length} Unlocked)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {badges.map((badge) => (
                    <div
                      key={badge.id}
                      className={`p-4 rounded-xl border transition flex items-start space-x-3 ${
                        badge.unlocked
                          ? 'bg-slate-950/80 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                          : 'bg-slate-950/30 border-slate-800/60 opacity-60'
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                          badge.unlocked
                            ? 'bg-indigo-600/20 border border-indigo-500/30'
                            : 'bg-slate-900 border border-slate-800'
                        }`}
                      >
                        {badge.unlocked ? badge.icon : <Lock className="w-5 h-5 text-slate-500" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white truncate">
                            {badge.name}
                          </h4>
                          {badge.unlocked && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              Unlocked ✓
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          {badge.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>Earn +20 XP on every speech attempt, +30 XP bonus for scoring 90%+!</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
