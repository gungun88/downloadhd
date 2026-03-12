import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-background-dark">
      <header className="w-full p-6 flex items-center gap-4 z-20 sticky top-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-border-light dark:border-border-dark">
        <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-text-light dark:text-text-dark">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-sm font-bold uppercase tracking-widest text-text-light dark:text-text-dark">条款和使用规范</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 lg:p-12">
        <div className="max-w-3xl mx-auto prose prose-lg dark:prose-invert">
          <h1 className="text-3xl font-bold mb-8 text-text-light dark:text-text-dark">服务条款与使用协议</h1>
          
          <p className="text-sm text-muted-light dark:text-muted-dark mb-8">
            最后更新日期：2024年10月13日
          </p>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-text-light dark:text-text-dark">1. 接受条款</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              欢迎使用本服务。通过访问或使用本网站，即表示您同意受本服务条款（以下简称“条款”）的约束。如果您不同意这些条款的任何部分，请勿使用本服务。
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-text-light dark:text-text-dark">2. 服务说明</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              本网站提供在线视频解析、下载及转码工具（以下简称“服务”）。本服务仅供个人学习、研究或娱乐使用。我们不托管任何视频文件，所有内容均来自第三方平台。
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-text-light dark:text-text-dark">3. 用户行为规范</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              您同意在使用本服务时遵守所有适用的法律法规，且不得进行以下行为：
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>下载、复制或分发您不拥有版权或未获得授权的内容。</li>
              <li>将本服务用于任何非法目的或侵犯第三方权利。</li>
              <li>试图干扰、破坏本服务的正常运行或安全性。</li>
              <li>使用自动化脚本或软件大量请求本服务（爬虫行为）。</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-text-light dark:text-text-dark">4. 知识产权声明</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              本服务尊重知识产权。用户下载的内容版权归原作者或原平台所有。本服务仅作为技术工具，不对用户下载的内容承担任何法律责任。如果您是版权所有者并认为您的权益受到侵犯，请联系我们，我们将配合处理。
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-text-light dark:text-text-dark">5. 免责声明</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              本服务按“原样”提供，不包含任何形式的明示或暗示保证。我们不保证服务不会中断、没有错误或完全安全。在法律允许的最大范围内，我们不对因使用本服务而产生的任何直接、间接、附带或后果性损害负责。
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-text-light dark:text-text-dark">6. 条款修改</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              我们保留随时修改本条款的权利。修改后的条款一旦公布即生效。您继续使用本服务即视为接受修改后的条款。建议您定期查阅本页面以了解最新条款。
            </p>
          </section>

          <div className="pt-8 border-t border-border-light dark:border-border-dark">
            <p className="text-gray-700 dark:text-gray-300">
              如果您对本条款有任何疑问，请通过 <Link to="/contact" className="text-primary hover:underline font-bold">联系我们</Link> 页面与我们取得联系。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
