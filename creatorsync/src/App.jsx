import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Video, CloudUpload, CheckSquare, LogOut, BarChart3, Search, ChevronRight, AlertCircle, LayoutGrid } from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, provider } from "./firebase";

// SAARE COMPONENTS IMPORT KIYE HAIN 👇
import MediaVault from './MediaVault';
import LandingPage from './LandingPage';
import HabitTracker from './HabitTracker';
import SmartScript from './SmartScript'; // NAYA AI SCRIPT WRITER IMPORT KIYA 🤖
import Dashboard from './Dashboard';
import AnalyticsDashboard from './AnalyticsDashboard';
import KanbanBoard from './KanbanBoard';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [creatorLink, setCreatorLink] = useState('');
  const [creatorLinkDraft, setCreatorLinkDraft] = useState('');
  const [creatorLinkError, setCreatorLinkError] = useState('');
  const [isSavingCreatorLink, setIsSavingCreatorLink] = useState(false);

  // 1. Check if user is logged in
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCreatorLink('');
      setCreatorLinkDraft('');
      setCreatorLinkError('');
      setIsSavingCreatorLink(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const storageKey = `creatorsync:last-youtube-channel:${user.uid}`;

    try {
      const savedLink = localStorage.getItem(storageKey);
      if (savedLink) {
        setCreatorLink(savedLink);
        setCreatorLinkDraft(savedLink);
      } else {
        setCreatorLink('');
        setCreatorLinkDraft('');
      }
    } catch {
      setCreatorLink('');
      setCreatorLinkDraft('');
    }
  }, [user]);

  // 3. Login Function
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
      alert(`Login Failed: ${error.message}`);
    }
  };

  const saveCreatorLink = async (event) => {
    event.preventDefault();

    const value = creatorLinkDraft.trim();
    if (!value) {
      setCreatorLinkError('Please paste your YouTube channel link or handle to continue.');
      return;
    }

    if (!user?.uid) return;

    setIsSavingCreatorLink(true);
    setCreatorLinkError('');

    try {
      const storageKey = `creatorsync:last-youtube-channel:${user.uid}`;
      localStorage.setItem(storageKey, value);
      setCreatorLink(value);
    } catch (error) {
      console.error('Failed to save creator link:', error);
      setCreatorLinkError('We could not save that link locally. Please try again.');
      return;
    } finally {
      setIsSavingCreatorLink(false);
    }
  };

  // ==========================================
  // RENDER TABS
  // ==========================================

  const renderDashboard = () => <Dashboard user={user} />;

  // YAHAN HUMNE NAYA AI COMPONENT LAGA DIYA HAI 🤖✨
  const renderScripts = () => <SmartScript user={user} />;

  const renderAnalytics = () => <AnalyticsDashboard user={user} />;

  const renderVault = () => <MediaVault user={user} />;
  const renderHabits = () => <HabitTracker user={user} />;
  const renderPipeline = () => <KanbanBoard user={user} />;

  const needsCreatorLink = user && !creatorLink;

  // Display Landing Page if not logged in
  if (!user) {
    return <LandingPage onLaunch={handleLogin} />;
  }

  // Main Dashboard Layout
  return (
    <div className="flex h-screen bg-[#111318] text-[#fffcfe] font-sans">
      <aside className="w-64 bg-[#181a1f] border-r border-white/10 flex flex-col justify-between shadow-2xl shadow-black/30">
        <div>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-[#f97316] tracking-wider">CreatorSync</h1>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-white/10 text-white ring-1 ring-[#f97316]/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span>
            </button>
            <button onClick={() => setActiveTab('pipeline')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'pipeline' ? 'bg-white/10 text-white ring-1 ring-[#f97316]/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <LayoutGrid size={20} /> <span className="font-medium">Pipeline</span>
            </button>
            <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-white/10 text-white ring-1 ring-[#f97316]/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <BarChart3 size={20} /> <span className="font-medium">Analytics</span>
            </button>
            <button onClick={() => setActiveTab('scripts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'scripts' ? 'bg-white/10 text-white ring-1 ring-[#f97316]/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <Video size={20} /> <span className="font-medium">Video Scripts</span>
            </button>
            <button onClick={() => setActiveTab('habits')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'habits' ? 'bg-white/10 text-white ring-1 ring-[#f97316]/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <CheckSquare size={20} /> <span className="font-medium">Habit Tracker</span>
            </button>
            <button onClick={() => setActiveTab('vault')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'vault' ? 'bg-white/10 text-white ring-1 ring-[#f97316]/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <CloudUpload size={20} /> <span className="font-medium">Raw Footage Drop</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={user.photoURL || "https://via.placeholder.com/40"} 
              alt="Profile" 
              className="w-10 h-10 rounded-full border border-white/15"
              referrerPolicy="no-referrer"
            />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.displayName || "Creator"}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)} 
            className="w-full flex items-center justify-center gap-2 bg-[#f97316]/10 hover:bg-[#f97316]/20 text-[#ffc01e] p-2 rounded-lg transition-colors"
          >
            <LogOut size={16} /> <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'pipeline' && renderPipeline()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'scripts' && renderScripts()}
        {activeTab === 'habits' && renderHabits()}
        {activeTab === 'vault' && renderVault()} 
      </main>

      {needsCreatorLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#111318] p-6 shadow-2xl shadow-black/50">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f97316]/15 text-[#ffc01e]">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Creator setup</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">Add your YouTube account link</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Paste your channel link, handle, or channel ID so CreatorSync can load your analytics and personalize the workspace.
                </p>
              </div>
            </div>

            <form onSubmit={saveCreatorLink} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Creator YouTube link
                </label>
                <input
                  type="text"
                  value={creatorLinkDraft}
                  onChange={(e) => setCreatorLinkDraft(e.target.value)}
                  placeholder="https://youtube.com/@YourChannel or @YourHandle"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/30"
                  autoFocus
                />
              </div>

              {creatorLinkError && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  <AlertCircle className="h-4 w-4" />
                  {creatorLinkError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="submit"
                  disabled={isSavingCreatorLink}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f97316] to-[#ffc01e] px-5 py-3 text-sm font-semibold text-[#111318] transition hover:from-[#ff8f33] hover:to-[#ffc94d] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingCreatorLink ? 'Saving...' : 'Continue'}
                  {!isSavingCreatorLink && <ChevronRight size={16} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
