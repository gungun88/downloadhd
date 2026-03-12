# Instagram 解析配置指南

## 问题说明

Instagram对未登录用户有严格限制，解析时会遇到以下错误：
- "内容不可用，该帖子可能需要登录才能访问"
- "平台返回空响应"
- "empty media response"

## 解决方案：配置Instagram Cookies

### 步骤1：安装浏览器扩展

安装 "Get cookies.txt LOCALLY" 扩展：
- Chrome: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
- Firefox: https://addons.mozilla.org/firefox/addon/cookies-txt/
- Edge: 在Chrome商店搜索并安装

### 步骤2：登录Instagram

1. 打开浏览器，访问 https://www.instagram.com
2. 登录你的Instagram账号（**强烈建议使用小号**）
3. 确保登录成功

### 步骤3：导出Cookies

1. 在Instagram页面，点击浏览器扩展图标
2. 点击 "Export" 或 "导出"
3. 复制导出的内容

### 步骤4：更新cookies.txt

1. 打开 `backend/cookies.txt` 文件
2. **删除现有的Instagram cookies**（避免冲突）
3. 将新导出的Instagram cookies内容追加到文件末尾
4. 保存文件

### 步骤5：重启后端服务

重启后端服务使配置生效。

## 必需的Cookies字段

Instagram解析至少需要以下cookies：
- **sessionid**: 最重要的会话标识（必需）
- **csrftoken**: CSRF token
- **ds_user_id**: 用户ID

当前cookies.txt中缺少 `sessionid`，这是导致解析失败的主要原因。

## 验证配置

配置完成后：
1. 重启后端服务
2. 尝试解析一个Instagram帖子
3. 如果成功解析，说明配置正确

## 重要提示

### 为什么必须使用小号？

1. **账号安全**: 使用主账号有被封禁的风险
2. **隐私保护**: 小号不包含个人重要信息
3. **易于管理**: 小号被封也不影响主账号

### 如何创建Instagram小号？

1. 使用临时邮箱注册（如 temp-mail.org）
2. 随便填写用户名和资料
3. 不需要添加好友或发帖
4. 只用于导出cookies

## 常见问题

### Q: Cookies多久需要更新？
A: 通常30-90天。如果解析失败，尝试重新导出cookies。

### Q: 会不会导致账号被封？
A: 使用小号并合理控制请求频率，风险很低。系统已有频率限制保护。

### Q: 为什么配置了cookies还是失败？
A: 可能的原因：
1. Cookies已过期，需要重新导出
2. 缺少sessionid（最常见）
3. Cookies格式不正确
4. 后端服务未重启
5. Instagram临时限制了该IP

### Q: 可以不配置cookies吗？
A: 不可以。Instagram对所有未登录访问都返回空响应，必须配置有效的登录cookies。

### Q: 其他平台也需要cookies吗？
A: 大部分平台不需要，但以下平台建议配置：
- **Instagram**: 必需（否则无法解析）
- **B站**: 强烈建议（否则经常失败）
- **YouTube**: 可选（高清视频需要）
- **Twitter**: 可选（部分内容需要）

## 技术说明

当前Instagram cookies状态：
- ✅ csrftoken: 已配置
- ✅ mid: 已配置
- ✅ ig_did: 已配置
- ❌ **sessionid: 缺失（必需）**

缺少sessionid是导致"empty media response"错误的根本原因。

## 快速检查

运行以下命令检查是否有sessionid：

```bash
grep "sessionid" backend/cookies.txt
```

如果没有输出，说明缺少sessionid，需要重新导出完整的cookies。
