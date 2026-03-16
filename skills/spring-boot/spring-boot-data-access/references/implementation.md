# Data Access Implementation Examples

## Transactional Strategy & Projections

```java
@Service
@Transactional(readOnly = true) // Default: Optimized for reads
public class UserService {
    private final UserRepository repo;

    // Returns a DTO (Record), not an Entity
    public List<UserSummary> listActive() {
        return repo.findAllActiveProjected();
    }

    @Transactional // Override: Read-Write transaction
    public void activate(UUID id) {
        repo.updateStatus(id, Status.ACTIVE);
    }
}
```

## Solving N+1 with EntityGraph

```java
public interface UserRepository extends JpaRepository<User, UUID> {

    // PROJECTION (Fastest for reads)
    // Spring Data automatically maps result to the Record
    @Query("SELECT new com.app.dto.UserSummary(u.username, u.email) FROM User u")
    List<UserSummary> findAllActiveProjected();

    // ENTITY GRAPH (Prevents N+1 for Entities)
    // Eagerly loads 'roles' attribute
    @EntityGraph(attributePaths = {"roles"})
    Optional<User> findWithRolesByUsername(String username);
}
```
