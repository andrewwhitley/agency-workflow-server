import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MessageCircle, Send, Plus, Trash2, ArrowLeft } from 'lucide-react';
import type { FamilyMember, Conversation, ChatMessage } from '../types';
import { getConversations, getMessages, createConversation, deleteConversation, streamChat } from '../api';
import { EmptyState } from '../components/EmptyState';

interface OutletCtx {
  activeMember: FamilyMember | null;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function formatMarkdown(text: string) {
  // Simple markdown: bold, italic, lists, headers
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h4 class="font-semibold text-base mt-3 mb-1">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 class="font-semibold text-lg mt-3 mb-1">$1</h3>')
    .replace(/^# (.*$)/gm, '<h2 class="font-bold text-xl mt-3 mb-1">$1</h2>')
    .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4">$1. $2</li>')
    .replace(/\n/g, '<br/>');
}

export function ChatPage() {
  const { activeMember, addToast } = useOutletContext<OutletCtx>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showList, setShowList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadConversations = async () => {
    if (!activeMember) return;
    try {
      const data = await getConversations(activeMember.id);
      setConversations(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadConversations(); setActiveConv(null); setMessages([]); }, [activeMember?.id]);

  const loadMessages = async (convId: string) => {
    try {
      const msgs = await getMessages(convId);
      setMessages(msgs);
      setActiveConv(convId);
      setShowList(false);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = async () => {
    if (!input.trim() || !activeMember || streaming) return;
    const userMsg = input.trim();
    setInput('');
    setStreaming(true);
    setStreamingText('');

    // Add user message to display immediately
    setMessages((prev) => [...prev, {
      id: 'temp-' + Date.now(),
      conversation_id: activeConv || '',
      role: 'user',
      content: userMsg,
      created_at: new Date().toISOString(),
    }]);

    let fullResponse = '';
    let finalConvId = activeConv;

    abortRef.current = streamChat(userMsg, activeMember.id, activeConv || undefined, (event) => {
      if (event.type === 'text') {
        fullResponse += event.content;
        setStreamingText(fullResponse);
        if (event.conversationId && !finalConvId) {
          finalConvId = event.conversationId;
          setActiveConv(event.conversationId);
        }
      } else if (event.type === 'done') {
        setStreaming(false);
        setStreamingText('');
        setMessages((prev) => [...prev, {
          id: 'resp-' + Date.now(),
          conversation_id: finalConvId || '',
          role: 'assistant',
          content: fullResponse,
          created_at: new Date().toISOString(),
        }]);
        loadConversations();
      } else if (event.type === 'error') {
        setStreaming(false);
        setStreamingText('');
        addToast(event.content, 'error');
      }
    });
  };

  const handleNewChat = async () => {
    if (!activeMember) return;
    try {
      const conv = await createConversation(activeMember.id);
      setActiveConv(conv.id);
      setMessages([]);
      setShowList(false);
      loadConversations();
    } catch (err) { addToast(String(err), 'error'); }
  };

  const handleDeleteConv = async (id: string) => {
    try {
      await deleteConversation(id);
      if (activeConv === id) { setActiveConv(null); setMessages([]); setShowList(true); }
      loadConversations();
    } catch (err) { addToast(String(err), 'error'); }
  };

  if (!activeMember) {
    return <EmptyState icon={MessageCircle} title="Select a family member" description="Choose a family member to chat with the AI wellness assistant." />;
  }

  // Mobile: show list or chat
  const chatView = (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-600 bg-dark-800">
        <button onClick={() => setShowList(true)} className="lg:hidden p-1 text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <MessageCircle className="w-5 h-5 text-emerald-400" />
        <span className="font-medium text-sm">
          {conversations.find((c) => c.id === activeConv)?.title || 'New Conversation'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="text-center py-12 text-gray-500">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p className="text-sm">Ask me about {activeMember.name}'s health, labs, symptoms, or protocols.</p>
            <p className="text-xs mt-1 text-gray-600">I use functional medicine optimal ranges, not conventional ranges.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-emerald-500 text-white rounded-br-md'
                : 'bg-dark-700 text-gray-200 rounded-bl-md'
            }`}>
              {msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {streaming && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-bl-md bg-dark-700 text-gray-200 px-4 py-3 text-sm">
              <div dangerouslySetInnerHTML={{ __html: formatMarkdown(streamingText) }} />
              <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-0.5" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-dark-600 p-3 bg-dark-800">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about health, labs, protocols..."
            disabled={streaming}
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5 text-center">AI wellness assistant — not medical advice</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] lg:h-dvh">
      {/* Conversations list */}
      <div className={`${showList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-72 border-r border-dark-600 bg-dark-800`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600">
          <h2 className="font-semibold text-sm">Conversations</h2>
          <button onClick={handleNewChat} className="p-1.5 text-emerald-400 hover:text-emerald-300">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              <p>No conversations yet.</p>
              <button onClick={() => { setShowList(false); setActiveConv(null); setMessages([]); }}
                className="text-emerald-400 text-xs mt-2 hover:underline">
                Start chatting
              </button>
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-2 px-4 py-3 border-b border-dark-700/50 cursor-pointer hover:bg-dark-700 ${
                  activeConv === c.id ? 'bg-dark-700' : ''
                }`}
              >
                <button onClick={() => loadMessages(c.id)} className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium truncate">{c.title}</div>
                  <div className="text-xs text-gray-500">{c.message_count} messages</div>
                </button>
                <button onClick={() => handleDeleteConv(c.id)} className="p-1 text-gray-600 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`${showList ? 'hidden' : 'flex'} lg:flex flex-col flex-1`}>
        {chatView}
      </div>
    </div>
  );
}
