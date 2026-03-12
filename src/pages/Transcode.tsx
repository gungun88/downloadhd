import { Upload, Zap, Shield, Info, X, FileVideo, Loader2, Download, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import clsx from 'clsx';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

interface TranscodeState {
  file: File | null;
  outputFormat: string;
  progress: number;
  status: 'idle' | 'loading' | 'processing' | 'completed' | 'error';
  outputUrl: string | null;
  errorMessage: string | null;
  ffmpegLoaded: boolean;
}

const OUTPUT_FORMATS = [
  { value: 'mp4', label: 'MP4', desc: '最佳兼容性' },
  { value: 'webm', label: 'WebM', desc: '网页优化' },
  { value: 'mkv', label: 'MKV', desc: '高质量' },
  { value: 'avi', label: 'AVI', desc: '传统格式' },
  { value: 'mp3', label: 'MP3', desc: '仅音频' },
];

const Transcode = () => {
  const [state, setState] = useState<TranscodeState>({
    file: null,
    outputFormat: 'mp4',
    progress: 0,
    status: 'idle',
    outputUrl: null,
    errorMessage: null,
    ffmpegLoaded: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // 初始化 FFmpeg - 暂时禁用
  useEffect(() => {
    // 由于网络环境限制，暂时禁用 FFmpeg 加载
    setState(prev => ({
      ...prev,
      status: 'error',
      ffmpegLoaded: false,
      errorMessage: '视频转码功能暂时不可用。此功能需要从 CDN 加载约 30MB 的 WebAssembly 文件，在当前网络环境下无法访问。建议使用本地视频转码工具（如 HandBrake、FFmpeg 命令行工具）进行视频格式转换。',
    }));
  }, []);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const validExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.flv', '.mp3', '.wav', '.flac', '.m4a', '.aac', '.opus', '.ogg'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: '不支持的文件格式',
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      file,
      outputFormat: 'mp4',
      progress: 0,
      status: 'idle',
      outputUrl: null,
      errorMessage: null,
    }));
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setState(prev => ({
      ...prev,
      file: null,
      outputFormat: 'mp4',
      progress: 0,
      status: 'idle',
      outputUrl: null,
      errorMessage: null,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartTranscode = async () => {
    if (!state.file || !ffmpegRef.current || !state.ffmpegLoaded) return;

    setState(prev => ({ ...prev, status: 'loading', progress: 0 }));

    try {
      const ffmpeg = ffmpegRef.current;
      setState(prev => ({ ...prev, status: 'processing' }));

      // 写入输入文件到 FFmpeg 虚拟文件系统
      const inputFileName = 'input.' + state.file.name.split('.').pop();
      const outputFileName = 'output.' + state.outputFormat;

      await ffmpeg.writeFile(inputFileName, await fetchFile(state.file));

      // 执行转码命令
      // -i: 输入文件
      // -c copy: 复制编码（remux，不重新编码）
      // 如果需要重新编码，可以使用 -c:v libx264 -c:a aac
      await ffmpeg.exec(['-i', inputFileName, '-c', 'copy', outputFileName]);

      // 读取输出文件
      const data = await ffmpeg.readFile(outputFileName);
      const blob = new Blob([data], { type: `video/${state.outputFormat}` });
      const url = URL.createObjectURL(blob);

      setState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        outputUrl: url,
      }));

      // 清理虚拟文件系统
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);
    } catch (error) {
      console.error('[Transcode] Error:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : '转码失败，请检查文件格式是否兼容',
      }));
    }
  };

  const handleDownload = () => {
    if (!state.outputUrl || !state.file) return;

    const link = document.createElement('a');
    link.href = state.outputUrl;
    link.download = state.file.name.replace(/\.[^/.]+$/, '') + '.' + state.outputFormat;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="flex-1 relative flex flex-col items-center p-4 md:p-8 overflow-y-auto bg-background-light dark:bg-background-dark">
      <div className="w-full max-w-3xl flex flex-col gap-8 my-auto">

        {/* FFmpeg Loading Error */}
        {state.status === 'error' && !state.ffmpegLoaded && state.errorMessage && (
          <div className="w-full p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
            <Info size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-1">加载失败</p>
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{state.errorMessage}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white text-sm font-bold rounded-lg hover:opacity-80 transition-opacity"
              >
                刷新页面重试
              </button>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div className="flex flex-col items-center w-full gap-4">{!state.file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                "w-full aspect-video border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group",
                isDragging
                  ? "border-primary dark:border-white bg-primary/5 dark:bg-white/5"
                  : "border-border-light dark:border-border-dark bg-white/50 dark:bg-[#1a1a1a]/50 hover:border-primary dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-800/50"
              )}
            >
              <div className="bg-sidebar-light dark:bg-sidebar-dark p-4 rounded-full group-hover:scale-110 transition-transform">
                <Upload size={32} className="text-muted-light dark:text-muted-dark" />
              </div>
              <div className="text-center px-6">
                <p className="text-lg font-bold text-text-light dark:text-text-dark">拖动或选择文件</p>
                <p className="text-[13px] text-muted-light dark:text-muted-dark mt-2 font-mono">
                  支持格式: .mp4, .webm, .mkv, .avi, .mp3, .m4a, .wav, .opus
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.webm,.mkv,.avi,.mov,.flv,.mp3,.wav,.flac,.m4a,.aac,.opus,.ogg"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="w-full bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="bg-sidebar-light dark:bg-sidebar-dark p-3 rounded-xl shrink-0">
                    <FileVideo size={24} className="text-primary dark:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm md:text-base text-text-light dark:text-text-dark truncate">
                      {state.file.name}
                    </p>
                    <p className="text-xs text-muted-light dark:text-muted-dark mt-1">
                      {formatFileSize(state.file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
                >
                  <X size={18} className="text-muted-light dark:text-muted-dark" />
                </button>
              </div>

              {/* Format Selection */}
              {(state.status === 'idle' || state.status === 'loading') && (
                <div className="mt-6 space-y-4">
                  <p className="text-sm font-bold text-text-light dark:text-text-dark">选择输出格式</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {OUTPUT_FORMATS.map(format => (
                      <button
                        key={format.value}
                        onClick={() => setState(prev => ({ ...prev, outputFormat: format.value }))}
                        disabled={!state.ffmpegLoaded}
                        className={clsx(
                          "p-3 rounded-xl border-2 transition-all text-left",
                          state.outputFormat === format.value
                            ? "border-primary dark:border-white bg-primary/5 dark:bg-white/5"
                            : "border-border-light dark:border-border-dark hover:border-primary dark:hover:border-white",
                          !state.ffmpegLoaded && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <p className="font-bold text-sm text-text-light dark:text-text-dark">{format.label}</p>
                        <p className="text-[10px] text-muted-light dark:text-muted-dark mt-0.5">{format.desc}</p>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleStartTranscode}
                    disabled={!state.ffmpegLoaded}
                    className={clsx(
                      "w-full py-3 px-6 rounded-full font-bold transition-opacity",
                      state.ffmpegLoaded
                        ? "bg-primary text-white hover:opacity-80 cursor-pointer"
                        : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {state.ffmpegLoaded ? '开始转码' : '加载中...'}
                  </button>
                </div>
              )}

              {/* Processing */}
              {(state.status === 'loading' || state.status === 'processing') && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-text-light dark:text-text-dark">转码中...</p>
                    <p className="text-sm font-bold text-primary dark:text-white">{state.progress}%</p>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary dark:bg-white transition-all duration-300"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 size={20} className="animate-spin text-primary dark:text-white" />
                    <p className="text-xs text-muted-light dark:text-muted-dark">正在处理文件...</p>
                  </div>
                </div>
              )}

              {/* Completed */}
              {state.status === 'completed' && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 size={20} />
                    <p className="font-bold text-sm">转码完成！</p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="w-full py-3 px-6 bg-primary text-white rounded-full font-bold hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    下载文件
                  </button>
                </div>
              )}

              {/* Error */}
              {state.status === 'error' && state.errorMessage && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-400">{state.errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="w-full space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary dark:text-white">
              <Zap size={20} />
              <h3 className="font-bold">什么是转码 (Remux)?</h3>
            </div>
            <p className="text-sm text-muted-light dark:text-muted-dark leading-relaxed">
              转码是一种在不重新编码视频流的情况下，将视频从一种容器格式（如 MKV）转换到另一种格式（如 MP4）的技术。这意味着几乎瞬间完成且质量无损。
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary dark:text-white">
              <Shield size={20} />
              <h3 className="font-bold">隐私与本地化</h3>
            </div>
            <p className="text-sm text-muted-light dark:text-muted-dark leading-relaxed">
              所有的转码过程完全在您的浏览器中完成。文件不会被上传到我们的服务器。您的隐私和数据安全得到了物理层面的保障。
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary dark:text-white">
              <Zap size={20} />
              <h3 className="font-bold">极致速度</h3>
            </div>
            <p className="text-sm text-muted-light dark:text-muted-dark leading-relaxed">
              由于不需要上传文件和重新渲染像素，处理速度通常仅受限于您的硬盘读取速度。几秒钟即可处理完数 GB 的文件。
            </p>
          </div>

          <div className="pt-4 border-t border-border-light dark:border-border-dark">
            <div className="bg-sidebar-light dark:bg-sidebar-dark p-4 rounded-2xl flex items-start gap-3">
              <Info size={18} className="text-orange-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-muted-light dark:text-muted-dark italic leading-relaxed">
                注意：如果目标格式不支持源编码（例如在 MP4 中使用 FLAC 音频），转换可能需要更多时间进行部分重编码。
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-12 w-full text-center px-4">
        <p className="text-[13px] text-muted-light dark:text-muted-dark font-medium">
          继续操作即表示您同意
          <Link to="/terms" className="underline hover:text-text-light dark:hover:text-text-dark transition-colors ml-1">
            条款和使用规范
          </Link>
        </p>
      </footer>
    </div>
  );
};

export default Transcode;
