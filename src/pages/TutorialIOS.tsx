import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TutorialIOS = () => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-background-dark">
      <div className="flex-1 flex overflow-hidden">
        <article className="flex-1 overflow-y-auto bg-white dark:bg-background-dark">
          <div className="max-w-3xl mx-auto min-h-full flex flex-col px-8 pt-8 lg:px-12 lg:pt-12">
            <div className="flex-1">
              <header className="mb-10">
                <h1 className="text-3xl lg:text-4xl font-extrabold text-text-light dark:text-text-dark mb-4 leading-tight">iOS系统的Safari浏览器如何保存视频至本地</h1>
                <div className="flex items-center gap-3 text-sm text-muted-light dark:text-muted-dark font-medium">
                  <span>2024-08-25 10:00:00</span>
                  <span className="w-1 h-1 rounded-full bg-border-light dark:bg-border-dark"></span>
                  <span>首页</span>
                  <span className="w-1 h-1 rounded-full bg-border-light dark:bg-border-dark"></span>
                  <span>博客</span>
                </div>
              </header>
              
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <h2 className="text-2xl font-bold mt-12 mb-6 text-text-light dark:text-text-dark">苹果Safari浏览器保存视频</h2>
                
                <h4 className="text-lg font-bold mt-8 mb-4 text-text-light dark:text-text-dark">1. 单击屏幕弹出一个如下图的页面，点击左上角箭头指向的按钮</h4>
                <p className="text-gray-700 dark:text-gray-300">
                  （此处应有示意图，请参考实际操作界面）
                </p>

                <h4 className="text-lg font-bold mt-8 mb-4 text-text-light dark:text-text-dark">2. 然后可以看到下面的页面，单击中下角的分享按钮</h4>
                
                <h4 className="text-lg font-bold mt-8 mb-4 text-text-light dark:text-text-dark">3. 接下来会弹出一个多选框，选择里面的存储到“文件”</h4>

                <h4 className="text-lg font-bold mt-8 mb-4 text-text-light dark:text-text-dark">4. 询问存放位置的页面就会弹出来，可以选择存放在下载文件夹</h4>

                <h4 className="text-lg font-bold mt-8 mb-4 text-text-light dark:text-text-dark">5. 然后就可以到文件这个app找到视频</h4>

                <h4 className="text-lg font-bold mt-8 mb-4 text-text-light dark:text-text-dark">6. 选择里面的我的iPhone</h4>

                <h4 className="text-lg font-bold mt-8 mb-4 text-text-light dark:text-text-dark">7. 点进去后往下滑，或者搜索下载，就能看到下载文件夹</h4>

                <h2 className="text-2xl font-bold mt-12 mb-6 text-text-light dark:text-text-dark">视频文件选择保存到相册</h2>
                
                <h4 className="text-lg font-bold mt-8 mb-4 text-text-light dark:text-text-dark">1. 先单击视频文件，会弹出播放页面，点击左下角的分享按钮</h4>

                <h4 className="text-lg font-bold mt-8 mb-4 text-text-light dark:text-text-dark">2. 弹出一个选择页面，单击存储视频即可</h4>
              </div>
              
              <div className="mt-12 pt-8 border-t border-border-light dark:border-border-dark flex justify-between items-center">
                 <Link to="/tutorial" className="flex items-center gap-2 text-primary dark:text-white font-bold hover:underline">
                   <ChevronLeft size={16} /> DownloadHD视频下载完整教程
                 </Link>
                 <span className="text-muted-light dark:text-muted-dark text-sm">下一篇</span>
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
    </div>
  );
};

export default TutorialIOS;
