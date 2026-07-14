In Swift, use `async let` to start independent asynchronous tasks concurrently:

```swift
async let user = fetchUser()
async let posts = fetchPosts()

let (loadedUser, loadedPosts) = await (user, posts)
```

For throwing functions:

```swift
async let user = fetchUser()
async let posts = fetchPosts()

do {
    let (loadedUser, loadedPosts) = try await (user, posts)
    print(loadedUser, loadedPosts)
} catch {
    print("Loading failed:", error)
}
```

`async let` begins execution when the declaration is reached. The task’s result is retrieved with `await` (and `try await` if it can throw). Use it for independent operations; dependent work should remain sequential:

```swift
let user = try await fetchUser()
let profile = try await fetchProfile(for: user.id)
```
