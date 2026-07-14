Use Mockito to provide a mocked `UserRepository`, then inject it into `UserService` with `@InjectMocks`:

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
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
    void getUser_returnsUserFromRepository() {
        User expected = new User(1L, "Ada");
        when(userRepository.findById(1L)).thenReturn(Optional.of(expected));

        User actual = userService.getUser(1L);

        assertEquals(expected, actual);
        verify(userRepository).findById(1L);
    }
}
```

The service should receive the repository through its constructor:

```java
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getUser(long id) {
        return userRepository.findById(id).orElseThrow();
    }
}
```

Add JUnit 5 and Mockito test dependencies, such as `junit-jupiter` and `mockito-junit-jupiter`, to the test configuration. Mock the repository’s responses with `when(...).thenReturn(...)`, assert the service result, and use `verify(...)` when you also want to check the repository interaction.

