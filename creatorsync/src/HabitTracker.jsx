import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { CheckSquare, Plus, Activity, Flame, TrendingUp } from 'lucide-react';

const HabitTracker = ({ user }) => {
  const [habits, setHabits] = useState(['Running', 'Meditation', 'Reading 10 Pages', 'Deep Work', 'Drink 2L Water']);
  const [newHabit, setNewHabit] = useState('');
  const [logs, setLogs] = useState({}); 

  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0]; 
  }).reverse(); 

  useEffect(() => {
    if (!user) return; 
    
    const q = query(collection(db, "habitLogs"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = {};
      snapshot.docs.forEach(doc => {
        const parts = doc.id.split('_');
        const habitDateKey = `${parts[1]}_${parts[2]}`; 
        fetchedLogs[habitDateKey] = doc.data().completed;
      });
      setLogs(fetchedLogs);
    });
    return () => unsubscribe();
  }, [user]);

  const toggleHabit = async (habit, date) => {
    if (!user) return;
    
    const uiKey = `${habit}_${date}`;
    const docId = `${user.uid}_${habit}_${date}`;
    const isCompleted = logs[uiKey];
    
    try {
      if (isCompleted) {
        await deleteDoc(doc(db, "habitLogs", docId));
      } else {
        await setDoc(doc(db, "habitLogs", docId), { 
          habit, 
          date, 
          completed: true,
          userId: user.uid
        });
      }
    } catch (error) {
      console.error("Error toggling habit:", error);
    }
  };

  const handleAddHabit = (e) => {
    e.preventDefault();
    if (newHabit.trim() && !habits.includes(newHabit)) {
      setHabits([...habits, newHabit.trim()]);
      setNewHabit('');
    }
  };

  const formatDateLabel = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  };

  const chartData = last7Days.map(date => {
    let completedCount = 0;
    habits.forEach(h => { if (logs[`${h}_${date}`]) completedCount++; });
    return {
      name: formatDateLabel(date),
      dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      score: Math.round((completedCount / habits.length) * 100) || 0
    };
  });

  const totalCompletedThisWeek = chartData.reduce((acc, curr) => acc + (curr.score > 0 ? curr.score / 100 * habits.length : 0), 0);
  const totalPossibleThisWeek = habits.length * 7;
  const overallPercentage = Math.round((totalCompletedThisWeek / totalPossibleThisWeek) * 100) || 0;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <header className="mb-8 border-b border-gray-700 pb-6">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Activity className="text-blue-400" size={32} /> 
          Habit & Protocol Tracker
        </h2>
        <p className="text-gray-400 mt-2">Visualize your consistency. Data doesn't lie.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        
        <div className="lg:col-span-2 bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl shadow-xl">
          <h3 className="text-gray-400 font-medium mb-6 flex items-center gap-2 uppercase tracking-wider text-sm">
            <TrendingUp size={16} className="text-blue-400"/> Daily Consistency Score
          </h3>
          <div className="flex justify-between items-end h-48 w-full px-2">
            {chartData.map((data, index) => (
              <div key={index} className="flex flex-col items-center gap-3 w-1/7 group">
                <span className="text-xs font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {data.score}%
                </span>
                <div className="w-full flex justify-center h-32 items-end">
                  <div 
                    className="w-10 sm:w-12 bg-gradient-to-t from-blue-600 to-blue-400 rounded-lg transition-all duration-700 ease-out hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                    style={{ height: `${Math.max(data.score, 5)}%` }} 
                  ></div>
                </div>
                <span className="text-xs text-gray-400 uppercase">{data.dayName}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl shadow-xl flex flex-col items-center justify-center relative">
          <h3 className="text-gray-400 font-medium mb-4 uppercase tracking-wider text-sm w-full text-center">Weekly Completion</h3>
          <div className="relative flex items-center justify-center w-40 h-40">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path className="text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
              <path className="text-blue-500 transition-all duration-1000 ease-out" strokeDasharray={`${overallPercentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white">{overallPercentage}%</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Done</span>
            </div>
          </div>
        </div>

      </div>

      <form onSubmit={handleAddHabit} className="flex gap-4 mb-6">
        <input 
          type="text" 
          value={newHabit}
          onChange={(e) => setNewHabit(e.target.value)}
          placeholder="Enter a new daily habit..." 
          className="flex-1 max-w-sm bg-gray-800/50 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-blue-400"
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2">
          <Plus size={18} /> Add Habit
        </button>
      </form>

      <div className="bg-gray-800/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/60 border-b border-gray-700/50">
                <th className="p-5 text-gray-400 font-medium w-1/4 uppercase tracking-wider text-sm">Daily Habits</th>
                {last7Days.map(date => (
                  <th key={date} className="p-5 text-center text-gray-300 font-medium whitespace-nowrap">
                    {formatDateLabel(date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {habits.map((habit, index) => (
                <tr key={index} className="hover:bg-gray-700/20 transition-colors">
                  <td className="p-5 text-white font-medium flex items-center gap-3">
                    <Flame className="text-orange-500/80" size={16} /> {habit}
                  </td>
                  {last7Days.map(date => {
                    const isChecked = logs[`${habit}_${date}`] || false;
                    return (
                      <td key={date} className="p-5 text-center">
                        <button 
                          onClick={() => toggleHabit(habit, date)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 mx-auto border-2 ${
                            isChecked 
                              ? 'bg-blue-500 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]' 
                              : 'bg-gray-900/50 border-gray-600 hover:border-gray-400'
                          }`}
                        >
                          {isChecked && <CheckSquare className="text-white" size={18} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HabitTracker;