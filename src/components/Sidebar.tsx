import { Link, useLocation } from 'react-router-dom';
import { Combine, BookOpen, Clock, Headset, Cookie, LucideIcon, Users, Image } from 'lucide-react';
import clsx from 'clsx';
import { FC } from 'react';

interface NavItemProps {
  path: string;
  icon?: LucideIcon;
  customIcon?: React.ReactNode;
  label: string;
}

const NavItem: FC<{ item: NavItemProps; isActive: boolean }> = ({ item, isActive }) => {
  return (
    <Link
      to={item.path}
      className={clsx(
        'w-full h-[72px] rounded-xl flex flex-col items-center justify-center gap-1 transition-all shrink-0 group',
        isActive
          ? 'bg-primary text-white shadow-sm'
          : 'text-text-light hover:bg-gray-200 dark:text-text-dark dark:hover:bg-gray-800'
      )}
    >
      {item.customIcon ? (
        <div className={clsx("w-6 h-6 flex items-center justify-center", isActive ? "text-white" : "text-current")}>
          {item.customIcon}
        </div>
      ) : (
        item.icon && <item.icon size={24} strokeWidth={2.5} />
      )}
      <span className="text-[11px] font-bold text-center leading-tight">{item.label}</span>
    </Link>
  );
};

const Sidebar = () => {
  const location = useLocation();

  const navItems: NavItemProps[] = [
    {
      path: '/',
      customIcon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 1024 1024">
          <path d="M439.077 0v291.986H292.57L512 512l219.429-220.014H584.923V0z"/>
          <path d="M877.714 146.286H732.16v73.143h145.554a73.143 73.143 0 0 1 73.143 73.142V731.43a73.143 73.143 0 0 1-73.143 73.142H146.286a73.143 73.143 0 0 1-73.143-73.142V292.57a73.143 73.143 0 0 1 73.143-73.142h146.066v-73.143H146.286A146.286 146.286 0 0 0 0 292.57V731.43a146.286 146.286 0 0 0 146.286 146.285h292.571v73.143H219.21V1024h585.143v-73.143h-219.21v-73.143h292.572A146.286 146.286 0 0 0 1024 731.43V292.57a146.286 146.286 0 0 0-146.286-146.285"/>
        </svg>
      ),
      label: '视频解析'
    },
    { path: '/gallery', icon: Image, label: '图片解析' },
    { path: '/merge', icon: Combine, label: '音视频合并' },
  ];

  const bottomNavItems: NavItemProps[] = [
    { path: '/tutorial', icon: BookOpen, label: '使用教程' },
    { path: '/history', icon: Clock, label: '解析历史' },
    { path: '/contact', icon: Headset, label: '联系我们' },
    { path: '/cookies', icon: Cookie, label: 'Cookies配置' },
  ];

  return (
    <aside className="hidden md:flex w-24 bg-sidebar-light dark:bg-sidebar-dark h-full flex-col border-r border-border-light dark:border-border-dark shrink-0 overflow-hidden">
      <div className="flex flex-col items-center w-full px-2 pt-6 gap-2">
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} isActive={location.pathname === item.path} />
        ))}
      </div>
      <div className="flex-grow"></div>
      <div className="flex flex-col items-center w-full px-2 pb-6 gap-2">
        <a
          href="https://doingfb.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-[72px] rounded-xl flex flex-col items-center justify-center gap-1 transition-all shrink-0 text-text-light hover:bg-gray-200 dark:text-text-dark dark:hover:bg-gray-800"
        >
          <Users size={24} strokeWidth={2.5} />
          <span className="text-[11px] font-bold text-center leading-tight">交流社区</span>
        </a>
        {bottomNavItems.map((item) => (
          <NavItem key={item.path} item={item} isActive={location.pathname === item.path} />
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
