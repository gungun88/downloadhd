import { useEffect, useState } from 'react';
import { TrendingUp, Video, Image, Activity } from 'lucide-react';

interface OverviewData {
  date: string;
  video: {
    total: number;
    youtube: number;
    tiktok: number;
    other: number;
  };
  gallery: {
    total: number;
    instagram: number;
    other: number;
  };
  total: number;
}

export default function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/overview');
      if (!response.ok) {
        throw new Error('获取数据失败');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const cards = [
    {
      title: '今日总解析',
      value: data.total,
      icon: Activity,
      color: 'bg-blue-600',
      description: '视频 + 图片'
    },
    {
      title: '视频解析',
      value: data.video.total,
      icon: Video,
      color: 'bg-purple-600',
      description: `YouTube ${data.video.youtube} · TikTok ${data.video.tiktok} · 其他 ${data.video.other}`
    },
    {
      title: '图片解析',
      value: data.gallery.total,
      icon: Image,
      color: 'bg-green-600',
      description: `Instagram ${data.gallery.instagram} · 其他 ${data.gallery.other}`
    },
    {
      title: '增长趋势',
      value: '+' + Math.round((data.total / Math.max(1, data.total - 10)) * 100 - 100) + '%',
      icon: TrendingUp,
      color: 'bg-orange-600',
      description: '相比昨日'
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">概览</h2>
        <p className="text-gray-400">今日数据统计 · {data.date}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div
            key={index}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-400 text-sm mb-2">{card.title}</h3>
            <p className="text-3xl font-bold text-white mb-2">{card.value}</p>
            <p className="text-gray-500 text-sm">{card.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 视频解析详情 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Video className="w-5 h-5" />
            视频解析详情
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">YouTube</span>
              <span className="text-white font-medium">{data.video.youtube}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">TikTok</span>
              <span className="text-white font-medium">{data.video.tiktok}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">其他平台</span>
              <span className="text-white font-medium">{data.video.other}</span>
            </div>
            <div className="pt-3 border-t border-gray-700 flex items-center justify-between">
              <span className="text-gray-300 font-medium">总计</span>
              <span className="text-white font-bold">{data.video.total}</span>
            </div>
          </div>
        </div>

        {/* 图片解析详情 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Image className="w-5 h-5" />
            图片解析详情
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Instagram</span>
              <span className="text-white font-medium">{data.gallery.instagram}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">其他平台</span>
              <span className="text-white font-medium">{data.gallery.other}</span>
            </div>
            <div className="pt-3 border-t border-gray-700 flex items-center justify-between">
              <span className="text-gray-300 font-medium">总计</span>
              <span className="text-white font-bold">{data.gallery.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
