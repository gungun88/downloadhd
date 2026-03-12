import { Mail, Send, Globe, MessageCircle, Clock, FileText, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const Contact = () => {
  return (
    <div className="flex-1 relative flex flex-col overflow-hidden bg-[#fafafa] dark:bg-background-dark">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto min-h-full flex flex-col items-center pt-12 px-6">
          <div className="w-full flex-1">
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold tracking-tight text-text-light dark:text-text-dark mb-4">联系官方：常见问题解答</h1>
              <p className="text-muted-light dark:text-muted-dark">
                如果您有其他问题或需要进一步的帮助，请随时联系我们！
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {/* Email Support */}
              <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-border-light dark:border-border-dark shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                    <Mail size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-text-light dark:text-text-dark">如何联系官方支持？</h2>
                </div>
                <p className="text-muted-light dark:text-muted-dark text-sm mb-4">
                  通过电子邮件详细说明来意及联系方式
                </p>
                <a href="mailto:info@doingfb.com" className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
                  <Mail size={18} className="text-muted-light dark:text-muted-dark group-hover:text-primary dark:group-hover:text-white transition-colors" />
                  <span className="font-mono font-medium text-text-light dark:text-text-dark">info@doingfb.com</span>
                </a>
              </div>

              {/* Webmaster Contact */}
              <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-border-light dark:border-border-dark shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                    <User size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-text-light dark:text-text-dark">联系站长</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <Send size={16} className="text-blue-400" />
                      <span className="text-sm font-medium text-muted-light dark:text-muted-dark">电报</span>
                    </div>
                    <span className="text-sm font-bold text-text-light dark:text-text-dark">@doingfb</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <MessageCircle size={16} className="text-blue-500" /> {/* QQ usually blue/penguin */}
                      <span className="text-sm font-medium text-muted-light dark:text-muted-dark">QQ</span>
                    </div>
                    <span className="text-sm font-bold text-text-light dark:text-text-dark">3436794252</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <MessageCircle size={16} className="text-green-500" /> {/* WeChat green */}
                      <span className="text-sm font-medium text-muted-light dark:text-muted-dark">微信</span>
                    </div>
                    <span className="text-sm font-bold text-text-light dark:text-text-dark">doingfb</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Community Section */}
            <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-border-light dark:border-border-dark shadow-sm mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                  <MessageCircle size={20} />
                </div>
                <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                  加入官方群聊 <span className="text-green-500 text-sm font-normal ml-2">Contact me</span>
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a href="https://t.me/doingfb_com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all group">
                  <Send size={32} className="text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-text-light dark:text-text-dark">Telegram 群组</span>
                </a>
                <a href="https://t.me/doingfb_rss" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all group">
                  <div className="relative">
                    <Send size={32} className="text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-[#1a1a1a]"></div>
                  </div>
                  <span className="font-bold text-text-light dark:text-text-dark">Telegram 频道</span>
                </a>
                <a href="https://doingfb.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all group">
                  <Globe size={32} className="text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-text-light dark:text-text-dark">官方网站</span>
                </a>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-text-light dark:text-text-dark px-2">常见问题</h2>
              
              <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-border-light dark:border-border-dark">
                <div className="flex gap-4">
                  <div className="mt-1 text-primary dark:text-white">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-light dark:text-text-dark mb-2">我提交了问题，什么时候能得到回复？</h3>
                    <p className="text-sm text-muted-light dark:text-muted-dark leading-relaxed">
                      我们通常会在24小时内处理并回复您的请求。
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-border-light dark:border-border-dark">
                <div className="flex gap-4">
                  <div className="mt-1 text-primary dark:text-white">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-light dark:text-text-dark mb-2">如何确保我的请求得到及时处理？</h3>
                    <p className="text-sm text-muted-light dark:text-muted-dark leading-relaxed">
                      请确保在联系时提供所有必要的信息，包括用户名、问题描述和截图（如适用）。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link
                to="/"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-sidebar-light dark:bg-sidebar-dark border border-border-light dark:border-border-dark text-sm font-bold text-text-light dark:text-text-dark hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"
              >
                返回首页
              </Link>
            </div>
          </div>

          <footer className="mt-12 w-full text-center py-6 px-4">
            <p className="text-[13px] text-muted-light dark:text-muted-dark font-medium">
              继续操作即表示您同意
              <Link to="/terms" className="underline hover:text-text-light dark:hover:text-text-dark transition-colors ml-1">
                条款和使用规范
              </Link>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Contact;
