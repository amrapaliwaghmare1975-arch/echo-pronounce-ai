import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SentenceCard from './components/SentenceCard';
import RecordingStudio from './components/RecordingStudio';
import FeedbackDashboard from './components/FeedbackDashboard';
import WordModal from './components/WordModal';
import HistoryModal from './components/HistoryModal';
import AuthModal from './components/AuthModal';
import { DEFAULT_SENTENCES } from './data/sentences';
import {
  checkBackendHealth,
  fetchSentences,
  fetchPracticeHistory,
  savePracticeSession,
  deletePracticeHistoryItem,
  clearPracticeHistory,
  fetchCurrentUser,
  getStoredUser,
  logoutUser
} from './services/api';

export default function App() {
  const [allSentences, setAllSentences] = useState(DEFAULT_SENTENCES);
  const [currentCategory, setCurrentCategory] = useState('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [customSentence, setCustomSentence] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Check backend server on startup, load history & user profile
  useEffect(() => {
    async function init() {
      const online = await checkBackendHealth();
      setIsBackendOnline(online);
      if (online) {
        const fetched = await fetchSentences(DEFAULT_SENTENCES);
        setAllSentences(fetched);
        const user = await fetchCurrentUser();
        if (user) setCurrentUser(user);
      }
      const initialHistory = await fetchPracticeHistory();
      setHistory(initialHistory);
    }
    init();

    // Recheck health periodically
    const timer = setInterval(async () => {
      const online = await checkBackendHealth();
      setIsBackendOnline(online);
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // Filter sentences by category
  const filteredSentences =
    currentCategory === 'All'
      ? allSentences
      : currentCategory === 'Custom'
      ? []
      : allSentences.filter((s) => s.category.toLowerCase() === currentCategory.toLowerCase());

  // Determine active target sentence
  const activeSentence =
    currentCategory === 'Custom'
      ? customSentence || {
          sentence: 'Type a custom sentence above to practice...',
          phonetic: '',
          focus: 'Custom Practice',
          tip: 'Enter your preferred sentence in the input box.'
        }
      : filteredSentences[currentIndex] || allSentences[0];

  const handleSelectCategory = (cat) => {
    setCurrentCategory(cat);
    setCurrentIndex(0);
    setAnalysis(null);
  };

  const handleSetCustomSentence = (text) => {
    const customObj = {
      id: Date.now(),
      category: 'Custom',
      sentence: text,
      phonetic: '',
      focus: 'User Custom Sentence',
      tip: 'Practice speaking at a steady tempo.'
    };
    setCustomSentence(customObj);
    setAnalysis(null);
  };

  const handleSelectIndex = (idx) => {
    setCurrentIndex(idx);
    setAnalysis(null);
  };

  const handleAnalysisResult = async (res) => {
    setAnalysis(res);
    if (res && res.overall_score !== undefined && activeSentence?.sentence) {
      const resSave = await savePracticeSession({
        ...res,
        sentence: activeSentence.sentence,
        category: activeSentence.category || currentCategory
      });
      setHistory(resSave.history);
      if (resSave.userProgress) {
        setCurrentUser(resSave.userProgress);
      }
    }
  };

  const handleDeleteHistoryItem = async (id) => {
    const updated = await deletePracticeHistoryItem(id);
    setHistory(updated);
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear your practice history?')) {
      const updated = await clearPracticeHistory();
      setHistory(updated);
    }
  };

  const handleSelectSentenceForPractice = (sentenceText, category) => {
    const foundIdx = allSentences.findIndex((s) => s.sentence === sentenceText);
    if (foundIdx !== -1) {
      setCurrentCategory('All');
      setCurrentIndex(foundIdx);
    } else {
      handleSetCustomSentence(sentenceText);
      setCurrentCategory('Custom');
    }
    setAnalysis(null);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    fetchPracticeHistory().then(setHistory);
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    fetchPracticeHistory().then(setHistory);
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans">
      <Header
        isBackendOnline={isBackendOnline}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Sentence + Speech Studio */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <SentenceCard
            sentences={filteredSentences}
            currentIndex={currentIndex}
            onSelectIndex={handleSelectIndex}
            currentCategory={currentCategory}
            onSelectCategory={handleSelectCategory}
            currentSentence={activeSentence}
            onSetCustomSentence={handleSetCustomSentence}
          />

          <RecordingStudio
            targetSentence={activeSentence}
            onAnalysisResult={handleAnalysisResult}
            setIsAnalyzing={setIsAnalyzing}
            isAnalyzing={isAnalyzing}
            isBackendOnline={isBackendOnline}
          />
        </div>

        {/* Right Column (5 cols): Feedback Dashboard & Scoring */}
        <div className="lg:col-span-5">
          <FeedbackDashboard
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            onSelectWord={(word) => setSelectedWord(word)}
          />
        </div>
      </main>

      {/* Word Detail Modal */}
      <WordModal word={selectedWord} onClose={() => setSelectedWord(null)} />

      {/* Database History, Progression & Gamification Badges Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onClearHistory={handleClearHistory}
        onDeleteItem={handleDeleteHistoryItem}
        onSelectSentenceForPractice={handleSelectSentenceForPractice}
        isBackendOnline={isBackendOnline}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Auth Modal (Login / Sign Up / Demo Account) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>EchoPronounce AI React • Powered by React 18, Tailwind CSS, & FastAPI</p>
      </footer>
    </div>
  );
}
