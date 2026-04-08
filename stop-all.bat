@echo off
echo ===================================
echo    SparkBin 一键停止脚本
echo ===================================
echo.

echo 停止所有 Node 和 Python 进程...

taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM python3.exe /T 2>nul

echo.
echo 所有服务已停止！
echo.
pause
