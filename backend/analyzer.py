import re
from difflib import SequenceMatcher
from typing import List, Dict, Any
from rag_service import rag_service

# Common English phonetic tips for difficult words or patterns
PHONETIC_TIPS = {
    "pronunciation": "Break down as: pro-NUN-see-AY-shun. Stress is on the 4th syllable.",
    "comfortable": "Often pronounced 'COMF-ter-bull', silent second 'o'.",
    "february": "Commonly pronounced 'FEB-roo-air-ee' or 'FEB-yoo-air-ee'. Don't drop the 'r'.",
    "wednesday": "First 'd' is silent: 'WENZ-day'.",
    "subtle": "The letter 'b' is silent: 'SUT-uhl'.",
    "doubt": "The 'b' is completely silent: 'DOWT'.",
    "receipt": "The 'p' is silent: 'rih-SEET'.",
    "colonel": "Pronounced like 'KER-nul', sounds like kernel.",
    "choir": "Pronounced 'KWY-er', starts with a 'K' sound not 'Ch'.",
    "rhythm": "No vowels in spelling, sounds like 'RIH-thum'.",
    "thorough": "Pronounced 'THUR-oh'.",
    "thought": "Pronounced 'THAWT'. Voiceless 'th' + 'awt'.",
    "through": "Pronounced 'THROO'.",
    "island": "The 's' is silent: 'EYE-land'.",
    "salmon": "The 'l' is silent: 'SAM-un'.",
    "almond": "Often silent 'l': 'AH-mund' or 'AL-mund'.",
    "queue": "Pronounced simply like the letter 'Q': 'KYOO'.",
    "mischievous": "Three syllables: 'MIS-chuh-vus' (not mis-CHEEV-ee-us).",
    "often": "Can be 'OFF-ten' or 'OFF-en' (t is traditionally silent).",
    "schedule": "American: 'SKED-jool', British: 'SHED-yool'.",
}

def clean_text(text: str) -> str:
    """Removes punctuation and normalizes spaces."""
    cleaned = re.sub(r"[^\w\s']", "", text.lower())
    return " ".join(cleaned.split())

def word_similarity(w1: str, w2: str) -> float:
    """Calculates similarity between two individual words (0.0 to 1.0)."""
    return SequenceMatcher(None, w1.lower(), w2.lower()).ratio()

def generate_tips(target_words: List[str], mispronounced: List[str]) -> List[str]:
    """Generates actionable pronunciation tips for mispronounced words."""
    tips = []
    for word in mispronounced:
        clean_w = clean_text(word)
        if clean_w in PHONETIC_TIPS:
            tips.append(f"💡 **{word}**: {PHONETIC_TIPS[clean_w]}")
        elif len(clean_w) > 7:
            tips.append(f"💡 **{word}**: Break it into smaller syllables and practice slowly.")
        elif "th" in clean_w:
            tips.append(f"💡 **{word}**: Place the tip of your tongue gently between your front teeth for the 'th' sound.")
        elif "r" in clean_w:
            tips.append(f"💡 **{word}**: Curl your tongue back slightly without touching the roof of your mouth for the 'r' sound.")
        elif "v" in clean_w or "w" in clean_w:
            tips.append(f"💡 **{word}**: For 'v', touch upper teeth to lower lip. For 'w', round your lips like an 'o'.")

    if not tips:
        tips.append("🌟 Excellent attempt! Keep your intonation steady and enunciate each consonant clearly.")
    return tips

def analyze_pronunciation(target_text: str, spoken_text: str, duration_sec: float = 0.0) -> Dict[str, Any]:
    """
    Compares spoken transcript with target text word-by-word.
    Returns detailed accuracy metrics, word-level feedback, and tips.
    """
    target_clean = clean_text(target_text)
    spoken_clean = clean_text(spoken_text)

    target_tokens = target_clean.split()
    spoken_tokens = spoken_clean.split()

    if not target_tokens:
        return {
            "overall_score": 0,
            "accuracy_percentage": 0,
            "completeness_score": 0,
            "fluency_feedback": "No target text provided.",
            "target_text": target_text,
            "spoken_text": spoken_text,
            "words": [],
            "tips": [],
            "summary": "Please select or type a sentence to practice."
        }

    matcher = SequenceMatcher(None, target_tokens, spoken_tokens)
    word_analysis = []
    total_score = 0.0
    mispronounced_words = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            for idx in range(i1, i2):
                word_analysis.append({
                    "target_word": target_tokens[idx],
                    "spoken_word": spoken_tokens[j1 + (idx - i1)],
                    "status": "correct",
                    "score": 100,
                    "comment": "Accurately pronounced"
                })
                total_score += 100
        elif tag == 'replace':
            t_sub = target_tokens[i1:i2]
            s_sub = spoken_tokens[j1:j2]
            max_len = max(len(t_sub), len(s_sub))
            for k in range(max_len):
                tw = t_sub[k] if k < len(t_sub) else None
                sw = s_sub[k] if k < len(s_sub) else None
                if tw and sw:
                    sim = word_similarity(tw, sw)
                    score = int(sim * 100)
                    if sim >= 0.75:
                        status = "close"
                        comment = f"Close, but heard '{sw}'"
                    else:
                        status = "mispronounced"
                        comment = f"Mispronounced. Heard '{sw}'"
                        mispronounced_words.append(tw)
                    
                    word_analysis.append({
                        "target_word": tw,
                        "spoken_word": sw,
                        "status": status,
                        "score": score,
                        "comment": comment
                    })
                    total_score += score
                elif tw and not sw:
                    word_analysis.append({
                        "target_word": tw,
                        "spoken_word": "",
                        "status": "missing",
                        "score": 0,
                        "comment": "Word was omitted or skipped"
                    })
                    mispronounced_words.append(tw)
                elif sw and not tw:
                    word_analysis.append({
                        "target_word": "",
                        "spoken_word": sw,
                        "status": "extra",
                        "score": 0,
                        "comment": f"Extra word inserted: '{sw}'"
                    })
        elif tag == 'delete':
            # Target words missing in spoken text
            for idx in range(i1, i2):
                word_analysis.append({
                    "target_word": target_tokens[idx],
                    "spoken_word": "",
                    "status": "missing",
                    "score": 0,
                    "comment": "Word omitted"
                })
                mispronounced_words.append(target_tokens[idx])
        elif tag == 'insert':
            # Extra words inserted by user
            for idx in range(j1, j2):
                word_analysis.append({
                    "target_word": "",
                    "spoken_word": spoken_tokens[idx],
                    "status": "extra",
                    "score": 0,
                    "comment": f"Extra word: '{spoken_tokens[idx]}'"
                })

    # Calculate overall metrics
    target_count = len(target_tokens)
    spoken_count = len(spoken_tokens)

    # Base score on target words
    accuracy_percentage = round(total_score / target_count, 1) if target_count > 0 else 0
    accuracy_percentage = min(100.0, max(0.0, accuracy_percentage))

    # Completeness calculation
    words_spoken_correctly = sum(1 for w in word_analysis if w["status"] in ["correct", "close"])
    completeness_score = round((words_spoken_correctly / target_count) * 100, 1) if target_count > 0 else 0

    # Fluency / Speed calculation (Words Per Minute)
    wpm = 0
    fluency_feedback = "Good tempo."
    if duration_sec > 0.5 and spoken_count > 0:
        wpm = round((spoken_count / duration_sec) * 60)
        if wpm < 80:
            fluency_feedback = f"A bit slow ({wpm} WPM). Try speaking a little more naturally."
        elif wpm > 180:
            fluency_feedback = f"Too fast ({wpm} WPM). Slow down to clearly enunciate consonants."
        else:
            fluency_feedback = f"Great natural pace ({wpm} WPM)!"

    # Overall combined score (80% accuracy + 20% completeness)
    overall_score = round((accuracy_percentage * 0.8) + (completeness_score * 0.2))

    # Qualitative verdict
    if overall_score >= 90:
        summary = "🎉 Outstanding! Your pronunciation is clear, fluent, and highly accurate."
    elif overall_score >= 75:
        summary = "👍 Very good! Minor errors detected. Focus on the highlighted words to sound native."
    elif overall_score >= 50:
        summary = "💪 Good effort! Several words need clearer articulation. Listen to the reference audio and try again."
    else:
        summary = "🌱 Needs practice. Take it slow, pronounce each syllable clearly, and repeat after the native voice."

    tips = generate_tips(target_tokens, mispronounced_words)

    # RAG: Retrieve targeted phonetic mouth/tongue articulation guides
    rag_guidance = None
    try:
        query_words = mispronounced_words if mispronounced_words else target_tokens[:3]
        rag_guidance = rag_service.generate_coaching(query_words, target_text)
    except Exception:
        rag_guidance = None

    return {
        "overall_score": overall_score,
        "accuracy_percentage": accuracy_percentage,
        "completeness_score": completeness_score,
        "words_per_minute": wpm,
        "fluency_feedback": fluency_feedback,
        "target_text": target_text,
        "spoken_text": spoken_text,
        "words": word_analysis,
        "tips": tips,
        "rag_guidance": rag_guidance,
        "summary": summary
    }
