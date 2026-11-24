@echo off
chcp 65001 >nul
title FinJava Senior Academy - Local & Wi-Fi Server (Port 8899)
echo =====================================================================
echo   FINJAVA SENIOR ACADEMY - DANG KHOI DONG SERVER TAI CONG 8899...
echo   Giu cua so nay mo khi hoc (Co the thu nho xuong thanh Taskbar).
echo =====================================================================
start "" "http://127.0.0.1:8899"
node "%~dp0server.js"
pause
