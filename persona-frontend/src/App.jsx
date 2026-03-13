import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Sparkles, Loader2, Trash2, Plus, MessageSquare, 
  Moon, Sun, PanelRightClose, PanelRightOpen, FileText,
  Paperclip, Cloud 
} from 'lucide-react';

// --- PDF RENDERING ENGINE ---
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// --- GOOGLE DRIVE CONFIG ---
const API_KEY = 'AIzaSyDlcdyvfd7EMA-nPVstI0k0PUTQ1NTZfHs';
const CLIENT_ID = '885835915578-mj43atkiqch34tt8ua7jbognhvjmrpre.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

function App() {
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // --- STATE ---
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark' || !localStorage.getItem('theme'));
  const [showPreview, setShowPreview] = useState(true);
  const [mode, setMode] = useState('web');
  const [activeSessionId, setActiveSessionId] = useState('default-web');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('persona_sessions');
    return saved ? JSON.parse(saved) : {
      web: [{ id: 'default-web', title: 'Web Research', messages: [{ role: 'assistant', content: 'Online and ready. What are we researching today?' }] }],
      study: [{ id: 'default-study', title: '8085 Architecture', pdfData: null, pdfName: null, messages: [{ role: 'assistant', content: 'Study mode initialized. Click **+** to load your reference material.' }] }]
    };
  });
  
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // --- THEME & PERSISTENCE ---
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('persona_sessions', JSON.stringify(sessions));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, isLoading]);

  const currentSession = sessions[mode].find(s => s.id === activeSessionId) || sessions[mode][0];

  // --- GOOGLE DRIVE PICKER LOGIC ---
  const handleDrivePick = () => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (response) => {
        if (response.error) return;
        setAccessToken(response.access_token);
        createPicker(response.access_token);
      },
    });
    tokenClient.requestAccessToken();
  };

  const createPicker = (token) => {
    window.gapi.load('picker', () => {
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.PDFS);
      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setAppId(CLIENT_ID)
        .setOAuthToken(token)
        .addView(view)
        .setDeveloperKey(API_KEY)
        .setCallback(pickerCallback)
        .build();
      picker.setVisible(true);
    });
  };

  const pickerCallback = async (data) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const doc = data.docs[0];
      const fileId = doc.id;
      const fileName = doc.name;

      // Fetch the actual PDF bytes from Google Drive
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const blob = await response.blob();
      
      // Convert to Base64 to save in our session logic
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target.result;
        processFile(new File([blob], fileName, { type: 'application/pdf' }), base64String, fileName);
      };
      reader.readAsDataURL(blob);
    }
  };

  // --- REUSABLE FILE PROCESSOR ---
  const processFile = (rawFile, base64Data, fileName) => {
    setFile(rawFile);
    setIsMenuOpen(false);
    setSessions(prev => ({
      ...prev, [mode]: prev[mode].map(s => s.id === activeSessionId ? { 
        ...s, 
        pdfData: base64Data,
        pdfName: fileName,
        messages: [...s.messages, { role: 'user', type: 'attachment', fileName: fileName }] 
      } : s)
    }));
    setShowPreview(true);
  };

  const handleLocalUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onload = (event) => processFile(uploadedFile, event.target.result, uploadedFile.name);
      reader.readAsDataURL(uploadedFile);
    }
  };

  // --- CORE SEND LOGIC ---
  const handleSend = async () => {
    if (!input.trim()) return;
    const currentInput = input;
    const userMsg = { role: 'user', content: currentInput };
    
    setSessions(prev => ({
      ...prev, [mode]: prev[mode].map(s => s.id === activeSessionId ? { 
        ...s, 
        messages: [...s.messages, userMsg], 
        title: s.messages.filter(m => !m.type).length < 2 ? currentInput.substring(0, 20) : s.title 
      } : s)
    }));
    
    setInput('');
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('session_id', activeSessionId);
      formData.append('question', currentInput);
      
      let response;
      if (mode === 'study') {
        if (file) {
          formData.append('file', file);
          response = await fetch('http://127.0.0.1:8000/upload-and-study', { method: 'POST', body: formData });
          setFile(null);
        } else {
          response = await fetch('http://127.0.0.1:8000/study-ask', { method: 'POST', body: formData });
        }
      } else {
        response = await fetch(`http://127.0.0.1:8000/web-ask?query=${encodeURIComponent(currentInput)}`, { method: 'POST', body: formData });
      }
      
      const data = await response.json();
      const aiAnswer = mode === 'study' ? data.answer : data.response;
      
      setSessions(prev => ({
        ...prev, [mode]: prev[mode].map(s => s.id === activeSessionId ? { 
          ...s, messages: [...s.messages, { role: 'assistant', content: aiAnswer }] 
        } : s)
      }));
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-100 font-sans antialiased overflow-hidden selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors duration-300">
      
      {/* SIDEBAR */}
      <aside className="w-[280px] flex flex-col border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-[#0a0a0a] backdrop-blur-xl z-20 shrink-0">
        <div className="p-5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-zinc-900 dark:bg-zinc-100 rounded-md shadow-sm">
                <Sparkles className="w-4 h-4 text-white dark:text-zinc-900" />
              </div>
              <h1 className="text-[13px] font-bold tracking-wide">Persona AI</h1>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex p-1 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-lg">
            <button onClick={() => {setMode('web'); setActiveSessionId(sessions.web[0].id)}} className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold tracking-wide transition-all ${mode === 'web' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>WEB</button>
            <button onClick={() => {setMode('study'); setActiveSessionId(sessions.study[0].id)}} className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold tracking-wide transition-all ${mode === 'study' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>STUDY</button>
          </div>

          <button onClick={() => {
            const id = Date.now().toString();
            setSessions(prev => ({ ...prev, [mode]: [{ id, title: `New Session`, pdfData: null, pdfName: null, messages: [{ role: 'assistant', content: 'Ready.' }] }, ...prev[mode]] }));
            setActiveSessionId(id);
          }} className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-[12px] font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
             <Plus className="w-3.5 h-3.5" /> New Chat
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-6">
          <p className="px-2 pt-2 pb-3 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider">SESSIONS</p>
          {sessions[mode].map((s) => (
            <div key={s.id} onClick={() => setActiveSessionId(s.id)} className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${activeSessionId === s.id ? 'bg-zinc-200/50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}>
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
              <span className="text-[13px] font-medium truncate flex-1">{s.title}</span>
              <Trash2 onClick={(e) => {
                e.stopPropagation();
                if (sessions[mode].length <= 1) return;
                const updated = sessions[mode].filter(sess => sess.id !== s.id);
                setSessions(prev => ({ ...prev, [mode]: updated }));
                if (activeSessionId === s.id) setActiveSessionId(updated[0].id);
              }} className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all" />
            </div>
          ))}
        </nav>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0a0a0a]">
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800/80 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
             <h2 className="text-[14px] font-semibold">{currentSession?.title}</h2>
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
               <div className={`w-1.5 h-1.5 rounded-full ${mode === 'web' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
               {mode === 'web' ? 'Global Web' : 'Local RAG'}
             </div>
          </div>
          {mode === 'study' && currentSession?.pdfData && (
            <button onClick={() => setShowPreview(!showPreview)} className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
               {showPreview ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          )}
        </header>

        <div className="flex-1 flex min-h-0">
          <div className="flex flex-col flex-1 min-w-0 border-r border-transparent data-[preview=true]:border-zinc-200 dark:data-[preview=true]:border-zinc-800/80 transition-all" data-preview={showPreview && mode === 'study' && currentSession?.pdfData}>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {currentSession.messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type === 'attachment' ? (
                    <div onClick={() => setShowPreview(true)} className="flex items-center gap-3 px-4 py-3 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shadow-sm">
                      <FileText className="w-5 h-5 text-red-500" />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{msg.fileName}</span>
                        <span className="text-[10px] text-zinc-500 font-medium tracking-wider">PDF DOCUMENT</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`max-w-[80%] px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed ${msg.role === 'user' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-br-sm' : 'bg-zinc-50 dark:bg-[#151515] border border-zinc-200 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-200 rounded-bl-sm'}`}>
                      {msg.role === 'assistant' ? <div className="prose dark:prose-invert prose-zinc prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div> : msg.content}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 items-center px-5 py-3.5 bg-zinc-50 dark:bg-[#151515] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl rounded-bl-sm w-fit">
                   <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                   <span className="text-[12px] font-medium text-zinc-500">Processing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* --- GEMINI-STYLE INPUT BAR --- */}
            <div className="p-4 bg-white dark:bg-[#0a0a0a] relative">
              <div className="max-w-3xl mx-auto relative">
                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute bottom-[4.5rem] left-0 w-56 bg-white dark:bg-[#1e1e20] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 z-50 flex flex-col gap-1">
                      <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-sm font-medium transition-colors">
                        <Paperclip className="w-4 h-4 text-zinc-500" />
                        Upload files
                        <input type="file" accept=".pdf,.txt,.docx" onChange={handleLocalUpload} className="hidden" />
                      </label>
                      <button onClick={handleDrivePick} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-sm font-medium transition-colors w-full text-left">
                        <Cloud className="w-4 h-4 text-zinc-500" />
                        Add from Drive
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2 p-1.5 rounded-[2rem] bg-zinc-100 dark:bg-[#1e1e20] border border-zinc-200 dark:border-zinc-800 focus-within:ring-1 focus-within:ring-zinc-300 dark:focus-within:ring-zinc-600 transition-shadow">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-3 m-0.5 rounded-full transition-colors ${isMenuOpen ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}>
                    <Plus className={`w-5 h-5 transition-transform ${isMenuOpen ? 'rotate-45' : ''}`} />
                  </button>
                  <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={mode === 'web' ? "Search global web..." : "Ask about your PDF..."} className="flex-1 max-h-32 min-h-[44px] py-3.5 bg-transparent border-none focus:outline-none focus:ring-0 text-[15px] resize-none" rows={1} />
                  <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-3 mb-0.5 mr-0.5 rounded-full text-zinc-900 dark:text-white disabled:opacity-30 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showPreview && mode === 'study' && currentSession?.pdfData && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: '50%', opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="bg-zinc-50 dark:bg-[#0a0a0a]">
                <div className="w-full h-full p-4 relative group">
                  <div className="w-full h-full overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white shadow-sm rounded-xl">
                    <button onClick={() => setShowPreview(false)} className="absolute top-6 right-8 z-50 p-1.5 bg-zinc-800/80 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      <PanelRightClose className="w-4 h-4" />
                    </button>
                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                      <Viewer fileUrl={currentSession.pdfData} plugins={[defaultLayoutPluginInstance]} theme={darkMode ? 'dark' : 'light'} />
                    </Worker>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;