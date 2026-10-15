import os
import json
import re
from typing import List, Dict, Any, Optional

KB_PATH = os.path.join(os.path.dirname(__file__), "data", "knowledge_base", "phonetics_kb.json")

class PhoneticRAGService:
    """
    Retrieval-Augmented Generation (RAG) Service for Pronunciation Feedback.
    Retrieves targeted phonetic mouth/tongue articulation guides and minimal-pair drills
    based on detected mispronunciations.
    """

    def __init__(self, kb_path: str = KB_PATH):
        self.kb_path = kb_path
        self.documents: List[Dict[str, Any]] = []
        self.load_knowledge_base()

    def load_knowledge_base(self):
        """Loads and indexes the phonetic knowledge base."""
        if os.path.exists(self.kb_path):
            try:
                with open(self.kb_path, "r", encoding="utf-8") as f:
                    self.documents = json.load(f)
            except Exception as e:
                print(f"[RAG] Warning: Could not load knowledge base from {self.kb_path}: {e}")
                self.documents = []
        else:
            print(f"[RAG] Warning: Knowledge base file not found at {self.kb_path}")
            self.documents = []

    def retrieve(self, words: List[str], top_k: int = 2) -> List[Dict[str, Any]]:
        """
        Retrieves the most relevant articulation guides for a list of target/mispronounced words.
        """
        if not self.documents:
            self.load_knowledge_base()
        if not self.documents or not words:
            return []

        # Clean words
        cleaned_words = [re.sub(r"[^\w']", "", w.lower()).strip() for w in words if w.strip()]
        if not cleaned_words:
            return []

        scored_docs = []

        for doc in self.documents:
            score = 0
            doc_keywords = [k.lower() for k in doc.get("keywords", [])]
            doc_title = doc.get("title", "").lower()
            doc_cat = doc.get("category", "").lower()

            for w in cleaned_words:
                # Exact keyword match (highest weight)
                if w in doc_keywords:
                    score += 10
                # Substring match in keywords
                elif any(w in kw or kw in w for kw in doc_keywords if len(kw) > 3):
                    score += 4
                # Title or category match
                if w in doc_title:
                    score += 5
                if w in doc_cat:
                    score += 2

                # Specific phoneme heuristics
                if "th" in w and ("th_unvoiced" in doc["id"] or "th_voiced" in doc["id"]):
                    score += 6
                if ("sh" in w or (w.startswith("s") and not "sh" in w)) and doc["id"] == "s_vs_sh":
                    score += 5
                if ("r" in w or "l" in w) and doc["id"] == "r_vs_l":
                    score += 4
                if ("v" in w or "w" in w) and doc["id"] == "v_vs_w":
                    score += 5
                if (w.startswith("p") or "pp" in w) and doc["id"] == "p_aspiration":
                    score += 4

            if score > 0:
                scored_docs.append((score, doc))

        # Sort by relevance score descending
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored_docs[:top_k]]

    def get_guide_by_sound(self, sound_id_or_query: str) -> Optional[Dict[str, Any]]:
        """Finds a specific articulation guide by sound ID or symbol."""
        query = sound_id_or_query.lower().strip()
        for doc in self.documents:
            if doc["id"].lower() == query or query in doc.get("sound", "").lower():
                return doc
            if any(query in kw for kw in doc.get("keywords", [])):
                return doc
        return self.documents[0] if self.documents else None

    def generate_coaching(self, mispronounced_words: List[str], target_sentence: str = "") -> Dict[str, Any]:
        """
        Synthesizes retrieved phonetic knowledge into structured, actionable coaching.
        """
        # 1. Retrieve matching guides
        retrieved_guides = self.retrieve(mispronounced_words, top_k=2)

        # If no specific match was found, pick word stress or general guide
        if not retrieved_guides and self.documents:
            retrieved_guides = [self.documents[0]]

        coaching_cards = []
        for guide in retrieved_guides:
            coaching_cards.append({
                "id": guide["id"],
                "sound": guide["sound"],
                "title": guide["title"],
                "category": guide["category"],
                "tongue_position": guide["tongue_position"],
                "lip_shape": guide["lip_shape"],
                "airflow": guide["airflow"],
                "common_pitfall": guide["common_pitfall"],
                "minimal_pairs": guide.get("minimal_pairs", [])[:3],
                "practice_drill": guide.get("practice_drill", "")
            })

        # Summary guidance
        words_label = ", ".join(f"'{w}'" for w in mispronounced_words[:4]) if mispronounced_words else "your practice"
        summary_advice = (
            f"Based on your pronunciation of {words_label}, our RAG engine retrieved "
            f"{len(coaching_cards)} key articulation guides to help you place your tongue and lips correctly."
        )

        return {
            "retrieved_count": len(coaching_cards),
            "summary_advice": summary_advice,
            "target_words": mispronounced_words,
            "guides": coaching_cards
        }

# Global singleton instance
rag_service = PhoneticRAGService()
