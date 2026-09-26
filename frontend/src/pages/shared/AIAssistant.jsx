import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { aiService } from '../../services/services';
import { Send, Bot, User, ExternalLink, AlertTriangle, Zap } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const MessageBubble = ({ msg, isDark }) => {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4 animate-fade-in`}>
      <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center
        ${isUser ? 'gradient-primary' : isDark ? 'bg-gray-700' : 'bg-blue-50'}`}>
        {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className={isDark ? 'text-blue-400' : 'text-blue-600'} />}
      </div>
      <div className={`chat-bubble px-4 py-3 ${isUser ? 'chat-user' : 'chat-bot dark:bg-gray-800 dark:text-gray-200'}`}>
        <div className="text-sm whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{
          __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
        }} />
        {msg.department && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <Link
              to={`/patient/book-appointment?department=${encodeURIComponent(msg.department)}`}
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg transition-all"
            >
              <ExternalLink size={12} /> Book with {msg.department}
            </Link>
          </div>
        )}
        {msg.disclaimer && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-gray-600">
            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-start gap-1">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              {msg.disclaimer}
            </p>
          </div>
        )}
        <p className="text-xs opacity-50 mt-2">
          {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

const AIAssistant = () => {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const { data: welcome } = useQuery({
    queryKey: ['ai-welcome'],
    queryFn: () => aiService.getWelcome().then(r => r.data.data),
    onSuccess: (data) => {
      setMessages([{
        id: Date.now(),
        role: 'assistant',
        content: data.message,
        disclaimer: data.disclaimer,
        timestamp: new Date()
      }]);
    }
  });

  const chatMutation = useMutation({
    mutationFn: ({ message }) => aiService.chat(message, messages.map(m => ({ role: m.role, content: m.content }))).then(r => r.data.data),
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: data.message || 'I apologize, I could not process your request.',
        department: data.department,
        disclaimer: data.disclaimer,
        timestamp: new Date()
      }]);
    },
    onError: () => toast.error('Failed to get response. Please try again.')
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || chatMutation.isPending) return;
    const userMessage = input.trim();
    setInput('');

    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    chatMutation.mutate({ message: userMessage });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestion = (suggestion) => {
    setInput(suggestion);
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-180px)] flex flex-col">
      {/* Header */}
      <div className={`card p-4 mb-4 flex items-center gap-4 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
        <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
          <Zap size={22} className="text-white" />
        </div>
        <div>
          <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>AI Health Assistant</h2>
          <p className="text-xs text-slate-400">Symptom guidance & department recommendations</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-green-500 font-medium">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 rounded-2xl border mb-4
        ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-slate-50 border-slate-100'}`}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} isDark={isDark} />
        ))}

        {chatMutation.isPending && (
          <div className="flex gap-3 mb-4">
            <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <Bot size={16} className="text-blue-600" />
            </div>
            <div className={`chat-bubble chat-bot dark:bg-gray-800 px-4 py-3`}>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick suggestions */}
        {messages.length <= 1 && welcome?.quickSuggestions && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {welcome.quickSuggestions.map(s => (
              <button key={s} onClick={() => handleSuggestion(s)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all
                  ${isDark ? 'border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-900/20'
                  : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'}`}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`card p-3 flex gap-3 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
        <textarea
          rows={1}
          className={`flex-1 resize-none outline-none bg-transparent text-sm py-2 px-1
            ${isDark ? 'text-gray-200 placeholder-gray-500' : 'text-slate-800 placeholder-slate-400'}`}
          placeholder="Describe your symptoms or ask a health question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || chatMutation.isPending}
          className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
        >
          <Send size={16} className="text-white" />
        </button>
      </div>
      <p className="text-center text-xs text-slate-400 mt-2">
        ⚕️ Not a substitute for professional medical advice. Always consult a doctor.
      </p>
    </div>
  );
};

export default AIAssistant;
