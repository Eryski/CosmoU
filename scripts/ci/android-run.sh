#!/bin/bash
# runs the Android test inside the emulator step and keeps everything it prints for the report
mkdir -p "$RUNNER_TEMP/e2e"
echo "adb devices: $(adb devices | tr '\n' ' ')" > "$RUNNER_TEMP/e2e/test.log"
APK=$(ls dist/CosmoU-Android-*.apk | head -1)
node scripts/ci/android-test.js "$APK" dist/cemu-stub.apk "$RUNNER_TEMP/e2e" >> "$RUNNER_TEMP/e2e/test.log" 2>&1
code=$?
echo "exit code $code" >> "$RUNNER_TEMP/e2e/test.log"
cat "$RUNNER_TEMP/e2e/test.log"
exit $code
