@echo off
chcp 65001 >nul
title FinJava Senior Academy - Day Website Len Online
echo =====================================================================
echo   FINJAVA SENIOR ACADEMY - DAY WEBSITE LEN ONLINE MIEN PHI
echo =====================================================================
echo.
echo Chon nen tang ban muon xuat ban de lay link HTTPS dung o moi noi:
echo   [1] Vercel (Khuyen nghi - ten mien https://ten-du-an.vercel.app)
echo   [2] Surge.sh (Cuc nhanh qua email - https://finjava-senior.surge.sh)
echo   [3] Cloudflare Pages (Toc do CDN toan cau sieu muot)
echo   [4] Mo trinh duyet Netlify Drop (Keo tha thu muc 10 giay khong can CLI)
echo.
set /p choice="Nhap lua chon cua ban (1/2/3/4): "

if "%choice%"=="1" (
  echo Dang khoi chay Vercel Deploy...
  call npx.cmd vercel --prod
  pause
  exit /b
)
if "%choice%"=="2" (
  echo Dang khoi chay Surge Deploy...
  call npx.cmd surge "%~dp0"
  pause
  exit /b
)
if "%choice%"=="3" (
  echo Dang khoi chay Cloudflare Wrangler Pages Deploy...
  call npx.cmd wrangler pages deploy "%~dp0" --project-name=finjava-senior-academy
  pause
  exit /b
)
if "%choice%"=="4" (
  start https://app.netlify.com/drop
  explorer "%~dp0.."
  echo Hay keo nguyen thu muc "java-banking-academy" tha vao cua so Netlify Drop vua mo!
  pause
  exit /b
)

echo Lua chon khong hop le.
pause
