import { Link, useLocation } from 'react-router-dom';
import { Combine, BookOpen, Clock, Headset, Cookie, Users, MoreHorizontal, X, Image } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const MobileNav = () => {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const mainNavItems = [
    {
      path: '/',
      customIcon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 1024 1024">
          <path d="M439.077 0v291.986H292.57L512 512l219.429-220.014H584.923V0z"/>
          <path d="M877.714 146.286H732.16v73.143h145.554a73.143 73.143 0 0 1 73.143 73.142V731.43a73.143 73.143 0 0 1-73.143 73.142H146.286a73.143 73.143 0 0 1-73.143-73.142V292.57a73.143 73.143 0 0 1 73.143-73.142h146.066v-73.143H146.286A146.286 146.286 0 0 0 0 292.57V731.43a146.286 146.286 0 0 0 146.286 146.285h292.571v73.143H219.21V1024h585.143v-73.143h-219.21v-73.143h292.572A146.286 146.286 0 0 0 1024 731.43V292.57a146.286 146.286 0 0 0-146.286-146.285"/>
        </svg>
      ),
      label: '视频'
    },
    { path: '/gallery', icon: Image, label: '图片' },
    { path: '/merge', icon: Combine, label: '合并' },
    { path: '/tutorial', icon: BookOpen, label: '教程' },
  ];

  const moreNavItems = [
    { path: '/history', icon: Clock, label: '历史' },
    { path: '/contact', icon: Headset, label: '联系我们' },
    { path: '/cookies', icon: Cookie, label: 'Cookies配置' },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-sidebar-dark border-t border-border-light dark:border-border-dark z-50 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex flex-col items-center justify-center gap-1 w-full h-full text-xs font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark'
                )}
              >
                {item.customIcon ? (
                  <div className={clsx("w-6 h-6", isActive ? "text-primary" : "text-current")}>
                    {item.customIcon}
                  </div>
                ) : (
                  item.icon && <item.icon size={24} strokeWidth={2} />
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          <button
            onClick={() => setShowMore(true)}
            className={clsx(
              'flex flex-col items-center justify-center gap-1 w-full h-full text-xs font-medium transition-colors',
              showMore
                ? 'text-primary'
                : 'text-muted-light dark:text-muted-dark hover:text-text-light dark:hover:text-text-dark'
            )}
          >
            <MoreHorizontal size={24} strokeWidth={2} />
            <span>更多</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMore(false)}
              className="fixed inset-0 bg-black/50 z-[60] md:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-sidebar-dark rounded-t-2xl z-[70] md:hidden pb-safe"
            >
              <div className="p-4">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-lg font-bold text-text-light dark:text-text-dark">更多功能</h3>
                  <button 
                    onClick={() => setShowMore(false)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X size={20} className="text-muted-light dark:text-muted-dark" />
                  </button>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  {moreNavItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMore(false)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-text-light dark:text-text-dark">
                        <item.icon size={24} />
                      </div>
                      <span className="text-xs font-medium text-text-light dark:text-text-dark text-center">{item.label}</span>
                    </Link>
                  ))}
                  
                  <a
                    href="https://doingfb.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMore(false)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-text-light dark:text-text-dark">
                      <Users size={24} />
                    </div>
                    <span className="text-xs font-medium text-text-light dark:text-text-dark text-center">社区</span>
                  </a>
                </div>
                
                <div className="mt-6 mb-2 text-center text-xs text-muted-light dark:text-muted-dark">
                  © 2024 DownloadHD. All rights reserved.
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNav;
