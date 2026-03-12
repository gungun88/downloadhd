import { Upload, Info, X, FileVideo, FileAudio, Loader2, Download, CheckCircle2, Combine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import clsx from 'clsx';

interface MergeState {
  videoFile: File | null;
  audioFile: File | null;
  outputName: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  outputUrl: string | null;
  errorMessage: string | null;
}

const Merge = () => {
  const [state, setState] = useState<MergeState>({
    videoFile: null,
    audioFile: null,
    outputName: 'output.mp4',
    status: 'idle',
    progress: 0,
    outputUrl: null,
    errorMessage: null,
  });

  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>, type: 'video' | 'audio') => {
    e.preventDefault();
    if (type === 'video') {
      setIsDraggingVideo(true);
    } else {
      setIsDraggingAudio(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>, type: 'video' | 'audio') => {
    e.preventDefault();
    if (type === 'video') {
      setIsDraggingVideo(false);
    } else {
      setIsDraggingAudio(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, type: 'video' | 'audio') => {
    e.preventDefault();
    if (type === 'video') {
      setIsDraggingVideo(false);
    } else {
      setIsDraggingAudio(false);
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0], type);
    }
  };

  const handleFileSelect = (file: File, type: 'video' | 'audio') => {
    const videoExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov'];
    const audioExtensions = ['.mp3', '.wav', '.aac', '.m4a', '.flac', '.webm', '.opus', '.ogg'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (type === 'video' && !videoExtensions.includes(fileExt)) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: '不支持的视频格式',
      }));
      return;
    }

    if (type === 'audio' && !audioExtensions.includes(fileExt)) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: '不支持的音频格式',
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      [type === 'video' ? 'videoFile' : 'audioFile']: file,
      status: 'idle',
      errorMessage: null,
    }));
  };

  const handleVideoInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0], 'video');
    }
  };

  const handleAudioInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0], 'audio');
    }
  };

  const handleRemoveFile = (type: 'video' | 'audio') => {
    setState(prev => ({
      ...prev,
      [type === 'video' ? 'videoFile' : 'audioFile']: null,
    }));
    if (type === 'video' && videoInputRef.current) {
      videoInputRef.current.value = '';
    }
    if (type === 'audio' && audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  };

  const handleStartMerge = async () => {
    if (!state.videoFile || !state.audioFile) {
      return;
    }

    try {
      setState(prev => ({ ...prev, status: 'processing', progress: 0 }));

      // 创建 FormData
      const formData = new FormData();
      formData.append('video', state.videoFile);
      formData.append('audio', state.audioFile);
      formData.append('output_name', state.outputName || 'output.mp4');

      // 发送到后端
      const response = await fetch('/api/merge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '合并失败');
      }

      // 获取合并后的文件
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        outputUrl: url,
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : '合并失败，请检查文件格式是否兼容',
      }));
    }
  };

  const handleDownload = () => {
    if (!state.outputUrl) return;

    const link = document.createElement('a');
    link.href = state.outputUrl;
    link.download = state.outputName || 'output.mp4';
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

        {/* Upload Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Video Upload */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-text-light dark:text-text-dark flex items-center gap-2">
              <FileVideo size={18} />
              视频文件
            </h3>
            {!state.videoFile ? (
              <div
                onDragOver={(e) => handleDragOver(e, 'video')}
                onDragLeave={(e) => handleDragLeave(e, 'video')}
                onDrop={(e) => handleDrop(e, 'video')}
                onClick={() => videoInputRef.current?.click()}
                className={clsx(
                  "w-full aspect-video border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group",
                  isDraggingVideo
                    ? "border-primary dark:border-white bg-primary/5 dark:bg-white/5"
                    : "border-border-light dark:border-border-dark bg-white/50 dark:bg-[#1a1a1a]/50 hover:border-primary dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-800/50"
                )}
              >
                <div className="bg-sidebar-light dark:bg-sidebar-dark p-3 rounded-full group-hover:scale-110 transition-transform">
                  <Upload size={24} className="text-muted-light dark:text-muted-dark" />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-bold text-text-light dark:text-text-dark">点击或拖拽视频文件到此处</p>
                  <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1 font-mono">
                    支持 MP4, AVI, MOV 等格式
                  </p>
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept=".mp4,.webm,.mkv,.avi,.mov"
                  onChange={handleVideoInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="w-full bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="bg-sidebar-light dark:bg-sidebar-dark p-2 rounded-lg shrink-0">
                      <FileVideo size={20} className="text-primary dark:text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-text-light dark:text-text-dark truncate">
                        {state.videoFile.name}
                      </p>
                      <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
                        {formatFileSize(state.videoFile.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFile('video')}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
                  >
                    <X size={16} className="text-muted-light dark:text-muted-dark" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Audio Upload */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-text-light dark:text-text-dark flex items-center gap-2">
              <FileAudio size={18} />
              音频文件
            </h3>
            {!state.audioFile ? (
              <div
                onDragOver={(e) => handleDragOver(e, 'audio')}
                onDragLeave={(e) => handleDragLeave(e, 'audio')}
                onDrop={(e) => handleDrop(e, 'audio')}
                onClick={() => audioInputRef.current?.click()}
                className={clsx(
                  "w-full aspect-video border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group",
                  isDraggingAudio
                    ? "border-primary dark:border-white bg-primary/5 dark:bg-white/5"
                    : "border-border-light dark:border-border-dark bg-white/50 dark:bg-[#1a1a1a]/50 hover:border-primary dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-800/50"
                )}
              >
                <div className="bg-sidebar-light dark:bg-sidebar-dark p-3 rounded-full group-hover:scale-110 transition-transform">
                  <Upload size={24} className="text-muted-light dark:text-muted-dark" />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-bold text-text-light dark:text-text-dark">点击或拖拽音频文件到此处</p>
                  <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1 font-mono">
                    支持 MP3, M4A, WEBM, WAV, AAC, OPUS 等格式
                  </p>
                </div>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept=".mp3,.wav,.aac,.m4a,.flac,.webm,.opus,.ogg"
                  onChange={handleAudioInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="w-full bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="bg-sidebar-light dark:bg-sidebar-dark p-2 rounded-lg shrink-0">
                      <FileAudio size={20} className="text-primary dark:text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-text-light dark:text-text-dark truncate">
                        {state.audioFile.name}
                      </p>
                      <p className="text-xs text-muted-light dark:text-muted-dark mt-0.5">
                        {formatFileSize(state.audioFile.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFile('audio')}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
                  >
                    <X size={16} className="text-muted-light dark:text-muted-dark" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Output Settings & Merge Button */}
        {state.videoFile && state.audioFile && state.status !== 'processing' && state.status !== 'completed' && (
          <div className="w-full space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-light dark:text-text-dark">
                输出文件名
              </label>
              <input
                type="text"
                value={state.outputName}
                onChange={(e) => setState(prev => ({ ...prev, outputName: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-xl text-sm font-medium text-text-light dark:text-text-dark placeholder:text-muted-light dark:placeholder:text-muted-dark focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
                placeholder="output.mp4"
              />
            </div>

            <button
              onClick={handleStartMerge}
              className="w-full py-3 px-6 rounded-full font-bold transition-opacity flex items-center justify-center gap-2 bg-primary text-white hover:opacity-80 cursor-pointer"
            >
              <Combine size={18} />
              开始合并
            </button>
          </div>
        )}

        {/* Processing */}
        {state.status === 'processing' && (
          <div className="w-full bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 size={20} className="animate-spin text-primary dark:text-white" />
              <p className="text-sm font-bold text-text-light dark:text-text-dark">正在处理文件，请稍候...</p>
            </div>
            <p className="text-xs text-center text-muted-light dark:text-muted-dark">
              文件正在服务器端合并，处理时间取决于文件大小
            </p>
          </div>
        )}

        {/* Completed */}
        {state.status === 'completed' && (
          <div className="w-full bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 size={20} />
              <p className="font-bold text-sm">合并完成！</p>
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
          <div className="w-full p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl space-y-3">
            <p className="text-sm text-red-700 dark:text-red-400">{state.errorMessage}</p>
            <button
              onClick={() => setState(prev => ({ ...prev, status: 'idle', errorMessage: null }))}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* Info Section */}
        <div className="w-full space-y-4 pt-4 border-t border-border-light dark:border-border-dark">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex items-start gap-3">
            <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-1">功能说明</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 leading-relaxed">
                此工具可以将视频文件和音频文件合并为一个新的视频文件。适用于为无声视频添加背景音乐，或替换视频原有音轨等场景。所有处理都在服务器端完成，安全可靠。
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

export default Merge;
