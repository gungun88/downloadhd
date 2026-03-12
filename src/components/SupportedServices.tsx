import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const SupportedServices = () => {
  const [isOpen, setIsOpen] = useState(false);

  const services = [
    'YouTube',
    'TikTok',
    'Instagram',
    'Facebook',
    'Twitter (X)',
    'Bilibili',
    'Douyin',
    'Xiaohongshu',
    'Weibo',
    'Kuaishou',
    'Vimeo',
    'Dailymotion',
    'Twitch',
    'Reddit',
    'Pinterest',
    'Tumblr',
    'Snapchat',
    'LinkedIn',
    'SoundCloud',
    'Spotify',
    'Bandcamp',
    'Mixcloud',
    'VK',
    'OK.ru',
    'Rutube',
    'Youku',
    'iQIYI',
    'Tencent Video',
    'Mango TV',
    'Bluesky',
    'Mastodon',
    'Threads',
    'Streamable',
    'Vevo',
    'Niconico',
    'Pixiv',
    'DeviantArt',
    'ArtStation',
    'Behance',
    'Dribbble',
    'Flickr',
    'Imgur',
    '9GAG',
    'Giphy',
    'Tenor',
    'Loom',
    'Wistia',
    'Vidyard',
    'Brightcove',
    'JW Player',
    'Kaltura',
    'Newgrounds',
    'Archive.org',
    'Periscope',
    'Likee',
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-sidebar-light dark:bg-sidebar-dark border border-border-light dark:border-border-dark rounded-full text-sm font-medium text-text-light dark:text-text-dark hover:border-primary dark:hover:border-white transition-colors"
        aria-label={isOpen ? "隐藏支持的服务" : "显示支持的服务"}
      >
        <div className="w-5 h-5 flex items-center justify-center">
          {isOpen ? <X size={16} /> : <Plus size={16} />}
        </div>
        <span>支持的服务</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Popover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute top-full mt-3 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-2xl"
            >
              <div className="bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl shadow-2xl p-6">
                {/* Services Grid */}
                <div className="max-h-[60vh] overflow-y-auto scrollbar-thin mb-4">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {services.map((service) => (
                      <div
                        key={service}
                        className="px-3 py-2 bg-sidebar-light dark:bg-sidebar-dark rounded-lg text-xs font-medium text-text-light dark:text-text-dark text-center"
                      >
                        {service}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disclaimer */}
                <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed pt-4 border-t border-border-light dark:border-border-dark">
                  对某项服务的支持并不意味着隶属关系、认可或除技术兼容性之外的任何形式的支持。
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupportedServices;
