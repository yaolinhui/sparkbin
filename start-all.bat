@echo off
chcp 65001 >nul
echo ===================================
echo    SparkBin 一键启动脚本
echo ===================================
echo.

:: 设置环境变量，禁用代理
set HTTP_PROXY=
set HTTPS_PROXY=

:: 启动后端
echo [1/2] 启动后端服务...
cd /d "%~dp0backend"
set "PY_CMD="
where python >nul 2>nul
if %errorlevel%==0 (
    set "PY_CMD=python"
) else (
    where py >nul 2>nul
    if %errorlevel%==0 (
        set "PY_CMD=py -3"
    ) else (
        echo [错误] 未找到可用的 Python 解释器（python/py）。
        echo 请先安装 Python 3.11+，然后重试。
        pause
        exit /b 1
    )
)
echo 使用后端解释器: %PY_CMD%
start "Backend" cmd /k "%PY_CMD% start.py"

:: 等待后端启动
timeout /t 5 /nobreak >nul

:: 启动前端
echo [2/2] 启动前端服务...
cd /d "%~dp0frontend"
start "Frontend" cmd /k "npm run dev"

echo.
echo ===================================
echo    服务启动完成！
echo ===================================
echo.
echo 后端: http://localhost:8000
echo API文档: http://localhost:8000/docs
echo 前端: http://localhost:5181 (自动分配)
echo.
echo 首次使用请通过注册页面创建账号，或在 .env 中配置管理员凭据
echo.
echo 按任意键关闭此窗口（不会关闭服务）
pause >nul
