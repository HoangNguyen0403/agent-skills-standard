# Common Mobile UX Core: Quick Start

Here is a compact Flutter-style pattern for an inset-safe form with accessible controls and keyboard-aware scrolling:

```dart
Scaffold(
  body: SafeArea(
    child: SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          TextField(
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(labelText: 'Email'),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: submit,
              child: const Text('Continue'),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    ),
  ),
);
```

Why this is a good baseline:

- `SafeArea` prevents content from colliding with system UI.
- `SingleChildScrollView` lets the form move above the keyboard; in a larger form, ensure the focused field is explicitly scrolled into view if needed.
- The button is 48 dp high, meeting the Android minimum and providing a comfortable touch target.
- The email keyboard and `next` action are configured for the field’s purpose.
- Body text should remain at least 16 sp with comfortable line height, and the screen should be tested with large accessibility text.

For an icon-only action, keep the icon visually small if desired but wrap it in an `IconButton` or equivalent hit area with at least 44 pt/48 dp, and use a pressed state plus optional brief haptic feedback.

