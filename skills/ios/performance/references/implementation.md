# iOS Performance Implementation

## Lightweight Cells

```swift
func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "ItemCell", for: indexPath) as! ItemCell
    let item = items[indexPath.row]

    // POSITIVE: Simple assignment. Heavy processing should be in ViewModel.
    cell.configure(with: item)
    return cell
}
```

## Background Processing (Modern Swift)

```swift
func handleHeavyData() async {
    // 1. Move to background actor or detached task
    let result = await Task.detached(priority: .background) {
        return self.performHeavyCalculation()
    }.value

    // 2. Update UI on MainActor
    await MainActor.run {
        self.updateUI(with: result)
    }
}
```

## Using Instruments (Checklist)

1. **Memory Growth**: Select _Allocations_, hit record, and monitor the _Persistent_ column.
2. **Leaks**: Select _Leaks_, hit record. Red spikes indicate actual leaks (missing `[weak self]`).
3. **Stalls**: Select _Time Profiler_, look for heavy stack traces with the Main Thread icon.
