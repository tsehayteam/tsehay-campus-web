'use client';
import { useState, useEffect } from "react";
import { usePathname } from 'next/navigation';

export default function FloatingAIButton() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{ role: 'system', text: 'ሰላም! እኔ Tsehay AI ነኝ። ምን ልርዳዎት?' }]);
    const [input, setInput] = useState('');


    useEffect(() => {
        const saved = localStorage.getItem('tsehay-ai-chat');
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (e) {}
        }

        const handleToggle = () => setIsOpen(prev => !prev);
        document.addEventListener('toggle-ai', handleToggle);
        return () => document.removeEventListener('toggle-ai', handleToggle);
    }, []);

    useEffect(() => {
        localStorage.setItem('tsehay-ai-chat', JSON.stringify(messages));
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        
        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userMsg })
            });
            const data = await response.json();
            const reply = data.reply || data.error || "ይቅርታ፣ አሁን ላይ መመለስ አልቻልኩም።";
            setMessages(prev => [...prev, { role: 'system', text: reply }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'system', text: `ስህተት: ${error?.message || error || "ያልታወቀ ስህተት"}` }]);
        }
    };

    if (pathname !== '/dashboard') {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
            {/* Chat Modal */}
            {isOpen && (
                <div className="bg-white dark:bg-slate-800 w-[90vw] sm:w-[350px] h-[60vh] sm:h-[500px] mb-4 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
                    {/* Header */}
                    <div className="bg-primary p-4 flex items-center justify-between shadow-md z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary text-xl">
                                <i className="fa-solid fa-robot"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-dark font-heading leading-tight">Tsehay AI</h3>
                                <p className="text-[10px] text-dark/70 font-bold">Online</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => { if(confirm('Are you sure you want to delete chat history?')) setMessages([{ role: 'system', text: 'ሰላም! እኔ Tsehay AI ነኝ። ምን ልርዳዎት?' }]); }} className="text-dark hover:bg-black/10 w-8 h-8 rounded-full flex items-center justify-center transition" title="Clear Chat">
                                <i className="fa-solid fa-trash text-sm"></i>
                            </button>
                            <button onClick={() => setIsOpen(false)} className="text-dark hover:bg-black/10 w-8 h-8 rounded-full flex items-center justify-center transition">
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
                                {m.role === 'system' && i > 0 && (
                                    <button onClick={() => alert('ወደ ኖት ታክሏል! (Added to notes)')} className="text-[10px] text-slate-500 hover:text-primary mt-1 flex items-center gap-1 transition">
                                        <i className="fa-solid fa-plus"></i> ወደ ኖት አድ አድርግ
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
                            <button type="submit" disabled={!input.trim()} className="absolute right-1 top-1 w-10 h-10 bg-primary text-dark rounded-full flex items-center justify-center hover:bg-yellow-400 disabled:opacity-50 transition">
                                <i className="fa-solid fa-paper-plane text-xs"></i>
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Floating Button */}
            <button onClick={() => setIsOpen(!isOpen)} className="w-14 h-14 bg-primary text-dark rounded-full shadow-[0_10px_25px_rgba(249,176,60,0.5)] flex items-center justify-center text-3xl hover:scale-105 transition-transform relative">
                <i className="fa-solid fa-robot"></i>
                {!isOpen && <span className="absolute 1 top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
            </button>
        </div>
    );
}
