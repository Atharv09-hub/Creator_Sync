import React from 'react';
import { ChevronRight, Video, Target, TrendingUp, Cloud } from 'lucide-react';

const LandingPage = ({ onLaunch }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden relative">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none"></div>

      <nav className="flex items-center justify-between px-10 py-6 max-w-7xl mx-auto relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="font-bold text-lg">C</span>
          </div>
          <span className="text-xl font-semibold tracking-wide">CreatorSync</span>
        </div>
        <button 
          onClick={onLaunch}
          className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          Login
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-10 pt-20 pb-32 relative z-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700/50 text-xs font-medium text-blue-400 mb-8 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          The Ultimate Hybrid Workflow
        </div>

        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 leading-[1.1]">
          Create. Lift. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-blue-600">
            Conquer.
          </span>
        </h1>

        <p className="text-xl text-gray-400 mb-12 max-w-2xl font-light leading-relaxed">
          The all-in-one command center for creators who value content production and physical discipline equally. Zero friction, zero burnout.
        </p>

        <button 
          onClick={onLaunch}
          className="group relative inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full text-lg font-medium hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
        >
          Sign In with Google
          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 w-full text-left">
          <div className="bg-gray-900/50 border border-gray-800 p-8 rounded-3xl backdrop-blur-sm hover:border-blue-500/50 transition-colors">
            <div className="bg-blue-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <Cloud className="text-blue-400" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-3">Raw Footage Drop</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Instantly bridge your mobile camera roll to your desktop editing suite with zero latency.</p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 p-8 rounded-3xl backdrop-blur-sm hover:border-purple-500/50 transition-colors md:-translate-y-8">
            <div className="bg-purple-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <Target className="text-purple-400" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-3">Habit Protocol</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Visualized daily consistency grid. Data-driven insights to maintain peak physical and mental form.</p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 p-8 rounded-3xl backdrop-blur-sm hover:border-emerald-500/50 transition-colors">
            <div className="bg-emerald-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <Video className="text-emerald-400" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-3">Pipeline Sync</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Kanban-style production board. Track your videos from raw ideas to published masterpieces.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;