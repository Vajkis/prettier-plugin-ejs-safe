@echo off
rem setup.bat (Windows)
rem Run once on a new machine:
rem
rem   setup.bat

setlocal

set "PLUGIN_NAME=prettier-plugin-ejs-safe"
set "CONFIG_PATH=%USERPROFILE%\.prettierrc"

echo.
echo Installing %PLUGIN_NAME%...
echo.

rem 1. Global install - prettier is installed automatically as a dependency
call npm install -g %PLUGIN_NAME%
if errorlevel 1 (
  echo.
  echo npm install failed - aborting.
  pause
  exit /b 1
)

rem 2. Dynamically resolve full plugin entry file path for this machine
for /f "delims=" %%i in ('npm root -g') do set "NPM_ROOT=%%i"
set "PLUGIN_PATH=%NPM_ROOT%\%PLUGIN_NAME%\index.js"
set "PLUGIN_PATH=%PLUGIN_PATH:\=/%"

rem 3. Write config (plain ASCII content, so plain redirection is fine - no BOM is ever added)
(
echo {
echo   "plugins": ["%PLUGIN_PATH%"],
echo   "printWidth": 120,
echo   "tabWidth": 2,
echo   "useTabs": false,
echo   "semi": true,
echo   "singleQuote": true,
echo   "quoteProps": "as-needed",
echo   "trailingComma": "none",
echo   "bracketSpacing": true,
echo   "bracketSameLine": true,
echo   "arrowParens": "always",
echo   "htmlWhitespaceSensitivity": "css",
echo   "singleAttributePerLine": false,
echo   "endOfLine": "lf",
echo   "embeddedLanguageFormatting": "auto",
echo   "ignoreTags": ["html", "body"],
echo   "overrides": [
echo     {
echo       "files": ["*.html", "*.ejs"],
echo       "options": {
echo         "printWidth": 99999
echo       }
echo     }
echo   ]
echo }
) > "%CONFIG_PATH%"

echo.
echo Config written to: %CONFIG_PATH%
echo Plugin path: %PLUGIN_PATH%
echo.
echo VS Code - add to User Settings (Ctrl+Shift+P -^> Open User Settings JSON):
echo.
echo   "prettier.configPath": "%CONFIG_PATH:\=\\%",
echo   "prettier.resolveGlobalModules": true,
echo   "[ejs]": {
echo     "editor.defaultFormatter": "esbenp.prettier-vscode"
echo   }
echo.
echo Done!
echo.
pause
