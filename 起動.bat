@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo 動画ギャラリーサーバーを起動中...
echo ========================================
echo.

python server.py

pause
