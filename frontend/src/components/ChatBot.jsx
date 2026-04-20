import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../utils/api';
import { useResourceContext } from '../context/ResourceContext';
import './ChatBot.css';

const Suggestions = [
  { text: "How do I upload a resource?", icon: "📤", value: "How do I upload a resource?" },
  { text: "Tell me about this project", icon: "💎", value: "What is this platform about?" },
  { text: "How can I contact faculty?", icon: "👨‍🏫", value: "How do I reach the faculty?" },
  { text: "Show me the latest resources", icon: "✨", value: "What are the most recent resources?" }
];

const ChatBot = () => {
  const navigate = useNavigate();
  const { activeResource } = useResourceContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = async (e, customMsg = null) => {
    if (e) e.preventDefault();
    const messageToSend = customMsg || input.trim();
    if (!messageToSend || isTyping) return;

    if (!customMsg) setInput('');
    
    const tempUserMsg = {
      id: Date.now(),
      message: messageToSend,
      role: 'user',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsTyping(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: messageToSend,
          resourceId: activeResource?.id,
          history: messages 
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessages(prev => [...prev, result.data]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }
    } catch (err) {
      console.error('Chat error:', err);
      
      const friendlyError = err.message.includes("quota") || err.message.includes("requests")
        ? "I'm currently very busy helping other students. Please try again in a few moments!"
        : `I'm having a little trouble connecting right now. ${err.message}`;

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        message: friendlyError,
        role: 'model',
        created_at: new Date().toISOString(),
        isError: true
      }]);
    } finally {

      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    setMessages([]);
  };

  return (
    <div className="chatbot-container" aria-label="Academic Assistant Chatbot">
      {!isOpen && (
        <button 
          className="chatbot-bubble" 
          onClick={() => setIsOpen(true)}
          aria-label="Open Chat"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      )}

      {isOpen && (
        <div className="chatbot-window">
          <header className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white' }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </div>
              <div>
                <h3>Academic Assistant</h3>
                <div className="status">Online</div>
              </div>
            </div>
            <div className="chatbot-header-actions">
              {messages.length > 0 && (
                <button 
                  className="chatbot-action-icon clear-btn" 
                  onClick={handleClearChat}
                  title="Clear Chat"
                  aria-label="Clear Chat"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                  </svg>
                </button>
              )}
              <button className="chatbot-close" onClick={() => setIsOpen(false)} aria-label="Close Chat">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </header>

          <div className="chatbot-messages">
            {activeResource && messages.length === 0 && (
              <div className="context-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v14.5" />
                </svg>
                Focusing on: {activeResource.title}
              </div>
            )}

            {messages.length === 0 && (
              <div className="empty-chat">
                <div className="welcome-content">
                  <div className="welcome-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <h2>Hey there! 👋</h2>
                  <p>I'm your Academic Assistant. How can I help you excel today?</p>
                </div>
                
                <div className="suggestion-chips">
                  {Suggestions.map((s, i) => (
                    <button 
                      key={i} 
                      className="suggestion-chip"
                      onClick={() => handleSend(null, s.value)}
                    >
                      <span className="chip-icon">{s.icon}</span>
                      {s.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, index) => {
              const navMatch = msg.message.match(/\[NAVIGATE:(.*?)\|(.*?)\]/);
              const cleanMessage = msg.message.replace(/\[NAVIGATE:.*?\]/g, '').trim();

              return (
                <div key={msg.id || index} className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}>
                  <div className="message-text">{cleanMessage}</div>
                  
                  {navMatch && (
                    <button 
                      className="chat-action-btn" 
                      onClick={() => navigate(navMatch[1])}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                      {navMatch[2]}
                    </button>
                  )}
                  
                  <div className="message-meta">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="message ai">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input-area" onSubmit={handleSend}>
            <div className="chatbot-input-wrapper">
              <input
                type="text"
                placeholder="Message your assistant..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isTyping}
              />
              <button 
                type="submit" 
                className="chatbot-send" 
                disabled={!input.trim() || isTyping}
                aria-label="Send Message"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;

