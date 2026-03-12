import { Link } from 'react-router-dom';
import {
  Link as LinkIcon,
  Sparkles,
  Video,
  Music,
  Download,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { motion } from 'motion/react';
import { addToHistory } from '../utils/history';
import SupportedServices from '../components/SupportedServices';

// Helper function to render error message with clickable links
const renderErrorMessage = (error: string) => {
  const cookiesConfigText = 'Cookies 配置页面';
  if (error.includes(cookiesConfigText)) {
    const parts = error.split(cookiesConfigText);
    return (
      <>
        {parts[0]}
        <Link to="/cookies" className="underline hover:text-red-800 dark:hover:text-red-200 font-bold">
          {cookiesConfigText}
        </Link>
        {parts[1]}
      </>
    );
  }
  return error;
};

interface Format {
  format_id: string;
  ext: string;
  quality: number | null;
  filesize: number | null;
  vcodec: string;
  acodec: string;
  tbr: number | null;
  abr: number | null;
  vbr: number | null;
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
  source_url?: string;
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
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Global counter for download numbering (persists across component re-renders)
let globalDownloadCounter = parseInt(localStorage.getItem('downloadCounter') || '0', 10);

const Home = () => {
  const [url, setUrl] = useState('');
  const [activeMode, setActiveMode] = useState<'auto' | 'video' | 'audio'>('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFormats, setDownloadingFormats] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map());
  const [thumbnailError, setThumbnailError] = useState(false);

  const hasContent = loading || error !== null || result !== null;

  const handleParse = async () => {
    const trimmed = url.trim();
    if (!trimmed || loading) return;

    try {
      new URL(trimmed);
    } catch {
      setError('请输入有效的 URL 链接');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setThumbnailError(false);

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const json = await response.json();

      if (!response.ok) {
        const errorMsg = json?.detail || '解析失败，请检查链接是否正确';
        throw new Error(errorMsg);
      }

      // Save to history
      addToHistory({
        url: trimmed,
        title: json.title,
        thumbnail: json.thumbnail,
        platform: json.platform,
        duration: json.duration,
        uploader: json.uploader,
        formats: json.formats.map((f: Format) => ({
          format_id: f.format_id,
          ext: f.ext,
          quality: f.quality,
          filesize: f.filesize,
          has_video: f.has_video,
          has_audio: f.has_audio,
          abr: f.abr,
          tbr: f.tbr,
        })),
      });

      setResult({ ...json, source_url: trimmed });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || '解析失败，请检查链接是否正确');
    } finally {
      setLoading(false);
    }
  };

  const getFormats = () => {
    if (!result) return [];

    const filtered = (() => {
      switch (activeMode) {
        case 'auto': {
          // Prioritize video formats (with or without audio)
          const videoFormats = result.formats.filter(f => f.has_video);
          if (videoFormats.length > 0) return videoFormats;
          // Fallback to audio-only if no video formats available
          return result.formats.filter(f => !f.has_video && f.has_audio);
        }
        case 'video':
          return result.formats.filter(f => f.has_video);
        case 'audio':
          return result.formats.filter(f => !f.has_video && f.has_audio);
        default:
          return result.formats;
      }
    })();

    return filtered
      .sort((a, b) => {
        const qualityA = a.quality || 0;
        const qualityB = b.quality || 0;
        if (qualityA !== qualityB) return qualityB - qualityA;
        const sizeA = a.filesize || 0;
        const sizeB = b.filesize || 0;
        return sizeB - sizeA;
      })
      .slice(0, 50);
  };

  const formats = getFormats();

  const getNextDownloadNumber = () => {
    globalDownloadCounter++;
    localStorage.setItem('downloadCounter', globalDownloadCounter.toString());
    return globalDownloadCounter;
  };

  const buildDownloadUrl = (format: Format, title: string, sourceUrl: string, platform: string | null, downloadNumber: number) => {
    const headers = btoa(JSON.stringify(format.http_headers || {}));
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `downloadhd_${date}_${String(downloadNumber).padStart(3, '0')}`;

    const params = new URLSearchParams({
      url: format.url,
      headers: headers,
      filename: filename,
      ext: format.ext,
      source_url: sourceUrl,
      platform: platform || 'unknown',
    });

    return `/api/download?${params.toString()}`;
  };

  const handleDownload = async (formatId: string, downloadUrl: string, filename: string) => {
    setDownloadingFormats(prev => new Set(prev).add(formatId));
    setDownloadProgress(prev => new Map(prev).set(formatId, 0));

    try {
      // Simulate initial progress (0-10%)
      let simulatedProgress = 0;
      const simulateInterval = setInterval(() => {
        simulatedProgress += Math.random() * 5;
        if (simulatedProgress > 10) {
          simulatedProgress = 10;
          clearInterval(simulateInterval);
        }
        setDownloadProgress(prev => new Map(prev).set(formatId, simulatedProgress));
      }, 200);

      // Start actual download
      const response = await fetch(downloadUrl);
      clearInterval(simulateInterval);

      if (!response.ok) throw new Error('Download failed');

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Calculate real progress (10% - 100%)
        if (total > 0) {
          const realProgress = 10 + (receivedLength / total) * 90;
          setDownloadProgress(prev => new Map(prev).set(formatId, realProgress));
        } else {
          // If no content-length, show indeterminate progress
          setDownloadProgress(prev => new Map(prev).set(formatId, 50));
        }
      }

      // Combine chunks and create blob
      const blob = new Blob(chunks);
      const url = URL.createObjectURL(blob);

      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      URL.revokeObjectURL(url);
      setDownloadProgress(prev => new Map(prev).set(formatId, 100));

      // Remove from downloading state after a short delay
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
      }, 1000);
    } catch (error) {
      console.error('Download failed:', error);
      // Remove from downloading state on error
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
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      {/* Supported Services Button - Fixed at top */}
      <div className="w-full flex justify-center pt-4 pb-2 px-4">
        <SupportedServices />
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className={clsx(
          'w-full max-w-3xl mx-auto px-4 md:px-6 flex flex-col',
          hasContent ? 'pt-8 pb-8' : 'py-4 justify-center flex-1',
        )}>
        {/* Logo + Input Section */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex justify-center">
            <img src="/logo.png" alt="Logo" className="h-[120px] md:h-[152px]" />
          </div>

          <div className="flex flex-col gap-4">
            {/* Input */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none text-muted-light dark:text-muted-dark">
                <LinkIcon size={18} className="md:w-5 md:h-5" />
              </div>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleParse();
                  }
                }}
                className="w-full pl-12 pr-4 py-3 md:pl-14 md:py-4 bg-white dark:bg-[#1a1a1a] border-2 border-border-light dark:border-border-dark rounded-full text-base md:text-lg font-medium text-text-light dark:text-text-dark placeholder:text-muted-light dark:placeholder:text-muted-dark focus:outline-none focus:border-primary dark:focus:border-white transition-colors shadow-sm"
                placeholder="在此粘贴视频链接"
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
                  <Sparkles size={16} className={clsx('md:w-[18px] md:h-[18px]', activeMode === 'auto' ? 'text-yellow-300' : '')} />
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
                type="button"
                onClick={handleParse}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-bold hover:opacity-80 transition-opacity shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
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

        {/* Loading */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 gap-3"
          >
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm text-muted-light dark:text-muted-dark">正在解析视频...</p>
          </motion.div>
        )}

        {/* Error */}
        {!loading && error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
          >
            <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{renderErrorMessage(error)}</p>
          </motion.div>
        )}

        {/* Result */}
        {!loading && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            {/* Video info */}
            <div className="flex gap-4 p-4 bg-sidebar-light dark:bg-sidebar-dark rounded-2xl border border-border-light dark:border-border-dark">
              {result.thumbnail ? (
                <div className="w-24 h-16 md:w-32 md:h-20 shrink-0 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {!thumbnailError ? (
                    <img
                      src={result.thumbnail}
                      alt={result.title}
                      className="w-full h-full object-cover"
                      onError={() => setThumbnailError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                      <Video size={24} className="text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-24 h-16 md:w-32 md:h-20 shrink-0 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                  <Video size={24} className="text-gray-400 dark:text-gray-500" />
                </div>
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
                {formats.map((f) => {
                  const isDownloading = downloadingFormats.has(f.format_id);
                  const progress = downloadProgress.get(f.format_id) || 0;
                  const downloadNumber = getNextDownloadNumber();
                  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
                  const filename = `downloadhd_${date}_${String(downloadNumber).padStart(3, '0')}.${f.ext}`;

                  return (
                    <button
                      key={f.format_id}
                      onClick={() => handleDownload(f.format_id, buildDownloadUrl(f, result.title, result.source_url!, result.platform, downloadNumber), filename)}
                      disabled={isDownloading}
                      className={clsx(
                        "flex flex-col p-3 md:p-4 bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl transition-colors group w-full text-left relative overflow-hidden",
                        isDownloading
                          ? "opacity-90 cursor-not-allowed"
                          : "hover:border-primary dark:hover:border-white cursor-pointer"
                      )}
                    >
                      {/* Progress bar background */}
                      {isDownloading && (
                        <div
                          className="absolute inset-0 bg-primary/10 dark:bg-primary/20 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      )}

                      <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-sidebar-light dark:bg-sidebar-dark rounded-lg text-xs font-black font-mono shrink-0">
                          {f.quality ? `${f.quality}p` : f.ext.toUpperCase()}
                        </span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-black dark:text-white">{f.ext.toUpperCase()}</span>

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

                            {(() => {
                              const bitrate = f.abr || f.tbr;
                              if (bitrate) {
                                return (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-gray-100 dark:bg-gray-700 text-muted-light dark:text-muted-dark">
                                    {bitrate.toFixed(0)} kbps
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            {f.has_video && (
                              <span className="text-[10px] text-muted-light dark:text-muted-dark">视频</span>
                            )}
                            {f.has_audio && (
                              <span className="text-[10px] text-muted-light dark:text-muted-dark">音频</span>
                            )}
                            {f.filesize && (
                              <span className="text-[10px] text-muted-light dark:text-muted-dark">
                                {formatFileSize(f.filesize)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isDownloading ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-primary">{Math.round(progress)}%</span>
                            <Loader2 size={18} className="animate-spin text-primary" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-light dark:text-muted-dark group-hover:text-primary dark:group-hover:text-white transition-colors">
                            <Download size={18} />
                            <span className="text-xs font-bold hidden sm:block">下载</span>
                          </div>
                        )}
                      </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-light dark:text-muted-dark">
                  没有找到符合条件的格式
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto w-full text-center py-8 px-4">
        <p className="text-[13px] text-muted-light dark:text-muted-dark font-medium">
          继续操作即表示您同意
          <Link to="/terms" className="underline hover:text-text-light dark:hover:text-text-dark transition-colors ml-1">
            条款和使用规范
          </Link>
        </p>
      </footer>
      </div>
    </div>
  );
};

export default Home;
