Use Mockito with JUnit 5’s `MockitoExtension` to inject a mock `UserRepository` into the `UserService`, then stub the repository and verify the interaction.

```java
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void findById_WhenUserExists_ReturnsUser() {
        User expected = new User(42L, "Ada Lovelace");
        when(userRepository.findById(42L)).thenReturn(Optional.of(expected));

        User actual = userService.findById(42L);

        assertThat(actual)
                .isNotNull()
                .isEqualTo(expected);
        verify(userRepository, times(1)).findById(42L);
    }
}
```

For a missing user, test the exception explicitly:

```java
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Test
void findById_WhenUserDoesNotExist_ThrowsException() {
    when(userRepository.findById(42L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.findById(42L))
            .isInstanceOf(UserNotFoundException.class)
            .hasMessage("User not found: 42");

    verify(userRepository, times(1)).findById(42L);
}
```

This assumes the service has constructor injection, for example:

```java
class UserService {
    private final UserRepository userRepository;

    UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    User findById(long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + id));
    }
}
```

The test remains isolated because the repository is mocked; no database or shared state is involved.

