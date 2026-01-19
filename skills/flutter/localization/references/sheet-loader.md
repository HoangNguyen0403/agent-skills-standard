# Google Sheets Localization Loader

Automating translation updates from Google Sheets using `sheet_loader_localization`.

## Configuration (`pubspec.yaml`)

```yaml
dev_dependencies:
  sheet_loader_localization: ^0.1.0

sheet_loader_localization:
  # Google Sheet ID (find in the URL of your sheet)
  doc_id: 'your_google_sheet_id_here'
  sheet_id: '0' # Usually 0 for first sheet
  output_path: 'assets/translations'
  output_format: 'json' # Can be csv or json
```

## Typical Sheet Format(<https://docs.google.com/spreadsheets/d/1v2Y3e0Uvn0JTwHvsduNT70u7Fy9TG43DIcZYJxPu1ZA/edit?gid=1013756643#gid=1013756643>)

| key            | en            | vi         |
| :------------- | :------------ | :--------- |
| welcome        | Welcome!      | Chào mừng! |
| login.button   | Login         | Đăng nhập  |
| errors.network | Network Error | Lỗi mạng   |

## CLI Command

Run this command to synchronize your local asset files with the Google Sheet:

```bash
flutter pub run sheet_loader_localization:main
```
