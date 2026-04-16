import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2, Wand2, X } from 'lucide-react';
import { deleteScript, fetchHistory, restoreVersion, saveScript } from './scriptVersions';

const initialScripts = [
  {
    id: 'script-1',
    title: 'A Day in Life',
    content: 'Open with a hook.\n\nSet the scene fast.\n\nBuild the tension and close with a clean payoff.'
  },
  {
    id: 'script-2',
    title: 'Behind the Edit',
    content: 'Start with the problem.\n\nShow the process.\n\nEnd with the result viewers came for.'
  }
];

const createScriptId = () => `script-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const normalizeRewrite = (value) => {
  const cleaned = value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
};

const formatVersionTime = (value) => {
  if (!value) {
    return 'Unknown time';
  }

  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
};

const SmartScript = ({ user }) => {
  const [scripts, setScripts] = useState(initialScripts);
  const [activeScriptId, setActiveScriptId] = useState(initialScripts[0].id);
  const [editorContent, setEditorContent] = useState({
    title: initialScripts[0].title,
    content: initialScripts[0].content
  });
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [openVersionId, setOpenVersionId] = useState('');

  const activeScript = scripts.find((script) => script.id === activeScriptId) || null;

  const loadScript = (script) => {
    setActiveScriptId(script.id);
    setEditorContent({
      title: script.title,
      content: script.content
    });
    setSelectedVersionId('');
    setHistory([]);
    setHistoryError('');
  };

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      if (!activeScriptId) {
        setHistory([]);
        setSelectedVersionId('');
        return;
      }

      setHistoryLoading(true);
      setHistoryError('');

      try {
        const versions = await fetchHistory(activeScriptId);
        if (!active) {
          return;
        }

        setHistory(versions);
        setSelectedVersionId(versions[0]?.id || '');
      } catch (error) {
        if (!active) {
          return;
        }

        setHistoryError(error instanceof Error ? error.message : 'Failed to load version history.');
        setHistory([]);
        setSelectedVersionId('');
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      active = false;
    };
  }, [activeScriptId]);

  const handleNewScript = () => {
    const newScript = {
      id: createScriptId(),
      title: '',
      content: ''
    };

    setScripts((current) => [newScript, ...current]);
    setActiveScriptId(newScript.id);
    setEditorContent({ title: '', content: '' });
  };

  const refreshHistory = async (scriptId) => {
    const versions = await fetchHistory(scriptId);
    setHistory(versions);
    setSelectedVersionId(versions[0]?.id || '');
  };

  const persistScript = async (contentToSave) => {
    if (!user?.uid) {
      throw new Error('You must be signed in to save scripts.');
    }

    const nextTitle = editorContent.title.trim();
    const nextContent = contentToSave.trim();

    await saveScript({
      scriptId: activeScriptId,
      title: nextTitle,
      content: nextContent,
      userId: user.uid
    });

    setScripts((current) =>
      current.map((script) =>
        script.id === activeScriptId
          ? {
              ...script,
              title: nextTitle,
              content: nextContent
            }
          : script
      )
    );

    setEditorContent((current) => ({
      ...current,
      title: nextTitle,
      content: nextContent
    }));

    await refreshHistory(activeScriptId);
  };

  const handleSave = async () => {
    try {
      await persistScript(editorContent.content);
      setRewriteError('');
    } catch (error) {
      console.error('Save failed:', error);
      setRewriteError(error instanceof Error ? error.message : 'Save failed.');
    }
  };

  const handleDeleteScript = async (scriptId) => {
    const shouldDelete = window.confirm('Delete this script?');
    if (!shouldDelete) return;

    try {
      if (user?.uid) {
        await deleteScript(scriptId);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      setRewriteError(error instanceof Error ? error.message : 'Delete failed.');
    }

    setScripts((current) => {
      const nextScripts = current.filter((script) => script.id !== scriptId);

      if (scriptId === activeScriptId) {
        const nextActiveScript = nextScripts[0] || null;
        setActiveScriptId(nextActiveScript?.id || '');
        setEditorContent(
          nextActiveScript
            ? {
                title: nextActiveScript.title,
                content: nextActiveScript.content
              }
            : { title: '', content: '' }
        );
      }

      return nextScripts;
    });
  };

  const callRewriteApi = async ({ title, content }) => {
    const response = await fetch('/api/rewrite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.error?.message ||
        `Could not rewrite the script. API returned ${response.status}.`;
      throw new Error(message);
    }

    return data.content?.trim() || '';
  };

  const handleRewrite = async () => {
    const sourceText = editorContent.content.trim();
    setRewriteError('');

    if (!sourceText) {
      setRewriteError('Add a script or rough idea before rewriting.');
      return;
    }

    setIsRewriting(true);

    try {
      const rewritten = await callRewriteApi({
        title: editorContent.title.trim(),
        content: editorContent.content.trim()
      });

      const nextContent = rewritten || normalizeRewrite(editorContent.content);
      setEditorContent((current) => ({
        ...current,
        content: nextContent
      }));

      if (user?.uid) {
        persistScript(nextContent).catch((error) => {
          console.error('Background save after rewrite failed:', error);
          setRewriteError(
            error instanceof Error
              ? `${error.message} The rewritten script is still in the editor.`
              : 'The rewritten script is still in the editor, but saving failed.'
          );
        });
      }
    } catch (error) {
      console.error('SB7 rewrite failed:', error);
      setRewriteError(error instanceof Error ? error.message : 'Rewrite failed.');
    } finally {
      setIsRewriting(false);
    }
  };

  const handleViewVersion = (versionId) => {
    setSelectedVersionId(versionId);
    setOpenVersionId(versionId);
  };

  const closeVersionViewer = () => {
    setOpenVersionId('');
  };

  const handleRestoreSelectedVersion = async (version) => {
    if (!version) {
      return;
    }

    try {
      if (!user?.uid) {
        throw new Error('You must be signed in to restore versions.');
      }

      const restored = await restoreVersion({
        scriptId: activeScriptId,
        versionContent: version.content,
        title: editorContent.title.trim(),
        userId: user.uid
      });

      setScripts((current) =>
        current.map((script) =>
          script.id === activeScriptId
            ? {
                ...script,
                title: restored.title,
                content: restored.content
              }
            : script
        )
      );

      setEditorContent((current) => ({
        ...current,
        content: version.content
      }));

      await refreshHistory(activeScriptId);
      setSelectedVersionId('');
      setRewriteError('');
    } catch (error) {
      console.error('Restore failed:', error);
      setRewriteError(error instanceof Error ? error.message : 'Restore failed.');
    }
  };

  const selectedVersion = history.find((version) => version.id === selectedVersionId) || history[0] || null;
  const openVersion = history.find((version) => version.id === openVersionId) || null;

  return (
    <div className="min-h-[calc(100vh-4rem)] rounded-3xl border border-white/10 bg-[#111318] text-white shadow-2xl shadow-black/30">
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[30%_70%]">
        <aside className="border-b border-white/10 bg-white/[0.03] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Video Scripts</h2>
              <p className="mt-1 text-sm text-slate-400">Select, edit, save.</p>
            </div>

            <button
              type="button"
              onClick={handleNewScript}
              className="inline-flex items-center gap-2 rounded-full border border-[#f97316]/20 bg-[#f97316]/10 px-4 py-2 text-sm font-medium text-[#ffc01e] transition hover:bg-[#f97316]/15 hover:text-white"
            >
              <Plus className="h-4 w-4" />
              New Script
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1 lg:h-[calc(100vh-11rem)]">
            {scripts.map((script) => {
              const isActive = script.id === activeScriptId;

              return (
                <div
                  key={script.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => loadScript(script)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      loadScript(script);
                    }
                  }}
                  className={`group w-full rounded-2xl border p-4 text-left transition outline-none ${
                    isActive
                      ? 'border-[#f97316]/40 bg-[#f97316]/10 shadow-[0_0_0_1px_rgba(249,115,22,0.15)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">
                        {script.title.trim() || 'Untitled Script'}
                      </p>
                      <p className="mt-1 max-h-10 overflow-hidden text-sm text-slate-400">
                        {script.content.trim() || 'Start a new draft.'}
                      </p>
                    </div>

                    <div className="flex items-start gap-2">
                      {isActive ? (
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#ffc01e] shadow-[0_0_12px_rgba(255,192,30,0.75)]" />
                      ) : null}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteScript(script.id);
                        }}
                        className="rounded-full p-1 text-slate-500 opacity-0 transition hover:bg-white/5 hover:text-red-300 group-hover:opacity-100"
                        title="Delete script"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="p-4 lg:p-6">
          <div className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-[#181a1f] p-4 lg:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{activeScript?.title?.trim() || 'Untitled Script'}</h3>
                <p className="mt-1 text-sm text-slate-400">One script, one editor, no context switching.</p>
              </div>
            </div>

            <input
              type="text"
              value={editorContent.title}
              onChange={(event) =>
                setEditorContent((current) => ({
                  ...current,
                  title: event.target.value
                }))
              }
              placeholder="Script title"
              className="w-full rounded-2xl border border-white/10 bg-[#111318] px-4 py-4 text-lg font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-[#f97316]/50 focus:ring-2 focus:ring-[#f97316]/20"
            />

            <textarea
              value={editorContent.content}
              onChange={(event) =>
                setEditorContent((current) => ({
                  ...current,
                  content: event.target.value
                }))
              }
              placeholder="Write the script here..."
              className="min-h-0 flex-1 resize-none rounded-2xl border border-white/10 bg-[#111318] px-4 py-4 text-sm leading-7 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#f97316]/50 focus:ring-2 focus:ring-[#f97316]/20"
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#f97316] px-5 py-3.5 text-sm font-semibold text-[#111318] transition hover:bg-[#ff8f33]"
              >
                <Save className="h-4 w-4" />
                Save
              </button>

              <button
                type="button"
                onClick={handleRewrite}
                disabled={isRewriting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isRewriting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {isRewriting ? 'Rewriting...' : 'Rewrite'}
              </button>
            </div>

            {rewriteError ? (
              <div className="rounded-2xl border border-[#ffc01e]/20 bg-[#ffc01e]/10 px-4 py-3 text-sm text-[#ffc01e]">
                {rewriteError}
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-base font-semibold">Version History</h4>
                <span className="text-xs text-slate-400">{history.length} versions</span>
              </div>

              {historyLoading ? <p className="text-sm text-slate-400">Loading versions...</p> : null}
              {historyError ? <p className="text-sm text-red-300">{historyError}</p> : null}

              {!historyLoading && !historyError && history.length === 0 ? (
                <p className="text-sm text-slate-400">No saved versions yet.</p>
              ) : null}

              <div className="mt-3 space-y-2">
                {history.map((version) => (
                  <div
                    key={version.id}
                    className={`rounded-xl border p-3 ${
                      version.id === selectedVersionId
                        ? 'border-[#f97316]/40 bg-[#f97316]/10'
                        : 'border-white/10 bg-black/10'
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{formatVersionTime(version.createdAt)}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{version.content}</p>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewVersion(version.id)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/5"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRestoreSelectedVersion(version)}
                        className="rounded-lg border border-[#f97316]/30 px-3 py-1.5 text-xs text-[#ffc01e] hover:bg-[#f97316]/10"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedVersion ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-[#111318] p-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Preview</p>
                  <textarea
                    readOnly
                    value={selectedVersion.content}
                    className="h-32 w-full resize-none bg-transparent text-sm leading-6 text-slate-100 outline-none"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {openVersion ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-white/10 bg-[#111318] shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Full Script</p>
                <h4 className="mt-1 text-xl font-semibold text-white">
                  {editorContent.title?.trim() || activeScript?.title?.trim() || 'Untitled Script'}
                </h4>
                <p className="mt-1 text-sm text-slate-400">{formatVersionTime(openVersion.createdAt)}</p>
              </div>

              <button
                type="button"
                onClick={closeVersionViewer}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close script viewer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 p-5">
              <div className="h-full max-h-[calc(90vh-9.5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1116] p-4">
                <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-100">
                  {openVersion.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SmartScript;
