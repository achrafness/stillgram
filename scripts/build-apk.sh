#!/usr/bin/env bash
# Builds the Stillgram release APK.
#
# Wraps the toolchain this machine needs: a standalone JDK 21 (the system Java is a JRE with
# no javac) and the command-line Android SDK. Heap, worker count and the arm64-only ABI live
# in android/gradle.properties — note `expo prebuild` regenerates that file and drops them.
set -euo pipefail

cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

export ANDROID_HOME="$HOME/Android/Sdk"
JAVA_HOME="$(ls -d "$HOME"/.jdks/jdk-21* | head -1)"
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"
export NODE_ENV=production

cd "$PROJECT_ROOT/android"
./gradlew assembleRelease --console=plain

cp "$PROJECT_ROOT/android/app/build/outputs/apk/release/app-release.apk" \
  "$PROJECT_ROOT/Stillgram-v1.0.0.apk"
echo "APK ready: $PROJECT_ROOT/Stillgram-v1.0.0.apk"
