import { Link } from 'react-router-dom';
import { Cookie, Chrome, Download, CheckCircle, X } from 'lucide-react';
import { useState } from 'react';

const Tutorial = () => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-background-dark">
      <div className="flex-1 flex overflow-hidden">
        <article className="flex-1 overflow-y-auto bg-white dark:bg-background-dark">
          <div className="max-w-3xl mx-auto min-h-full flex flex-col px-8 pt-8 lg:px-12 lg:pt-12">
            <div className="flex-1">
              <header className="mb-10">
                <h1 className="text-3xl lg:text-4xl font-extrabold text-text-light dark:text-text-dark mb-4 leading-tight">
                  Cookies 配置图文教程
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-light dark:text-muted-dark font-medium">
                  <Cookie size={16} />
                  <span>完整教程</span>
                  <span className="w-1 h-1 rounded-full bg-border-light dark:bg-border-dark"></span>
                  <span>5 分钟完成</span>
                </div>
              </header>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                  某些平台（如 Instagram、Twitter 等）需要登录才能下载内容。本教程将手把手教你如何配置 Cookies，让你能够顺利下载这些平台的视频和图片。
                </p>

                {/* 步骤 1 */}
                <div className="mt-12">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                      1
                    </div>
                    <h2 className="text-2xl font-bold text-text-light dark:text-text-dark m-0">
                      安装浏览器扩展
                    </h2>
                  </div>

                  <p className="text-gray-700 dark:text-gray-300">
                    首先，你需要安装一个浏览器扩展来导出 Cookies。我们推荐使用 <strong>Get cookies.txt LOCALLY</strong>。
                  </p>

                  <div className="my-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Chrome size={24} className="text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-blue-900 dark:text-blue-300 mb-2">Chrome 浏览器用户</p>
                        <a
                          href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors no-underline"
                        >
                          <Download size={16} />
                          前往 Chrome 商店安装
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="my-8 rounded-2xl overflow-hidden border border-border-light dark:border-border-dark bg-sidebar-light dark:bg-sidebar-dark cursor-pointer hover:opacity-90 transition-opacity">
                    <img
                      src="/images/tutorial/Chrome 商店扩展页面截图.png"
                      alt="Chrome 商店扩展页面截图"
                      className="w-full h-auto"
                      onClick={() => setLightboxImage("/images/tutorial/Chrome 商店扩展页面截图.png")}
                    />
                  </div>

                  <p className="text-muted-light dark:text-muted-dark text-sm italic border-l-4 border-primary pl-4 py-2 bg-sidebar-light dark:bg-sidebar-dark rounded-r">
                    💡 提示：安装后，浏览器右上角会出现扩展图标。如果没有看到，点击拼图图标查看所有扩展。
                  </p>
                </div>

                {/* 步骤 2 */}
                <div className="mt-12">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                      2
                    </div>
                    <h2 className="text-2xl font-bold text-text-light dark:text-text-dark m-0">
                      登录目标平台
                    </h2>
                  </div>

                  <p className="text-gray-700 dark:text-gray-300">
                    打开你想要下载内容的平台（例如 Instagram、Twitter），并登录你的账号。
                  </p>

                  <div className="my-8 rounded-2xl overflow-hidden border border-border-light dark:border-border-dark bg-sidebar-light dark:bg-sidebar-dark cursor-pointer hover:opacity-90 transition-opacity">
                    <img
                      src="/images/tutorial/Instagram 登录页面截图.png"
                      alt="Instagram 登录页面截图"
                      className="w-full h-auto"
                      onClick={() => setLightboxImage("/images/tutorial/Instagram 登录页面截图.png")}
                    />
                  </div>

                  <div className="my-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                    <p className="text-yellow-900 dark:text-yellow-300 text-sm m-0">
                      ⚠️ <strong>重要提示：</strong>建议使用小号登录，避免主账号因频繁下载被平台限制。
                    </p>
                  </div>
                </div>

                {/* 步骤 3 */}
                <div className="mt-12">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                      3
                    </div>
                    <h2 className="text-2xl font-bold text-text-light dark:text-text-dark m-0">
                      导出 Cookies
                    </h2>
                  </div>

                  <p className="text-gray-700 dark:text-gray-300">
                    在目标平台页面，点击浏览器右上角的扩展图标，选择 <strong>Get cookies.txt LOCALLY</strong>。
                  </p>

                  <div className="my-8 rounded-2xl overflow-hidden border border-border-light dark:border-border-dark bg-sidebar-light dark:bg-sidebar-dark cursor-pointer hover:opacity-90 transition-opacity">
                    <img
                      src="/images/tutorial/点击扩展图标的截图.png"
                      alt="点击扩展图标的截图"
                      className="w-full h-auto"
                      onClick={() => setLightboxImage("/images/tutorial/点击扩展图标的截图.png")}
                    />
                  </div>

                  <p className="text-gray-700 dark:text-gray-300">
                    点击后，扩展会自动导出当前网站的 Cookies。你可以选择：
                  </p>

                  <ul className="text-gray-700 dark:text-gray-300 space-y-2">
                    <li><strong>复制到剪贴板</strong> - 直接复制 Cookies 内容</li>
                    <li><strong>下载为文件</strong> - 保存为 .txt 文件</li>
                  </ul>

                  <div className="my-8 rounded-2xl overflow-hidden border border-border-light dark:border-border-dark bg-sidebar-light dark:bg-sidebar-dark cursor-pointer hover:opacity-90 transition-opacity">
                    <img
                      src="/images/tutorial/导出 Cookies 的界面截图.png"
                      alt="导出 Cookies 的界面截图"
                      className="w-full h-auto"
                      onClick={() => setLightboxImage("/images/tutorial/导出 Cookies 的界面截图.png")}
                    />
                  </div>
                </div>

                {/* 步骤 4 */}
                <div className="mt-12">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                      4
                    </div>
                    <h2 className="text-2xl font-bold text-text-light dark:text-text-dark m-0">
                      配置到网站
                    </h2>
                  </div>

                  <p className="text-gray-700 dark:text-gray-300">
                    回到本网站的 <Link to="/cookies" className="text-primary dark:text-white font-bold hover:underline">Cookies 配置页面</Link>，按照以下步骤操作：
                  </p>

                  <ol className="text-gray-700 dark:text-gray-300 space-y-3 list-decimal list-inside">
                    <li>选择对应的平台（如 Instagram）</li>
                    <li>将刚才复制的 Cookies 内容粘贴到输入框</li>
                    <li>点击"保存配置"按钮</li>
                  </ol>

                  <div className="my-8 rounded-2xl overflow-hidden border border-border-light dark:border-border-dark bg-sidebar-light dark:bg-sidebar-dark cursor-pointer hover:opacity-90 transition-opacity">
                    <img
                      src="/images/tutorial/Cookies 配置页面截图.png"
                      alt="Cookies 配置页面截图"
                      className="w-full h-auto"
                      onClick={() => setLightboxImage("/images/tutorial/Cookies 配置页面截图.png")}
                    />
                  </div>

                  <div className="my-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-start gap-3">
                      <CheckCircle size={24} className="text-green-600 dark:text-green-400 shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-green-900 dark:text-green-300 mb-2">配置成功！</p>
                        <p className="text-green-800 dark:text-green-400 text-sm m-0">
                          现在你可以刷新页面，然后正常下载该平台的内容了。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 常见问题 */}
                <div className="mt-12">
                  <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-6">
                    常见问题
                  </h2>

                  <div className="space-y-6">
                    <div className="p-4 bg-sidebar-light dark:bg-sidebar-dark rounded-xl border border-border-light dark:border-border-dark">
                      <h3 className="font-bold text-text-light dark:text-text-dark mb-2">
                        Q: Cookies 会过期吗？
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 text-sm m-0">
                        A: 是的，Cookies 通常会在 30-90 天后过期。过期后重新按照本教程配置即可。
                      </p>
                    </div>

                    <div className="p-4 bg-sidebar-light dark:bg-sidebar-dark rounded-xl border border-border-light dark:border-border-dark">
                      <h3 className="font-bold text-text-light dark:text-text-dark mb-2">
                        Q: 配置后还是无法下载怎么办？
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 text-sm m-0">
                        A: 请确保：1) 已经登录目标平台 2) 复制的是完整的 Cookies 内容 3) 刷新了页面。如果还是不行，可能是 Cookies 已过期，请重新导出。
                      </p>
                    </div>

                    <div className="p-4 bg-sidebar-light dark:bg-sidebar-dark rounded-xl border border-border-light dark:border-border-dark">
                      <h3 className="font-bold text-text-light dark:text-text-dark mb-2">
                        Q: 我的账号会被封吗？
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 text-sm m-0">
                        A: 建议使用小号，并且不要频繁下载。我们的系统已经做了请求频率限制，降低了被封的风险。
                      </p>
                    </div>
                  </div>
                </div>

                {/* 返回按钮 */}
                <div className="mt-12 text-center">
                  <Link
                    to="/cookies"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:opacity-80 transition-opacity no-underline"
                  >
                    <Cookie size={18} />
                    前往配置 Cookies
                  </Link>
                </div>
              </div>
            </div>

            <footer className="mt-12 w-full text-center py-6">
              <p className="text-[13px] text-muted-light dark:text-muted-dark font-medium">
                继续操作即表示您同意
                <Link to="/terms" className="underline hover:text-text-light dark:hover:text-text-dark transition-colors ml-1">
                  条款和使用规范
                </Link>
              </p>
            </footer>
          </div>
        </article>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setLightboxImage(null)}
            aria-label="关闭"
          >
            <X size={32} />
          </button>
          <img
            src={lightboxImage}
            alt="放大图片"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Tutorial;
