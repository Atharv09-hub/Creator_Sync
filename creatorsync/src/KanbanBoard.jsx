import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Timestamp, collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { Search, Filter, Plus, Sparkles, LayoutGrid, Bolt, Loader2 } from 'lucide-react';
import PipelineCard from './PipelineCard';

const STAGES = [
  { id: 'ideas', label: 'Ideas', empty: 'Capture the hook, angle, and tags for the next video.' },
  { id: 'script', label: 'Script', empty: 'Attach the script draft, outline, or beat sheet.' },
  { id: 'filming', label: 'Filming', empty: 'Drop raw clip links, takes, or shoot notes here.' },
  { id: 'editing', label: 'Editing', empty: 'Track cut progress and revision status.' },
  { id: 'publish', label: 'Publish', empty: 'Schedule the post and lock the platform.' },
  { id: 'performance', label: 'Performance', empty: 'Review views, likes, and lessons learned.' }
];

const STATUS_OPTIONS = ['All', 'Idea', 'Writing', 'Recording', 'Editing', 'Scheduled', 'Published'];
const PLATFORM_OPTIONS = ['All', 'YouTube', 'Instagram Reel', 'YT Shorts'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];

const LEGACY_STAGE_MAP = {
  Ideas: 'ideas',
  'Ideas 💡': 'ideas',
  Scripting: 'script',
  'Scripting 📝': 'script',
  Filming: 'filming',
  'Filming 🎥': 'filming',
  Editing: 'editing',
  'Editing ✂️': 'editing',
  Published: 'publish',
  Publish: 'publish',
  'Publish 🚀': 'publish',
  Performance: 'performance',
  'Performance 📈': 'performance'
};

const STAGE_STATUS_MAP = {
  ideas: 'Idea',
  script: 'Writing',
  filming: 'Recording',
  editing: 'Editing',
  publish: 'Scheduled',
  performance: 'Published'
};

const STAGE_IDS = STAGES.map((stage) => stage.id);

const normalizeStageValue = (value) => {
  if (!value) return 'ideas';
  return LEGACY_STAGE_MAP[value] || (STAGE_IDS.includes(value) ? value : 'ideas');
};

const KanbanBoard = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [platform, setPlatform] = useState('YouTube');
  const [deadline, setDeadline] = useState('');
  const [reminder, setReminder] = useState('');
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isSaving, setIsSaving] = useState(false);
  const [draggedStage, setDraggedStage] = useState(null);
  const addFormRef = useRef(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const q = query(collection(db, 'kanbanTasks'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map((item) => {
        const data = item.data();
        const column = normalizeStageValue(data.column);

        return {
          id: item.id,
          ...data,
          column,
          status: data.status || STAGE_STATUS_MAP[column]
        };
      });

      setTasks(fetchedTasks);
      setLoadError('');
    }, (error) => {
      console.error('Kanban listener failed:', error);
      setLoadError('Kanban data could not be loaded. Please check Firestore rules and authentication.');
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddTask = async (e) => {
    e.preventDefault();

    if (!newTask.trim() || !user) return;

    setIsSaving(true);

    try {
      const tags = newTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      await addDoc(collection(db, 'kanbanTasks'), {
        title: newTask.trim(),
        tags,
        priority: newPriority,
        platform,
        column: 'ideas',
        status: 'Idea',
        deadline: deadline || '',
        reminder: reminder || '',
        script: '',
        scriptStatus: 'Draft',
        clipUrl: '',
        rawClipUrl: '',
        progress: 0,
        scheduledFor: '',
        publishStatus: 'Queued',
        metrics: { views: 0, likes: 0 },
        timestamp: new Date(),
        updatedAt: Timestamp.now(),
        userId: user.uid
      });

      setNewTask('');
      setNewTags('');
      setNewPriority('Medium');
      setPlatform('YouTube');
      setDeadline('');
      setReminder('');
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateTask = async (taskId, payload) => {
    await updateDoc(doc(db, 'kanbanTasks', taskId), payload);
  };

  const moveTask = async (taskId, currentStage, direction) => {
    const currentIndex = STAGE_IDS.indexOf(currentStage);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex < 0 || nextIndex >= STAGE_IDS.length) return;

    const nextStage = STAGE_IDS[nextIndex];

    try {
      await updateTask(taskId, {
        column: nextStage,
        status: STAGE_STATUS_MAP[nextStage],
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error moving task:', error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await deleteDoc(doc(db, 'kanbanTasks', taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleDeleteClick = async (taskId) => {
    const shouldDelete = window.confirm('Delete this card?');
    if (!shouldDelete) return;
    await deleteTask(taskId);
  };

  const handleAdvanceTask = async (taskId, currentStage) => {
    const currentIndex = STAGE_IDS.indexOf(currentStage);

    if (currentIndex === STAGE_IDS.length - 1) {
      const shouldArchive = window.confirm('Video published? Do you want to archive/remove this card?');
      if (shouldArchive) {
        await deleteTask(taskId);
      }
      return;
    }

    const nextStage = STAGE_IDS[currentIndex + 1];

    try {
      await updateTask(taskId, {
        column: nextStage,
        status: STAGE_STATUS_MAP[nextStage],
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error advancing task:', error);
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggedStage(null);
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    setDraggedStage(stageId);
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    setDraggedStage(null);

    if (!taskId) return;

    try {
      await updateTask(taskId, {
        column: targetStage,
        status: STAGE_STATUS_MAP[targetStage],
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  const filteredTasks = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const taskTags = Array.isArray(task.tags) ? task.tags.join(' ') : String(task.tags || '');
      const matchesSearch =
        !searchTerm ||
        task.title?.toLowerCase().includes(searchTerm) ||
        taskTags.toLowerCase().includes(searchTerm) ||
        String(task.platform || '').toLowerCase().includes(searchTerm);

      const matchesPlatform = platformFilter === 'All' || task.platform === platformFilter;
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter;

      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [tasks, search, platformFilter, statusFilter]);

  const stageCounts = useMemo(() => {
    return STAGES.reduce((acc, stage) => {
      acc[stage.id] = filteredTasks.filter((task) => normalizeStageValue(task.column) === stage.id).length;
      return acc;
    }, {});
  }, [filteredTasks]);

  const totalFiltered = filteredTasks.length || 1;

  const openQuickAdd = () => {
    addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const input = addFormRef.current?.querySelector('input');
    input?.focus();
  };

  return (
    <div className="relative w-full pb-24">
      <div className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#181a1f]/80 via-[#111318]/70 to-[#0f1116]/90 p-6 shadow-2xl shadow-black/25 backdrop-blur-xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f97316]/20 bg-[#f97316]/10 px-3 py-1 text-xs font-medium text-[#ffc01e]">
              <Sparkles size={14} />
              Production system
            </div>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Creator Command Center</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
              Plan ideas, attach scripts, track filming, monitor edit progress, schedule releases, and review performance from one pipeline.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:min-w-[680px]">
            {STAGES.map((stage) => (
              <div key={stage.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{stage.label}</p>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <span className="text-2xl font-semibold text-white">{stageCounts[stage.id] || 0}</span>
                  <span className="text-xs text-slate-500">
                    {Math.round(((stageCounts[stage.id] || 0) / totalFiltered) * 100)}%
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[#f97316] to-[#ffc01e] transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(8, ((stageCounts[stage.id] || 0) / totalFiltered) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl lg:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ideas, tags, platforms..."
            className="w-full rounded-2xl border border-white/10 bg-[#0f1116]/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#0f1116]/70 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/30"
            >
              {PLATFORM_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#0f1116]/70 px-3 py-3 text-sm text-white outline-none transition focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/30"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={openQuickAdd}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f97316] to-[#ffc01e] px-4 py-3 text-sm font-semibold text-[#111318] transition hover:from-[#ff8f33] hover:to-[#ffc94d]"
        >
          <Bolt size={16} />
          Quick Add
        </button>
      </div>

      {loadError && (
        <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      )}

      <div
        ref={addFormRef}
        className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/45 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quick Add</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Capture a new production task</h3>
          </div>
          <LayoutGrid className="h-5 w-5 text-[#ffc01e]" />
        </div>

        <form onSubmit={handleAddTask} className="grid gap-3 lg:grid-cols-6">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Task title"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/30 lg:col-span-2"
          />
          <input
            type="text"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            placeholder="Tags, separated by commas"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/30"
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/30"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option} Priority</option>
            ))}
          </select>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/30"
          >
            {PLATFORM_OPTIONS.filter((option) => option !== 'All').map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffc01e] px-5 py-3 font-semibold text-[#111318] transition hover:bg-[#ffcf54] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={16} />}
            Add
          </button>

          <div className="grid grid-cols-2 gap-3 lg:col-span-6 lg:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/30"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Reminder</label>
              <input
                type="date"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/30"
              />
            </div>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {STAGES.map((stage) => {
          const columnTasks = filteredTasks.filter((task) => normalizeStageValue(task.column) === stage.id);
          const progressPercent = Math.round((stageCounts[stage.id] || 0) / totalFiltered * 100);

          return (
            <section
              key={stage.id}
              className={`min-h-[560px] rounded-[2rem] border border-white/10 bg-slate-950/40 p-4 shadow-xl shadow-black/10 backdrop-blur-xl transition ${
                draggedStage === stage.id ? 'border-[#f97316]/40 bg-[#0f1116]/70' : 'hover:border-[#f97316]/20'
              }`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="mb-4 flex items-start justify-between gap-4 border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{stage.label}</h3>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
                      {columnTasks.length}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{stage.empty}</p>
                </div>
                <div className="w-24 shrink-0">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Progress</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[#f97316] to-[#ffc01e] transition-all duration-300"
                      style={{ width: `${Math.max(8, progressPercent)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {columnTasks.length === 0 && (
                  <div className="flex min-h-[160px] items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/5 px-4 text-center text-sm text-slate-500">
                    {stage.empty}
                  </div>
                )}

                {columnTasks.map((task) => {
                  const nextLabel =
                    stage.id === 'editing'
                      ? 'Publish'
                      : stage.id === 'publish'
                        ? 'Move to Performance'
                        : stage.id === 'performance'
                          ? 'Archive'
                          : 'Next';

                  return (
                    <PipelineCard
                      key={task.id}
                      task={task}
                      stage={stage.id}
                      nextLabel={nextLabel}
                      onDelete={handleDeleteClick}
                      onAdvance={handleAdvanceTask}
                      onPrev={moveTask}
                      onDragStart={handleDragStart}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <button
        type="button"
        onClick={openQuickAdd}
        className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f97316] to-[#ffc01e] px-5 py-4 text-sm font-semibold text-[#111318] shadow-2xl shadow-[#f97316]/20 transition hover:scale-105"
      >
        <Plus size={16} />
        Quick Add
      </button>
    </div>
  );
};

export default KanbanBoard;
