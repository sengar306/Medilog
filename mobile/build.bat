@echo off
setlocal

:: Force Node 20 to be the first in PATH and remove global node 14 references
set "PATH=C:\Users\vivek\AppData\Local\nvm\v20.20.2;C:\Users\vivek\AppData\Local\nvm\v20.20.2\node_modules\npm\bin;%PATH%"
:: Remove the Node 14 Program Files folder from PATH to prevent override
set "PATH=%PATH:C:\Program Files\nodejs\=%"

if "%1"=="login" (
    echo Logging in to Expo...
    node node_modules\eas-cli\bin\run login
    goto end
)

if "%1"=="build" (
    echo Triggering EAS Android APK build...
    node node_modules\eas-cli\bin\run build -p android --profile preview
    goto end
)

if "%1"=="run" (
    echo Setting up environment variables...
    set "JAVA_HOME=%~dp0jdk17"
    set "ANDROID_HOME=C:\Users\vivek\AppData\Local\Android\Sdk"
    set "PATH=%~dp0jdk17\bin;C:\Users\vivek\AppData\Local\Android\Sdk\platform-tools;%PATH%"
    echo Running app on Android...
    npx expo run:android
    goto end
)

if "%1"=="release" (
    echo Setting up environment variables...
    set "JAVA_HOME=%~dp0jdk17"
    set "ANDROID_HOME=C:\Users\vivek\AppData\Local\Android\Sdk"
    set "PATH=%~dp0jdk17\bin;C:\Users\vivek\AppData\Local\Android\Sdk\platform-tools;%PATH%"
    echo Building local release APK...
    cd android
    call gradlew.bat assembleRelease
    cd ..
    echo.
    echo Release APK generated at: mobile\android\app\build\outputs\apk\release\app-release.apk
    goto end
)

echo.
echo MediLog Build Helper
echo ====================
echo Usage:
echo   build.bat run      - Run the app locally on your connected phone/emulator
echo   build.bat release  - Build a local Release APK (packages JS code offline)
echo   build.bat login    - Log in to your Expo account
echo   build.bat build    - Start the EAS Cloud APK build
echo.

:end
endlocal
