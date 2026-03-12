#!/usr/bin/env python3
"""
测试主流平台视频解析功能
"""
import sys
import json
from pathlib import Path

# 添加backend到路径
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from services.ytdlp import parse_video

# 主流平台测试链接（需要用户提供真实链接）
TEST_PLATFORMS = {
    "YouTube": {
        "name": "YouTube",
        "urls": [
            # "https://www.youtube.com/watch?v=VIDEO_ID",  # 普通视频
            # "https://www.youtube.com/shorts/SHORT_ID",   # Shorts
        ]
    },
    "TikTok": {
        "name": "TikTok",
        "urls": [
            # "https://www.tiktok.com/@user/video/ID",
        ]
    },
    "Instagram": {
        "name": "Instagram",
        "urls": [
            # "https://www.instagram.com/p/POST_ID/",
            # "https://www.instagram.com/reel/REEL_ID/",
        ]
    },
    "Twitter/X": {
        "name": "Twitter/X",
        "urls": [
            # "https://twitter.com/user/status/ID",
            # "https://x.com/user/status/ID",
        ]
    },
    "Facebook": {
        "name": "Facebook",
        "urls": [
            # "https://www.facebook.com/watch/?v=VIDEO_ID",
        ]
    },
    "Bilibili": {
        "name": "Bilibili",
        "urls": [
            # "https://www.bilibili.com/video/BV...",
        ]
    },
    "Douyin": {
        "name": "抖音 (Douyin)",
        "urls": [
            # "https://www.douyin.com/video/ID",
        ]
    },
    "Reddit": {
        "name": "Reddit",
        "urls": [
            # "https://www.reddit.com/r/subreddit/comments/ID/title/",
        ]
    },
    "Vimeo": {
        "name": "Vimeo",
        "urls": [
            # "https://vimeo.com/VIDEO_ID",
        ]
    },
    "Twitch": {
        "name": "Twitch",
        "urls": [
            # "https://www.twitch.tv/videos/VIDEO_ID",
        ]
    },
}


def test_url(platform_name: str, url: str) -> dict:
    """测试单个URL"""
    try:
        result = parse_video(url)
        return {
            "success": True,
            "platform": platform_name,
            "url": url,
            "title": result.get("title", "")[:50],
            "formats_count": len(result.get("formats", [])),
            "duration": result.get("duration"),
        }
    except Exception as e:
        return {
            "success": False,
            "platform": platform_name,
            "url": url,
            "error": str(e)[:100],
        }


def main():
    print("=" * 80)
    print("主流平台视频解析测试")
    print("=" * 80)
    print()

    results = []
    total_tests = 0
    successful_tests = 0

    for platform_key, platform_info in TEST_PLATFORMS.items():
        platform_name = platform_info["name"]
        urls = platform_info["urls"]

        if not urls:
            print(f"⚠️  {platform_name}: 没有测试链接")
            continue

        print(f"\n📱 测试 {platform_name}:")
        print("-" * 80)

        for url in urls:
            total_tests += 1
            print(f"  测试: {url[:60]}...")

            result = test_url(platform_name, url)
            results.append(result)

            if result["success"]:
                successful_tests += 1
                print(f"  ✅ 成功")
                print(f"     标题: {result['title']}")
                print(f"     格式数: {result['formats_count']}")
                print(f"     时长: {result['duration']}秒")
            else:
                print(f"  ❌ 失败: {result['error']}")

    # 总结
    print("\n" + "=" * 80)
    print("测试总结")
    print("=" * 80)
    print(f"总测试数: {total_tests}")
    print(f"成功: {successful_tests}")
    print(f"失败: {total_tests - successful_tests}")
    print(f"成功率: {(successful_tests / total_tests * 100) if total_tests > 0 else 0:.1f}%")

    # 保存结果
    output_file = Path(__file__).parent / "test_results.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n详细结果已保存到: {output_file}")


if __name__ == "__main__":
    main()
