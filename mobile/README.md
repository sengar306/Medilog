# MediLog Mobile - React Native Client

MediLog Mobile is a cross-platform (Android/iOS) client for the **MediLog Pharmacy Management Platform**. It features high-speed barcode scanning, AI OCR invoice parser imports, offline POS queue synchronization, and direct WhatsApp invoice sharing.

---

## 🚀 Tech Stack Highlights
- **React Native & TypeScript** for type-safe native development.
- **Redux Toolkit & Redux Persist** for client-side state caching.
- **React Navigation** bottom tabs and nested stacks.
- **React Native Paper** for Google Material Design 3 guidelines.
- **React Native Vision Camera** for barcode scanners.
- **NetInfo & AsyncStorage** for offline billing queue sync.

---

## 🛠️ Local Development & Port Forwarding

On Android Emulators, `localhost` points to the emulator itself. To connect the mobile app to the backend Express server running on your host machine:

1. Connect your Android device via USB (with USB Debugging enabled) or start your Android Virtual Device (AVD) emulator.
2. Run the port-forwarding command to route network queries on port `5000` to your host machine:
   ```bash
   adb reverse tcp:5000 tcp:5000
   ```
3. Set your backend host domain in `mobile/src/api/apiClient.ts` if running on a custom LAN address (defaults to `http://10.0.2.2:5000` for default AVD configurations).

---

## 📦 Build Instructions (Android)

### 1. Setup Environment
Ensure you have the following installed:
- Node.js (v18 or v20 recommended)
- Java Development Kit (JDK 17)
- Android Studio & Android SDK (platform-tools, build-tools v34)

### 2. Install Dependencies
Run in the `mobile/` directory:
```bash
npm install
```

### 3. Run Android Emulator / Debug
Start the Metro bundler:
```bash
npm start
```
In a new terminal window, compile and launch the debug app:
```bash
npm run android
```

---

## 🏆 Production Release & APK Generation Guide

Follow these steps to generate a release-signed APK ready for testing or Google Play Console distribution:

### Step 1: Generate a Keystore File
Open your terminal and run the keytool command to generate a signing key:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```
Move the generated `my-upload-key.keystore` file to `mobile/android/app/` directory.

### Step 2: Configure Gradle Properties
Create/edit `mobile/android/gradle.properties` and add the variables:
```properties
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=your_keystore_password
MYAPP_UPLOAD_KEY_PASSWORD=your_key_password
```

### Step 3: Edit Gradle Build Config
Open `mobile/android/app/build.gradle` and add signing configurations:
```gradle
android {
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

### Step 4: Assemble the Release Build
Navigate to the `android/` directory and build the APK / Bundle:
- **For APK File (Testing / Sideloading):**
  ```bash
  cd android
  ./gradlew assembleRelease
  ```
  The generated APK will be available at:  
  `mobile/android/app/build/outputs/apk/release/app-release.apk`

- **For AAB File (Google Play Console Release):**
  ```bash
  cd android
  ./gradlew bundleRelease
  ```
  The generated App Bundle will be available at:  
  `mobile/android/app/build/outputs/bundle/release/app-release.aab`

---

## 📈 Google Play Launch Checklist
1. **App Permissions:** Verify `AndroidManifest.xml` has required tags for `<uses-permission android:name="android.permission.CAMERA" />` and `<uses-permission android:name="android.permission.INTERNET" />`.
2. **Proguard Enabled:** Minification is enabled in gradle build config to reduce package size and obfuscate code.
3. **Version Code:** Increment `versionCode` and `versionName` inside `android/app/build.gradle` for successive updates.
