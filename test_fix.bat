@echo off
echo ========================================
echo 视频下载站 - 修复测试
echo ========================================
echo.

echo [1/3] 检查后端服务...
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo 后端未运行，正在启动...
    start "Backend Server" cmd /k "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
    echo 等待后端启动...
    timeout /t 5 /nobreak >nul
) else (
    echo 后端已运行 ✓
)

echo.
echo [2/3] 检查前端服务...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo 前端未运行，正在启动...
    start "Frontend Server" cmd /k "npm run dev"
    echo 等待前端启动...
    timeout /t 5 /nobreak >nul
) else (
    echo 前端已运行 ✓
)

echo.
echo [3/3] 打开测试页面...
start http://localhost:3000
start test_download.html

echo.
echo ========================================
echo 测试说明：
echo 1. 在浏览器中粘贴 YouTube 视频链接
echo 2. 点击"解析"按钮
echo 3. 选择格式后点击"下载"
echo 4. 观察进度条是否正常显示
echo 5. 检查文件是否成功下载
echo ========================================
echo.
echo 按任意键关闭此窗口...
pause >nul
