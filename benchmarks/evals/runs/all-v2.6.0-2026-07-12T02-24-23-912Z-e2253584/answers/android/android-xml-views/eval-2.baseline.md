# Use DiffUtil-backed list updates

`notifyDataSetChanged()` invalidates the whole visible list and prevents RecyclerView from knowing which rows were inserted, removed, moved, or changed. Prefer `ListAdapter`, which uses `DiffUtil` to calculate and dispatch only the necessary updates.

```kotlin
data class User(val id: Long, val name: String, val avatarUrl: String?)

class UserAdapter : ListAdapter<User, UserViewHolder>(DIFF) {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): UserViewHolder {
        val binding = RowUserBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return UserViewHolder(binding)
    }

    override fun onBindViewHolder(holder: UserViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<User>() {
            override fun areItemsTheSame(oldItem: User, newItem: User): Boolean =
                oldItem.id == newItem.id

            override fun areContentsTheSame(oldItem: User, newItem: User): Boolean =
                oldItem == newItem
        }
    }
}
```

Submit a new list when data changes:

```kotlin
adapter.submitList(updatedUsers)
```

Do not mutate the list currently submitted to the adapter and then resubmit the same instance. Create a new immutable list, for example `adapter.submitList(updatedUsers.toList())`; otherwise the diff may not observe the change. In a `ViewModel`, expose a `StateFlow`/`LiveData` of lists and submit each newly emitted list from the UI layer.

For an existing custom `RecyclerView.Adapter`, use `DiffUtil.calculateDiff(...)` and dispatch the returned updates, or use `AsyncListDiffer` directly. For a small, explicitly known single change, targeted calls such as `notifyItemInserted`, `notifyItemRemoved`, or `notifyItemChanged` are also appropriate. Use `notifyDataSetChanged()` only when the entire data set has changed and no more precise update is practical.

