# Advanced Fastlane Standards

Automates signing, build versioning, flavors, and multi-channel distribution (Firebase vs. Stores).

## Prerequisites

1. **Versioning**: Use `flutter_version` or `cider` to sync Fastlane with `pubspec.yaml`.
2. **Firebase**: Install plugin: `bundle exec fastlane add_plugin firebase_app_distribution`.
3. **Flavors**: Ensure your Flutter app is set up with Flavors (e.g., `dev`, `prod` schemes).

## Android Configuration (`android/fastlane/Fastfile`)

Supported lanes:

- `staging`: Builds `dev` flavor -> Firebase App Distribution.
- `prod`: Builds `prod` flavor -> Play Store (Internal Track).

```ruby
default_platform(:android)

platform :android do
  # Helper: Read version from pubspec
  def load_version
    # Requires: gem install yaml
    require 'yaml'
    pubspec = YAML.load_file("../../pubspec.yaml")
    return pubspec['version'].split('+') # Returns [version, build]
  end

  desc "Deploy Staging to Firebase"
  lane :staging do
    version_name, version_code = load_version

    # 1. Build APK (Flavor: Dev, Type: Release)
    gradle(
      task: "assemble",
      flavor: "Dev",
      build_type: "Release",
      properties: {
        "android.injected.version.code" => version_code,
        "android.injected.version.name" => version_name
      }
    )

    # 2. Upload to Firebase
    firebase_app_distribution(
      app: ENV["FIREBASE_APP_ID_ANDROID_DEV"],
      groups: "qa-team",
      release_notes: "Staging Build v#{version_name} (#{version_code})"
    )
  end

  desc "Deploy Production to Play Store"
  lane :prod do
    version_name, version_code = load_version

    # 1. Build Bundle (Flavor: Prod)
    gradle(
      task: "bundle",
      flavor: "Prod",
      build_type: "Release",
      properties: {
        "android.injected.version.code" => version_code,
        "android.injected.version.name" => version_name
      }
    )

    # 2. Upload to Play Store
    upload_to_play_store(
      track: "internal",
      json_key: ENV["PLAY_STORE_JSON_KEY_FILE"],
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end
end
```

## iOS Configuration (`ios/fastlane/Fastfile`)

Supported lanes:

- `staging`: Builds `Dev` Scheme -> Firebase (AdHoc).
- `prod`: Builds `Prod` Scheme -> TestFlight (AppStore).

**Note**: Creates separate `Matchfile` logic for AdHoc vs AppStore.

```ruby
default_platform(:ios)

platform :ios do
  before_all do
    setup_ci if ENV['CI']
  end

  desc "Deploy Staging to Firebase (AdHoc)"
  lane :staging do
    # 1. Sync Signing (AdHoc for restricted devices)
    match(type: "adhoc", app_identifier: "com.example.app.dev", readonly: is_ci)

    # 2. Build IPA (Scheme: Dev)
    build_app(
      scheme: "Dev",
      export_method: "ad-hoc",
      include_bitcode: false
    )

    # 3. Upload to Firebase
    firebase_app_distribution(
      app: ENV["FIREBASE_APP_ID_IOS_DEV"],
      groups: "qa-team"
    )
  end

  desc "Deploy Production to TestFlight"
  lane :prod do
    # 1. Sync Signing (AppStore)
    match(type: "appstore", app_identifier: "com.example.app", readonly: is_ci)

    # 2. Build IPA (Scheme: Prod)
    build_app(
      scheme: "Prod",
      export_method: "app-store"
    )

    # 3. Upload to TestFlight
    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )
  end
end
```

## Setup Checklist

1. **Google Play Key**: Define `PLAY_STORE_JSON_KEY_FILE`.
2. **Match Repo**: Ensure `git_url` in `Matchfile` points to your private cert repo.
3. **Firebase CLI**: Ensure firebase-tools is installed or the plugin authenticated via `FIREBASE_TOKEN`.
