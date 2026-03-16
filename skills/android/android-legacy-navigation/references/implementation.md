# Legacy Navigation Implementation

## SafeArgs Setup

```kotlin
// build.gradle.kts (Project)
dependencies {
    classpath("androidx.navigation:navigation-safe-args-gradle-plugin:$nav_version")
}

// build.gradle.kts (Module)
plugins {
    id("androidx.navigation.safeargs.kotlin")
}
```

## Navigation Graph (nav_graph.xml)

```xml
<navigation xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    app:startDestination="@id/homeFragment">

    <fragment
        android:id="@+id/homeFragment"
        android:name="com.example.HomeFragment">
        <action
            android:id="@+id/action_home_to_details"
            app:destination="@id/detailsFragment" />
    </fragment>

    <fragment
        android:id="@+id/detailsFragment"
        android:name="com.example.DetailsFragment">
        <argument
            android:name="postId"
            app:argType="string" />
    </fragment>
</navigation>
```

## Navigate with SafeArgs

```kotlin
// Origin
val action = HomeFragmentDirections.actionHomeToDetails(postId = "123")
findNavController().navigate(action)

// Destination
val args: DetailsFragmentArgs by navArgs()
val postId = args.postId
```
