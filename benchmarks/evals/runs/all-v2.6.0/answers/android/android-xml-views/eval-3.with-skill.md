# Flatten the XML with `ConstraintLayout`

For a complex screen, replace the nested `LinearLayout` tree with one flat `ConstraintLayout`. Position views using constraints, chains, guidelines, or barriers instead of adding wrapper containers. A `0dp` dimension means “match the available space defined by the constraints.”

For example, a title, subtitle, and action can be laid out without nested rows or columns:

```xml
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:padding="16dp">

    <TextView
        android:id="@+id/title"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:text="Title"
        android:textAppearance="@style/TextAppearance.AppCompat.Title"
        app:layout_constraintEnd_toStartOf="@id/action"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />

    <TextView
        android:id="@+id/subtitle"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:text="Supporting text"
        app:layout_constraintEnd_toStartOf="@id/action"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toBottomOf="@id/title" />

    <Button
        android:id="@+id/action"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Open"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintTop_toTopOf="parent" />

</androidx.constraintlayout.widget.ConstraintLayout>
```

The exact constraints should reflect the design: use a vertical chain for evenly distributed content, a guideline for a shared alignment edge, and a barrier when one view's dynamic height or width must determine another view's position. Keep a single `LinearLayout` for a genuinely simple one-dimensional group if it is clearer, but avoid repeatedly nesting `LinearLayout` inside `LinearLayout`; deep hierarchies increase measure/layout work and make maintenance harder. Ensure the module includes the AndroidX ConstraintLayout dependency.

