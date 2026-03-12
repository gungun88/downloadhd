# Cookies 管理说明

本项目使用分平台的 cookies 管理方式，每个平台的 cookies 独立存储，方便维护和更新。

## 目录结构

```
backend/cookies/
├── README.md          # 本说明文件
├── instagram.txt      # Instagram cookies
├── youtube.txt        # YouTube cookies
├── tiktok.txt         # TikTok cookies
├── twitter.txt        # Twitter/X cookies
├── facebook.txt       # Facebook cookies
├── reddit.txt         # Reddit cookies
├── douyin.txt         # 抖音 cookies
└── kuaishou.txt       # 快手 cookies
```

## 如何获取 Cookies

### 方法 1：使用浏览器扩展（推荐）

1. 安装浏览器扩展：**Get cookies.txt LOCALLY**
   - Chrome: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/

2. 登录目标平台（建议使用小号）

3. 在该平台页面点击扩展图标，导出 cookies

4. 将导出的内容保存为对应的文件名（如 `instagram.txt`），放在本目录下

5. 重启后端服务

### 方法 2：使用 yt-dlp 自动导出

```bash
# 使用浏览器 cookies 导出（需要先登录浏览器）
yt-dlp --cookies-from-browser chrome --cookies cookies/youtube.txt "https://www.youtube.com/watch?v=xxxxx"
```

## 各平台说明

### Instagram
- **必需**：Instagram 图片/视频下载必须使用 cookies
- 文件：`instagram.txt`
- 建议使用小号，避免主账号被限制

### YouTube
- **可选**：大部分视频不需要，但某些受限内容需要
- 文件：`youtube.txt`
- 可以提高下载成功率

### TikTok
- **部分需要**：某些内容需要登录才能访问
- 文件：`tiktok.txt`

### Twitter/X
- **部分需要**：受保护的推文需要
- 文件：`twitter.txt`

### Reddit
- **部分需要**：NSFW 内容需要（需设置 `over18=1`）
- 文件：`reddit.txt`

### 抖音/快手
- **建议配置**：国内平台通常需要登录
- 文件：`douyin.txt` / `kuaishou.txt`

## Cookie 文件格式

所有 cookies 文件使用 Netscape HTTP Cookie File 格式：

```
# Netscape HTTP Cookie File
.instagram.com	TRUE	/	TRUE	1234567890	sessionid	xxxxx
.instagram.com	TRUE	/	TRUE	1234567890	csrftoken	xxxxx
```

## 注意事项

1. **使用小号**：不要用主账号，避免被封号
2. **定期更新**：Cookies 会过期（通常 30-90 天），过期后重新导出即可
3. **只读操作**：本项目只用于读取内容，不会进行任何操作（点赞、关注等）
4. **频率限制**：已添加请求频率限制，降低封号风险
5. **安全性**：不要将 cookies 文件提交到公开仓库

## 自动选择机制

系统会根据 URL 自动选择对应平台的 cookies 文件：
- `youtube.com` / `youtu.be` → `youtube.txt`
- `instagram.com` → `instagram.txt`
- `tiktok.com` → `tiktok.txt`
- `twitter.com` / `x.com` → `twitter.txt`
- 等等...

无需手动指定，系统会自动匹配。
