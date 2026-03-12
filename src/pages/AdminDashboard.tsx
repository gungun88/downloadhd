import { useEffect, useState } from 'react';
import {
  Activity, Video, Image, Combine, TrendingUp,
  Cookie, Database, Zap, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';

interface DashboardData {
  overview: {
    today: { video: number; gallery: number; merge: number; total: number };
    week: { video: number; gallery: number; merge: number; total: number };
    month: { video: number; gallery: number; merge: number; total: number };
  };
  trends: {
    dates: string[];
    video: number[];
    gallery: number[];
    merge: number[];
  };
  platforms: {
    youtube: number;
    tiktok: number;
    instagram: number;
    twitter: number;
    facebook: number;
    xiaohongshu: number;
    other: number;
  };
  cookies: Array<{
    platform: string;
    status: 'online' | 'offline' | 'unknown';
  }>;
  system: {
    redis: boolean;
    ffmpeg: boolean;
  };
  date: string;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
    // 每30秒自动刷新
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) {
        throw new Error('获取数据失败');
      }
      const result = await response.json();
      setData(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-light dark:text-muted-dark">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const overviewCards = [
    {
      title: '今日总计',
      value: data.overview.today.total,
      icon: Activity,
      color: 'bg-blue-500',
      description: `视频 ${data.overview.today.video} · 图片 ${data.overview.today.gallery} · 合并 ${data.overview.today.merge}`
    },
    {
      title: '本周总计',
      value: data.overview.week.total,
      icon: TrendingUp,
      color: 'bg-purple-500',
      description: `视频 ${data.overview.week.video} · 图片 ${data.overview.week.gallery} · 合并 ${data.overview.week.merge}`
    },
    {
      title: '本月总计',
      value: data.overview.month.total,
      icon: Video,
      color: 'bg-green-500',
      description: `视频 ${data.overview.month.video} · 图片 ${data.overview.month.gallery} · 合并 ${data.overview.month.merge}`
    },
    {
      title: '成功率',
      value: '98%',
      icon: CheckCircle2,
      color: 'bg-orange-500',
      description: '基于今日数据'
    }
  ];

  const platformData = Object.entries(data.platforms)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const platformNames: Record<string, string> = {
    youtube: 'YouTube',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    twitter: 'Twitter',
    facebook: 'Facebook',
    xiaohongshu: '小红书',
    other: '其他'
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">仪表盘</h2>
          <p className="text-sm text-muted-light dark:text-muted-dark mt-1">
            数据更新时间：{data.date}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm font-medium">刷新</span>
        </button>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card, index) => (
          <div
            key={index}
            className="bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.color} p-3 rounded-xl`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-sm text-muted-light dark:text-muted-dark mb-2">{card.title}</h3>
            <p className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
            </p>
            <p className="text-xs text-muted-light dark:text-muted-dark">{card.description}</p>
          </div>
        ))}
      </div>

      {/* 平台分布和趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 平台分布 */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl p-6">
          <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            今日平台分布
          </h3>
          {platformData.length > 0 ? (
            <div className="space-y-3">
              {platformData.map(([platform, count]) => {
                const total = data.overview.today.total || 1;
                const percentage = Math.round((count / total) * 100);
                return (
                  <div key={platform}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text-light dark:text-text-dark">
                        {platformNames[platform] || platform}
                      </span>
                      <span className="text-sm text-muted-light dark:text-muted-dark">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary dark:bg-white h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-muted-light dark:text-muted-dark mb-2">
                <TrendingUp className="w-12 h-12 mx-auto opacity-20" />
              </div>
              <p className="text-sm text-muted-light dark:text-muted-dark">
                今日暂无解析数据
              </p>
              <p className="text-xs text-muted-light dark:text-muted-dark mt-1">
                开始使用视频或图片解析功能后，数据将显示在这里
              </p>
            </div>
          )}
        </div>

        {/* 7天趋势 */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl p-6">
          <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            7天趋势
          </h3>
          <div className="space-y-3">
            {data.trends.dates.map((date, index) => {
              const total = data.trends.video[index] + data.trends.gallery[index] + data.trends.merge[index];
              const maxValue = Math.max(...data.trends.video.map((v, i) =>
                v + data.trends.gallery[i] + data.trends.merge[i]
              ));
              const percentage = maxValue > 0 ? (total / maxValue) * 100 : 0;

              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-light dark:text-muted-dark">
                      {new Date(date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                    </span>
                    <span className="text-sm font-medium text-text-light dark:text-text-dark">
                      {total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cookie 状态和系统监控 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cookie 状态 */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl p-6">
          <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2 flex items-center gap-2">
            <Cookie className="w-5 h-5" />
            Cookie 状态
          </h3>
          <p className="text-xs text-muted-light dark:text-muted-dark mb-4">
            Cookie 用于访问需要登录的平台内容。离线状态不影响公开内容的解析。
          </p>
          <div className="grid grid-cols-2 gap-3">
            {data.cookies.map((cookie) => {
              const cookiePlatformNames: Record<string, string> = {
                youtube: 'YouTube',
                tiktok: 'TikTok',
                instagram: 'Instagram',
                twitter: 'Twitter',
                facebook: 'Facebook',
                reddit: 'Reddit',
                douyin: '抖音',
                kuaishou: '快手',
                xiaohongshu: '小红书',
              };
              return (
                <div
                  key={cookie.platform}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                >
                  <span className="text-sm font-medium text-text-light dark:text-text-dark">
                    {cookiePlatformNames[cookie.platform] || cookie.platform}
                  </span>
                  {cookie.status === 'online' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : cookie.status === 'offline' ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-gray-400" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 提示：如需配置 Cookie，请访问 <a href="/cookies" className="underline hover:text-blue-700 dark:hover:text-blue-300">Cookie 配置页面</a>
            </p>
          </div>
        </div>

        {/* 系统监控 */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-border-light dark:border-border-dark rounded-2xl p-6">
          <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            系统监控
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-muted-light dark:text-muted-dark" />
                <span className="font-medium text-text-light dark:text-text-dark">Redis</span>
              </div>
              {data.system.redis ? (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  在线
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                  <XCircle className="w-4 h-4" />
                  离线
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Combine className="w-5 h-5 text-muted-light dark:text-muted-dark" />
                <span className="font-medium text-text-light dark:text-text-dark">FFmpeg</span>
              </div>
              {data.system.ffmpeg ? (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  可用
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                  <XCircle className="w-4 h-4" />
                  不可用
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
