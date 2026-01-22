# Control Flow

## Conditional (@if)

```html
@if (user(); as u) {
<app-profile [user]="u" />
} @else if (loading()) {
<app-spinner />
} @else {
<p>No user found</p>
}
```

## Loop (@for)

ALWAYS provide a tracking function.

```html
@for (item of items(); track item.id) {
<app-item [item]="item" />
} @empty {
<p>List is empty</p>
}
```

## Switch (@switch)

```html
@switch (status()) { @case ('active') { <span class="badge">Active</span> }
@case ('pending') { <span class="badge">Pending</span> } @default {
<span class="badge">Unknown</span> } }
```
