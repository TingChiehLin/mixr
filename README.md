# 🧠 Safe Sessions

**Safe Sessions** is a harm-reduction mobile app built with **React Native + Expo**.  
It helps users **plan, track, and learn** about safer substance use sessions through friendly UI and educational content.

---

## ✨ Features

- 🗓️ Create and save session plans (primary + secondary substances)  
- ⚖️ View risk levels (Safe / Caution / Dangerous / Unsafe)  
- 📘 Log past sessions and delete them anytime  
- ⏱️ Track active sessions in real-time  
- 💡 Learn about harm-reduction practices  
- 💾 Local storage with AsyncStorage (data stays on your device)

---

## 🛠️ Tech Stack

- [React Native](https://reactnative.dev/) (Expo)
- [TypeScript](https://www.typescriptlang.org/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [AsyncStorage](https://github.com/react-native-async-storage/async-storage)

---

## 🚀 Getting Started

### 1. Clone the project

```bash
git clone https://github.com/yourusername/safe-sessions.git
cd safe-sessions
```

### 2. Install dependencies

```
npm install
# or
yarn install
```

### 3. Run the app

```
npx expo start
```

Then:
- Press i to open the iOS simulator (macOS only)
- Press a to open the Android emulator
- Or scan the QR code with the Expo Go app on your phone

### 📱 Build for production

If you want to build the real app:

```
npx eas build -p android
# or
npx eas build -p ios
```
Make sure you have an Expo,account and EAS CLI installed.

