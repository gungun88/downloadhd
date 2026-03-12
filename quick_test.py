#!/usr/bin/env python3
"""
快速测试已知平台
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from services.ytdlp import parse_video

# 已知的测试链接
test_cases = [
    {
        "platform": "YouTube Shorts",
        "url": "https://www.youtube.com/shorts/DRhHQim5f2E",
    },
    {
        "platform": "TikTok",
        "url": "https://www.tiktok.com/@jkcisbvz9d7/video/7600341897369996575",
    },
]

print("=" * 80)
print("快速平台测试")
print("=" * 80)

for test in test_cases:
    print(f"\n测试 {test['platform']}:")
    print(f"URL: {test['url']}")
    print("-" * 80)

    try:
        result = parse_video(test['url'])
        print(f"✅ 成功")
        print(f"   标题: {result.get('title', 'N/A')[:60]}")
        print(f"   平台: {result.get('platform', 'N/A')}")
        print(f"   时长: {result.get('duration', 'N/A')}秒")
        print(f"   格式数: {len(result.get('formats', []))}")
        print(f"   上传者: {result.get('uploader', 'N/A')}")
    except Exception as e:
        print(f"❌ 失败: {str(e)[:100]}")

print("\n" + "=" * 80)
print("测试完成")
print("=" * 80)
