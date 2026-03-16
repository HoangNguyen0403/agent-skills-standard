# Kotlin Testing & MockK Reference

## MockK Advanced Usage

First-class Kotlin mocking library patterns.

```kotlin
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import io.mockk.coEvery
import io.mockk.coVerify
import org.junit.jupiter.api.Test

class UserServiceTest {
    private val repo = mockk<UserRepository>()
    private val service = UserService(repo)

    @Test
    fun `should fetch user successfully`() {
        // Arrange
        val expectedUser = User(id = "1", name = "Test")
        every { repo.getUser("1") } returns expectedUser

        // Act
        val result = service.findUser("1")

        // Assert
        assertThat(result).isEqualTo(expectedUser)
        verify(exactly = 1) { repo.getUser("1") }
    }

    @Test
    fun `should handle suspending calls`() = runTest {
        // Arrange
        coEvery { repo.fetchRemoteData() } returns "Data"

        // Act
        service.sync()

        // Assert
        coVerify { repo.fetchRemoteData() }
    }
}
```

## Gradle Version Catalog (libs.versions.toml)

```toml
[versions]
kotlin = "1.9.22"
mockk = "1.13.9"

[libraries]
kotlin-stdlib = { group = "org.jetbrains.kotlin", name = "kotlin-stdlib", version.ref = "kotlin" }
test-mockk = { group = "io.mockk", name = "mockk", version.ref = "mockk" }

[plugins]
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
```
