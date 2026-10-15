import React from 'react';
import { Sparkles, Info, Check, HelpCircle, AlertCircle } from 'lucide-react';
import RagCoachingCard from './RagCoachingCard';

export default function FeedbackDashboard({ analysis, isAnalyzing, onSelectWord }) {
  const score = analysis?.overall_score ?? null;

  const getScoreColor = (val) => {
    if (val >= 90) return { stroke: '#10b981', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    if (val >= 70) return { stroke: '#f59e0b', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    return { stroke: '#f43f5e', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
  };

  const colors = score !== null ? getScoreColor(score) : { stroke: '#475569', text: 'text-slate-400', badge: 'bg-slate-800 text-slate-400' };

  return (
    <div className="flex flex-col space-y-6">
      {/* Card: AI Overall Score & Metrics */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex items-center space-x-2 mb-5">
          <span className="w-2 h-5 bg-emerald-500 rounded-full"></span>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Feedback & Score
          </h2>
        </div>

        {/* Score Dial / Ring Display */}
        <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-5">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                style={{
                  stroke: colors.stroke,
                  strokeDasharray: score !== null ? `${score}, 100` : '0, 100',
                  transition: 'stroke-dasharray 1s ease-out, stroke 0.5s ease'
                }}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={`text-2xl font-extrabold ${colors.text}`}>
                {score !== null ? score : '--'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">/ 100</span>
            </div>
          </div>

          <div className="flex-1 pl-5">
            <span
              className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md mb-1.5 border ${colors.badge}`}
            >
              {isAnalyzing
                ? 'Processing Speech...'
                : score !== null
                ? score >= 90
                  ? 'Native Level'
                  : score >= 70
                  ? 'Good Articulation'
                  : 'Needs Practice'
                : 'Awaiting Speech'}
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isAnalyzing
                ? 'Listening carefully to your pronunciation and cadence...'
                : analysis?.summary ||
                  'Record your voice to receive instant pronunciation accuracy, fluency, and word breakdown.'}
            </p>
          </div>
        </div>

        {/* Key Stats Sub-grid */}
        <div className="grid grid-cols-3 gap-2 text-center mb-5">
          <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-2.5">
            <p className="text-[11px] text-slate-400">Accuracy</p>
            <p className="text-base font-bold text-emerald-400 mt-0.5">
              {analysis?.accuracy_percentage !== undefined ? `${analysis.accuracy_percentage}%` : '--'}
            </p>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-2.5">
            <p className="text-[11px] text-slate-400">Completeness</p>
            <p className="text-base font-bold text-indigo-400 mt-0.5">
              {analysis?.completeness_score !== undefined ? `${analysis.completeness_score}%` : '--'}
            </p>
          </div>
          <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-2.5">
            <p className="text-[11px] text-slate-400">Pace (WPM)</p>
            <p className="text-base font-bold text-amber-400 mt-0.5">
              {analysis?.words_per_minute !== undefined ? analysis.words_per_minute : '--'}
            </p>
          </div>
        </div>

        {/* Word-by-Word Analysis Section */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Word Accuracy Breakdown
            </h3>
            {/* Legend */}
            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>Correct
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1"></span>Close
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-rose-500 mr-1"></span>Mispronounced
              </span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 min-h-[90px] flex flex-wrap gap-2 items-center">
            {analysis?.words && analysis.words.length > 0 ? (
              analysis.words.map((item, idx) => {
                let badgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                if (item.status === 'close') badgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
                else if (item.status === 'mispronounced') badgeClass = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
                else if (item.status === 'missing') badgeClass = 'bg-slate-800/60 text-slate-400 border-slate-700/60 line-through';
                else if (item.status === 'extra') badgeClass = 'bg-purple-500/15 text-purple-300 border-purple-500/30';

                return (
                  <button
                    key={idx}
                    onClick={() => onSelectWord(item)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition transform hover:-translate-y-0.5 hover:brightness-110 active:scale-95 ${badgeClass}`}
                  >
                    {item.target_word || item.spoken_word}
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-slate-500 italic">
                Spoken words will be analyzed here.
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            Tip: Click on any word chip to hear native pronunciation and phonetic breakdown.
          </p>
        </div>

        {/* AI Coach Tips & Suggestions */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-2 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Phonetic Coaching Tips</span>
          </h3>
          <div className="space-y-2 text-xs text-slate-300 bg-slate-950/50 border border-slate-800/60 rounded-xl p-3.5">
            {analysis?.tips && analysis.tips.length > 0 ? (
              analysis.tips.map((tip, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="shrink-0">👉</span>
                  <p>{tip.replace(/\*\*/g, '')}</p>
                </div>
              ))
            ) : (
              <div className="flex items-start space-x-2 text-slate-400">
                <span className="shrink-0">💡</span>
                <p>Practice reading slowly first to master tricky consonants and silent letters.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RAG Phonetic Articulation Coaching Card */}
      <RagCoachingCard ragGuidance={analysis?.rag_guidance} />

      {/* Marathi Help Guide Card */}
      <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 text-xs text-indigo-200">
        <h4 className="font-bold flex items-center space-x-1.5 mb-1.5 text-indigo-300">
          <Info className="w-4 h-4" />
          <span>वापर कसा करावा? (Quick User Guide)</span>
        </h4>
        <ul className="list-disc list-inside space-y-1 text-indigo-300/80">
          <li><strong>Listen</strong> बटण दाबून मूळ इंग्रजी उच्चार ऐका.</li>
          <li><strong>Microphone</strong> बटणावर क्लिक करा आणि समोर दिलेले वाक्य स्पष्ट आवाजात वाचा.</li>
          <li>AI तुमचे प्रत्येक शब्द तपासून <strong>हिरवा (योग्य)</strong>, <strong>पिवळा (जवळपास)</strong> किंवा <strong>लाल (चुकीचा)</strong> रंगात अचूक फीडबॅक देईल.</li>
          <li>कोणत्याही शब्दावर क्लिक करून त्याचा स्वतंत्र उच्चार ऐकू शकता.</li>
        </ul>
      </div>
    </div>
  );
}
