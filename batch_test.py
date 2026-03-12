#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 test_urls.txt 读取测试链接并批量测试
"""
import sys
import json
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from services.ytdlp import parse_video


def load_test_urls(file_path: Path) -> list:
    """从文件加载测试URL"""
    test_cases = []

    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            # 跳过注释和空行
            if not line or line.startswith('#'):
                continue

            # 解析格式: 平台名称 | URL
            if '|' in line:
                parts = line.split('|', 1)
                platform = parts[0].strip()
                url = parts[1].strip()

                if url:  # 只添加有URL的条目
                    test_cases.append({
                        'platform': platform,
                        'url': url
                    })

    return test_cases


def test_url(platform: str, url: str) -> dict:
    """测试单个URL"""
    try:
        result = parse_video(url)
        return {
            'success': True,
            'platform': platform,
            'url': url,
            'title': result.get('title', '')[:80],
            'formats_count': len(result.get('formats', [])),
            'duration': result.get('duration'),
            'uploader': result.get('uploader', ''),
            'detected_platform': result.get('platform', ''),
        }
    except Exception as e:
        error_msg = str(e)
        # 尝试解码错误消息
        try:
            error_msg = error_msg.encode('latin1').decode('gbk')
        except:
            pass

        return {
            'success': False,
            'platform': platform,
            'url': url,
            'error': error_msg[:200],
        }


def main():
    # 加载测试URL
    test_file = Path(__file__).parent / 'test_urls.txt'

    if not test_file.exists():
        print(f"错误: 找不到测试文件 {test_file}")
        print("请创建 test_urls.txt 文件并添加测试链接")
        return

    test_cases = load_test_urls(test_file)

    if not test_cases:
        print("没有找到测试链接")
        print("请在 test_urls.txt 中添加测试链接，格式: 平台名称 | URL")
        return

    print("=" * 100)
    print(f"平台解析测试 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 100)
    print(f"\n找到 {len(test_cases)} 个测试链接\n")

    results = []
    success_count = 0

    for i, test_case in enumerate(test_cases, 1):
        platform = test_case['platform']
        url = test_case['url']

        print(f"\n[{i}/{len(test_cases)}] 测试 {platform}")
        print(f"URL: {url[:80]}...")
        print("-" * 100)

        result = test_url(platform, url)
        results.append(result)

        if result['success']:
            success_count += 1
            print(f"状态: 成功")
            print(f"标题: {result['title']}")
            print(f"检测平台: {result['detected_platform']}")
            print(f"格式数: {result['formats_count']}")
            print(f"时长: {result['duration']}秒" if result['duration'] else "时长: N/A")
            print(f"上传者: {result['uploader']}" if result['uploader'] else "")
        else:
            print(f"状态: 失败")
            print(f"错误: {result['error']}")

    # 总结
    print("\n" + "=" * 100)
    print("测试总结")
    print("=" * 100)
    print(f"总测试数: {len(test_cases)}")
    print(f"成功: {success_count}")
    print(f"失败: {len(test_cases) - success_count}")
    print(f"成功率: {(success_count / len(test_cases) * 100):.1f}%")

    # 成功的平台
    if success_count > 0:
        print("\n成功的平台:")
        for r in results:
            if r['success']:
                print(f"  - {r['platform']} ({r['detected_platform']})")

    # 失败的平台
    failed_count = len(test_cases) - success_count
    if failed_count > 0:
        print("\n失败的平台:")
        for r in results:
            if not r['success']:
                print(f"  - {r['platform']}: {r['error'][:80]}")

    # 保存详细结果
    output_file = Path(__file__).parent / 'test_results.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total': len(test_cases),
            'success': success_count,
            'failed': failed_count,
            'results': results
        }, f, ensure_ascii=False, indent=2)

    print(f"\n详细结果已保存到: {output_file}")


if __name__ == '__main__':
    main()
