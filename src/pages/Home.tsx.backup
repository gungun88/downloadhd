import { Link } from 'react-router-dom';
import {
  Link as LinkIcon,
  Sparkles,
  Video,
  Music,
  X,
  Download,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { addToHistory } from '../utils/history';

interface Format {
  format_id: string;
  ext: string;
  quality: number | null;
  filesize: number | null;
  vcodec: string;
  acodec: string;
  tbr: number | null;
  abr: number | null;  // 音频比特率
  vbr: number | null;  // 视频比特率
  url: string;
  has_video: boolean;
  has_audio: boolean;
  http_headers?: Record<string, string>;
}

interface ParseResult {
  title: string;
  thumbnail: string | null;
  duration: number | null;
  platform: string | null;
  uploader: string | null;
  formats: Format[];
  source_url?: string;  // original URL passed back for stream endpoint
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function buildDownloadUrl(format: Format, title: string, sourceUrl?: string, platform?: string | null, index?: number): string {
  // Generate filename: downloadhd_YYYYMMDD_序号
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const filename = index !== undefined
    ? `downloadhd_${dateStr}_${String(index + 1).padStart(3, '0')}`
    : title.slice(0, 80);

  // Check if the URL is HLS format (m3u8 playlist)
  const isHLS = format.url.includes('.m3u8') || format.url.includes('manifest/hls');

  // Platforms that need backend streaming proxy (due to special headers, cookies, or anti-bot measures)
  const needsProxy = ['tiktok', 'instagram', 'facebook', 'twitter', 'xiaohongshu'];

  // For HLS streams or platforms that need proxy, use backend streaming
  if (isHLS || (platform && needsProxy.includes(platform.toLowerCase()))) {
    const params = new URLSearchParams({
      url: sourceUrl || format.url,
      format_id: format.format_id,
      filename: filename,
      ext: format.ext,
    });
    return `/api/stream?${params.toString()}`;
  }

  // For YouTube and other platforms, use backend proxy to avoid CORS issues
  // Encode the URL and headers for backend proxy
  const headers = format.http_headers ? btoa(JSON.stringify(format.http_headers)) : '';
  const params = new URLSearchParams({
    url: format.url,
    headers: headers,
    filename: filename,
    ext: format.ext,
  });
  return `/api/download?${params.toString()}`;
}

const SERVICES = [
  'bilibili', 'bluesky', 'dailymotion', 'facebook', 'instagram', 'loom', 'ok',
  'pinterest', 'newgrounds', 'reddit', 'rutube', 'snapchat', 'soundcloud',
  'streamable', 'tiktok', 'tumblr', 'twitch clips', 'twitter', 'vimeo', 'vk',
  'xiaohongshu', 'youtube',
];

const Home = () => {
  const [url, setUrl] = useState('');
  const [activeMode, setActiveMode] = useState<'auto' | 'video' | 'audio'>('auto');
  const [showServices, setShowServices] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false); // Ref-based lock to prevent race conditions

  // Component lifecycle logging
  const componentIdRef = useRef(`Home-${Date.now()}`);
  console.log(`[COMPONENT_RENDER] ${componentIdRef.current} - Component rendering`, {
    hasResult: !!result,
    loading,
    url: url.substring(0, 50)
  });
  const [downloadingFormats, setDownloadingFormats] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Track latest parse request to avoid 旧请求覆盖新结果
  const parseRequestIdRef = useRef(0);
  const parseAbortControllerRef = useRef<AbortController | null>(null);

  // Track last parsed URL to prevent clearing results when re-parsing same URL
  const lastParsedUrlRef = useRef<string>('');

  const hasContent = loading || error !== null || result !== null;

  // Abort pending parse when组件卸载，避免内存泄漏
  useEffect(() => {
    console.log(`[COMPONENT_MOUNT] ${componentIdRef.current} - Component mounted`);

    // Track page unload events
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log(`[PAGE_UNLOAD] ${componentIdRef.current} - Page is being unloaded/refreshed`);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      console.log(`[COMPONENT_UNMOUNT] ${componentIdRef.current} - Component unmounting`);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (parseAbortControllerRef.current) {
        parseAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch {
      // Clipboard permission denied — user pastes manually
    }
  };

  const handleSubmit = async () => {
    const trimmed = url.trim();
    const requestId = Date.now(); // 生成唯一请求ID
    console.log(`[VIDEO_PARSE_SUBMIT] Request #${requestId} - Starting parse request`, { url: trimmed, loading, isSubmitting: isSubmittingRef.current });

    if (!trimmed) {
      console.log(`[VIDEO_PARSE_SUBMIT_SKIP] Request #${requestId} - Skipping - empty URL`);
      return;
    }

    // Check both state and ref to prevent race conditions
    if (loading || isSubmittingRef.current) {
      console.log(`[VIDEO_PARSE_SUBMIT_SKIP] Request #${requestId} - Already loading, ignoring duplicate request`, { loading, isSubmitting: isSubmittingRef.current });
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmed);
      console.log(`[VIDEO_PARSE_URL_VALID] Request #${requestId} - URL validation passed`);
    } catch {
      console.error(`[VIDEO_PARSE_URL_INVALID] Request #${requestId} - Invalid URL format`);
      setError('请输入有效的 URL 链接');
      return;
    }

    console.log(`[VIDEO_PARSE_STATE_RESET] Request #${requestId} - Resetting state before parse`);
    console.log(`[VIDEO_PARSE_STATE_RESET] Request #${requestId} - Current result before clear:`, result ? 'HAS_RESULT' : 'NO_RESULT');

    // Set lock immediately to prevent race conditions
    isSubmittingRef.current = true;
    setLoading(true);
    setError(null);
    setResult(null);
    console.log(`[VIDEO_PARSE_STATE_RESET] Request #${requestId} - State cleared, lock set, starting fetch`);

    try {
      console.log(`[VIDEO_PARSE_FETCH_START] Request #${requestId} - Sending POST request to /api/parse`);
      const fetchStartTime = Date.now();

      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const fetchDuration = Date.now() - fetchStartTime;
      console.log(`[VIDEO_PARSE_FETCH_COMPLETE] Request #${requestId}`, {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        duration: `${fetchDuration}ms`
      });

      let json: any | null = null;
      try {
        json = await res.json();
        console.log(`[VIDEO_PARSE_JSON_SUCCESS] Request #${requestId} - Response parsed successfully`, {
          hasTitle: !!json?.title,
          hasFormats: !!json?.formats,
          formatCount: json?.formats?.length || 0,
          platform: json?.platform
        });
      } catch (jsonErr) {
        console.error(`[VIDEO_PARSE_JSON_ERROR] Request #${requestId} - Failed to parse JSON response`, jsonErr);
        throw new Error('服务器返回了无效响应，请稍后重试');
      }

      if (!res.ok) {
        console.error(`[VIDEO_PARSE_ERROR_RESPONSE] Request #${requestId}`, {
          status: res.status,
          detail: json?.detail
        });
        throw new Error(json?.detail || '解析失败，请检查链接是否正确');
      }

      console.log(`[VIDEO_PARSE_SAVE_HISTORY] Request #${requestId} - Saving to history`);
      // Save to history
      // TEMPORARILY DISABLED FOR DEBUGGING
      // addToHistory({
      //   url: trimmed,
      //   title: json.title,
      //   thumbnail: json.thumbnail,
      //   platform: json.platform,
      //   duration: json.duration,
      //   uploader: json.uploader,
      //   formats: json.formats.map((f: Format) => ({
      //     format_id: f.format_id,
      //     ext: f.ext,
      //     quality: f.quality,
      //     filesize: f.filesize,
      //     has_video: f.has_video,
      //     has_audio: f.has_audio,
      //     abr: f.abr,
      //     tbr: f.tbr,
      //   })),
      // });
      console.log(`[VIDEO_PARSE_SAVE_HISTORY_DONE] Request #${requestId} - History save skipped (debugging)`);

      console.log(`[VIDEO_PARSE_SUCCESS] Request #${requestId} - Parse completed successfully`, {
        title: json.title,
        platform: json.platform,
        formatCount: json.formats.length
      });
      console.log(`[VIDEO_PARSE_SET_RESULT] Request #${requestId} - Setting result state`);

      // DEBUGGING: Add a small delay before setting result
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log(`[VIDEO_PARSE_SET_RESULT_AFTER_DELAY] Request #${requestId} - Delay complete, setting result now`);

      setResult({ ...json, source_url: trimmed });
      console.log(`[VIDEO_PARSE_SET_RESULT_DONE] Request #${requestId} - Result state set`);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log(`[VIDEO_PARSE_ABORTED] Request #${requestId} - Request was aborted`);
        return;
      }
      console.error(`[VIDEO_PARSE_ERROR] Request #${requestId} - Parse failed`, {
        errorName: err.name,
        errorMessage: err.message,
        error: err
      });
      setError(err.message || '解析失败，请检查链接是否正确');
    } finally {
      console.log(`[VIDEO_PARSE_COMPLETE] Request #${requestId} - Setting loading to false and releasing lock`);
      setLoading(false);
      isSubmittingRef.current = false; // Release lock
    }
  };

  // Calculate formats directly without useMemo to avoid any caching issues
  const getFormats = () => {
    if (!result) {
      return [];
    }

    const filtered = (() => {
      switch (activeMode) {
        case 'auto': {
          // First try to find formats with both video and audio
          const combined = result.formats.filter(f => f.has_video && f.has_audio);
          if (combined.length > 0) {
            return combined;
          }
          // If no combined formats (like Instagram), show video-only formats as fallback
          return result.formats.filter(f => f.has_video);
        }
        case 'video':
          return result.formats.filter(f => f.has_video);
        case 'audio':
          return result.formats.filter(f => !f.has_video && f.has_audio);
        default:
          return result.formats;
      }
    })();
    return filtered;
  };

  const formats = getFormats();

  const handleDownload = async (formatId: string, downloadUrl: string) => {
    console.log('[VIDEO_DOWNLOAD_START]', { formatId, downloadUrl });
    setDownloadingFormats(prev => new Set(prev).add(formatId));
    setDownloadProgress(prev => new Map(prev).set(formatId, 0));

    // Start simulated progress immediately for better UX
    let simulatedProgress = 0;
    const simulationInterval = setInterval(() => {
      simulatedProgress += 1;
      // Cap simulated progress at 10% to avoid misleading user
      if (simulatedProgress <= 10) {
        setDownloadProgress(prev => {
          const current = prev.get(formatId) || 0;
          // Only update if real progress hasn't started yet
          if (current < 10) {
            return new Map(prev).set(formatId, simulatedProgress);
          }
          return prev;
        });
      } else {
        clearInterval(simulationInterval);
      }
    }, 200); // Update every 200ms for smooth animation

    try {
      console.log('[VIDEO_DOWNLOAD_FETCH] Fetching download URL');
      const fetchStartTime = Date.now();
      // All downloads go through backend proxy to avoid CORS issues
      const response = await fetch(downloadUrl);
      const fetchDuration = Date.now() - fetchStartTime;

      console.log('[VIDEO_DOWNLOAD_RESPONSE]', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        duration: `${fetchDuration}ms`,
        contentLength: response.headers.get('content-length'),
        contentType: response.headers.get('content-type')
      });

      if (!response.ok) {
        clearInterval(simulationInterval);
        console.error('[VIDEO_DOWNLOAD_ERROR] Download failed', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      console.log('[VIDEO_DOWNLOAD_STREAM_START]', { total, hasContentLength: !!contentLength });

      const reader = response.body?.getReader();
      if (!reader) {
        clearInterval(simulationInterval);
        console.error('[VIDEO_DOWNLOAD_NO_READER] Cannot read response stream');
        throw new Error('无法读取响应流');
      }

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Clear simulation once real progress starts
        if (simulatedProgress > 0) {
          clearInterval(simulationInterval);
          simulatedProgress = 0;
        }

        // Update progress
        if (total > 0) {
          const progress = Math.round((receivedLength / total) * 100);
          setDownloadProgress(prev => new Map(prev).set(formatId, progress));
        } else {
          // If no content-length, show indeterminate progress
          const estimatedProgress = Math.min(90, Math.floor(receivedLength / (1024 * 1024) * 10)); // 10% per MB, max 90%
          setDownloadProgress(prev => new Map(prev).set(formatId, estimatedProgress));
        }
      }

      console.log('[VIDEO_DOWNLOAD_STREAM_COMPLETE]', {
        receivedLength,
        total,
        chunks: chunks.length
      });

      // Ensure simulation is cleared
      clearInterval(simulationInterval);

      // Set progress to 100% when done
      setDownloadProgress(prev => new Map(prev).set(formatId, 100));

      // Combine chunks into a single blob
      const blob = new Blob(chunks as BlobPart[]);
      const url = URL.createObjectURL(blob);
      console.log('[VIDEO_DOWNLOAD_BLOB_CREATED]', { blobSize: blob.size, blobType: blob.type });

      // Trigger download
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from Content-Disposition header or use default
      const disposition = response.headers.get('content-disposition');
      let filename = 'video.mp4';

      if (disposition) {
        // Try to extract filename from Content-Disposition header
        const filenameMatch = disposition.match(/filename\*=UTF-8''(.+)|filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1] || filenameMatch[2]);
        }
      }

      console.log('[VIDEO_DOWNLOAD_TRIGGER]', { filename });
      link.download = filename;

      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('[VIDEO_DOWNLOAD_CLEANUP] Cleaned up download link and blob URL');
      }, 100);

      // Keep the downloading state for a moment to show completion
      setTimeout(() => {
        setDownloadingFormats(prev => {
          const next = new Set(prev);
          next.delete(formatId);
          return next;
        });
        setDownloadProgress(prev => {
          const next = new Map(prev);
          next.delete(formatId);
          return next;
        });
        console.log('[VIDEO_DOWNLOAD_SUCCESS] Download completed successfully');
      }, 1000);
    } catch (error) {
      // Clear simulation interval on error
      clearInterval(simulationInterval);

      console.error('[VIDEO_DOWNLOAD_FAILED]', {
        formatId,
        error: error instanceof Error ? error.message : String(error)
      });

      // Reset downloading state on error immediately
      setDownloadingFormats(prev => {
        const next = new Set(prev);
        next.delete(formatId);
        return next;
      });
      setDownloadProgress(prev => {
        const next = new Map(prev);
        next.delete(formatId);
        return next;
      });
      // Show error to user
      const errorMsg = error instanceof Error ? error.message : '下载失败，请重试';
      alert(errorMsg);
    }
  };

  return (
    <div className="flex-1 relative flex flex-col h-full">

      {/* Floating header */}
      <header className="absolute top-0 w-full p-4 md:p-6 flex justify-between items-center z-10">
        <div className="flex-1" />
        <div className="relative flex flex-col items-center">
          <button
            onClick={() => setShowServices(!showServices)}
            className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-sidebar-light dark:bg-sidebar-dark border border-border-light dark:border-border-dark text-xs md:text-sm font-medium text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors shadow-sm cursor-pointer z-50 relative"
          >
            {showServices
              ? <X size={14} className="md:w-4 md:h-4" />
              : <LinkIcon size={14} className="md:w-4 md:h-4" />}
            {showServices ? 'supported services' : '支持的服务'}
          </button>

          <AnimatePresence>
            {showServices && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full mt-4 w-[90vw] max-w-[340px] sm:w-[480px] sm:max-w-none bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl border border-border-light dark:border-border-dark p-4 md:p-6 z-40 flex flex-col items-center right-0 md:right-auto md:left-1/2 md:-translate-x-1/2"
              >
                <div className="flex flex-wrap gap-2 justify-center max-h-[60vh] overflow-y-auto">
                  {SERVICES.map(s => (
                    <span
                      key={s}
                      className="px-2 py-1 md:px-3 md:py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs md:text-sm font-medium text-text-light dark:text-text-dark border border-transparent hover:border-border-light dark:hover:border-border-dark transition-colors cursor-default"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="mt-4 md:mt-6 text-[10px] md:text-[11px] text-center text-muted-light dark:text-muted-dark leading-relaxed max-w-[95%]">
                  support for a service does not imply affiliation, endorsement, or any form of support other than technical compatibility.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex-1" />
      </header>

      {/* Scrollable content area */}
      <div className={clsx(
        'flex-1 w-full overflow-y-auto',
        !hasContent && 'flex flex-col justify-center',
      )}>
        <div className={clsx(
          'w-full max-w-3xl mx-auto px-4 md:px-6 flex flex-col',
          hasContent ? 'pt-20 pb-8' : 'py-4',
        )}>

          {/* ── Logo + Input Section ── */}
          <div className="flex flex-col gap-3 mb-5">
            {/* ── Logo ── */}
            <div className="flex justify-center">
              <img src="/logo.png" alt="Logo" className="h-[120px] md:h-[152px]" />
            </div>

            {/* ── Input ── */}
            <div className="flex flex-col gap-4">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none text-muted-light dark:text-muted-dark">
                <LinkIcon size={18} className="md:w-5 md:h-5" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit();
                  }
                }}
                className="w-full pl-12 pr-4 py-3 md:pl-14 md:py-4 bg-white dark:bg-[#1a1a1a] border-2 border-border-light dark:border-border-dark rounded-full text-base md:text-lg font-medium text-text-light dark:text-text-dark placeholder:text-muted-light dark:placeholder:text-muted-dark focus:outline-none focus:border-primary dark:focus:border-white transition-colors shadow-sm"
                placeholder="在此粘贴链接"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-3 sm:gap-0">
              {/* Mode tabs */}
              <div className="flex bg-sidebar-light dark:bg-sidebar-dark p-1 rounded-full border border-border-light dark:border-border-dark shadow-sm w-full sm:w-auto justify-between sm:justify-start">
                <button
                  onClick={() => setActiveMode('auto')}
                  className={clsx(
                    'flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 md:px-5 rounded-full text-xs md:text-sm font-bold transition-all flex-1 sm:flex-none',
                    activeMode === 'auto'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-text-light dark:text-text-dark hover:bg-gray-200 dark:hover:bg-gray-700',
                  )}
                >
                  <Sparkles size={16} className={clsx('md:w-[18px] md:h-[18px]', activeMode === 'auto' ? 'text-yellow-400' : '')} />
                  自动
                </button>
                <button
                  onClick={() => setActiveMode('video')}
                  className={clsx(
                    'flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 md:px-5 rounded-full text-xs md:text-sm font-bold transition-all flex-1 sm:flex-none',
                    activeMode === 'video'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-text-light dark:text-text-dark hover:bg-gray-200 dark:hover:bg-gray-700',
                  )}
                >
                  <Video size={16} className={clsx('md:w-[18px] md:h-[18px]', activeMode === 'video' ? 'text-blue-500' : '')} />
                  视频
                </button>

                <div className="w-[1px] h-5 md:h-6 bg-border-light dark:bg-border-dark mx-0.5 md:mx-1 my-auto" />

                <button
                  onClick={() => setActiveMode('audio')}
                  className={clsx(
                    'flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 md:px-5 rounded-full text-xs md:text-sm font-bold transition-all flex-1 sm:flex-none',
                    activeMode === 'audio'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-text-light dark:text-text-dark hover:bg-gray-200 dark:hover:bg-gray-700',
                  )}
                >
                  <Music size={16} className={clsx('md:w-[18px] md:h-[18px]', activeMode === 'audio' ? 'text-purple-500' : '')} />
                  音频
                </button>
              </div>

              {/* Submit button */}
              <button
                ref={submitButtonRef}
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-bold hover:opacity-80 transition-opacity shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <Loader2 size={18} className="animate-spin" />
                  : <ChevronRight size={18} />}
                {loading ? '解析中...' : '解析'}
              </button>
            </div>

            {/* Codec compatibility tip */}
            <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <AlertCircle size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                <span className="font-bold">播放提示：</span>如果下载的视频无法播放，请选择标记为 <span className="font-mono font-bold">H.264</span> 的格式（兼容性最好），或使用 VLC 播放器打开 H.265 格式的视频
              </p>
            </div>
            </div>
          </div>
          {/* End Logo + Input Section */}

          {/* ── Loading ── */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-12"
            >
              <Loader2 size={28} className="animate-spin text-muted-light dark:text-muted-dark" />
              <p className="text-sm text-muted-light dark:text-muted-dark">正在解析...</p>
            </motion.div>
          )}

          {/* ── Error ── */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl"
            >
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </motion.div>
          )}

          {/* ── Result ── */}
          {!loading && result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              {/* Video info */}
              <div className="flex gap-4 p-4 bg-sidebar-light dark:bg-sidebar-dark rounded-2xl border border-border-light dark:border-border-dark">
                {result.thumbnail && (
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-24 h-16 md:w-32 md:h-20 object-cover rounded-xl shrink-0 bg-gray-200 dark:bg-gray-700"
                  />
                )}
                <div className="flex flex-col justify-center min-w-0">
                  <p className="font-bold text-sm md:text-base leading-tight line-clamp-2">
                    {result.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {result.platform && (
                      <span className="text-[11px] px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-md font-mono shrink-0">
                        {result.platform}
                      </span>
                    )}
                    {result.uploader && (
                      <span className="text-xs text-muted-light dark:text-muted-dark truncate">
                        {result.uploader}
                      </span>
                    )}
                    {result.duration && (
                      <span className="text-xs text-muted-light dark:text-muted-dark shrink-0">
                        {formatDuration(result.duration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Format list */}
              {formats.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {formats.map((f, index) => {
                    const isDownloading = downloadingFormats.has(f.format_id);
                    const progress = downloadProgress.get(f.format_id) || 0;
                    return (
                      <div key={f.format_id} className="flex flex-col gap-2">
                        <button
                          onClick={() => handleDownload(f.format_id, buildDownloadUrl(f, result.title, result.source_url, result.platform, index))}
                          disabled={isDownloading}
                          className={clsx(
                            "flex items-center justify-between p-3 md:p-4 bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl transition-colors group w-full text-left",
                            isDownloading
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:border-primary dark:hover:border-white cursor-pointer"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 bg-sidebar-light dark:bg-sidebar-dark rounded-lg text-xs font-black font-mono shrink-0">
                              {f.quality ? `${f.quality}p` : f.ext.toUpperCase()}
                            </span>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-black dark:text-white">{f.ext.toUpperCase()}</span>

                                {/* 视频编码 */}
                                {f.vcodec && f.vcodec !== 'none' && (
                                  <span className={clsx(
                                    "text-[10px] px-1.5 py-0.5 rounded font-mono",
                                    f.vcodec === 'h264'
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                      : "bg-gray-100 dark:bg-gray-700 text-muted-light dark:text-muted-dark"
                                  )}>
                                    {f.vcodec === 'h264' ? 'H.264' :
                                     f.vcodec === 'h265' ? 'H.265' :
                                     f.vcodec === 'vp9' ? 'VP9' :
                                     f.vcodec === 'av1' ? 'AV1' :
                                     f.vcodec.toUpperCase()}
                                  </span>
                                )}

                                {/* 音频编码 */}
                                {f.acodec && f.acodec !== 'none' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                                    {f.acodec === 'mp4a' ? 'AAC' :
                                     f.acodec === 'opus' ? 'OPUS' :
                                     f.acodec === 'vorbis' ? 'VORBIS' :
                                     f.acodec === 'mp3' ? 'MP3' :
                                     f.acodec === 'aac' ? 'AAC' :
                                     f.acodec.toUpperCase()}
                                  </span>
                                )}

                                {/* 比特率 - 优先显示音频比特率（对于纯音频格式） */}
                                {(() => {
                                  const bitrate = f.abr || f.tbr;
                                  if (bitrate) {
                                    return (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                        {Math.round(bitrate)}kbps
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}

                                {/* 音频/视频标签 */}
                                {f.has_video && f.has_audio && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                    视频+音频
                                  </span>
                                )}
                                {f.has_video && !f.has_audio && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                                    仅视频
                                  </span>
                                )}
                                {!f.has_video && f.has_audio && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                                    仅音频
                                  </span>
                                )}
                              </div>
                              {f.filesize && (
                                <span className="text-xs font-bold text-black dark:text-white">
                                  {formatFileSize(f.filesize)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={clsx(
                            "flex items-center gap-1.5 transition-colors shrink-0",
                            isDownloading
                              ? "text-muted-light dark:text-muted-dark"
                              : "text-muted-light dark:text-muted-dark group-hover:text-text-light dark:group-hover:text-text-dark"
                          )}>
                            {isDownloading ? (
                              <>
                                <Loader2 size={17} className="animate-spin" />
                                <span className="text-xs font-black hidden sm:block">下载中</span>
                              </>
                            ) : (
                              <>
                                <Download size={17} />
                                <span className="text-xs font-black hidden sm:block">下载</span>
                              </>
                            )}
                          </div>
                        </button>

                        {/* Progress bar */}
                        {isDownloading && (
                          <div className="px-3 pb-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-light dark:text-muted-dark">下载进度</span>
                              <span className="text-xs font-bold text-primary dark:text-white">{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary dark:bg-white transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-8 text-sm text-muted-light dark:text-muted-dark">
                  当前模式下没有可用格式，请切换到其他模式
                </p>
              )}
            </motion.div>
          )}

        </div>
      </div>

      {/* Footer — only when idle */}
      {!hasContent && (
        <footer className="absolute bottom-6 w-full text-center px-4">
          <p className="text-[13px] text-muted-light dark:text-muted-dark font-medium">
            继续操作即表示您同意
            <Link to="/terms" className="underline hover:text-text-light dark:hover:text-text-dark transition-colors ml-1">
              条款和使用规范
            </Link>
          </p>
        </footer>
      )}
    </div>
  );
};

export default Home;
