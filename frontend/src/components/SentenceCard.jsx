import React, { useState } from 'react';
import { Volume2, ChevronLeft, ChevronRight, SpellCheck, Target, Sparkles, Send } from 'lucide-react';
import { playNativeAudio } from '../services/api';

const CATEGORIES = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Tongue Twister', 'Custom'];

export default function SentenceCard({
  sentences,
  currentIndex,
  onSelectIndex,
  currentCategory,
  onSelectCategory,
  currentSentence,
  onSetCustomSentence
}) {
  const [speechRate, setSpeechRate] = useState(1.0);
  const [customText, setCustomText] = useState('');
  const [isPlayingRef, setIsPlayingRef] = useState(false);

  const handlePlayReference = () => {
    if (!currentSentence?.sentence) return;
    setIsPlayingRef(true);
    playNativeAudio(currentSentence.sentence, speechRate);
    setTimeout(() => setIsPlayingRef(false), 2500);
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    onSetCustomSentence(customText.trim());
    setCustomText('');
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
      {/* Category Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-5 bg-indigo-500 rounded-full"></span>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Practice Sentence
          </h2>
        </div>

        {/* Categories */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 max-w-full">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
                currentCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {cat === 'Tongue Twister' ? 'Twisters' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Sentence Box */}
      {currentCategory === 'Custom' && (
        <form onSubmit={handleApplyCustom} className="mb-4">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Type or paste your own English sentence:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g. Practice makes a speaker fluent and confident..."
              className="flex-1 bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition flex items-center space-x-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Set</span>
            </button>
          </div>
        </form>
      )}

      {/* Main Sentence Box */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {currentSentence?.category || 'Custom'}
          </span>

          {currentCategory !== 'Custom' && sentences.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onSelectIndex((currentIndex - 1 + sentences.length) % sentences.length)}
                title="Previous sentence"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 font-mono">
                {currentIndex + 1} / {sentences.length}
              </span>
              <button
                onClick={() => onSelectIndex((currentIndex + 1) % sentences.length)}
                title="Next sentence"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Target Sentence Typography */}
        <p className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug my-3">
          {currentSentence?.sentence}
        </p>

        {/* Phonetics & Focus */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
          {currentSentence?.phonetic && (
            <div className="flex items-center space-x-1.5">
              <SpellCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-mono text-indigo-200">{currentSentence.phonetic}</span>
            </div>
          )}
          {currentSentence?.focus && (
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentSentence.focus}</span>
            </div>
          )}
        </div>

        {/* Listen Reference Audio Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlayReference}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border font-semibold text-xs transition ${
                isPlayingRef
                  ? 'bg-indigo-600 border-indigo-400 text-white'
                  : 'bg-slate-800 hover:bg-indigo-600/30 border-slate-700 hover:border-indigo-500/50 text-indigo-300'
              }`}
            >
              <Volume2 className={`w-4 h-4 ${isPlayingRef ? 'animate-bounce' : ''}`} />
              <span>{isPlayingRef ? 'Playing...' : 'Listen Native Accent'}</span>
            </button>

            <select
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
            >
              <option value={1.0}>1.0x (Normal)</option>
              <option value={0.75}>0.75x (Slow)</option>
            </select>
          </div>

          {currentSentence?.tip && (
            <div className="flex items-center space-x-1 text-[11px] text-slate-400">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{currentSentence.tip}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
