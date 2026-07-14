Quick start:

1. Open Instruments and run Time Profiler to find CPU hot spots, then run Allocations and Leaks to catch memory growth and retain cycles.
2. Keep scrolling views cheap: use `dequeueReusableCell`, avoid heavy work in `cellForRowAt`, and cache remote images with something like Kingfisher or SDWebImage.
3. Move expensive parsing, formatting, and crypto off the main thread with GCD or Swift concurrency.
4. Use Xcode Analyze and treat warnings as errors in Release to catch issues earlier.

Example:

```swift
final class FeedViewController: UITableViewController {
    private var items: [FeedItem] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        loadItems()
    }

    private func loadItems() {
        Task.detached(priority: .userInitiated) {
            let data = try await API.fetchFeed()
            let decoded = try JSONDecoder().decode([FeedItem].self, from: data)

            await MainActor.run {
                self.items = decoded
                self.tableView.reloadData()
            }
        }
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "FeedCell", for: indexPath)
        cell.textLabel?.text = items[indexPath.row].title
        return cell
    }
}
```

Rule of thumb: profile first, fix the biggest hotspot, then re-measure.

