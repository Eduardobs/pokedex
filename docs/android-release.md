# Android releases

The confirmed Android application name is **Atlas Pokémon** and its application ID is `app.atlaspokemon.android`. A Google Play Console developer account is already available.

## GitHub Actions

The **Android build** workflow validates the web application and builds a debug APK on pull requests and pushes to `main` or `master`. Download the APK from the workflow run's **Artifacts** section. Artifacts expire after 14 days. This does not publish to Google Play.

A `v*` tag additionally generates a signed release AAB after the debug build passes. The tag must match `package.json` (for example, version `0.0.9` requires `v0.0.9`). You can also run the workflow manually with **Generate a signed release bundle** enabled. A manual build uses the selected ref and its package version.

The workflow uses `github.run_number` as `versionCode`. Keep this workflow and its run counter when publishing updates. If a version code has already been uploaded from another process, ensure the next run number exceeds it before uploading. Re-running the same workflow run reuses its version code; a new upload with changed binaries needs a new run. The visible version comes from `package.json`.

## Upload key and secrets

The local upload key has been created in `.android-signing/atlas-upload.jks`, with alias `atlas-upload`. Its passwords and absolute key path are stored in `.android-signing/credentials.env`; its public certificate is `.android-signing/upload-certificate.pem`. The entire directory is ignored by Git and restricted to the local user. Keep an encrypted backup of this directory outside the repository before the first upload. Never commit or share the credentials file.

To use this existing key locally, load its environment variables without printing them:

```bash
source .android-signing/credentials.env
JAVA_HOME=/opt/android-studio/jbr ANDROID_HOME="$HOME/Android/Sdk" npm run android:bundle
```

This builds with the default version code 1, intended for the first upload only. Use an explicit increasing version code for updates as described below. If the repository is moved, update `ANDROID_KEYSTORE_PATH` in the private environment file. A fresh clone will not contain the signing directory: restore the backup rather than creating a replacement key for an existing release.

For a separate app without an existing key, Android Studio's **Build → Generate Signed Bundle / APK → Android App Bundle → Create new** can create an upload keystore. Do not recreate the key for this app. A debug keystore is not an upload key. With Play App Signing, Google manages the distribution signing key and the upload key authenticates your uploads.

In GitHub, create the `android-release` environment under **Settings → Environments**. Configure its deployment branch/tag restrictions for your release refs, and add these environment secrets:

| Secret                      | Value                                  |
| --------------------------- | -------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | Base64 contents of the upload keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password                      |
| `ANDROID_KEY_ALIAS`         | Upload key alias                       |
| `ANDROID_KEY_PASSWORD`      | Upload key password                    |

On Linux, `base64 -w 0 /path/to/upload.jks` produces the value for the first secret. Paste it directly into GitHub's secret field; do not add it to source files, issues, chat, or logs. Base64 is an encoding, not encryption.

The signing step reconstructs the key in the runner's temporary directory, signs the bundle, and removes the temporary key on exit. Only the AAB is uploaded as an artifact. Missing or incomplete signing configuration fails with an explicit error. Debug builds do not require release secrets.

## Local signed build

Export these variables in a private terminal session or load them through your password manager:

- `ANDROID_KEYSTORE_PATH`: absolute path to the upload keystore
- `ANDROID_KEYSTORE_PASSWORD`: keystore password
- `ANDROID_KEY_ALIAS`: upload key alias
- `ANDROID_KEY_PASSWORD`: key password

Then run:

```bash
npm run android:sync
cd android
./gradlew bundleRelease -PversionCode=2
```

Choose an unused, increasing version code. Output: `android/app/build/outputs/bundle/release/app-release.aab`. `npm run android:bundle` is a convenience command using the default version code 1; use the explicit Gradle command above for subsequent uploads. Release assembly refuses to run without all signing variables.

## First Google Play submission

Before uploading the first bundle:

1. Use the confirmed application ID (`app.atlaspokemon.android`) and display name (**Atlas Pokémon**). The application ID becomes the permanent store identity.
2. Replace the default Capacitor launcher icons and splash screen, prepare store screenshots, and verify use rights for third-party artwork, maps, models, and trademarks.
3. Create the app in Play Console and enroll in Play App Signing.
4. Provide the store listing, contact information, a public privacy policy, Data safety declaration, content rating, target audience, and other declarations requested by the console. Review actual app/network behavior before answering these declarations.
5. Upload the signed AAB to internal testing, install the Play-delivered app, and verify upgrade persistence for favorites, teams, language, and theme. A Play build can have a different signing certificate from the local debug APK, so test migration between Play builds rather than installing over a debug APK.
6. Complete the testing and production-access requirements shown for your developer account, then submit for review.

Uploading and publishing to Google Play are not enabled by this workflow yet. After the app and developer account are ready, configure Google Play Developer API access with an app-scoped service account and add an upload stage targeting internal testing before enabling production releases.

References: [Android app signing](https://developer.android.com/studio/publish/app-signing), [GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets), [Google Play Developer API setup](https://developers.google.com/android-publisher/getting_started).
