import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, ThumbsUp, MessageSquare, Loader2, User, Video, BarChart3, Search } from 'lucide-react';

const YOUTUBE_API_KEY = "AIzaSyBSJf1qJ4agz3YO2BP-GN6-gyUTEZ6tvew";

const formatNumber = (value) => {
  const num = Number(value);

  if (!Number.isFinite(num)) return '0';

  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;

  return num.toLocaleString();
};

const formatMaybeCount = (value) => {
  if (value === null || value === undefined) return 'Hidden';
  return formatNumber(value);
};

const clampTitleStyle = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden'
};

const parseChannelInput = (rawInput) => {
  const value = rawInput.trim();
  if (!value) return null;

  if (/^UC[a-zA-Z0-9_-]{22}$/.test(value)) {
    return { type: 'id', value };
  }

  if (value.startsWith('@')) {
    return { type: 'handle', value: value.slice(1).trim() };
  }

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();

    if (!host.includes('youtube.com') && !host.includes('youtu.be')) {
      return null;
    }

    const pathParts = url.pathname.split('/').filter(Boolean);
    const handlePart = pathParts.find((part) => part.startsWith('@'));

    if (handlePart) {
      return { type: 'handle', value: handlePart.slice(1).trim() };
    }

    if (pathParts[0] === 'channel' && pathParts[1]) {
      return { type: 'id', value: pathParts[1] };
    }

    if (pathParts[0] === 'c' || pathParts[0] === 'user') {
      return null;
    }

    if (pathParts[0] && pathParts[0] !== 'watch' && pathParts[0] !== 'shorts' && pathParts[0] !== 'live') {
      return { type: 'handle', value: pathParts[0].replace(/^@/, '').trim() };
    }
  } catch {
    // Fall through to the plain-text fallback below.
  }

  return { type: 'handle', value: value.replace(/^@/, '').split(/[/?#&]/)[0].trim() };
};

const getApiErrorMessage = (payload, fallback) => {
  const message = payload?.error?.message;
  return message || fallback;
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, 'Something went wrong while calling the YouTube API.'));
  }

  return data;
};

const AnalyticsDashboard = ({ user }) => {
  const [channelInput, setChannelInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const lastAutoLoadedKeyRef = useRef('');

  const storageKey = user?.uid ? `creatorsync:last-youtube-channel:${user.uid}` : null;

  const saveChannelPreference = useCallback((value) => {
    if (!storageKey || !value) return;

    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // Ignore storage failures and keep the dashboard working.
    }
  }, [storageKey]);

  const fetchStats = useCallback(async (rawInput, { persist = true } = {}) => {
    const parsedInput = parseChannelInput(rawInput);

    if (!parsedInput?.value) {
      setError('Please paste a valid YouTube channel link, handle, or channel ID.');
      return false;
    }

    setLoading(true);
    setError('');
    setChannel(null);
    setVideos([]);

    try {
      const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
      channelUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
      channelUrl.searchParams.set('key', YOUTUBE_API_KEY);

      if (parsedInput.type === 'id') {
        channelUrl.searchParams.set('id', parsedInput.value);
      } else {
        channelUrl.searchParams.set('forHandle', parsedInput.value);
      }

      const channelData = await fetchJson(channelUrl.toString());
      const channelItem = channelData.items?.[0];

      if (!channelItem) {
        throw new Error('Channel not found. Please check the link or handle and try again.');
      }

      const uploadsPlaylistId = channelItem.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        throw new Error('Could not locate the channel uploads playlist.');
      }

      const playlistUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      playlistUrl.searchParams.set('part', 'snippet');
      playlistUrl.searchParams.set('playlistId', uploadsPlaylistId);
      playlistUrl.searchParams.set('maxResults', '6');
      playlistUrl.searchParams.set('key', YOUTUBE_API_KEY);

      const playlistData = await fetchJson(playlistUrl.toString());
      const recentVideoIds = (playlistData.items || [])
        .map((item) => item.snippet?.resourceId?.videoId)
        .filter(Boolean)
        .slice(0, 6);

      let detailedVideos = [];

      if (recentVideoIds.length > 0) {
        const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        videosUrl.searchParams.set('part', 'snippet,statistics');
        videosUrl.searchParams.set('id', recentVideoIds.join(','));
        videosUrl.searchParams.set('key', YOUTUBE_API_KEY);

        const videosData = await fetchJson(videosUrl.toString());
        const videoMap = new Map((videosData.items || []).map((item) => [item.id, item]));

        detailedVideos = recentVideoIds
          .map((videoId) => videoMap.get(videoId))
          .filter(Boolean)
          .map((video) => ({
            id: video.id,
            title: video.snippet?.title || 'Untitled video',
            thumbnail:
              video.snippet?.thumbnails?.high?.url ||
              video.snippet?.thumbnails?.medium?.url ||
              video.snippet?.thumbnails?.default?.url ||
              `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
            views: video.statistics?.viewCount,
            likes: video.statistics?.likeCount,
            comments: video.statistics?.commentCount
          }));
      }

      setChannel({
        id: channelItem.id,
        name: channelItem.snippet?.title || 'Unknown channel',
        avatar:
          channelItem.snippet?.thumbnails?.high?.url ||
          channelItem.snippet?.thumbnails?.medium?.url ||
          channelItem.snippet?.thumbnails?.default?.url ||
          'https://via.placeholder.com/240x240?text=Channel',
        subscriberCount: channelItem.statistics?.subscriberCount,
        viewCount: channelItem.statistics?.viewCount,
        videoCount: channelItem.statistics?.videoCount,
        uploadsPlaylistId
      });
      setVideos(detailedVideos);

      if (persist) {
        saveChannelPreference(rawInput.trim());
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch channel analytics.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [saveChannelPreference]);

  useEffect(() => {
    if (!storageKey) return;
    if (lastAutoLoadedKeyRef.current === storageKey) return;
    lastAutoLoadedKeyRef.current = storageKey;

    let cancelled = false;

    try {
      const savedChannel = localStorage.getItem(storageKey);
      if (!savedChannel) return;

      setChannelInput(savedChannel);

      void (async () => {
        if (cancelled) return;
        await fetchStats(savedChannel, { persist: false });
      })();
    } catch {
      // Ignore storage issues and wait for manual input.
    }

    return () => {
      cancelled = true;
    };
  }, [storageKey, fetchStats]);

  const handleFetchStats = async (event) => {
    event.preventDefault();
    await fetchStats(channelInput);
  };

  return (
    <div className="min-h-screen bg-[#111318] text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-28 left-0 h-80 w-80 rounded-full bg-[#f97316]/18 blur-3xl" />
        <div className="absolute top-40 right-[-6rem] h-96 w-96 rounded-full bg-[#ffc01e]/12 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/4 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10 backdrop-blur">
            <BarChart3 className="h-5 w-5 text-[#ffc01e]" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#ffc01e]/80">Creator Analytics</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">YouTube channel performance dashboard</h1>
          </div>
        </div>

        <form
          onSubmit={handleFetchStats}
          className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6"
        >
          <label className="mb-3 block text-sm font-medium text-slate-200">
            Paste a YouTube Channel Link or Handle
          </label>
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="@MrBeast or https://youtube.com/@MrBeast"
                className="w-full rounded-2xl border border-white/10 bg-[#0f1116]/80 py-4 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f97316] to-[#ffc01e] px-6 py-4 text-sm font-semibold text-[#111318] transition hover:from-[#ff8f33] hover:to-[#ffc94d] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Fetching...' : 'Fetch Stats'}
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </form>

        {channel ? (
          <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-[#181a1f]/90 to-[#0f1116]/80 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
              <div className="flex items-center gap-4">
                <img
                  src={channel.avatar}
                  alt={channel.name}
              className="h-20 w-20 rounded-full border border-white/10 object-cover shadow-lg shadow-[#f97316]/10"
                />
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Channel Overview</p>
                  <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{channel.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">Channel ID: {channel.id}</p>
                </div>
              </div>

              <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-400">
                    <User className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.2em]">Subscribers</span>
                  </div>
                  <p className="text-xl font-semibold">{formatMaybeCount(channel.subscriberCount)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-400">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.2em]">Views</span>
                  </div>
                  <p className="text-xl font-semibold">{formatMaybeCount(channel.viewCount)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-400">
                    <Video className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.2em]">Videos</span>
                  </div>
                  <p className="text-xl font-semibold">{formatMaybeCount(channel.videoCount)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-400">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.2em]">Uploads</span>
                  </div>
                  <p className="text-xl font-semibold">{videos.length}</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {videos.length > 0 ? (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Recent Uploads</h3>
                <p className="text-sm text-slate-400">The 6 most recent videos from the channel uploads playlist.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {videos.map((video) => (
                <article
                  key={video.id}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg shadow-black/10 transition hover:-translate-y-1 hover:border-[#f97316]/30 hover:bg-white/10"
                >
                  <a
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                  </a>

                  <div className="space-y-4 p-4">
                    <h4
                      className="text-base font-semibold leading-snug text-white"
                      style={clampTitleStyle}
                      title={video.title}
                    >
                      {video.title}
                    </h4>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                        <div className="flex items-center gap-1.5 text-[#ffc01e]">
                          <Eye className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-300">Views</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold">{formatMaybeCount(video.views)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                        <div className="flex items-center gap-1.5 text-[#ffc01e]">
                          <ThumbsUp className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-300">Likes</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold">{formatMaybeCount(video.likes)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                        <div className="flex items-center gap-1.5 text-[#f97316]">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-300">Comments</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold">{formatMaybeCount(video.comments)}</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          !loading &&
          !error && (
            <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-slate-400">
              Enter a channel handle or link to load the latest analytics and uploads.
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
