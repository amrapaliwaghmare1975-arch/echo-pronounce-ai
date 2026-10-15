# 🎙️ EchoPronounce AI - Pronunciation Feedback & Speech Coach

AI Pronunciation Feedback Tool चे आधुनिक **React Frontend** आणि **Python FastAPI Backend**.

---

## 🚀 Frontend Run कसे करावे (React + Vite + Tailwind CSS)

1. **Frontend डिरेक्टरीमध्ये जा:**
   ```bash
   cd c:\Users\DELL\Desktop\SUHA\pronunciation-tool\frontend
   ```

2. **Dependencies इन्स्टॉल करा:**
   ```bash
   npm install
   ```

3. **Development Server सुरू करा:**
   ```bash
   npm run dev
   ```
   ब्राउझरमध्ये `http://localhost:3000` ओपन होईल.

---

## 🐍 Backend Run कसे करावे (FastAPI)

1. **Backend डिरेक्टरीमध्ये जा:**
   ```bash
   cd c:\Users\DELL\Desktop\SUHA\pronunciation-tool\backend
   ```

2. **आवश्यक पॅकेजेस इन्स्टॉल करा:**
   ```bash
   pip install -r requirements.txt
   ```

3. **FastAPI सर्व्हर सुरू करा:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   API Swagger Docs: `http://localhost:8000/docs`

---

## ✨ Features (वैशिष्ट्ये):

1. **Dual AI Mode (हायब्रिड सपोर्ट):**
   - Backend चालू नसतानाही Browser Web Speech API ने त्वरित 100% काम करते.
   - Backend चालू केल्यावर डीप ऑडिओ स्पेक्ट्रम व सर्व्हर-साइड स्पीच रिकग्निशन सक्रिय होते.

2. **Live Waveform Visualizer:**
   - तुम्ही बोलत असताना ऑडिओ फ्रिक्वेन्सी डान्सिंग वेव्हफॉर्ममध्ये दिसते.

3. **Word-by-Word Color Coded Feedback:**
   - 🟢 **हिरवा (Correct):** अचूक उच्चार
   - 🟡 **पिवळा (Close):** जवळपास बरोबर (स्वल्प उच्चारण फरक)
   - 🔴 **लाल (Mispronounced):** चुकीचा उच्चार
   - ⚪ **राखाडी (Missing):** सुटलेले किंवा न उच्चारलेले शब्द

4. **Interactive Word Modal:**
   - कोणत्याही शब्दावर क्लिक केल्यास AI ने काय ऐकले, अचूक उच्चार काय आहे आणि Native ऑडिओ कसा उच्चारतो हे ऐकू शकता.

5. **Difficulty Levels & Custom Input:**
   - Beginner, Intermediate, Advanced, Tongue Twisters, Business आणि स्वतःचे वाक्य टाईप करण्यासाठी Custom पर्याय.
