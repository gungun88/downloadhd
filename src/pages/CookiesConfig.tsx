import { Link } from 'react-router-dom';
import { useState, FormEvent } from 'react';
import { Cookie, CheckCircle, AlertCircle, Loader2, Info, BookOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

const PLATFORM_DISPLAY_NAMES: Record<string, { name: string; icon: string }> = {
  instagram: { name: 'Instagram', icon: '📷' },
  youtube: { name: 'YouTube', icon: '▶️' },
  tiktok: { name: 'TikTok', icon: '🎵' },
  twitter: { name: 'Twitter/X', icon: '🐦' },
  facebook: { name: 'Facebook', icon: '👥' },
  reddit: { name: 'Reddit', icon: '🤖' },
  douyin: { name: '抖音', icon: '🎶' },
  kuaishou: { name: '快手', icon: '⚡' },
  xiaohongshu: { name: '小红书', icon: '📕' },
};

const CookiesConfig = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram');
  const [cookiesContent, setCookiesContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const validateCookiesPlatform = (cookies: string, platform: string): boolean => {
    // 平台域名映射
    const platformDomains: Record<string, string[]> = {
      instagram: ['instagram.com'],
      youtube: ['youtube.com'],
      tiktok: ['tiktok.com'],
      twitter: ['twitter.com', 'x.com'],
      facebook: ['facebook.com'],
      reddit: ['reddit.com'],
      douyin: ['douyin.com'],
      kuaishou: ['kuaishou.com'],
      xiaohongshu: ['xiaohongshu.com', 'xhslink.com'],
    };

    const domains = platformDomains[platform];
    if (!domains) return true; // 未知平台，跳过验证

    // 检查 cookies 内容中是否包含对应平台的域名
    return domains.some(domain => cookies.includes(domain));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!cookiesContent.trim()) {
      setSubmitStatus('error');
      setStatusMessage('请输入 Cookies 内容');
      return;
    }

    // 验证 Cookies 内容与平台是否匹配
    if (!validateCookiesPlatform(cookiesContent, selectedPlatform)) {
      const platformName = PLATFORM_DISPLAY_NAMES[selectedPlatform]?.name || selectedPlatform;
      setSubmitStatus('error');
      setStatusMessage(`Cookies 内容与所选平台不匹配，请确认是从 ${platformName} 导出的 Cookies`);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // TODO: 调用后端 API
      const response = await fetch('/api/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          cookies: cookiesContent,
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setStatusMessage('配置成功！');
        setCookiesContent('');
        // 3秒后清除成功提示
        setTimeout(() => setSubmitStatus('idle'), 3000);
      } else {
        const data = await response.json();
        setSubmitStatus('error');
        setStatusMessage(data.detail || '配置失败，请检查 Cookies 格式');
      }
    } catch (error) {
      setSubmitStatus('error');
      setStatusMessage('网络错误，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 relative flex flex-col items-center overflow-y-auto bg-background-light dark:bg-background-dark pt-8 md:pt-16">
      <div className="flex-1 flex flex-col items-center px-6 w-full max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Cookie size={28} className="text-primary dark:text-white" />
            <h1 className="text-2xl font-bold tracking-tight text-text-light dark:text-text-dark">Cookies 配置</h1>
          </div>
          <div className="w-8 h-1 bg-primary dark:bg-white mx-auto mt-2 rounded-full"></div>
          <p className="text-sm text-muted-light dark:text-muted-dark mt-4">
            某些平台需要登录才能下载，配置你的 Cookies 继续使用
          </p>
        </div>

        {/* Configuration Form */}
        <div className="w-full mb-8">
          <h2 className="text-sm font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
            <Cookie size={16} />
            配置 Cookies
          </h2>
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-xl p-6">
            {/* Platform Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                选择平台
              </label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full px-4 py-2.5 bg-sidebar-light dark:bg-sidebar-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
              >
                {Object.entries(PLATFORM_DISPLAY_NAMES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.icon} {value.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Cookies Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Cookies 内容
              </label>
              <textarea
                value={cookiesContent}
                onChange={(e) => setCookiesContent(e.target.value)}
                rows={8}
                placeholder="# Netscape HTTP Cookie File&#10;.instagram.com	TRUE	/	TRUE	1234567890	sessionid	xxxxx&#10;.instagram.com	TRUE	/	TRUE	1234567890	csrftoken	xxxxx"
                className="w-full px-4 py-3 bg-sidebar-light dark:bg-sidebar-dark border border-border-light dark:border-border-dark rounded-xl text-xs text-text-light dark:text-text-dark font-mono focus:outline-none focus:border-primary dark:focus:border-white transition-colors resize-none"
              />
              <p className="text-xs text-muted-light dark:text-muted-dark mt-2">
                粘贴从浏览器导出的 Cookies 文件内容（Netscape 格式）
              </p>
            </div>

            {/* Status Message */}
            <AnimatePresence>
              {submitStatus !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={clsx(
                    'mb-4 p-3 rounded-lg flex items-center gap-2 text-sm',
                    submitStatus === 'success' && 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
                    submitStatus === 'error' && 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  )}
                >
                  {submitStatus === 'success' && <CheckCircle size={16} />}
                  {submitStatus === 'error' && <AlertCircle size={16} />}
                  {statusMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:opacity-80 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  配置中...
                </>
              ) : (
                <>
                  <Cookie size={18} />
                  保存配置
                </>
              )}
            </button>
          </form>
        </div>

        {/* Help Section */}
        <div className="w-full mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
              <Info size={16} />
              如何获取 Cookies？
            </h3>
            <ol className="text-xs text-blue-800 dark:text-blue-400 space-y-2 list-decimal list-inside">
              <li>
                安装浏览器扩展：
                <a
                  href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline hover:text-blue-600 dark:hover:text-blue-200"
                >
                  Get cookies.txt LOCALLY
                </a>
              </li>
              <li>登录目标平台</li>
              <li>在该平台页面点击扩展图标，导出 或 复制Cookies</li>
              <li>复制内容并粘贴到上方输入框</li>
              <li>点击"保存配置"即可</li>
            </ol>

            <div className="mt-3">
              <Link
                to="/tutorial"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <BookOpen size={14} />
                查看图文教程
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                <strong>注意事项：</strong>
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside mt-2">
                <li>Cookies 会定期过期（30-90天），过期后重新配置即可</li>
                <li>配置后刷新页面就可以使用该平台的下载功能</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-auto w-full text-center py-8 px-4">
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

export default CookiesConfig;
