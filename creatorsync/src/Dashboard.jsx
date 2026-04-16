import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  FileText,
  PlayCircle,
  Rocket,
  Sparkles,
  TrendingUp,
  Target
} from 'lucide-react';

const WORKFLOW_STEPS = [
  { id: 'concept', label: 'Concept', stages: ['ideas'] },
  { id: 'drafting', label: 'Drafting', stages: ['script'] },
  { id: 'production', label: 'Production', stages: ['filming', 'editing'] },
  { id: 'live', label: 'Live', stages: ['publish', 'performance'] }
];

const STAGE_PROGRESS = {
  ideas: 10,
  script: 35,
  filming: 55,
  editing: 75,
  publish: 90,
  performance: 100
};

const STAGE_LABELS = {
  ideas: 'Concept',
  script: 'Drafting',
  filming: 'Production',
  editing: 'Production',
  publish: 'Live',
  performance: 'Live'
};

const normalizeStage = (value) => {
  if (!value) return 'ideas';
  return STAGE_LABELS[value] ? value : 'ideas';
};

const getProgressFromTask = (task) => {
  if (Number.isFinite(Number(task.progress))) {
    return Math.max(0, Math.min(100, Number(task.progress)));
  }

  const stage = normalizeStage(task.column);
  return STAGE_PROGRESS[stage] ?? 0;
};

const formatCount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString();
};

const formatPercent = (value) => `${Math.round(Math.max(0, Math.min(100, value)))}%`;

const getTimeValue = (value) => {
  if (!value) return 0;

  if (typeof value?.toDate === 'function') {
    return value.toDate().getTime();
  }

  if (typeof value?.seconds === 'number') {
    return value.seconds * 1000;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const formatShortDateTime = (value) => {
  const time = getTimeValue(value);
  if (!time) return 'Recently';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(time));
};

const getDateKeyFromValue = (value) => {
  const time = getTimeValue(value);
  if (!time) return null;
  return new Date(time).toISOString().split('T')[0];
};

const formatRelativeDate = (value) => {
  if (!value) return null;

  const parsed = value?.toDate?.() ?? (value?.seconds ? new Date(value.seconds * 1000) : new Date(value));
  if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);

  const diff = Math.round((parsed - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1) return `In ${diff} days`;
  if (diff === -1) return 'Yesterday';
  return `${Math.abs(diff)} days ago`;
};

const formatDayLabel = (date) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);

const ProgressRing = ({ value }) => {
  const size = 180;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative mx-auto flex w-fit items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progress-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-semibold text-white">{Math.round(value)}%</span>
        <span className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">Progress</span>
      </div>
    </div>
  );
};

const Dashboard = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'kanbanTasks'), where('userId', '==', user.uid));
    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      setTasks(fetchedTasks);
      setLoadError('');
    }, (error) => {
      console.error('Dashboard listener failed:', error);
      setLoadError('Dashboard data could not be loaded. Please check Firestore rules and authentication.');
    });

    const scriptsQuery = query(collection(db, 'scripts'), where('userId', '==', user.uid));
    const unsubscribeScripts = onSnapshot(scriptsQuery, (snapshot) => {
      const fetchedScripts = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      setScripts(fetchedScripts);
      setLoadError('');
    }, (error) => {
      console.error('Script listener failed:', error);
      setLoadError('Script data could not be loaded. Please check Firestore rules and authentication.');
    });

    const habitsQuery = query(collection(db, 'habitLogs'), where('userId', '==', user.uid));
    const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
      const fetchedLogs = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      setHabitLogs(fetchedLogs);
      setLoadError('');
    }, (error) => {
      console.error('Habit listener failed:', error);
      setLoadError('Habit data could not be loaded. Please check Firestore rules and authentication.');
    });

    return () => {
      unsubscribeTasks();
      unsubscribeScripts();
      unsubscribeHabits();
    };
  }, [user]);

  const summary = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => normalizeStage(task.column) === 'performance').length;
    const inProgress = tasks.filter((task) => ['script', 'filming', 'editing', 'publish'].includes(normalizeStage(task.column))).length;
    const avgProgress = total ? tasks.reduce((sum, task) => sum + getProgressFromTask(task), 0) / total : 0;

    const stepCounts = WORKFLOW_STEPS.reduce((acc, step) => {
      acc[step.id] = tasks.filter((task) => step.stages.includes(normalizeStage(task.column))).length;
      return acc;
    }, {});

    return {
      total,
      completed,
      inProgress,
      avgProgress,
      stepCounts
    };
  }, [tasks]);

  const widgetData = useMemo(() => {
    const dueSoon = tasks.filter((task) => {
      if (!task.deadline) return false;
      const due = new Date(task.deadline);
      if (Number.isNaN(due.getTime())) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);

      const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    }).length;

    const latestTask = [...tasks].sort((a, b) => {
      const aTime = getTimeValue(a.updatedAt) || getTimeValue(a.timestamp);
      const bTime = getTimeValue(b.updatedAt) || getTimeValue(b.timestamp);
      return bTime - aTime;
    })[0];

    const liveTasks = tasks.filter((task) => normalizeStage(task.column) === 'performance').length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last7Days = [...Array(7)].map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - index);
      return date.toISOString().split('T')[0];
    });

    const completedHabitLogs = habitLogs.filter((log) => log.completed && last7Days.includes(log.date));
    const todayKey = today.toISOString().split('T')[0];
    const completedToday = completedHabitLogs.filter((log) => log.date === todayKey).length;

    return {
      dueSoon,
      latestTask,
      liveTasks,
      completionRate: summary.total ? (summary.completed / summary.total) * 100 : 0,
      completedHabitLogs: completedHabitLogs.length,
      completedToday
    };
  }, [tasks, habitLogs, summary.completed, summary.total]);

  const recentScripts = useMemo(
    () =>
      [...scripts]
        .sort((a, b) => {
          const aTime = getTimeValue(a.updatedAt);
          const bTime = getTimeValue(b.updatedAt);
          return bTime - aTime;
        })
        .slice(0, 5),
    [scripts]
  );

  const latestUpdate = useMemo(() => {
    const taskItems = tasks.map((task) => ({
      type: 'task',
      title: task.title || 'Untitled task',
      content: task.script || task.scriptText || task.content || '',
      status: STAGE_LABELS[normalizeStage(task.column)] || 'Concept',
      time: getTimeValue(task.timestamp),
      deadline: task.deadline
    }));

    const scriptItems = scripts.map((script) => ({
      type: 'script',
      title: script.title || 'Untitled script',
      content: script.content || '',
      status: 'Saved script',
      time: getTimeValue(script.updatedAt)
    }));

    return [...taskItems, ...scriptItems].sort((a, b) => b.time - a.time)[0] || null;
  }, [scripts, tasks]);

  const habitSummary = useMemo(() => {
    const completedThisWeek = widgetData.completedHabitLogs;

    return {
      completedThisWeek,
      completedToday: widgetData.completedToday
    };
  }, [widgetData.completedHabitLogs, widgetData.completedToday]);

  const recentWriting = useMemo(
    () =>
      [...scripts]
        .sort((a, b) => getTimeValue(b.updatedAt) - getTimeValue(a.updatedAt))
        .slice(0, 5),
    [scripts]
  );

  const selectedScript = useMemo(
    () => scripts.find((script) => script.id === selectedScriptId) || null,
    [scripts, selectedScriptId]
  );

  const weeklyActivity = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayKeys = [...Array(7)].map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return date.toISOString().split('T')[0];
    });

    const activityByDay = dayKeys.reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});

    const taskActivity = [...tasks, ...scripts].map((item) => ({
      dayKey: getDateKeyFromValue(item.updatedAt) || getDateKeyFromValue(item.timestamp),
      weight: 1
    }));

    const habitActivity = habitLogs.map((log) => ({
      dayKey: log.date || getDateKeyFromValue(log.createdAt) || getDateKeyFromValue(log.updatedAt),
      weight: 1
    }));

    [...taskActivity, ...habitActivity].forEach((entry) => {
      if (entry.dayKey && activityByDay[entry.dayKey] !== undefined) {
        activityByDay[entry.dayKey] += entry.weight;
      }
    });

    return dayKeys.map((key) => {
      const date = new Date(`${key}T00:00:00`);
      return {
        label: formatDayLabel(date),
        value: activityByDay[key] || 0
      };
    });
  }, [habitLogs, scripts, tasks]);

  const weeklyPeak = Math.max(1, ...weeklyActivity.map((item) => item.value));

  return (
    <div className="min-h-[calc(100vh-4rem)] rounded-[2rem] border border-white/10 bg-[#111318] p-5 text-white shadow-2xl shadow-black/30 lg:p-6">
      <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#f97316]/20 bg-[#f97316]/10 px-3 py-1 text-xs font-medium text-[#ffc01e]">
            <Sparkles size={14} />
            Desktop widget board
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Overall progress at a glance</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            A compact overview of your creative pipeline, built like a desktop widget board so you can check status instantly.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-300 sm:grid-cols-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCount(summary.total)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Active</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCount(summary.inProgress)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Done</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCount(summary.completed)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Due soon</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCount(widgetData.dueSoon)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Scripts</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCount(recentScripts.length)}</p>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Saved writing</p>
          <p className="mt-2 text-lg font-semibold text-white">{formatCount(scripts.length)} scripts in sync</p>
          <p className="mt-1 text-sm text-slate-400">Latest save updates this card automatically.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Habit check-ins</p>
          <p className="mt-2 text-lg font-semibold text-white">{formatCount(habitSummary.completedThisWeek)} ticks this week</p>
          <p className="mt-1 text-sm text-slate-400">{formatCount(habitSummary.completedToday)} completed today</p>
        </div>
      </div>

      {loadError && (
        <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      )}

      <section className="mb-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#181a1f] via-[#12141a] to-[#0f1116] p-5 shadow-xl shadow-black/20 lg:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Main widget</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Overall progress</h3>
            </div>
            <Target className="h-5 w-5 text-[#ffc01e]" />
          </div>

          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <div className="absolute inset-2 rounded-full border border-white/5 bg-[#0f1116]/80" />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#ffc01e 0deg ${summary.avgProgress * 3.6}deg, rgba(255,255,255,0.08) ${summary.avgProgress * 3.6}deg 360deg)`,
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 16px), #000 calc(100% - 15px))',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 16px), #000 calc(100% - 15px))'
                }}
              />
              <div className="relative text-center">
                <p className="text-4xl font-semibold text-white">{formatPercent(summary.avgProgress)}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">Average</p>
              </div>
            </div>

            <div className="grid gap-3 sm:min-w-[260px]">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-[#ffc01e]" />
                  <div>
                    <p className="text-sm font-medium text-white">Completion rate</p>
                    <p className="text-xs text-slate-500">Finished tasks in the board</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-white">{formatPercent(widgetData.completionRate)}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-[#ffc01e]" />
                  <div>
                    <p className="text-sm font-medium text-white">Deadline pressure</p>
                    <p className="text-xs text-slate-500">Tasks due in the next 3 days</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-white">{formatCount(widgetData.dueSoon)}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-[#ffc01e]" />
                  <div>
                    <p className="text-sm font-medium text-white">Live output</p>
                    <p className="text-xs text-slate-500">Published and performance-ready</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-white">{formatCount(widgetData.liveTasks)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Widget</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Workflow split</h3>
            </div>
            <BarChart3 className="h-5 w-5 text-[#ffc01e]" />
          </div>

          <div className="space-y-3">
            {WORKFLOW_STEPS.map((step) => {
              const count = summary.stepCounts[step.id] || 0;
              const percent = summary.total ? (count / summary.total) * 100 : 0;

              return (
                <div key={step.id} className="rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{step.label}</p>
                      <p className="text-xs text-slate-500">{count} tasks</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-300">{formatPercent(percent)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[#f97316] to-[#ffc01e] transition-all duration-500"
                      style={{ width: `${Math.max(4, percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Widget</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Latest update</h3>
            </div>
            <Rocket className="h-5 w-5 text-[#ffc01e]" />
          </div>

          {latestUpdate ? (
            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Current focus</p>
              <h4 className="mt-2 line-clamp-2 text-lg font-semibold text-white">{latestUpdate.title}</h4>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Type</span>
                  <span>{latestUpdate.type === 'script' ? 'Script' : 'Kanban task'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status</span>
                  <span>{latestUpdate.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Updated</span>
                  <span>{formatShortDateTime(latestUpdate.time)}</span>
                </div>
                {latestUpdate.type === 'task' ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Deadline</span>
                    <span>{formatRelativeDate(latestUpdate.deadline) || 'Not set'}</span>
                  </div>
                ) : null}
              </div>
              {latestUpdate.content ? (
                <p className="mt-4 line-clamp-4 rounded-2xl border border-white/10 bg-black/10 p-3 text-sm leading-6 text-slate-300">
                  {latestUpdate.content}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/30 text-sm text-slate-500">
              No tasks yet. Add your first idea to populate the widget board.
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 lg:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Progress</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Script completion</h3>
            </div>
            <BarChart3 className="h-5 w-5 text-[#ffc01e]" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
            <ProgressRing value={summary.avgProgress} />

            <div className="space-y-3">
            {WORKFLOW_STEPS.map((step) => {
              const count = summary.stepCounts[step.id] || 0;

                return (
                  <div key={step.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{step.label}</p>
                      <p className="text-xs text-slate-500">Scripts in this stage</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-200">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 lg:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Scripts</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Recent writing</h3>
            </div>
            <FileText className="h-5 w-5 text-[#ffc01e]" />
          </div>

          <div className="space-y-2">
            {recentWriting.length > 0 ? (
              recentWriting.map((script) => {
                return (
                  <button
                    key={script.id}
                    type="button"
                    onClick={() => setSelectedScriptId(script.id)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 px-4 py-3 text-left transition hover:border-[#f97316]/25 hover:bg-slate-950/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{script.title || 'Untitled script'}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatShortDateTime(script.updatedAt)}</p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      <PlayCircle className="h-3.5 w-3.5" />
                      Script
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/30 text-sm text-slate-500">
                No scripts yet. Start your first draft from the Scripts tab.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 lg:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Weekly graph</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Activity over the last 7 days</h3>
          </div>
          <span className="rounded-full border border-[#f97316]/20 bg-[#f97316]/10 px-3 py-1 text-xs font-medium text-[#ffc01e]">
            {tasks.length} tasks total
          </span>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {weeklyActivity.map((day) => {
            const height = Math.max(18, Math.round((day.value / weeklyPeak) * 100));

            return (
              <div key={day.label} className="flex flex-col items-center gap-3">
                <div className="flex h-36 w-full items-end justify-center rounded-2xl border border-white/5 bg-[#0f1116]/60 p-2">
                  <div
                    className="w-full rounded-xl bg-gradient-to-t from-[#f97316] to-[#ffc01e] transition-all duration-500"
                    style={{ height: `${height}%` }}
                    title={`${day.label}: ${day.value} tasks`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-white">{day.label}</p>
                  <p className="text-[11px] text-slate-500">{day.value} items</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {selectedScript ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"
          onClick={() => setSelectedScriptId('')}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-white/10 bg-[#111318] shadow-2xl shadow-black/60"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Full Script</p>
                <h4 className="mt-1 text-xl font-semibold text-white">
                  {selectedScript.title || 'Untitled script'}
                </h4>
                <p className="mt-1 text-sm text-slate-400">
                  {formatShortDateTime(selectedScript.updatedAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedScriptId('')}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 p-5">
              <div className="h-full max-h-[calc(90vh-9.5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1116] p-4">
                <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-100">
                  {selectedScript.content || 'No script content found.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Dashboard;
