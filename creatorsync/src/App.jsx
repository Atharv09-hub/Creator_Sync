import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Video, Dumbbell, CloudUpload, PlusCircle, CheckSquare, LogOut } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, where } from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { db, auth, provider } from "./firebase";
import KanbanBoard from './KanbanBoard';
import MediaVault from './MediaVault';
import LandingPage from './LandingPage';
import HabitTracker from './HabitTracker';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [exerciseName, setExerciseName] = useState('');
  const [liftWeight, setLiftWeight] = useState('');
  const [scriptTitle, setScriptTitle] = useState('');
  const [scriptContent, setScriptContent] = useState('');
  const [scriptsList, setScriptsList] = useState([]);
  const [workoutsList, setWorkoutsList] = useState([]);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  // Fetch only current user's data
  useEffect(() => {
    if (!user) {
      setScriptsList([]);
      setWorkoutsList([]);
      return; 
    }

    const scriptsQuery = query(collection(db, "videoScripts"), where("userId", "==", user.uid));
    const unsubScripts = onSnapshot(scriptsQuery, (snapshot) => {
      const fetchedScripts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setScriptsList(fetchedScripts);
    });

    const workoutsQuery = query(collection(db, "workoutLogs"), where("userId", "==", user.uid));
    const unsubWorkouts = onSnapshot(workoutsQuery, (snapshot) => {
      const fetchedWorkouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWorkoutsList(fetchedWorkouts);
    });

    return () => {
      unsubScripts();
      unsubWorkouts();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
      alert(`Login Failed: ${error.message}`);
    }
  };

  const handleSaveWorkout = async (e) => {
    e.preventDefault();
    if(!user) return;
    try {
      await addDoc(collection(db, "workoutLogs"), {
        exercise: exerciseName,
        weight: liftWeight,
        date: new Date().toLocaleDateString(),
        userId: user.uid
      });
      setExerciseName('');
      setLiftWeight('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveScript = async (e) => {
    e.preventDefault();
    if(!user) return;
    try {
      await addDoc(collection(db, "videoScripts"), {
        title: scriptTitle,
        content: scriptContent,
        status: "Draft",
        date: new Date().toLocaleDateString(),
        userId: user.uid
      });
      setScriptTitle('');
      setScriptContent('');
    } catch (error) {
      console.error(error);
    }
  };

  const renderDashboard = () => (
    <div>
      <header className="mb-8 border-b border-gray-700 pb-6">
        <h2 className="text-3xl font-bold text-white">Creator Command Center</h2>
        <p className="text-gray-400 mt-2">Manage your production pipeline. Drag and drop to sync instantly.</p>
      </header>
      <KanbanBoard user={user} />
    </div>
  );

  const renderScripts = () => (
    <div>
      <header className="mb-8 border-b border-gray-700 pb-6">
        <h2 className="text-3xl font-bold text-white">Content Scripts</h2>
        <p className="text-gray-400 mt-2">Write and push your vlog ideas directly to the cloud.</p>
      </header>
      <form onSubmit={handleSaveScript} className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-2xl">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">Episode Title</label>
          <input type="text" value={scriptTitle} onChange={(e) => setScriptTitle(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-blue-400" placeholder="e.g. Ep 36: Balancing College & Gym" />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">Script Content / Outline</label>
          <textarea value={scriptContent} onChange={(e) => setScriptContent(e.target.value)} required rows="5" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-blue-400" placeholder="Intro hook, B-roll ideas, main topics..."></textarea>
        </div>
        <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
          <PlusCircle size={18} /> Save Script to Cloud
        </button>
      </form>

      <div className="mt-12">
        <h3 className="text-xl font-medium text-white mb-6 border-b border-gray-700 pb-2 inline-block">Your Script Vault</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scriptsList.map((script) => (
            <div key={script.id} className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50 hover:border-blue-500/50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-lg font-bold text-white leading-tight">{script.title}</h4>
                <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded-md font-medium">{script.status}</span>
              </div>
              <p className="text-gray-400 text-sm whitespace-pre-wrap mb-4 line-clamp-4">{script.content}</p>
              <div className="text-xs text-gray-500">{script.date}</div>
            </div>
          ))}
          {scriptsList.length === 0 && <p className="text-gray-500 italic">No scripts written yet.</p>}
        </div>
      </div>
    </div>
  );

  const renderTracker = () => (
    <div>
      <header className="mb-8 border-b border-gray-700 pb-6">
        <h2 className="text-3xl font-bold text-white">Form & Lift Tracker</h2>
        <p className="text-gray-400 mt-2">Log your daily lifts to track progressive overload.</p>
      </header>
      <form onSubmit={handleSaveWorkout} className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-xl">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">Exercise Name</label>
          <input type="text" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-green-400" placeholder="e.g. Overhead Press (OHP)" />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">Weight / Details</label>
          <input type="text" value={liftWeight} onChange={(e) => setLiftWeight(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-green-400" placeholder="e.g. 60kg for 8 reps" />
        </div>
        <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
          <PlusCircle size={18} /> Log Lift to Cloud
        </button>
      </form>

      <div className="mt-12 max-w-xl">
        <h3 className="text-xl font-medium text-white mb-6 border-b border-gray-700 pb-2 inline-block">Recent Lifts</h3>
        <div className="space-y-4">
          {workoutsList.map((workout) => (
            <div key={workout.id} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 flex justify-between items-center hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-4">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <Dumbbell className="text-green-400" size={20} />
                </div>
                <div>
                  <h4 className="text-md font-bold text-white">{workout.exercise}</h4>
                  <p className="text-sm font-medium text-green-400">{workout.weight}</p>
                </div>
              </div>
              <span className="text-xs text-gray-500 bg-gray-900 px-3 py-1 rounded-full">{workout.date}</span>
            </div>
          ))}
          {workoutsList.length === 0 && <p className="text-gray-500 italic">No lifts logged yet.</p>}
        </div>
      </div>
    </div>
  );

  const renderVault = () => <MediaVault user={user} />;
  const renderHabits = () => <HabitTracker user={user} />;

  // Display Landing Page if not logged in
  if (!user) {
    return <LandingPage onLaunch={handleLogin} />;
  }

  // Main Dashboard
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col justify-between">
        <div>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-blue-400 tracking-wider">CreatorSync</h1>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
              <LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span>
            </button>
            <button onClick={() => setActiveTab('scripts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'scripts' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
              <Video size={20} /> <span className="font-medium">Video Scripts</span>
            </button>
            <button onClick={() => setActiveTab('tracker')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'tracker' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
              <Dumbbell size={20} /> <span className="font-medium">Form & Lift Tracker</span>
            </button>
            <button onClick={() => setActiveTab('habits')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'habits' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
              <CheckSquare size={20} /> <span className="font-medium">Habit Tracker</span>
            </button>
            <button onClick={() => setActiveTab('vault')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'vault' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
              <CloudUpload size={20} /> <span className="font-medium">Raw Footage Drop</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={user.photoURL || "https://via.placeholder.com/40"} 
              alt="Profile" 
              className="w-10 h-10 rounded-full border border-gray-600"
              referrerPolicy="no-referrer"
            />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.displayName || "Creator"}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)} 
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-lg transition-colors"
          >
            <LogOut size={16} /> <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'scripts' && renderScripts()}
        {activeTab === 'tracker' && renderTracker()}
        {activeTab === 'habits' && renderHabits()}
        {activeTab === 'vault' && renderVault()} 
      </main>
    </div>
  );
}

export default App;