@echo off
chcp 65001 >nul
echo ========================================
echo 音频格式支持测试
echo ========================================
echo.

echo [测试] 检查后端服务...
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 后端未运行
    echo 请先运行: cd backend ^&^& python -m uvicorn main:app --reload
    pause
    exit /b 1
) else (
    echo ✅ 后端运行正常
)

echo.
echo [测试] 检查前端服务...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 前端未运行
    echo 请先运行: npm run dev
    pause
    exit /b 1
) else (
    echo ✅ 前端运行正常
)

echo.
echo ========================================
echo 测试步骤：
echo ========================================
echo.
echo 1. 打开浏览器访问 http://localhost:3000
echo.
echo 2. 测试YouTube音频：
echo    粘贴链接: https://www.youtube.com/watch?v=2WbwRwmDHlA
echo    点击"音频"模式
echo    点击"解析"
echo.
echo 3. 验证显示内容：
echo    ✓ 显示多种音频格式（M4A、WEBM）
echo    ✓ 显示音频编码标签（AAC、OPUS）
echo    ✓ 显示比特率（128kbps、160kbps等）
echo    ✓ 显示"仅音频"标签（紫色）
echo    ✓ 显示文件大小
echo.
echo 4. 测试下载：
echo    ✓ 点击任意格式的"下载"按钮
echo    ✓ 观察进度条是否正常显示
echo    ✓ 检查文件是否成功下载
echo    ✓ 使用播放器验证音频可以播放
echo.
echo ========================================
echo 预期结果：
echo ========================================
echo.
echo 音频格式示例：
echo ┌─────────────────────────────────────┐
echo │ M4A  AAC  128kbps  仅音频  1.2 MB  │
echo │ WEBM OPUS 160kbps  仅音频  1.5 MB  │
echo │ WEBM OPUS 70kbps   仅音频  650 KB  │
echo └─────────────────────────────────────┘
echo.
echo 标签颜色：
echo - 紫色：音频编码（AAC、OPUS）
echo - 蓝色：比特率（128kbps）
echo - 紫色：仅音频标签
echo.
echo ========================================
echo.

echo 按任意键打开浏览器开始测试...
pause >nul

start http://localhost:3000

echo.
echo 测试进行中...
echo 完成测试后按任意键关闭此窗口
pause >nul
