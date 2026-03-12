import {
  Link as LinkIcon,
  Download,
  Loader2,
  AlertCircle,
  ChevronRight,
  Images,
} from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
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

interface GalleryImage {
  url: string;
  filename: string;
  extension: string;
  width: number;
  height: number;
}

interface GalleryResult {
  title: string;
  author: string;
  images: GalleryImage[];
  count: number;
}

const Gallery = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GalleryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingImages, setDownloadingImages] = useState<Set<string>>(new Set());

  const hasContent = loading || error !== null || result !== null;

  const handleParse = async () => {
    const trimmed = url.trim();
    if (!trimmed || loading) {
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmed);
    } catch {
      setError('请输入有效的 URL 链接');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/parse-gallery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: trimmed
        }),
      });

      let json: any | null = null;
      try {
        json = await response.json();
      } catch (jsonErr) {
        throw new Error('服务器返回了无效响应，请稍后重试');
      }

      if (!response.ok) {
        throw new Error(json?.detail || '解析失败，请检查链接是否正确');
      }

      setResult(json);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || '解析失败，请检查链接是否正确');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (image: GalleryImage, index: number) => {
    const imageKey = `${index}`;
    setDownloadingImages(prev => new Set(prev).add(imageKey));

    try {
      // Generate filename: downloadhd_YYYYMMDD_序号
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `downloadhd_${dateStr}_${String(index + 1).padStart(3, '0')}`;

      const headers = btoa(JSON.stringify({}));
      const params = new URLSearchParams({
        url: image.url,
        headers: headers,
        filename: filename,
        ext: image.extension,
      });

      const downloadUrl = `/api/download?${params.toString()}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${filename}.${image.extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setTimeout(() => {
        setDownloadingImages(prev => {
          const next = new Set(prev);
          next.delete(imageKey);
          return next;
        });
      }, 2000);
    }
  };

  const handleDownloadAll = () => {
    if (!result) return;
    result.images.forEach((image, index) => {
      setTimeout(() => handleDownload(image, index), index * 500);
    });
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
        {/* Logo and Input Section */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex justify-center">
            <img src="/logo.png" alt="Logo" className="h-[120px] md:h-[152px]" />
          </div>

          <div className="flex flex-col gap-4">
            {/* Input Field */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none text-muted-light dark:text-muted-dark">
                <LinkIcon className="w-[18px] h-[18px] md:w-5 md:h-5" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                placeholder="在此粘贴图集链接"
                className="w-full pl-12 pr-4 py-3 md:pl-14 md:py-4 bg-white dark:bg-[#1a1a1a] border-2 border-border-light dark:border-border-dark rounded-full text-base md:text-lg font-medium text-text-light dark:text-text-dark placeholder:text-muted-light dark:placeholder:text-muted-dark focus:outline-none focus:border-primary dark:focus:border-white transition-colors shadow-sm"
              />
            </div>

            {/* Parse Button */}
            <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-3 sm:gap-0">
              <div className="flex bg-sidebar-light dark:bg-sidebar-dark p-1 rounded-full border border-border-light dark:border-border-dark shadow-sm w-full sm:w-auto justify-between sm:justify-start">
                <button className="flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 md:px-5 rounded-full text-xs md:text-sm font-bold transition-all flex-1 sm:flex-none bg-primary text-white shadow-md">
                  <Images className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                  图集
                </button>
              </div>
              <button
                type="button"
                onClick={handleParse}
                disabled={loading || !url.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-bold hover:opacity-80 transition-opacity shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    解析中
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-[18px] h-[18px]" />
                    解析
                  </>
                )}
              </button>
            </div>

            {/* Info Tip */}
            <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                <span className="font-bold">支持平台：</span>Twitter、Pinterest、Pixiv 等平台的图集下载。<span className="font-bold">注意：</span>Instagram 视频请使用「视频解析」功能
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4"
            >
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400">{renderErrorMessage(error)}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Info Card */}
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 md:p-6 border-2 border-border-light dark:border-border-dark shadow-sm">
                <h2 className="text-sm md:text-base font-bold mb-2 text-text-light dark:text-text-dark truncate">
                  {result.title}
                </h2>
                <p className="text-xs md:text-sm text-muted-light dark:text-muted-dark mb-4">
                  作者: {result.author} · 共 {result.count} 张图片
                </p>
                <button
                  onClick={handleDownloadAll}
                  className="w-full py-3 bg-primary text-white rounded-full font-bold hover:opacity-80 transition-opacity flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="w-[18px] h-[18px]" />
                  下载全部
                </button>
              </div>

              {/* Images Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {result.images.map((image, index) => {
                  const imageKey = `${index}`;
                  const isDownloading = downloadingImages.has(imageKey);

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative group bg-white dark:bg-[#1a1a1a] rounded-lg overflow-hidden border-2 border-border-light dark:border-border-dark hover:border-primary dark:hover:border-primary transition-colors shadow-sm"
                    >
                      <div className="aspect-square relative">
                        <img
                          src={image.url}
                          alt={`${image.filename}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => handleDownload(image, index)}
                            disabled={isDownloading}
                            title="下载"
                            className="flex items-center justify-center p-3 bg-white rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            ) : (
                              <Download className="w-6 h-6 text-primary" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-muted-light dark:text-muted-dark truncate">
                          {image.width} × {image.height}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

export default Gallery;
