import { Link } from 'react-router-dom';
import { useState, FormEvent } from 'react';
import { Search, X, ExternalLink, Send, Filter } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

interface LinkItem {
  title: string;
  desc: string;
  url: string;
  category: string;
}

const Links = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', desc: '', logo: '' });

  const links: LinkItem[] = [
    {
      title: '视频解析站',
      desc: '最快最全的全网短视频无水印解析平台',
      url: 'https://example.com',
      category: '工具',
    },
    {
      title: '素材下载网',
      desc: '每日更新高质量正版视频素材库',
      url: 'https://example.com',
      category: '资源',
    },
    {
      title: '工具大全',
      desc: '专为开发者设计的在线效率工具合集',
      url: 'https://example.com',
      category: '工具',
    },
    {
      title: '影音社区',
      desc: '分享视频剪辑心得与最新行业动态',
      url: 'https://example.com',
      category: '社区',
    },
    {
      title: '云盘搜索',
      desc: '一键检索全网优质学习资源与影视',
      url: 'https://example.com',
      category: '资源',
    },
    {
      title: '极速转码',
      desc: '高性能云端视频格式转换处理方案',
      url: 'https://example.com',
      category: '工具',
    },
  ];

  const categories = ['全部', ...Array.from(new Set(links.map(link => link.category)))];

  const filteredLinks = links.filter(link => {
    const matchesSearch = link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         link.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '全部' || link.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmitForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowApplyForm(false);
    setFormData({ name: '', url: '', desc: '', logo: '' });
  };

  return (
    <div className="flex-1 relative flex flex-col items-center overflow-y-auto bg-background-light dark:bg-background-dark pt-8 md:pt-16">
      <div className="flex-1 flex flex-col items-center px-6 w-full max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-text-light dark:text-text-dark">友情链接</h1>
          <div className="w-8 h-1 bg-primary dark:bg-white mx-auto mt-2 rounded-full"></div>
        </div>

        {/* Search & Filter Bar */}
        <div className="w-full flex flex-col md:flex-row gap-3 mb-6">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索链接..."
              className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark placeholder:text-muted-light dark:placeholder:text-muted-dark focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <Filter size={18} className="text-muted-light dark:text-muted-dark shrink-0" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  selectedCategory === cat
                    ? "bg-primary text-white"
                    : "bg-sidebar-light dark:bg-sidebar-dark text-text-light dark:text-text-dark hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Links Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <AnimatePresence mode="popLayout">
            {filteredLinks.map((link, index) => (
              <motion.a
                key={link.title}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="group relative block p-6 bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary dark:hover:border-white hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-text-light dark:text-text-dark text-[15px]">
                    {link.title}
                  </h3>
                  <ExternalLink
                    size={14}
                    className="text-muted-light dark:text-muted-dark group-hover:text-primary dark:group-hover:text-white transition-colors shrink-0 ml-2"
                  />
                </div>
                <p className="text-[11px] text-muted-light dark:text-muted-dark leading-snug mb-2">
                  {link.desc}
                </p>
                <span className="inline-block px-2 py-0.5 bg-sidebar-light dark:bg-sidebar-dark rounded text-[10px] font-medium text-muted-light dark:text-muted-dark">
                  {link.category}
                </span>
              </motion.a>
            ))}
          </AnimatePresence>
        </div>

        {/* No Results */}
        {filteredLinks.length === 0 && (
          <div className="w-full py-12 text-center">
            <p className="text-sm text-muted-light dark:text-muted-dark">未找到匹配的链接</p>
          </div>
        )}

        {/* Apply Button */}
        <div className="mt-8 text-center">
          <p className="text-[11px] text-muted-light dark:text-muted-dark uppercase tracking-widest font-bold mb-4">
            申请加入
          </p>
          <button
            onClick={() => setShowApplyForm(true)}
            className="px-6 py-2 rounded-full border border-border-light dark:border-border-dark text-[13px] font-medium text-text-light dark:text-text-dark hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
          >
            联系合作
          </button>
        </div>
      </div>

      {/* Apply Form Modal */}
      <AnimatePresence>
        {showApplyForm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowApplyForm(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl shadow-2xl z-50 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-text-light dark:text-text-dark">申请友情链接</h2>
                <button
                  onClick={() => setShowApplyForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X size={20} className="text-muted-light dark:text-muted-dark" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    网站名称
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-sidebar-light dark:bg-sidebar-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
                    placeholder="请输入网站名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    网站链接
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-4 py-2.5 bg-sidebar-light dark:bg-sidebar-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    网站描述
                  </label>
                  <textarea
                    required
                    value={formData.desc}
                    onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-sidebar-light dark:bg-sidebar-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark focus:outline-none focus:border-primary dark:focus:border-white transition-colors resize-none"
                    placeholder="简要描述您的网站..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    网站图标
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    className="w-full px-4 py-2.5 bg-sidebar-light dark:bg-sidebar-dark border border-border-light dark:border-border-dark rounded-xl text-sm text-text-light dark:text-text-dark focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  提交申请
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

export default Links;
