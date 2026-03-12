export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string | null;
  platform: string | null;
  duration: number | null;
  uploader: string | null;
  timestamp: number;
  formats: Array<{
    format_id: string;
    ext: string;
    quality: number | null;
    filesize: number | null;
    has_video: boolean;
    has_audio: boolean;
  }>;
}

const HISTORY_KEY = 'parse_history';
const MAX_HISTORY_ITEMS = 50;

export function getHistory(): HistoryItem[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>): void {
  const history = getHistory();
  const newItem: HistoryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };

  // Add to beginning and limit size
  const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function removeFromHistory(id: string): void {
  const history = getHistory();
  const updated = history.filter(item => item.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
