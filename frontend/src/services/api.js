const API_BASE = 'http://127.0.0.1:8000';

/**
 * Checks if the FastAPI backend server is accessible
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches practice sentences from backend or falls back to local data
 */
export async function fetchSentences(defaultList) {
  try {
    const res = await fetch(`${API_BASE}/api/sentences`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      return data.sentences || defaultList;
    }
  } catch {
    // Backend offline, use default list
  }
  return defaultList;
}

/**
 * Analyzes recorded audio file by uploading it to the FastAPI backend
 */
export async function analyzeAudioWithBackend(audioBlob, targetText, durationSec) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('target_text', targetText);
  formData.append('duration_sec', durationSec.toString());

  const res = await fetch(`${API_BASE}/api/analyze-audio`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Server speech analysis failed.');
  }

  return await res.json();
}

/**
 * Analyzes spoken text against target text (backend or client fallback)
 */
export async function analyzeText(targetText, spokenText, durationSec = 0) {
  try {
    const res = await fetch(`${API_BASE}/api/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_text: targetText,
        spoken_text: spokenText,
        duration_sec: durationSec
      }),
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // If backend is not running, execute client-side evaluator!
  }

  return localPronunciationAnalysis(targetText, spokenText, durationSec);
}

/**
 * Plays text aloud using native Browser SpeechSynthesis with chosen speed
 */
export function playNativeAudio(text, rate = 1.0) {
  if (!('speechSynthesis' in window)) {
    alert("Speech Synthesis is not supported in this browser.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.pitch = 1.0;

  // Prefer natural English voices if available
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Client-side phonetic & string similarity comparison fallback
 */
function cleanText(text) {
  return text.toLowerCase().replace(/[^\w\s']/g, '').trim().split(/\s+/).filter(Boolean);
}

function stringSimilarity(s1, s2) {
  let longer = s1.toLowerCase();
  let shorter = s2.toLowerCase();
  if (longer.length < shorter.length) {
    [longer, shorter] = [shorter, longer];
  }
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  
  // Levenshtein distance
  const costs = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longerLength - costs[shorter.length]) / longerLength;
}

export function localPronunciationAnalysis(targetText, spokenText, durationSec = 0) {
  const targetWords = cleanText(targetText);
  const spokenWords = cleanText(spokenText);

  if (targetWords.length === 0) {
    return {
      overall_score: 0,
      accuracy_percentage: 0,
      completeness_score: 0,
      words: [],
      tips: [],
      summary: "No sentence provided."
    };
  }

  const wordAnalysis = [];
  let totalScore = 0;
  let correctCount = 0;
  const mispronounced = [];

  // Match words sequentially
  let sIdx = 0;
  for (let tIdx = 0; tIdx < targetWords.length; tIdx++) {
    const tWord = targetWords[tIdx];
    const sWord = spokenWords[sIdx];

    if (!sWord) {
      wordAnalysis.push({
        target_word: tWord,
        spoken_word: "",
        status: "missing",
        score: 0,
        comment: "Word skipped or omitted"
      });
      mispronounced.push(tWord);
      continue;
    }

    const sim = stringSimilarity(tWord, sWord);
    const score = Math.round(sim * 100);

    if (tWord === sWord || sim >= 0.9) {
      wordAnalysis.push({
        target_word: tWord,
        spoken_word: sWord,
        status: "correct",
        score: 100,
        comment: "Accurate pronunciation"
      });
      totalScore += 100;
      correctCount++;
      sIdx++;
    } else if (sim >= 0.65) {
      wordAnalysis.push({
        target_word: tWord,
        spoken_word: sWord,
        status: "close",
        score: score,
        comment: `Close accent, heard '${sWord}'`
      });
      totalScore += score;
      correctCount++;
      sIdx++;
    } else {
      // Mispronounced or misrecognized
      wordAnalysis.push({
        target_word: tWord,
        spoken_word: sWord,
        status: "mispronounced",
        score: score,
        comment: `Needs work: heard '${sWord}'`
      });
      totalScore += score;
      mispronounced.push(tWord);
      sIdx++;
    }
  }

  const accuracy = Math.round(totalScore / targetWords.length);
  const completeness = Math.round((correctCount / targetWords.length) * 100);
  const overall = Math.round((accuracy * 0.8) + (completeness * 0.2));

  let wpm = 0;
  let fluency_feedback = "Good tempo.";
  if (durationSec > 0.5 && spokenWords.length > 0) {
    wpm = Math.round((spokenWords.length / durationSec) * 60);
    if (wpm < 80) fluency_feedback = `A bit slow (${wpm} WPM). Try speaking a bit more fluidly.`;
    else if (wpm > 180) fluency_feedback = `Too fast (${wpm} WPM). Slow down slightly for clear articulation.`;
    else fluency_feedback = `Great natural tempo (${wpm} WPM)!`;
  }

  let summary = "Good practice attempt! Keep practicing.";
  if (overall >= 90) summary = "🎉 Outstanding! Your pronunciation is clear, fluent, and highly accurate.";
  else if (overall >= 75) summary = "👍 Very good! Minor errors detected. Focus on the highlighted words to sound native.";
  else if (overall >= 50) summary = "💪 Good effort! Several words need clearer articulation. Listen to the reference audio and try again.";
  else summary = "🌱 Needs practice. Take it slow, pronounce each syllable clearly, and repeat after the native voice.";

  const tips = [];
  if (mispronounced.length > 0) {
    mispronounced.slice(0, 3).forEach(w => {
      tips.push(`💡 **${w}**: Break down the syllables slowly and listen to the reference audio.`);
    });
  } else {
    tips.push("🌟 Excellent work! All words were enunciated with high clarity.");
  }

  // Client-side RAG fallback guides
  const ragGuides = [];
  const queryStr = (mispronounced.join(' ') + ' ' + targetText).toLowerCase();

  if (queryStr.includes('th')) {
    ragGuides.push({
      id: 'th_unvoiced',
      sound: '/θ/',
      title: "Voiceless 'TH' Sound (as in 'Think', 'Cathedral', 'Through')",
      category: 'Fricative Consonants',
      tongue_position: "Place the tip of your tongue gently between your upper and lower front teeth. Do not clamp down.",
      lip_shape: "Relax lips and keep them slightly open.",
      airflow: "Continuous, gentle stream of air over the tongue tip. No vocal cord vibration.",
      common_pitfall: "Replacing /θ/ with /s/ or /t/ (saying 'sink' or 'tink' instead of 'think').",
      minimal_pairs: [
        { target: 'think', contrast: 'sink' },
        { target: 'thick', contrast: 'sick' },
        { target: 'thought', contrast: 'fought' }
      ],
      practice_drill: "The author thought through three thrilling theories."
    });
  }

  if (queryStr.includes('sh') || (queryStr.includes('s') && !ragGuides.length)) {
    ragGuides.push({
      id: 's_vs_sh',
      sound: '/s/ vs /ʃ/',
      title: "Distinguishing 'S' and 'SH' (as in 'Seashells', 'She')",
      category: 'Sibilant Consonants',
      tongue_position: "For /s/: Tongue tip points close behind upper front teeth. For /ʃ/ (sh): Arch blade of tongue toward palate.",
      lip_shape: "For /s/: Smiling lips. For /ʃ/: Flare lips forward in a slight trumpet shape.",
      airflow: "Sharp hissing air for /s/. Broader, softer whooshing air for /ʃ/.",
      common_pitfall: "Collapsing both sounds into /s/ or /sh/ ('see-sells' for 'seashells').",
      minimal_pairs: [
        { target: 'she', contrast: 'sea' },
        { target: 'shells', contrast: 'sells' },
        { target: 'shine', contrast: 'sign' }
      ],
      practice_drill: "She sells shiny seashells by the silent seashore."
    });
  }

  if (!ragGuides.length && (queryStr.includes('r') || queryStr.includes('l'))) {
    ragGuides.push({
      id: 'r_vs_l',
      sound: '/r/ vs /l/',
      title: "Liquid Consonants: American 'R' vs 'L' (as in 'Right', 'Light')",
      category: 'Liquid Consonants',
      tongue_position: "For /r/: Tongue curls back; tip NEVER touches roof of mouth. For /l/: Tip presses firmly on the alveolar ridge.",
      lip_shape: "For /r/: Slightly rounded. For /l/: Neutral lips.",
      airflow: "Resonates through oral cavity for /r/. Lateral air flows past sides of tongue for /l/.",
      common_pitfall: "Flapping the tongue tip against the roof of the mouth for /r/.",
      minimal_pairs: [
        { target: 'right', contrast: 'light' },
        { target: 'red', contrast: 'led' },
        { target: 'road', contrast: 'load' }
      ],
      practice_drill: "Red lorries and yellow lorries roll rapidly along the road."
    });
  }

  const rag_guidance = ragGuides.length > 0 ? {
    retrieved_count: ragGuides.length,
    summary_advice: `Retrieved ${ragGuides.length} articulation guides for target sounds in your speech:`,
    target_words: mispronounced.slice(0, 3),
    guides: ragGuides
  } : null;

  return {
    overall_score: overall,
    accuracy_percentage: accuracy,
    completeness_score: completeness,
    words_per_minute: wpm,
    fluency_feedback,
    target_text: targetText,
    spoken_text: spokenText,
    words: wordAnalysis,
    tips,
    rag_guidance,
    summary
  };
}

/**
 * Calls backend RAG endpoint for custom word coaching
 */
export async function fetchRagCoaching(words, targetSentence = '') {
  try {
    const res = await fetch(`${API_BASE}/api/rag/coaching`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words, target_sentence: targetSentence }),
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // backend offline
  }
  return null;
}


const AUTH_TOKEN_KEY = 'echopronounce_auth_token';
const USER_KEY = 'echopronounce_user_data';

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || null;
}

export function setAuthToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function logoutUser() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Register new user
 */
export async function registerUser(username, email, password) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed.');
    }
    const data = await res.json();
    if (data.token) setAuthToken(data.token);
    if (data.user) setStoredUser(data.user);
    return data;
  } catch (err) {
    if (err.name === 'TimeoutError' || err.message?.includes('Failed to fetch')) {
      // Offline fallback: create local profile so user is never blocked!
      const localUser = {
        id: `local_user_${Date.now()}`,
        username: username,
        email: email,
        streak_count: 1,
        xp: 50,
        level: 1,
        badges: []
      };
      setStoredUser(localUser);
      return { user: localUser, token: 'local_offline_token' };
    }
    throw err;
  }
}

/**
 * Login user
 */
export async function loginUser(usernameOrEmail, password) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_or_email: usernameOrEmail, password }),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid username or password. If you are new, click "Create Account" first!');
    }
    const data = await res.json();
    if (data.token) setAuthToken(data.token);
    if (data.user) setStoredUser(data.user);
    return data;
  } catch (err) {
    if (err.name === 'TimeoutError' || err.message?.includes('Failed to fetch')) {
      // Check if local stored user matches
      const localStored = getStoredUser();
      if (localStored && (localStored.username === usernameOrEmail || localStored.email === usernameOrEmail)) {
        return { user: localStored, token: 'local_offline_token' };
      }
      throw new Error('Backend server is not responding. Please make sure FastAPI is running (http://127.0.0.1:8000), or click "Create Account" to start.');
    }
    throw err;
  }
}


/**
 * Fetches current authenticated user profile
 */
export async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) return getStoredUser();

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        setStoredUser(data.user);
        return data.user;
      }
    }
  } catch {
    // offline
  }
  return getStoredUser();
}

/**
 * Fetches gamification badges
 */
export async function fetchBadges() {
  const token = getAuthToken();
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/api/gamification/badges`, {
      headers,
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const data = await res.json();
      return data.badges || [];
    }
  } catch {
    // fallback
  }
  return [];
}

const LOCAL_STORAGE_HISTORY_KEY = 'echopronounce_practice_history';

/**
 * Loads practice session history from Database (or localStorage fallback)
 */
export async function fetchPracticeHistory() {
  const token = getAuthToken();
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/api/history`, {
      headers,
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.history)) {
        // Sync local storage with DB records
        localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(data.history));
        return data.history;
      }
    }
  } catch {
    // Backend offline, load from local storage
  }

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Saves a new practice session to Database and local storage
 */
export async function savePracticeSession(sessionData) {
  const user = getStoredUser();
  const token = getAuthToken();

  const newEntry = {
    id: sessionData.id || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: user?.id || null,
    timestamp: new Date().toISOString(),
    sentence: sessionData.sentence || sessionData.target_text || '',
    category: sessionData.category || 'General',
    overall_score: sessionData.overall_score || 0,
    accuracy_percentage: sessionData.accuracy_percentage || 0,
    completeness_score: sessionData.completeness_score || 0,
    words_per_minute: sessionData.words_per_minute || 0,
    summary: sessionData.summary || '',
    words_count: sessionData.words ? sessionData.words.length : 0,
    mispronounced_count: sessionData.words
      ? sessionData.words.filter((w) => w.status === 'mispronounced' || w.status === 'missing').length
      : 0
  };

  // 1. Store in localStorage
  let localList = [];
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    localList = stored ? JSON.parse(stored) : [];
  } catch {
    localList = [];
  }
  const updatedList = [newEntry, ...localList].slice(0, 100);
  localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updatedList));

  // 2. Sync to Backend Database if connected
  let updatedUserProgress = null;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/history`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newEntry),
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user_progress) {
        updatedUserProgress = data.user_progress;
        setStoredUser(updatedUserProgress);
      }
    }
  } catch (err) {
    console.info('Database offline, session saved locally.');
  }

  return {
    history: updatedList,
    userProgress: updatedUserProgress
  };
}

/**
 * Deletes a session entry by ID
 */
export async function deletePracticeHistoryItem(id) {
  const token = getAuthToken();
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    const list = stored ? JSON.parse(stored) : [];
    const updated = list.filter((item) => item.id !== id);
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));

    // Delete on backend
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${API_BASE}/api/history/${id}`, {
      method: 'DELETE',
      headers,
      signal: AbortSignal.timeout(2000)
    }).catch(() => {});

    return updated;
  } catch {
    return [];
  }
}

/**
 * Clears all history
 */
export async function clearPracticeHistory() {
  const token = getAuthToken();
  try {
    localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${API_BASE}/api/history`, {
      method: 'DELETE',
      headers,
      signal: AbortSignal.timeout(2000)
    }).catch(() => {});
    return [];
  } catch {
    return [];
  }
}


