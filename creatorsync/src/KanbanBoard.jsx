import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from './firebase';

const KanbanBoard = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  const columns = ['Scripting', 'Filming', 'Editing', 'Published'];

  useEffect(() => {
    if (!user) {
        setTasks([]);
        return;
    }

    const q = query(collection(db, 'kanbanTasks'), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(fetchedTasks);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim() || !user) return;
    try {
      await addDoc(collection(db, 'kanbanTasks'), {
        title: newTask,
        column: 'Scripting',
        priority: 'HIGH',
        timestamp: new Date(),
        userId: user.uid
      });
      setNewTask('');
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const moveTask = async (taskId, currentColumn, direction) => {
    const currentIndex = columns.indexOf(currentColumn);
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < columns.length) {
      try {
        await updateDoc(doc(db, 'kanbanTasks', taskId), {
          column: columns[newIndex]
        });
      } catch (error) {
        console.error("Error moving task:", error);
      }
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await deleteDoc(doc(db, 'kanbanTasks', taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // ==========================================
  // DRAG AND DROP LOGIC STARTS HERE 🚀
  // ==========================================

  const handleDragStart = (e, taskId) => {
    // Card pakadte hi uski ID memory (dataTransfer) mein save kar lenge
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e) => {
    // Default behavior rokna zaroori hai tabhi drop kaam karega
    e.preventDefault(); 
  };

  const handleDrop = async (e, targetColumn) => {
    e.preventDefault();
    // Memory se pakde hue card ki ID nikal li
    const taskId = e.dataTransfer.getData('taskId'); 
    
    if (taskId) {
      try {
        // Firebase mein card ka naya column update kar diya
        await updateDoc(doc(db, 'kanbanTasks', taskId), {
          column: targetColumn
        });
      } catch (error) {
        console.error("Drop error:", error);
      }
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleAddTask} className="mb-8 flex gap-4">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New Video Idea..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-blue-400"
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors">
          + Add Card
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {columns.map(column => (
          <div 
            key={column} 
            className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 min-h-[500px] transition-colors hover:bg-gray-800/60"
            // DROP ZONE BANANE KE LIYE YEH DO LINES ADD KI HAIN 👇
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column)}
          >
            <div className="flex justify-between items-center mb-4 border-b border-gray-700/50 pb-2">
              <h3 className="font-bold text-white">{column}</h3>
              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                {tasks.filter(t => t.column === column).length}
              </span>
            </div>

            <div className="space-y-3">
              {tasks.filter(t => t.column === column).map(task => (
                <div 
                  key={task.id} 
                  // DRAGGABLE BANANE KE LIYE YEH LINES ADD KI HAIN 👇
                  draggable 
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-sm hover:border-blue-500/50 transition-colors group cursor-grab active:cursor-grabbing"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold bg-red-900/30 text-red-400 px-2 py-0.5 rounded uppercase pointer-events-none">
                      {task.priority || 'NORMAL'}
                    </span>
                    <button onClick={() => deleteTask(task.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      ✕
                    </button>
                  </div>
                  <p className="text-white font-medium mb-1 pointer-events-none">{task.title}</p>
                  <p className="text-xs text-gray-500 mb-3 pointer-events-none">Drag me or use buttons...</p>

                  <div className="flex justify-between mt-2">
                    <button
                      onClick={() => moveTask(task.id, column, 'prev')}
                      disabled={column === columns[0]}
                      className="text-xs text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => moveTask(task.id, column, 'next')}
                      disabled={column === columns[columns.length - 1]}
                      className="text-xs text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;