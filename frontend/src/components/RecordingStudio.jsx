import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, RefreshCw, Activity, AlertTriangle } from 'lucide-react';
import { analyzeText, analyzeAudioWithBackend } from '../services/api';

export default function RecordingStudio({
  targetSentence,
  onAnalysisResult,
  setIsAnalyzing,
  isAnalyzing,
  isBackendOnline
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [speechError, setSpeechError] = useState(null);

  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const spokenTranscriptRef = useRef('');
  const recordingStartTimeRef = useRef(0);

  // Initialize Web Speech Recognition if available in browser
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        spokenTranscriptRef.current = transcript.trim();
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition notice:', err.error);
      };

      speechRecognitionRef.current = recognition;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, []);

  const startVisualizer = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#6366f1');
          gradient.addColorStop(0.5, '#ec4899');
          gradient.addColorStop(1, '#38bdf8');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, (canvas.height - barHeight) / 2, barWidth - 3, Math.max(barHeight, 4), 3);
          ctx.fill();

          x += barWidth;
        }
      };

      draw();
    } catch (e) {
      console.warn('Visualizer setup error:', e);
    }
  };

  const startRecording = async () => {
    setSpeechError(null);
    spokenTranscriptRef.current = '';
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startVisualizer(stream);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());

        // Process Speech
        await evaluateSpeech(blob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      setRecordingTime(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start Web Speech Recognition
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch {
          // already started or not ready
        }
      }
    } catch (err) {
      console.error('Mic access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setSpeechError('Microphone permission blocked. Click the lock/settings icon 🔒 next to localhost:3000 in your browser address bar and set Microphone to "Allow", then refresh.');
      } else {
        setSpeechError('Could not access microphone. Please check your mic connection and browser permissions.');
      }
    }

  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    stopEverything();
  };

  const stopEverything = () => {
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
    }
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const evaluateSpeech = async (blob) => {
    setIsAnalyzing(true);
    const duration = Math.max(1, (Date.now() - recordingStartTimeRef.current) / 1000);

    try {
      let result = null;

      // If backend is active and we have an audio blob, attempt backend analysis
      if (isBackendOnline && blob) {
        try {
          result = await analyzeAudioWithBackend(blob, targetSentence.sentence, duration);
        } catch (backendErr) {
          console.warn('Backend audio analysis failed, falling back to transcript evaluation:', backendErr);
        }
      }

      // If result not yet obtained, evaluate transcript
      if (!result) {
        const transcript = spokenTranscriptRef.current || '';
        result = await analyzeText(targetSentence.sentence, transcript, duration);
      }

      onAnalysisResult(result);
    } catch (err) {
      console.error('Evaluation failed:', err);
      setSpeechError('Failed to analyze pronunciation. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-5 bg-pink-500 rounded-full"></span>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Speech Studio
          </h2>
        </div>
        <div className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-400">
          {formatTimer(recordingTime)}
        </div>
      </div>

      {speechError && (
        <div className="w-full mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Canvas Visualizer */}
      <div className="w-full h-24 bg-slate-950/80 border border-slate-800/80 rounded-xl overflow-hidden relative mb-6 flex items-center justify-center">
        <canvas ref={canvasRef} width={600} height={96} className="w-full h-full" />
        {!isRecording && (
          <div className="absolute text-xs text-slate-600 flex items-center space-x-1.5 pointer-events-none">
            <Activity className="w-4 h-4" />
            <span>Audio waveform will dance here while you speak</span>
          </div>
        )}
      </div>

      {/* Main Record Button with Pulse Glow */}
      <div className="relative flex flex-col items-center">
        {isRecording && (
          <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 blur-lg animate-pulse-glow" />
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isAnalyzing}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition transform active:scale-95 focus:outline-none ${
            isRecording
              ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/40 text-white'
              : 'bg-gradient-to-tr from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-indigo-600/30 text-white'
          }`}
        >
          {isRecording ? <Square className="w-7 h-7" /> : <Mic className="w-8 h-8" />}
        </button>
      </div>

      <p className="text-sm font-medium text-slate-200 mt-4 text-center">
        {isRecording
          ? 'Listening... Speak clearly into your mic, then tap Stop'
          : isAnalyzing
          ? 'AI is analyzing your pronunciation...'
          : 'Tap microphone and read the sentence out loud'}
      </p>

      <p className="text-xs text-slate-500 mt-1">
        Evaluates syllable articulation, word cadence, and phonetic accuracy
      </p>

      {/* Audio Playback after recording */}
      {audioUrl && !isRecording && (
        <div className="w-full mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-400">Your Voice:</span>
            <audio src={audioUrl} controls className="h-8 max-w-[260px]" />
          </div>

          <button
            onClick={() => evaluateSpeech(audioBlob)}
            disabled={isAnalyzing}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 font-medium transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>Re-evaluate</span>
          </button>
        </div>
      )}
    </div>
  );
}
