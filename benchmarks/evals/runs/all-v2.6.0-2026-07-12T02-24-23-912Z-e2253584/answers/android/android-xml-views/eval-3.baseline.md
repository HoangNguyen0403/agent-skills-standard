# Flatten the XML hierarchy with ConstraintLayout

For a deeply nested XML screen, use a `ConstraintLayout` as the parent and express relationships with constraints rather than wrapping views in many `LinearLayout`s. This can reduce measure/layout passes and makes relationships such as alignment, equal sizing, margins, chains, guidelines, and barriers explicit.

For example, instead of nesting a vertical layout inside a horizontal layout just to place a title and subtitle beside an image, use one `ConstraintLayout`:

```xml
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content">

    <ImageView
        android:id="@+id/avatar"
        android:layout_width="48dp"
        android:layout_height="48dp"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />

    <TextView
        android:id="@+id/title"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        app:layout_constraintStart_toEndOf="@id/avatar"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintTop_toTopOf="@id/avatar" />

    <TextView
        android:id="@+id/subtitle"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        app:layout_constraintStart_toStartOf="@id/title"
        app:layout_constraintEnd_toEndOf="@id/title"
        app:layout_constraintTop_toBottomOf="@id/title"
        app:layout_constraintBottom_toBottomOf="@id/avatar" />
</androidx.constraintlayout.widget.ConstraintLayout>
```

Also consider `<merge>` when including a layout whose root would otherwise add an unnecessary wrapper, and use `include` for reuse without copying XML. `include` improves reuse but does not itself flatten the runtime hierarchy. Avoid excessive `layout_weight` nesting, and do not optimize by guesswork: inspect the hierarchy with Layout Inspector and profile rendering/measure time first. A shallow hierarchy is useful, but a few simple nested layouts are usually preferable to a complicated set of constraints. For new screens, Jetpack Compose is another option, but within the XML View system `ConstraintLayout` is the usual first choice.

