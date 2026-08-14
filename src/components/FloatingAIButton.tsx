'use client';
import { useState, useEffect } from "react";
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function FloatingAIButton() {
    const pathname = usePathname();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([
        { role: 'system', text: 'ሰላም! እኔ Tsehay AI ነኝ። ምን ልርዳዎት?' }
    ]);
    const [input, setInput] = useState('');
    const [savedIndices, setSavedIndices] = useState<Record<number, boolean>>({});

    // Load Persistent Chat History
    useEffect(() => {
        let isMounted = true;
        const storageKey = user?.uid ? `tsehay-ai-chat_${user.uid}` : 'tsehay-ai-chat';
        
        // 1. Load from localStorage
        try {
            const saved = localStorage.getItem(storageKey) || localStorage.getItem('tsehay-ai-chat');
            if (saved && isMounted) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed);
                }
            }
        } catch (e) {}

        // 2. Fetch from Firestore if user is authenticated
        if (user?.uid) {
            const fetchChatHistory = async () => {
                try {
                    const chatRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'history');
                    const snap = await getDoc(chatRef);
                    if (isMounted && snap.exists() && Array.isArray(snap.data().messages) && snap.data().messages.length > 0) {
                        setMessages(snap.data().messages);
                        try { localStorage.setItem(storageKey, JSON.stringify(snap.data().messages)); } catch (e) {}
                    }
                } catch (err) {
                    console.warn("Could not load AI chat history:", err);
                }
            };
            fetchChatHistory();
        }

        const handleToggle = () => setIsOpen(prev => !prev);
        window.addEventListener('toggle-ai', handleToggle);
        document.addEventListener('toggle-ai', handleToggle);
        return () => {
            isMounted = false;
            window.removeEventListener('toggle-ai', handleToggle);
            document.removeEventListener('toggle-ai', handleToggle);
        };
    }, [user]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        
        const userMsg = input.trim();
        const newMsgs = [...messages, { role: 'user', text: userMsg }];
        setMessages(newMsgs);
        setInput('');
        
        const storageKey = user?.uid ? `tsehay-ai-chat_${user.uid}` : 'tsehay-ai-chat';
        try { localStorage.setItem(storageKey, JSON.stringify(newMsgs)); } catch (e) {}

        if (user?.uid) {
            (async () => {
                try {
                    const chatRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'history');
                    await setDoc(chatRef, { messages: newMsgs, updatedAt: serverTimestamp() }, { merge: true });
                } catch (e) {}
            })();
        }
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userMsg })
            });
            const data = await response.json();
            const reply = data.reply || data.error || "ይቅርታ፣ አሁን ላይ መመለስ አልቻልኩም።";
            const finalMsgs = [...newMsgs, { role: 'system', text: reply }];
            setMessages(finalMsgs);

            try { localStorage.setItem(storageKey, JSON.stringify(finalMsgs)); } catch (e) {}
            if (user?.uid) {
                try {
                    const chatRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'history');
                    await setDoc(chatRef, { messages: finalMsgs, updatedAt: serverTimestamp() }, { merge: true });
                } catch (e) {}
            }
        } catch (error: any) {
            const errorMsgs = [...newMsgs, { role: 'system', text: "ይቅርታ፣ የሲስተም ችግር አጋጥሟል! እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።" }];
            setMessages(errorMsgs);
        }
    };

    const handleSaveToNotes = async (text: string, index: number) => {
        setSavedIndices(prev => ({ ...prev, [index]: true }));

        const noteItem = {
            id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 7),
            text: text.trim(),
            createdAt: new Date().toLocaleString('am-ET', { dateStyle: 'medium', timeStyle: 'short' }),
            lessonTitle: 'Tsehay AI ማስታወሻ',
            courseId: 'general',
            source: 'ai'
        };

        // Dispatch global events
        window.dispatchEvent(new CustomEvent('add-to-notes', { detail: { text, title: 'Tsehay AI ማስታወሻ' } }));
        document.dispatchEvent(new CustomEvent('add-to-notes', { detail: { text, title: 'Tsehay AI ማስታወሻ' } }));

        let currentNotes: any[] = [];
        try {
            const cached = user?.uid 
                ? (localStorage.getItem(`tsehay_user_notes_${user.uid}`) || localStorage.getItem('tsehay_user_notes_all'))
                : localStorage.getItem('tsehay_user_notes_all');
            if (cached) currentNotes = JSON.parse(cached);
        } catch (e) {}

        const filtered = currentNotes.filter(n => n.text !== noteItem.text);
        const updatedNotes = [noteItem, ...filtered];

        try {
            if (user?.uid) {
                localStorage.setItem(`tsehay_user_notes_${user.uid}`, JSON.stringify(updatedNotes));
            }
            localStorage.setItem('tsehay_user_notes_all', JSON.stringify(updatedNotes));
        } catch (e) {}

        // Also persist to Firestore if user is authenticated
        if (user?.uid) {
            try {
                const notesRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'notes', 'all_notes');
                await setDoc(notesRef, { list: updatedNotes, updatedAt: serverTimestamp() }, { merge: true });
            } catch (err) {
                console.error("Error saving note from floating AI:", err);
            }
        }
    };

    const handleClearChat = async () => {
        if (!confirm('የ Tsehay AI ቻት ታሪክዎን ማጥፋት እርግጠኛ ነዎት? (ከጠፋ በኋላ አይመለስም)')) return;
        const initial = [{ role: 'system', text: 'ሰላም! እኔ Tsehay AI ነኝ። ምን ልርዳዎት?' }];
        setMessages(initial);

        const storageKey = user?.uid ? `tsehay-ai-chat_${user.uid}` : 'tsehay-ai-chat';
        try { localStorage.removeItem(storageKey); } catch (e) {}
        try { localStorage.removeItem('tsehay-ai-chat'); } catch (e) {}

        if (user?.uid) {
            try {
                const chatRef = doc(db, 'artifacts', 'tsehaycampus-e1a6d', 'users', user.uid, 'ai_chat', 'history');
                await setDoc(chatRef, { messages: initial, updatedAt: serverTimestamp() });
            } catch (e) {}
        }
    };

    if (pathname === '/dashboard') {
        return null;
    }

    return (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[100] flex flex-col items-end">
            {/* Chat Modal */}
            {isOpen && (
                <div className="bg-white dark:bg-slate-800 w-[calc(100vw-2rem)] sm:w-[360px] h-[68vh] sm:h-[500px] mb-3 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
                    {/* Header */}
                    <div className="bg-primary p-4 flex items-center justify-between shadow-md z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary text-xl">
                                <i className="fa-solid fa-robot"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-dark font-heading leading-tight">Tsehay AI</h3>
                                <div className="flex items-center gap-1.5 text-[10px] text-dark/85 font-extrabold uppercase tracking-wider mt-0.5">
                                    <span>Powered by</span>
                                    <a href="https://tsehay360.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity">
                                        <img 
                                            src="/tsehay-digital-logo.jpg" 
                                            alt="Tsehay Digital" 
                                            className="h-4 w-4 object-contain rounded-xs drop-shadow-xs" 
                                        />
                                        <span className="font-black text-amber-700 dark:text-amber-400">TSEHAY DIGITAL</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleClearChat} 
                                className="text-dark hover:bg-black/10 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer" 
                                title="ታሪክ አፅዳ (Clear Chat)"
                            >
                                <i className="fa-solid fa-trash text-sm"></i>
                            </button>
                            <button 
                                onClick={() => setIsOpen(false)} 
                                className="text-dark hover:bg-black/10 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    </div>
                    
                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-900/50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-secondary text-white rounded-br-none' : 'bg-white dark:bg-slate-700 dark:text-white text-dark shadow-sm rounded-bl-none border border-gray-100 dark:border-gray-600'}`}>
                                    {m.text}
                                </div>
                                {m.role !== 'user' && i > 0 && (
                                    <button 
                                        onClick={() => handleSaveToNotes(m.text, i)} 
                                        className={`mt-2 text-[11px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
                                            savedIndices[i]
                                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                                                : 'bg-amber-400/20 hover:bg-amber-400 dark:bg-amber-500/20 dark:hover:bg-amber-400 text-amber-800 dark:text-amber-300 hover:text-dark border-amber-400/40'
                                        }`}
                                    >
                                        <i className={`fa-solid ${savedIndices[i] ? 'fa-circle-check text-emerald-600 dark:text-emerald-400' : 'fa-bookmark text-[10px]'}`}></i> 
                                        <span>{savedIndices[i] ? '✓ ወደ ማስታወሻ ተመዝግቧል' : 'ወደ ማስታወሻ አድ አድርግ'}</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {/* Input */}
                    <div className="p-3 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-gray-700">
                        <form onSubmit={sendMessage} className="relative">
                            <input 
                                type="text" 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="ጥያቄዎን ይፃፉ..." 
                                className="w-full bg-gray-100 dark:bg-slate-900 border-none rounded-full py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-primary dark:text-white"
                            />
                            <button type="submit" disabled={!input.trim()} className="absolute right-1 top-1 w-10 h-10 bg-primary text-dark rounded-full flex items-center justify-center hover:bg-yellow-400 disabled:opacity-50 transition cursor-pointer">
                                <i className="fa-solid fa-paper-plane text-xs"></i>
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Floating Button */}
            <button onClick={() => setIsOpen(!isOpen)} className="w-14 h-14 bg-primary text-dark rounded-full shadow-[0_10px_25px_rgba(249,176,60,0.5)] flex items-center justify-center text-3xl hover:scale-105 transition-transform relative cursor-pointer">
                <i className="fa-solid fa-robot"></i>
                {!isOpen && <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
            </button>
        </div>
    );
}
