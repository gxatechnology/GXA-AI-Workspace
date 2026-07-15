import React, { useState } from 'react';
import { 
  Users, 
  MessageSquare, 
  Activity, 
  BarChart3, 
  Send, 
  Check, 
  Loader2, 
  Plus, 
  FolderGit2, 
  Share2, 
  TrendingUp, 
  Info,
  Clock,
  ThumbsUp,
  FileText
} from 'lucide-react';

interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
  resolved: boolean;
}

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
}

export default function Collaboration() {
  const [activeUsers] = useState([
    { name: 'Jane Smith', role: 'Staff Product Designer', status: 'Active (Editing)', color: 'bg-indigo-500' },
    { name: 'David Chen', role: 'Enterprise SaaS Architect', status: 'Active (Reviewing)', color: 'bg-emerald-500' },
    { name: 'Alice Mercer', role: 'Product Marketing Manager', status: 'Idle', color: 'bg-zinc-600' }
  ]);

  const [comments, setComments] = useState<Comment[]>([
    { id: 'c-1', author: 'Jane Smith', avatar: 'JS', text: 'We need to make sure the pricing segment matches the standard Enterprise SLA tier.', time: '10m ago', resolved: false },
    { id: 'c-2', author: 'David Chen', avatar: 'DC', text: 'Looks solid, but check if the port 3000 mapping constraint is clearly explained.', time: '23m ago', resolved: false },
    { id: 'c-3', author: 'Alice Mercer', avatar: 'AM', text: 'The marketing brief matches our CAC strategy parameters perfectly.', time: '1h ago', resolved: true }
  ]);

  const [activities] = useState<ActivityLog[]>([
    { id: 'a-1', user: 'Jane Smith', action: 'edited', target: 'annual_sales_proposal.md', time: '2m ago' },
    { id: 'a-2', user: 'David Chen', action: 'commented on', target: 'annual_sales_proposal.md', time: '10m ago' },
    { id: 'a-3', user: 'Alice Mercer', action: 'marked resolved', target: 'lead_outreach_campaign.md', time: '1h ago' }
  ]);

  const [newCommentText, setNewCommentText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'editor' | 'feed' | 'analytics'>('editor');
  const [docContent, setDocContent] = useState<string>(
    'GXA AI WORKSPACE - ENTERPRISE DOCUMENT SYNCHRONIZATION\n\nThis is a collaborative cloud workspace draft. Active team members are currently conducting simultaneous edits. Restructuring local namespaces protects API routing pipelines while ensuring scalable container connections.'
  );

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const newComment: Comment = {
      id: `c-${comments.length + 1}`,
      author: 'You (Admin)',
      avatar: 'U',
      text: newCommentText,
      time: 'Just Now',
      resolved: false
    };
    setComments(prev => [newComment, ...prev]);
    setNewCommentText('');
  };

  const handleResolveComment = (id: string) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, resolved: !c.resolved } : c));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 text-left h-full">
      {/* Collaboration Sidebar: Active Team Members */}
      <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex justify-between items-center mb-4 px-1">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
            Active Team Workspace
          </span>
          <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold font-mono">
            3 ONLINE
          </span>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {activeUsers.map((user, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-zinc-900/20 border border-zinc-800/60 flex items-start gap-3">
              <div className={`h-8 w-8 rounded-full ${user.color} flex items-center justify-center text-xs font-black text-white shrink-0 shadow-lg`}>
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block truncate">{user.name}</span>
                <span className="text-[9px] text-zinc-500 block truncate">{user.role}</span>
                <span className="text-[9px] text-indigo-400 font-mono font-bold block mt-1">● {user.status}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto border-t border-zinc-800/80 pt-4 px-1 space-y-3">
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
            Security Exemption
          </span>
          <div className="bg-black/60 border border-zinc-800 rounded p-2.5 text-[9px] leading-relaxed text-zinc-400 font-mono">
            All edits are isolated via secure HTTPS port 3000 tunnels. Collaboration is 100% end-to-end encrypted.
          </div>
        </div>
      </div>

      {/* Main Interactive Editor, Feed or Analytics */}
      <div className="lg:col-span-9 flex grid-cols-12 md:grid gap-6 h-[calc(100vh-12rem)] min-h-0">
        
        {/* Main interactive window */}
        <div className="md:col-span-8 flex flex-col gap-4 min-h-0">
          {/* Navigation Tab Header */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 shrink-0 flex gap-2">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'editor' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4" /> Collaborative Editor
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'feed' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Activity className="h-4 w-4" /> Activity Feed
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BarChart3 className="h-4 w-4" /> Team Analytics
            </button>
          </div>

          {activeTab === 'editor' && (
            <div className="flex-1 bg-black border border-zinc-800/80 rounded-xl p-5 flex flex-col min-h-0 shadow-2xl relative">
              {/* Collaborative highlights cursor simulator */}
              <div className="absolute top-24 left-44 bg-indigo-500 text-white font-mono text-[8px] font-bold px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(99,102,241,0.6)] z-10 pointer-events-none">
                Jane Smith is typing...
              </div>

              <textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="flex-1 bg-transparent text-xs text-neutral-200 focus:outline-none resize-none leading-relaxed font-mono"
              />
            </div>
          )}

          {activeTab === 'feed' && (
            <div className="flex-1 bg-zinc-900/20 border border-zinc-800/80 rounded-xl p-5 overflow-y-auto space-y-4">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
                System Activity Feed
              </span>
              <div className="space-y-3">
                {activities.map((act) => (
                  <div key={act.id} className="flex justify-between items-center bg-black/40 border border-zinc-800/60 p-3 rounded-lg text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="text-zinc-300 font-bold">{act.user}</span>
                      <span className="text-zinc-500">{act.action}</span>
                      <span className="text-white font-mono">{act.target}</span>
                    </div>
                    <span className="text-[9px] text-zinc-600 font-mono">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="flex-1 bg-zinc-900/20 border border-zinc-800/80 rounded-xl p-5 overflow-y-auto space-y-6">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
                Collaboration Metrics
              </span>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-black/40 border border-zinc-800 p-4 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Weekly Edits</span>
                  <span className="text-xl font-black text-white mt-1 block">1,482</span>
                  <span className="text-[9px] text-emerald-400 font-bold block mt-1">+12% YoY</span>
                </div>
                <div className="bg-black/40 border border-zinc-800 p-4 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Comments Resolved</span>
                  <span className="text-xl font-black text-white mt-1 block">94.8%</span>
                  <span className="text-[9px] text-emerald-400 font-bold block mt-1">Excellent SLA</span>
                </div>
                <div className="bg-black/40 border border-zinc-800 p-4 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Shared Assets</span>
                  <span className="text-xl font-black text-white mt-1 block">64 Docs</span>
                  <span className="text-[9px] text-indigo-400 font-bold block mt-1">Isolated Sandbox</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Document Comments section */}
        <div className="md:col-span-4 bg-zinc-950 border border-zinc-800/80 rounded-xl flex flex-col min-h-0">
          <div className="bg-zinc-900/60 px-4 py-2.5 border-b border-zinc-800/80 shrink-0">
            <span className="text-xs font-mono font-bold text-neutral-400 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-400" /> Page Comments Thread
            </span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {comments.map((c) => (
              <div key={c.id} className={`p-3 rounded-lg text-xs leading-relaxed border ${c.resolved ? 'bg-zinc-900/30 border-zinc-900/50 opacity-40' : 'bg-zinc-900 border-zinc-800'}`}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-[11px] block">{c.author}</span>
                    <span className="text-[9px] text-zinc-500 block font-mono">{c.time}</span>
                  </div>
                  <button 
                    onClick={() => handleResolveComment(c.id)}
                    className="text-[9px] font-bold text-indigo-400 hover:underline"
                  >
                    {c.resolved ? 'Reopen' : 'Resolve'}
                  </button>
                </div>
                <p className="text-zinc-300 leading-normal">{c.text}</p>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-zinc-800/80 flex gap-2 bg-zinc-950 shrink-0">
            <input 
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="Add thread comment..."
              className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500"
            />
            <button 
              onClick={handleAddComment}
              disabled={!newCommentText.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 p-1.5 rounded-lg text-white transition duration-200"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
