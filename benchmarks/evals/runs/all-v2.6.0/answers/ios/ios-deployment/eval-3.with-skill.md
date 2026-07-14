A quick-start setup is Fastlane + Match so signing and deployment stay automated.

`Fastfile`

```ruby
default_platform(:ios)

platform :ios do
  desc "Push a new beta build to TestFlight"
  lane :beta do
    setup_ci
    match(type: "appstore")
    increment_build_number(xcodeproj: "App.xcodeproj")
    build_app(scheme: "App")
    upload_to_testflight(skip_waiting_for_build_processing: true)
  end

  desc "Push a new release to the App Store"
  lane :release do
    match(type: "appstore")
    build_app(scheme: "App")
    upload_to_app_store(submit_for_review: false)
  end
end
```

`Matchfile`

```ruby
git_url("git@github.com:org/certificates-repo.git")
storage_mode("git")
type("appstore")
app_identifier(["com.app.bundle"])
username("apple-id@org.com")
```

If your app does not use non-exempt encryption, set this in `Info.plist`:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

Typical usage:

```bash
bundle exec fastlane ios beta
bundle exec fastlane ios release
```

This gives you centralized signing with Match, automatic build-number bumps, and separate lanes for TestFlight and App Store delivery.

