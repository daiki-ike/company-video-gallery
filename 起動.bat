@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo 動画ギャラリーを起動します
echo アクセス: http://localhost:8000
echo ========================================
echo.

rem 1) PHPがあればPHPビルトインサーバーで起動（get-videos.phpが動作）
where php >nul 2>nul
if %errorlevel%==0 (
  echo PHP を検出: PHP サーバーで起動します...
  php -S localhost:8000
  goto :end
)

rem 2) PHPが無い場合はPythonの簡易サーバーで起動（config.jsで動作）
where python >nul 2>nul
if %errorlevel%==0 (
  echo PHP が見つからないため Python サーバーで起動します...
  echo get-videos.php は動かないため config.js から動画を読み込みます。
  python -m http.server 8000
  goto :end
)

echo エラー: PHP も Python も見つかりません。いずれかをインストールしてください。
pause

:end
