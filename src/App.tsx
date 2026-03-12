/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Merge from './pages/Merge';
import History from './pages/History';
import Tutorial from './pages/Tutorial';
import TutorialIOS from './pages/TutorialIOS';
import Contact from './pages/Contact';
import CookiesConfig from './pages/CookiesConfig';
import Terms from './pages/Terms';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './pages/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="merge" element={<Merge />} />
          <Route path="history" element={<History />} />
          <Route path="tutorial" element={<Tutorial />} />
          <Route path="tutorial/ios" element={<TutorialIOS />} />
          <Route path="contact" element={<Contact />} />
          <Route path="cookies" element={<CookiesConfig />} />
          <Route path="terms" element={<Terms />} />
        </Route>

        {/* 管理后台路由 */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
