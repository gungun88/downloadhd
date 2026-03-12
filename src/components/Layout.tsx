import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const Layout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
      <Sidebar />
      <main className="flex-1 relative flex flex-col overflow-hidden pb-16 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};

export default Layout;
