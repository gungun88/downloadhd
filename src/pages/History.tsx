import { Download, PlayCircle, Film, Music, Trash2, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, type MouseEvent } from 'react';
import { getHistory, removeFromHistory, clearHistory, type HistoryItem } from '../utils/history';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

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

function buildDownloadUrl(formatId: string, ext: string, title: string, sourceUrl: string): string {
  const params = new URLSearchParams({
    url: sourceUrl,
    format_id: formatId,
    filename: title.slice(0, 80),
    ext: ext,
  });
  return `/api/stream?${params.toString()}`;
}

const History = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    setHistoryItems(getHistory());
  }, []);

  const handleClearAll = () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      clearHistory();
      setHistoryItems([]);
      setSelectedItem(null);
    }
  };

  const handleRemoveItem = (id: string, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    removeFromHistory(id);
    setHistoryItems(getHistory());
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }
  };

  const [downloadingUrls, setDownloadingUrls] = useState<Set<string>>(new Set());

  const handleDownload = async (downloadUrl: string, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setDownloadingUrls(prev => new Set(prev).add(downloadUrl));

    try {
      // For streaming downloads, we need to check if the server responds
      // Use HEAD request to verify the URL is valid before triggering download
      const headResponse = await fetch(downloadUrl, { method: 'HEAD' });

      if (!headResponse.ok) {
        throw new Error('Download URL is not available');
      }

      // Trigger download using a link element
      // This allows the browser to handle streaming downloads natively
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = ''; // Let the server's Content-Disposition header set the filename
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      // Keep the downloading state for a few seconds to provide feedback
      setTimeout(() => {
        setDownloadingUrls(prev => {
          const next = new Set(prev);
          next.delete(downloadUrl);
          return next;
        });
      }, 2000);
    } catch (error) {
      console.error('Download error:', error);
      // Reset downloading state on error immediately
      setDownloadingUrls(prev => {
        const next = new Set(prev);
        next.delete(downloadUrl);
        return next;
      });
      // Show error to user
      alert('下载失败，请重试');
    }
  };

  const getPlatformIcon = (platform: string | null) => {
    if (!platform) return PlayCircle;
    const lower = platform.toLowerCase();
    if (lower.includes('youtube')) return PlayCircle;
    if (lower.includes('vimeo')) return Film;
    if (lower.includes('tiktok') || lower.includes('soundcloud')) return Music;
    return PlayCircle;
  };

  const getPlatformColor = (platform: string | null) => {
    if (!platform) return 'text-gray-600';
    const lower = platform.toLowerCase();
    if (lower.includes('youtube')) return 'text-red-600';
    if (lower.includes('vimeo')) return 'text-blue-500';
    if (lower.includes('tiktok')) return 'text-pink-500';
    return 'text-gray-600';
  };

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden">
      <div className="w-full max-w-3xl mx-auto flex flex-col h-full pt-12 px-6">

        <div className="flex justify-between items-center mb-6 border-b border-transparent pb-2">
          <h1 className="text-xl font-bold tracking-tight">解析历史</h1>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors uppercase tracking-wider text-muted-light dark:text-muted-dark"
          >
            <Trash2 size={14} />
            清空
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-12 space-y-3">
          {historyItems.map((item) => {
            const Icon = getPlatformIcon(item.platform);
            const colorClass = getPlatformColor(item.platform);
            const isSelected = selectedItem?.id === item.id;

            return (
              <div key={item.id}>
                <div
                  onClick={() => setSelectedItem(isSelected ? null : item)}
                  className={clsx(
                    "group flex items-center p-4 bg-white dark:bg-[#1a1a1a] border transition-all cursor-pointer rounded-2xl",
                    isSelected
                      ? "border-primary dark:border-white shadow-sm"
                      : "border-transparent hover:border-border-light dark:hover:border-border-dark hover:shadow-sm"
                  )}
                >
                  <div className="w-20 h-12 bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center shrink-0 overflow-hidden">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900" />
                    )}
                  </div>

                  <div className="flex-1 ml-4 min-w-0">
                    <h3 className="text-sm font-bold truncate pr-4 text-text-light dark:text-text-dark">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Icon size={14} className={colorClass} />
                      {item.platform && (
                        <span className="text-[11px] text-muted-light dark:text-muted-dark uppercase tracking-wide font-medium">
                          {item.platform}
                        </span>
                      )}
                      {item.duration && (
                        <span className="text-[11px] text-muted-light dark:text-muted-dark">
                          {formatDuration(item.duration)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleRemoveItem(item.id, e)}
                    className="p-2 text-muted-light dark:text-muted-dark hover:text-red-500 dark:hover:text-red-400 transition-colors bg-sidebar-light dark:bg-sidebar-dark rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 mr-2"
                  >
                    <X size={16} />
                  </button>
                </div>

                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 p-4 bg-sidebar-light dark:bg-sidebar-dark rounded-2xl border border-border-light dark:border-border-dark space-y-2">
                        <p className="text-xs font-bold text-muted-light dark:text-muted-dark mb-3">
                          可用格式 ({item.formats.length})
                        </p>
                        {item.formats.slice(0, 10).map((format) => {
                          const downloadUrl = buildDownloadUrl(format.format_id, format.ext, item.title, item.url);
                          const isDownloading = downloadingUrls.has(downloadUrl);
                          return (
                            <button
                              key={format.format_id}
                              onClick={(e) => handleDownload(downloadUrl, e)}
                              disabled={isDownloading}
                              className={clsx(
                                "flex items-center justify-between w-full p-3 bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-xl transition-colors group",
                                isDownloading
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:border-primary dark:hover:border-white"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span className="px-2.5 py-1 bg-sidebar-light dark:bg-sidebar-dark rounded-lg text-xs font-black font-mono shrink-0">
                                  {format.quality ? `${format.quality}p` : format.ext.toUpperCase()}
                                </span>
                                <div className="flex flex-col items-start">
                                  <span className="text-sm font-black text-black dark:text-white">
                                    {format.ext.toUpperCase()}
                                  </span>
                                  {format.filesize && (
                                    <span className="text-xs font-bold text-black dark:text-white">
                                      {formatFileSize(format.filesize)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className={clsx(
                                "flex items-center gap-1.5 transition-colors",
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
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {historyItems.length === 0 && (
            <div className="text-center py-20 text-muted-light dark:text-muted-dark">
              暂无历史记录
            </div>
          )}
        </div>

        <footer className="mt-auto w-full text-center py-6 px-4">
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

export default History;
