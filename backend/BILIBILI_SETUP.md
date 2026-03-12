# B站视频解析配置指南

## 问题说明

B站（Bilibili）对视频访问有严格的反爬虫机制，未登录用户或频繁访问会遇到以下错误：
- "访问受限，请稍后重试"
- "平台返回异常响应"
- HTTP 412 错误

## 解决方案

### 方案一：配置B站Cookies（推荐）

#### 步骤1：安装浏览器扩展

安装 "Get cookies.txt LOCALLY" 扩展：
- Chrome: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
- Firefox: https://addons.mozilla.org/firefox/addon/cookies-txt/
- Edge: 在Chrome商店搜索并安装

#### 步骤2：登录B站

1. 打开浏览器，访问 https://www.bilibili.com
2. 登录你的B站账号（建议使用小号，不要用主账号）
3. 确保登录成功

#### 步骤3：导出Cookies

1. 在B站页面，点击浏览器扩展图标
2. 点击 "Export" 或 "导出"
3. 复制导出的内容

#### 步骤4：更新cookies.txt

1. 打开 `backend/cookies.txt` 文件
2. 将导出的B站cookies内容追加到文件末尾
3. 保存文件

#### 步骤5：重启后端服务

重启后端服务使配置生效。

### 方案二：等待重试

如果不想配置cookies，可以：
1. 等待一段时间（10-30分钟）后重试
2. 更换网络环境（如切换WiFi或使用移动网络）
3. 尝试解析其他平台的视频

## 必需的Cookies字段

B站解析至少需要以下cookies：
- **SESSDATA**: 最重要的会话标识
- **bili_jct**: CSRF token
- **DedeUserID**: 用户ID

## 验证配置

配置完成后，可以通过以下方式验证：

1. 重启后端服务
2. 尝试解析一个B站视频
3. 如果成功解析，说明配置正确

## 常见问题

### Q: Cookies多久需要更新？
A: 通常30-90天，具体取决于B站的策略。如果解析失败，尝试更新cookies。

### Q: 会不会导致账号被封？
A: 使用小号并合理控制请求频率，风险很低。建议：
- 使用专门的小号
- 不要频繁请求（已有频率限制）
- 定期更新cookies

### Q: 为什么配置了cookies还是失败？
A: 可能的原因：
1. Cookies已过期，需要重新导出
2. Cookies格式不正确
3. B站临时限制了该IP
4. 后端服务未重启

### Q: 其他平台也需要cookies吗？
A: 大部分平台不需要，但以下平台建议配置：
- YouTube（高清视频）
- Instagram（私密内容）
- Twitter（部分内容）

## 技术说明

当前配置：
- User-Agent: 已配置为Chrome浏览器
- Referer: 已配置为B站域名
- HTTP Headers: 已添加完整的浏览器请求头
- 地理位置: 已设置为中国

这些配置可以绕过部分限制，但对于B站的严格验证，仍然建议配置cookies。
