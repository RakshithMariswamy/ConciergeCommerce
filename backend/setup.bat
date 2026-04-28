@echo off
REM Backend Setup Script for Concierge Commerce LLM Proxy (Windows)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     Concierge Commerce - LLM Proxy Backend Setup           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js detected: %NODE_VERSION%
echo.

REM Navigate to backend directory
cd backend

REM Install dependencies
echo 📦 Installing backend dependencies...
call npm install

echo.
echo ✅ Backend setup complete!
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    Next Steps                              ║
echo ╠════════════════════════════════════════════════════════════╣
echo ║                                                            ║
echo ║  1. Configure your API keys:                              ║
echo ║     copy .env.example .env                                ║
echo ║     # Edit .env and add your API keys                     ║
echo ║                                                            ║
echo ║  2. Start the backend server:                             ║
echo ║     npm start                                             ║
echo ║     # Should see: LLM Proxy Server started...             ║
echo ║                                                            ║
echo ║  3. Configure frontend .env:                              ║
echo ║     VITE_LLM_PROXY_URL=http://localhost:3001/api/llm      ║
echo ║     VITE_LLM_PROVIDER=gemini                              ║
echo ║                                                            ║
echo ║  4. Start the frontend (in another terminal):             ║
echo ║     npm run dev                                           ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
pause
