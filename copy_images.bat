@echo off
chcp 65001 > nul
echo デモ用画像をプロジェクトフォルダにコピーしています...

if not exist "images" mkdir images

copy "C:\Users\user\.gemini\antigravity\brain\e3db9725-a584-4069-8276-d385c101930d\*.png" "images\"

echo.
echo ==============================================
echo 画像のコピーが完了しました！
echo concept.html と index.html をブラウザで開き直すか、更新（リロード）してください。
echo ==============================================
pause
