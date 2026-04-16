import React from 'react';
import {
  Clock,
  Trash2,
  Youtube,
  Instagram,
  FileText,
  PlayCircle,
  CalendarDays,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

const platformIcons = {
  YouTube: Youtube,
  'Instagram Reel': Instagram,
  'YT Shorts': Youtube
};

const statusStyles = {
  Idea: 'border-[#f97316]/30 bg-[#f97316]/10 text-[#ffc01e]',
  Writing: 'border-[#ffc01e]/30 bg-[#ffc01e]/10 text-[#111318]',
  Recording: 'border-[#ff8f33]/30 bg-[#ff8f33]/10 text-[#111318]',
  Editing: 'border-white/20 bg-white/10 text-white',
  Scheduled: 'border-white/20 bg-white/10 text-white',
  Published: 'border-white/20 bg-white/10 text-white'
};

const priorityStyles = {
  High: 'border-[#f97316]/30 bg-[#f97316]/10 text-[#ffc01e]',
  Medium: 'border-[#ffc01e]/30 bg-[#ffc01e]/10 text-[#111318]',
  Low: 'border-slate-400/30 bg-slate-500/10 text-slate-200'
};

const toTagList = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;

  return String(tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const getDeadlineTone = (deadline) => {
  if (!deadline) return null;

  const due = new Date(deadline);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Overdue', tone: 'border-[#f97316]/30 bg-[#f97316]/10 text-[#ffc01e]', icon: AlertTriangle };
  }

  if (diffDays <= 3) {
    return { label: 'Due soon', tone: 'border-[#ffc01e]/30 bg-[#ffc01e]/10 text-[#111318]', icon: Clock };
  }

  return { label: 'On track', tone: 'border-white/20 bg-white/10 text-white', icon: CheckCircle2 };
};

const formatDateLabel = (value) => {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit'
  }).format(parsed);
};

const PipelineCard = ({
  task,
  stage,
  nextLabel,
  onDelete,
  onAdvance,
  onPrev,
  onDragStart
}) => {
  const PlatformIcon = platformIcons[task.platform] || Youtube;
  const tags = toTagList(task.tags);
  const deadlineTone = getDeadlineTone(task.deadline);
  const priority = task.priority || 'Medium';
  const progress = Number(task.progress ?? 0);
  const clipUrl = task.clipUrl || task.rawClipUrl || '';
  const script = task.script || task.scriptText || '';
  const metrics = task.metrics || {};
  const platformBadgeClass = PlatformIcon === Instagram
    ? 'border-pink-400/30 bg-pink-500/10 text-pink-200'
    : 'border-red-400/30 bg-red-500/10 text-red-200';

  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className="group cursor-grab rounded-3xl border border-white/10 bg-gradient-to-br from-[#181a1f]/90 to-[#0f1116]/80 p-4 shadow-lg shadow-black/20 transition duration-200 hover:-translate-y-1 hover:border-[#f97316]/30 hover:shadow-[0_20px_40px_rgba(249,115,22,0.08)] active:cursor-grabbing"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${platformBadgeClass}`}>
            <PlatformIcon size={13} />
            {task.platform || 'YouTube'}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${priorityStyles[priority] || priorityStyles.Medium}`}>
            Priority: {priority}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusStyles[task.status] || statusStyles.Idea}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {task.status || 'Idea'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 opacity-0 transition hover:border-[#f97316]/30 hover:text-[#ffc01e] group-hover:opacity-100"
          title="Delete card"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <h4 className="mb-2 text-base font-semibold text-white">{task.title}</h4>

      <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
        {deadlineTone ? (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${deadlineTone.tone}`}>
            <deadlineTone.icon size={12} />
            {deadlineTone.label}: {formatDateLabel(task.deadline)}
          </span>
        ) : null}

        {task.reminder ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">
            <CalendarDays size={12} />
            Reminder {formatDateLabel(task.reminder)}
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        {stage === 'ideas' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Idea details</p>
            <div className="flex flex-wrap gap-2">
              {tags.length > 0 ? tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[#111318]/70 px-2.5 py-1 text-[11px] text-slate-200">
                  #{tag}
                </span>
              )) : (
                <span className="text-sm text-slate-500">Add tags to sharpen the angle.</span>
              )}
            </div>
          </div>
        )}

        {stage === 'script' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <FileText size={12} />
              Script status
            </div>
            <p className="text-sm text-slate-200">{task.scriptStatus || 'Draft'}</p>
            <p className="mt-3 line-clamp-3 text-sm text-slate-400">
              {script || 'Attach the script draft, outline, or beat sheet here.'}
            </p>
          </div>
        )}

        {stage === 'filming' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <PlayCircle size={12} />
              Raw clips
            </div>
            {clipUrl ? (
              <a
                href={clipUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[#f97316]/20 bg-[#f97316]/10 px-3 py-2 text-sm text-[#ffc01e] transition hover:bg-[#f97316]/20"
              >
                Open clip
              </a>
            ) : (
              <p className="text-sm text-slate-400">Drop the raw clip link, drive file, or upload note here.</p>
            )}
          </div>
        )}

        {stage === 'editing' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Edit progress</span>
              <span className="text-sm font-semibold text-white">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#f97316] to-[#ffc01e] transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
          </div>
        )}

        {stage === 'publish' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <CalendarDays size={12} />
              Publish plan
            </div>
            <p className="text-sm text-slate-200">
              {task.scheduledFor ? `Scheduled for ${formatDateLabel(task.scheduledFor)}` : 'Set a publish date and platform.'}
            </p>
            <p className="mt-2 text-sm text-slate-400">{task.publishStatus || 'Queued'}</p>
          </div>
        )}

        {stage === 'performance' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Views</p>
              <p className="mt-1 text-lg font-semibold text-white">{Number(metrics.views || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Likes</p>
              <p className="mt-1 text-lg font-semibold text-white">{Number(metrics.likes || 0).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onPrev(task.id, stage)}
          disabled={stage === 'ideas'}
          className="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowLeft size={12} />
          Prev
        </button>

        <button
          type="button"
          onClick={() => onAdvance(task.id, stage)}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#ffc01e] transition hover:text-white"
        >
          {nextLabel}
          <ArrowRight size={12} />
        </button>
      </div>
    </article>
  );
};

export default PipelineCard;
