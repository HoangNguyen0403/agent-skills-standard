# iOS Deployment Implementation

## Fastlane Fastfile Example

```ruby
default_platform(:ios)

platform :ios do
  desc "Push a new beta build to TestFlight"
  lane :beta do
    setup_ci # If running on CI
    match(type: "appstore") # Sync certificates
    increment_build_number(xcodeproj: "App.xcodeproj")
    build_app(scheme: "App")
    upload_to_testflight
  end

  desc "Push a new release to the App Store"
  lane :release do
    match(type: "appstore")
    build_app(scheme: "App")
    upload_to_app_store(submit_for_review: false)
  end
end
```

## Matchfile Setup

```ruby
git_url("git@github.com:org/certificates-repo.git")
storage_mode("git")

type("appstore") # default: appstore, adhoc, development, enterprise

app_identifier(["com.app.bundle"])
username("apple-id@org.com")
```

## Info.plist Export Compliance

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

## Simple Beta Lane

```ruby
lane :beta do
  match(type: "appstore")
  increment_build_number
  build_app(scheme: "MyApp")
  upload_to_testflight(
    skip_waiting_for_build_processing: true
  )
end
```

## Matchfile (Minimal)

```ruby
# Matchfile
git_url("https://github.com/org/certificates")
type("appstore")
app_identifier("com.example.myapp")
```
