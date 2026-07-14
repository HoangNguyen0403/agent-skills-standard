# Replace `notifyDataSetChanged()` with `ListAdapter`

Use `ListAdapter`, which wraps `AsyncListDiffer`, and describe how items are identified and when their contents changed. Submit each new snapshot with `submitList()`:

```kotlin
data class Post(
    val id: Long,
    val title: String,
)

class PostAdapter(
    private val onClick: (Post) -> Unit,
) : ListAdapter<Post, PostAdapter.ViewHolder>(DIFF_CALLBACK) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemPostBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false,
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ViewHolder(
        private val binding: ItemPostBinding,
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(post: Post) {
            binding.title.text = post.title
            binding.root.setOnClickListener { onClick(post) }
        }
    }

    companion object {
        private val DIFF_CALLBACK = object : DiffUtil.ItemCallback<Post>() {
            override fun areItemsTheSame(oldItem: Post, newItem: Post): Boolean =
                oldItem.id == newItem.id

            override fun areContentsTheSame(oldItem: Post, newItem: Post): Boolean =
                oldItem == newItem
        }
    }
}
```

Update the adapter with a new, preferably immutable list:

```kotlin
adapter.submitList(postsFromRepository)
```

`areItemsTheSame` answers whether two rows represent the same entity; `areContentsTheSame` answers whether that entity's rendered content is unchanged. `ListAdapter` computes the difference asynchronously and dispatches only the required insert, remove, move, and change operations, so there is no need for—and you should not call—`notifyDataSetChanged()`. Avoid mutating a list after submitting it; create a new snapshot when items change.

