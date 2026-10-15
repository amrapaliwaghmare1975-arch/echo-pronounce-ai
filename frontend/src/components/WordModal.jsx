import React from 'react';
import { X, Volume2, CheckCircle2, AlertCircle } from 'lucide-react';
import { playNativeAudio } from '../services/api';

export default function WordModal({ word, onClose }) {
  if (!word) return null;

  const wordToSpeak = word.target_word || word.spoken_word;
  const isCorrect = word.status === 'correct';
  const isClose = word.status === 'close';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 mb-3">
          <span
            className={`w-3 h-3 rounded-full ${
              isCorrect ? 'bg-emerald-500' : isClose ? 'bg-amber-500' : 'bg-rose-500'
            }`}
          />
          <h3 className="text-lg font-bold text-white capitalize">
            {wordToSpeak}
          </h3>
        </div>

        <div className="space-y-2 text-xs text-slate-300 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 mb-4">
          <div className="flex justify-between">
            <span className="text-slate-400">Target Word:</span>
            <span className="font-bold text-white">{word.target_word || '(None)'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">AI Heard:</span>
            <span className="font-bold text-indigo-400">{word.spoken_word || '(Missed)'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Word Score:</span>
            <span
              className={`font-bold ${
                isCorrect ? 'text-emerald-400' : isClose ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {word.score}%
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800">
            <p className="text-slate-300 leading-relaxed">{word.comment}</p>
          </div>
        </div>

        <button
          onClick={() => playNativeAudio(wordToSpeak)}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition active:scale-95"
        >
          <Volume2 className="w-4 h-4" />
          <span>Pronounce This Word</span>
        </button>
      </div>
    </div>
  );
}
