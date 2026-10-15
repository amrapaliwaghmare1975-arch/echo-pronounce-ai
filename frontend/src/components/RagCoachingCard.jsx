import React from 'react';
import { Sparkles, BookOpen, Volume2, ArrowRight, Lightbulb, CheckCircle2 } from 'lucide-react';
import { playNativeAudio } from '../services/api';

export default function RagCoachingCard({ ragGuidance }) {
  if (!ragGuidance || !ragGuidance.guides || ragGuidance.guides.length === 0) {
    return null;
  }

  const { guides, summary_advice } = ragGuidance;

  return (
    <div className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-5 bg-indigo-500 rounded-full"></span>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>RAG Phonetic Articulation Guide</span>
          </h2>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
          Knowledge Base Retrieved
        </span>
      </div>

      {summary_advice && (
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          {summary_advice}
        </p>
      )}

      {/* Guide Cards */}
      <div className="space-y-4">
        {guides.map((guide, idx) => (
          <div
            key={guide.id || idx}
            className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3"
          >
            {/* Guide Title & Sound Badge */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-pink-500/15 text-pink-300 border border-pink-500/30">
                {guide.sound}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {guide.category}
              </span>
            </div>

            <h3 className="text-xs sm:text-sm font-bold text-white">
              {guide.title}
            </h3>

            {/* Tongue & Lip Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* Tongue Position */}
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-2.5">
                <span className="text-[11px] font-semibold text-indigo-300 block mb-1">
                  👅 Tongue Position:
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {guide.tongue_position}
                </p>
              </div>

              {/* Lip Shape & Airflow */}
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-2.5">
                <span className="text-[11px] font-semibold text-pink-300 block mb-1">
                  👄 Lip Shape & Airflow:
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {guide.lip_shape} {guide.airflow}
                </p>
              </div>
            </div>

            {/* Common Pitfall */}
            {guide.common_pitfall && (
              <div className="text-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg p-2.5 flex items-start space-x-2">
                <span className="shrink-0 font-bold">⚠️ Watch out:</span>
                <p>{guide.common_pitfall}</p>
              </div>
            )}

            {/* Interactive Minimal Pairs */}
            {guide.minimal_pairs && guide.minimal_pairs.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  🎧 Minimal Pair Drills (Click to Hear Difference):
                </span>
                <div className="flex flex-wrap gap-2">
                  {guide.minimal_pairs.map((pair, pIdx) => (
                    <div
                      key={pIdx}
                      className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs"
                    >
                      <button
                        onClick={() => playNativeAudio(pair.target)}
                        className="font-bold text-emerald-400 hover:underline flex items-center space-x-1"
                        title={`Listen to '${pair.target}'`}
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>{pair.target}</span>
                      </button>
                      <span className="text-slate-500 text-[10px]">vs</span>
                      <button
                        onClick={() => playNativeAudio(pair.contrast)}
                        className="font-medium text-slate-400 hover:text-white flex items-center space-x-1"
                        title={`Listen to '${pair.contrast}'`}
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>{pair.contrast}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Practice Drill */}
            {guide.practice_drill && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-indigo-400 font-semibold block uppercase">
                    Practice Drill:
                  </span>
                  <p className="text-slate-200 italic font-medium truncate">
                    "{guide.practice_drill}"
                  </p>
                </div>
                <button
                  onClick={() => playNativeAudio(guide.practice_drill)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-[11px] font-semibold transition shrink-0 flex items-center space-x-1"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Listen</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
