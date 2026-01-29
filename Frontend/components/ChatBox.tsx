
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, X, MessageSquare, ExternalLink, Sparkles } from 'lucide-react';
import { Message } from '../types';
import { chatWithAI } from '../services/aiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isEmbedded?: boolean;
}

const QUICK_REPLIES = [
  "1-minute breathing exercise",
  "How to reduce stress now?",
  "Explain my test results",
  "Give me focus tips",
  "How does ZenGauge work?"
];

const ChatBox: React.FC<Props> = ({ isOpen, onClose, isEmbedded = false }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: "Hello! I'm your ZenGauge assistant. Feel free to ask me anything about managing stress, your results, or finding healthy habits.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const response = await chatWithAI([...messages, userMsg]);
    setMessages(prev => [...prev, response]);
    setIsLoading(false);
  };

  const handleSend = () => sendMessage(input);

  const containerClass = isEmbedded
    ? "w-full h-full flex flex-col bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden"
    : "fixed bottom-6 right-6 w-96 h-[500px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-4 duration-300";

  if (!isOpen && !isEmbedded) return (
    <button
      onClick={() => onClose()}
      className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-all z-50 animate-bounce"
    >
      <MessageSquare size={24} />
    </button>
  );

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Bot size={22} />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight block">Cognitive Assistant</span>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Powered by Gemini Thinking</span>
          </div>
        </div>
        {!isEmbedded && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${m.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-none'
                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
              }`}>
              <div className="flex flex-col gap-3">
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                {m.sources && (
                  <div className={`pt-3 border-t space-y-2 ${m.role === 'user' ? 'border-white/20' : 'border-slate-100'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${m.role === 'user' ? 'text-white/60' : 'text-slate-400'}`}>Grounding Sources</p>
                    <div className="flex flex-wrap gap-2">
                      {m.sources.map((s, si) => (
                        <a
                          key={si}
                          href={s.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-colors ${m.role === 'user'
                              ? 'border-white/20 hover:bg-white/10 text-white'
                              : 'border-indigo-100 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-50'
                            }`}
                        >
                          <ExternalLink size={10} /> {s.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className={`text-[10px] opacity-40 block mt-2 font-medium ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 rounded-tl-none shadow-sm flex items-center gap-3">
              <Loader2 size={16} className="animate-spin text-indigo-600" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assistant is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input & Quick Replies */}
      <div className="p-6 border-t border-slate-100 bg-white space-y-4">
        {!isLoading && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
            {QUICK_REPLIES.map((reply, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(reply)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full border border-indigo-100 bg-indigo-50/30 text-indigo-600 text-[11px] font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles size={12} className="text-indigo-400" />
                {reply}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe how you're feeling or ask for advice..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-slate-400 font-medium"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-all disabled:opacity-30 shadow-md shadow-indigo-100"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
