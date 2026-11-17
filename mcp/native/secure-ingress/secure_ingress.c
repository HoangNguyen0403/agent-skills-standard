#define _GNU_SOURCE
#define NAPI_VERSION 8
#include <node_api.h>
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <math.h>
#include <pthread.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>
#include <limits.h>

#ifndef NAME_MAX
#define NAME_MAX 255
#endif

/* Slot size includes the terminator and comes from the target's dirent layout. */
#define DIR_NAME_SLOT_BYTES (sizeof(((struct dirent *)0)->d_name))
#define CAP_MAGIC UINT32_C(0x53494e47)
#define MAX_PATH_BYTES 4096U
#define MAX_BATCH_ENTRIES 64U
static const napi_type_tag DIRECTORY_TAG = { UINT64_C(0x99ce14e23d774e7a), UINT64_C(0x2ab0c73f04d18965) };
static const napi_type_tag CURSOR_TAG = { UINT64_C(0x7ad2a915af6043c1), UINT64_C(0xd1806c3eb52f947a) };

typedef enum { CAP_DIRECTORY = 1, CAP_CURSOR = 2 } CapKind;
typedef enum {
  ERR_NONE = 0, ERR_ARGUMENTS, ERR_PATH, ERR_NOT_FOUND, ERR_NOT_DIRECTORY,
  ERR_ACCESS_DENIED, ERR_SYMLINK, ERR_COMPONENT, ERR_HANDLE, ERR_CLOSED,
  ERR_NOT_REGULAR, ERR_LIMIT, ERR_FILESYSTEM, ERR_MEMORY, ERR_ASYNC, ERR_CLOSE
} ErrorKind;
typedef enum {
  OP_ROOT, OP_CHILD_DIRECTORY, OP_REGULAR_FILE, OP_DIRECTORY_STREAM,
  OP_DIRECTORY_BATCH
} Operation;
typedef enum { ENTRY_FILE, ENTRY_DIRECTORY, ENTRY_SYMLINK, ENTRY_OTHER, ENTRY_UNKNOWN } EntryKind;

typedef struct CloseWaiter {
  napi_deferred deferred;
  struct CloseWaiter *next;
} CloseWaiter;

typedef struct Capability {
  uint32_t magic;
  CapKind kind;
  int fd;
  DIR *directory;
  bool closing;
  bool closed;
  bool mutex_initialized;
  size_t active;
  pthread_mutex_t cursor_mutex;
  CloseWaiter *waiter_head;
  CloseWaiter *waiter_tail;
} Capability;

typedef struct {
  char *name;
  EntryKind kind;
} BatchEntry;

typedef struct Job {
  Operation operation;
  napi_deferred deferred;
  napi_async_work work;
  napi_ref capability_ref;
  Capability *capability;
  ErrorKind error;
  char *argument;
  uint32_t batch_limit;
  int result_fd;
  DIR *result_directory;
  void *batch_storage;
  BatchEntry *entries;
  char *name_storage;
  size_t entry_count;
  size_t visited;
  bool done;
} Job;

static const char *error_code(ErrorKind error) {
  switch (error) {
    case ERR_NONE: return "NATIVE_FILESYSTEM_ERROR";
    case ERR_ARGUMENTS: return "NATIVE_INVALID_ARGUMENTS";
    case ERR_PATH: return "NATIVE_INVALID_PATH";
    case ERR_NOT_FOUND: return "NATIVE_NOT_FOUND";
    case ERR_NOT_DIRECTORY: return "NATIVE_NOT_DIRECTORY";
    case ERR_ACCESS_DENIED: return "NATIVE_ACCESS_DENIED";
    case ERR_SYMLINK: return "NATIVE_SYMLINK_REJECTED";
    case ERR_COMPONENT: return "NATIVE_INVALID_COMPONENT";
    case ERR_HANDLE: return "NATIVE_INVALID_CAPABILITY";
    case ERR_CLOSED: return "NATIVE_CAPABILITY_CLOSED";
    case ERR_NOT_REGULAR: return "NATIVE_NOT_REGULAR_FILE";
    case ERR_LIMIT: return "NATIVE_INVALID_LIMIT";
    case ERR_FILESYSTEM: return "NATIVE_FILESYSTEM_ERROR";
    case ERR_MEMORY: return "NATIVE_RESOURCE_ERROR";
    case ERR_ASYNC: return "NATIVE_ASYNC_ERROR";
    case ERR_CLOSE: return "NATIVE_CLOSE_ERROR";
  }
  return "NATIVE_FILESYSTEM_ERROR";
}

static const char *error_message(ErrorKind error) {
  switch (error) {
    case ERR_NONE: return "Native ingress filesystem operation failed";
    case ERR_ARGUMENTS: return "Invalid native ingress arguments";
    case ERR_PATH: return "Invalid native ingress root path";
    case ERR_NOT_FOUND: return "Native ingress entry was not found";
    case ERR_NOT_DIRECTORY: return "Native ingress path component is not a directory";
    case ERR_ACCESS_DENIED: return "Native ingress access denied";
    case ERR_SYMLINK: return "Native ingress symlink or loop rejected";
    case ERR_COMPONENT: return "Invalid native ingress path component";
    case ERR_HANDLE: return "Invalid native ingress capability";
    case ERR_CLOSED: return "Native ingress capability is closed";
    case ERR_NOT_REGULAR: return "Native ingress target is not a regular file";
    case ERR_LIMIT: return "Invalid native ingress batch limit";
    case ERR_FILESYSTEM: return "Native ingress filesystem operation failed";
    case ERR_MEMORY: return "Native ingress resource allocation failed";
    case ERR_ASYNC: return "Native ingress asynchronous operation failed";
    case ERR_CLOSE: return "Native ingress capability close failed";
  }
  return "Native ingress filesystem operation failed";
}

static void reject_deferred(napi_env env, napi_deferred deferred, ErrorKind error) {
  napi_value code, message, value;
  if (napi_create_string_utf8(env, error_code(error), NAPI_AUTO_LENGTH, &code) != napi_ok ||
      napi_create_string_utf8(env, error_message(error), NAPI_AUTO_LENGTH, &message) != napi_ok ||
      napi_create_error(env, code, message, &value) != napi_ok) {
    napi_get_undefined(env, &value);
  } else {
    napi_set_named_property(env, value, "code", code);
  }
  napi_reject_deferred(env, deferred, value);
}

static napi_value rejected_promise(napi_env env, ErrorKind error) {
  napi_deferred deferred;
  napi_value promise;
  if (napi_create_promise(env, &deferred, &promise) != napi_ok) return NULL;
  reject_deferred(env, deferred, error);
  return promise;
}

static bool callback_arguments(napi_env env, napi_callback_info info, size_t capacity,
                               napi_value *argv, size_t *argc) {
  napi_value this_arg;
  *argc = capacity;
  return napi_get_cb_info(env, info, argc, argv, &this_arg, NULL) == napi_ok;
}

static bool read_string(napi_env env, napi_value value, size_t maximum, char **result) {
  size_t length = 0;
  if (napi_get_value_string_utf8(env, value, NULL, 0, &length) != napi_ok ||
      length == 0 || length > maximum) return false;
  char *text = malloc(length + 1U);
  if (text == NULL) return false;
  size_t copied = 0;
  if (napi_get_value_string_utf8(env, value, text, length + 1U, &copied) != napi_ok ||
      copied != length || memchr(text, '\0', length) != NULL) {
    free(text);
    return false;
  }
  text[length] = '\0';
  *result = text;
  return true;
}

static bool valid_component(const char *component) {
  return component != NULL && component[0] != '\0' &&
         strcmp(component, ".") != 0 && strcmp(component, "..") != 0 &&
         strchr(component, '/') == NULL && strchr(component, '\\') == NULL;
}

static int open_flags_directory(void) {
  return O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW;
}

static ErrorKind filesystem_error(int error) {
  if (error == ENOENT) return ERR_NOT_FOUND;
  if (error == ENOTDIR) return ERR_NOT_DIRECTORY;
  if (error == EACCES || error == EPERM) return ERR_ACCESS_DENIED;
  if (error == ELOOP) return ERR_SYMLINK;
  if (error == EISDIR) return ERR_NOT_REGULAR;
  return ERR_FILESYSTEM;
}

static int open_root_components(const char *path, ErrorKind *error) {
  size_t path_length = path == NULL ? 0U : strlen(path);
  if (path == NULL || path[0] != '/' || path_length > MAX_PATH_BYTES ||
      (path_length > 1U && path[path_length - 1U] == '/')) {
    *error = ERR_PATH;
    errno = EINVAL;
    return -1;
  }
  int current = open("/", open_flags_directory());
  if (current < 0) { *error = filesystem_error(errno); return -1; }
  if (path[1] == '\0') return current;
  const char *cursor = path + 1;
  while (*cursor != '\0') {
    const char *end = strchr(cursor, '/');
    size_t length = end == NULL ? strlen(cursor) : (size_t)(end - cursor);
    if (length == 0 || length > NAME_MAX) {
      close(current);
      *error = ERR_PATH;
      errno = EINVAL;
      return -1;
    }
    char component[NAME_MAX + 1U];
    memcpy(component, cursor, length);
    component[length] = '\0';
    if (!valid_component(component)) {
      close(current);
      *error = ERR_PATH;
      errno = EINVAL;
      return -1;
    }
    int next = openat(current, component, open_flags_directory());
    if (next < 0) {
      int saved_error = errno;
      close(current);
      errno = saved_error;
      *error = filesystem_error(saved_error);
      return -1;
    }
    close(current);
    current = next;
    if (end == NULL) break;
    cursor = end + 1;
  }
  return current;
}

static int open_child_directory_at(int parent, const char *component, ErrorKind *error) {
  if (!valid_component(component)) { *error = ERR_COMPONENT; return -1; }
  int fd = openat(parent, component, open_flags_directory());
  if (fd < 0) *error = filesystem_error(errno);
  return fd;
}

static int open_regular_file(int parent, const char *component, ErrorKind *error) {
  if (!valid_component(component)) { *error = ERR_COMPONENT; return -1; }
  int fd = openat(parent, component, O_RDONLY | O_CLOEXEC | O_NOFOLLOW | O_NONBLOCK);
  if (fd < 0) { *error = filesystem_error(errno); return -1; }
  struct stat metadata;
  if (fstat(fd, &metadata) != 0) {
    int saved_error = errno;
    close(fd);
    *error = filesystem_error(saved_error);
    errno = saved_error;
    return -1;
  }
  if (!S_ISREG(metadata.st_mode)) {
    close(fd);
    *error = ERR_NOT_REGULAR;
    return -1;
  }
  return fd;
}

static Capability *new_capability(CapKind kind, int fd, DIR *directory) {
  Capability *capability = calloc(1U, sizeof(*capability));
  if (capability == NULL) return NULL;
  capability->magic = CAP_MAGIC;
  capability->kind = kind;
  capability->fd = fd;
  capability->directory = directory;
  if (kind == CAP_CURSOR) {
    if (pthread_mutex_init(&capability->cursor_mutex, NULL) != 0) {
      free(capability);
      return NULL;
    }
    capability->mutex_initialized = true;
  }
  return capability;
}

static void close_capability_resource(Capability *capability) {
  if (capability->closed) return;
  int result = 0;
  if (capability->kind == CAP_CURSOR) {
    if (capability->directory != NULL) result = closedir(capability->directory);
    capability->directory = NULL;
    capability->fd = -1;
  } else if (capability->fd >= 0) {
    result = close(capability->fd);
    capability->fd = -1;
  }
  capability->closed = true;
  if (capability->mutex_initialized) {
    pthread_mutex_destroy(&capability->cursor_mutex);
    capability->mutex_initialized = false;
  }
  if (result != 0) errno = EIO;
}

static void finalize_capability(napi_env env, void *data, void *hint) {
  (void)env;
  (void)hint;
  Capability *capability = data;
  if (capability == NULL) return;
  if (capability->magic == CAP_MAGIC) {
    if (capability->active == 0U) close_capability_resource(capability);
    capability->magic = 0U;
  }
  free(capability);
}

static napi_value wrap_capability(napi_env env, CapKind kind, int fd, DIR *directory,
                                  Capability **wrapped) {
  Capability *capability = new_capability(kind, fd, directory);
  napi_value object;
  if (capability == NULL) return NULL;
  if (napi_create_object(env, &object) != napi_ok) {
    if (capability->mutex_initialized) pthread_mutex_destroy(&capability->cursor_mutex);
    free(capability);
    return NULL;
  }
  const napi_type_tag *tag = kind == CAP_DIRECTORY ? &DIRECTORY_TAG : &CURSOR_TAG;
  if (napi_type_tag_object(env, object, tag) != napi_ok ||
      napi_wrap(env, object, capability, finalize_capability, NULL, NULL) != napi_ok) {
    if (capability->mutex_initialized) pthread_mutex_destroy(&capability->cursor_mutex);
    free(capability);
    return NULL;
  }
  *wrapped = capability;
  return object;
}

static void free_job(Job *job) {
  if (job == NULL) return;
  free(job->argument);
  free(job->batch_storage);
  if (job->result_fd >= 0) close(job->result_fd);
  if (job->result_directory != NULL) closedir(job->result_directory);
  free(job);
}

static EntryKind classify_entry(DIR *directory, const char *name) {
  struct stat metadata;
  if (fstatat(dirfd(directory), name, &metadata, AT_SYMLINK_NOFOLLOW) != 0) return ENTRY_UNKNOWN;
  if (S_ISREG(metadata.st_mode)) return ENTRY_FILE;
  if (S_ISDIR(metadata.st_mode)) return ENTRY_DIRECTORY;
  if (S_ISLNK(metadata.st_mode)) return ENTRY_SYMLINK;
  return ENTRY_OTHER;
}

static void read_batch(Job *job) {
  Capability *capability = job->capability;
  if (pthread_mutex_lock(&capability->cursor_mutex) != 0) {
    job->error = ERR_FILESYSTEM;
    return;
  }
  size_t batch_count = (size_t)job->batch_limit;
  size_t name_slot_size = DIR_NAME_SLOT_BYTES;
  if (name_slot_size == 0U ||
      batch_count > SIZE_MAX / sizeof(*job->entries) ||
      batch_count > SIZE_MAX / name_slot_size) {
    job->error = ERR_MEMORY;
  } else {
    size_t entries_size = batch_count * sizeof(*job->entries);
    size_t names_size = batch_count * name_slot_size;
    if (entries_size > SIZE_MAX - names_size) {
      job->error = ERR_MEMORY;
    } else {
      job->batch_storage = malloc(entries_size + names_size);
      if (job->batch_storage == NULL) {
        job->error = ERR_MEMORY;
      } else {
        job->entries = job->batch_storage;
        job->name_storage = (char *)job->batch_storage + entries_size;
      }
    }
  }
  while (job->error == ERR_NONE && job->visited < job->batch_limit) {
    errno = 0;
    struct dirent *entry = readdir(capability->directory);
    if (entry == NULL) {
      if (errno != 0) job->error = filesystem_error(errno);
      else job->done = true;
      break;
    }
    job->visited++;
    if (strcmp(entry->d_name, ".") == 0 || strcmp(entry->d_name, "..") == 0) continue;
    size_t length = strnlen(entry->d_name, name_slot_size);
    if (length == 0U || length >= name_slot_size) continue;
    char *name = job->name_storage + job->entry_count * name_slot_size;
    memcpy(name, entry->d_name, length);
    name[length] = 0;
    job->entries[job->entry_count].name = name;
    job->entries[job->entry_count].kind = classify_entry(capability->directory, name);
    job->entry_count++;
  }
  pthread_mutex_unlock(&capability->cursor_mutex);
}

static void execute_job(napi_env env, void *data) {
  (void)env;
  Job *job = data;
  switch (job->operation) {
    case OP_ROOT:
      job->result_fd = open_root_components(job->argument, &job->error);
      break;
    case OP_CHILD_DIRECTORY:
      job->result_fd = open_child_directory_at(job->capability->fd, job->argument, &job->error);
      break;
    case OP_REGULAR_FILE:
      job->result_fd = open_regular_file(job->capability->fd, job->argument, &job->error);
      break;
    case OP_DIRECTORY_STREAM: {
      int stream_fd = openat(job->capability->fd, ".", open_flags_directory());
      if (stream_fd < 0) { job->error = filesystem_error(errno); break; }
      job->result_directory = fdopendir(stream_fd);
      if (job->result_directory == NULL) {
        int saved_error = errno;
        close(stream_fd);
        job->error = filesystem_error(saved_error);
      }
      break;
    }
    case OP_DIRECTORY_BATCH:
      read_batch(job);
      break;
  }
}

static napi_value undefined_value(napi_env env) {
  napi_value value;
  napi_get_undefined(env, &value);
  return value;
}

static void settle_close_waiters(napi_env env, Capability *capability, bool failed) {
  CloseWaiter *waiter = capability->waiter_head;
  capability->waiter_head = NULL;
  capability->waiter_tail = NULL;
  while (waiter != NULL) {
    CloseWaiter *next = waiter->next;
    if (failed) reject_deferred(env, waiter->deferred, ERR_CLOSE);
    else napi_resolve_deferred(env, waiter->deferred, undefined_value(env));
    free(waiter);
    waiter = next;
  }
}

static void finish_close(napi_env env, Capability *capability) {
  errno = 0;
  close_capability_resource(capability);
  bool failed = errno != 0;
  settle_close_waiters(env, capability, failed);
}

static bool resolve_capability(napi_env env, Job *job, CapKind kind, int fd, DIR *directory) {
  Capability *capability = NULL;
  napi_value value = wrap_capability(env, kind, fd, directory, &capability);
  if (value == NULL) return false;
  if (kind == CAP_CURSOR) job->result_directory = NULL;
  else job->result_fd = -1;
  if (napi_resolve_deferred(env, job->deferred, value) != napi_ok) {
    close_capability_resource(capability);
    return false;
  }
  return true;
}

static bool resolve_batch(napi_env env, Job *job) {
  napi_value result, entries;
  if (napi_create_object(env, &result) != napi_ok ||
      napi_create_array_with_length(env, job->entry_count, &entries) != napi_ok) return false;
  for (size_t index = 0; index < job->entry_count; index++) {
    napi_value item, name, kind;
    const char *kind_name = "unknown";
    switch (job->entries[index].kind) {
      case ENTRY_FILE: kind_name = "file"; break;
      case ENTRY_DIRECTORY: kind_name = "directory"; break;
      case ENTRY_SYMLINK: kind_name = "symlink"; break;
      case ENTRY_OTHER: kind_name = "other"; break;
      case ENTRY_UNKNOWN: kind_name = "unknown"; break;
    }
    if (napi_create_object(env, &item) != napi_ok ||
        napi_create_string_utf8(env, job->entries[index].name, NAPI_AUTO_LENGTH, &name) != napi_ok ||
        napi_create_string_utf8(env, kind_name, NAPI_AUTO_LENGTH, &kind) != napi_ok ||
        napi_set_named_property(env, item, "name", name) != napi_ok ||
        napi_set_named_property(env, item, "kind", kind) != napi_ok ||
        napi_set_element(env, entries, (uint32_t)index, item) != napi_ok) return false;
  }
  napi_value visited, done;
  if (napi_create_uint32(env, (uint32_t)job->visited, &visited) != napi_ok ||
      napi_get_boolean(env, job->done, &done) != napi_ok ||
      napi_set_named_property(env, result, "entries", entries) != napi_ok ||
      napi_set_named_property(env, result, "visited", visited) != napi_ok ||
      napi_set_named_property(env, result, "done", done) != napi_ok) return false;
  return napi_resolve_deferred(env, job->deferred, result) == napi_ok;
}

static void complete_job(napi_env env, napi_status status, void *data) {
  Job *job = data;
  if (status != napi_ok && job->error == ERR_NONE) job->error = ERR_ASYNC;
  if (job->error != ERR_NONE) reject_deferred(env, job->deferred, job->error);
  else {
    switch (job->operation) {
      case OP_ROOT:
      case OP_CHILD_DIRECTORY:
        if (!resolve_capability(env, job, CAP_DIRECTORY, job->result_fd, NULL))
          reject_deferred(env, job->deferred, ERR_MEMORY);
        break;
      case OP_REGULAR_FILE: {
        napi_value value;
        if (napi_create_int32(env, job->result_fd, &value) != napi_ok ||
            napi_resolve_deferred(env, job->deferred, value) != napi_ok)
          reject_deferred(env, job->deferred, ERR_MEMORY);
        else job->result_fd = -1;
        break;
      }
      case OP_DIRECTORY_STREAM:
        if (!resolve_capability(env, job, CAP_CURSOR, -1, job->result_directory))
          reject_deferred(env, job->deferred, ERR_MEMORY);
        break;
      case OP_DIRECTORY_BATCH:
        if (!resolve_batch(env, job)) reject_deferred(env, job->deferred, ERR_MEMORY);
        break;
    }
  }
  Capability *capability = job->capability;
  if (capability != NULL) {
    if (capability->active > 0U) capability->active--;
    if (capability->closing && capability->active == 0U) finish_close(env, capability);
  }
  if (job->capability_ref != NULL) napi_delete_reference(env, job->capability_ref);
  napi_delete_async_work(env, job->work);
  free_job(job);
}

static bool has_capability_tag(napi_env env, napi_value value, CapKind kind) {
  bool tagged = false;
  const napi_type_tag *tag = kind == CAP_DIRECTORY ? &DIRECTORY_TAG : &CURSOR_TAG;
  return napi_check_object_type_tag(env, value, tag, &tagged) == napi_ok && tagged;
}

static CapKind operation_capability_kind(Operation operation) {
  return operation == OP_DIRECTORY_BATCH ? CAP_CURSOR : CAP_DIRECTORY;
}

static napi_value submit_job(napi_env env, napi_value promise, napi_deferred deferred,
                             Job *job, napi_value capability_value) {
  job->deferred = deferred;
  if (capability_value != NULL) {
    CapKind expected = operation_capability_kind(job->operation);
    void *data = NULL;
    if (!has_capability_tag(env, capability_value, expected) ||
        napi_unwrap(env, capability_value, &data) != napi_ok || data == NULL) {
      free_job(job);
      reject_deferred(env, deferred, ERR_HANDLE);
      return promise;
    }
    Capability *capability = data;
    if (capability->magic != CAP_MAGIC || capability->kind != expected) {
      free_job(job);
      reject_deferred(env, deferred, ERR_HANDLE);
      return promise;
    }
    if (capability->closed || capability->closing) {
      free_job(job);
      reject_deferred(env, deferred, ERR_CLOSED);
      return promise;
    }
    napi_value resource_name;
    if (napi_create_string_utf8(env, "native-ingress", NAPI_AUTO_LENGTH, &resource_name) != napi_ok ||
        napi_create_reference(env, capability_value, 1U, &job->capability_ref) != napi_ok) {
      free_job(job);
      reject_deferred(env, deferred, ERR_ASYNC);
      return promise;
    }
    job->capability = capability;
    capability->active++;
    if (napi_create_async_work(env, NULL, resource_name, execute_job, complete_job, job, &job->work) != napi_ok ||
        napi_queue_async_work(env, job->work) != napi_ok) {
      if (job->work != NULL) napi_delete_async_work(env, job->work);
      capability->active--;
      napi_delete_reference(env, job->capability_ref);
      free_job(job);
      reject_deferred(env, deferred, ERR_ASYNC);
      return promise;
    }
    return promise;
  }
  napi_value resource_name;
  if (napi_create_string_utf8(env, "native-ingress", NAPI_AUTO_LENGTH, &resource_name) != napi_ok ||
      napi_create_async_work(env, NULL, resource_name, execute_job, complete_job, job, &job->work) != napi_ok ||
      napi_queue_async_work(env, job->work) != napi_ok) {
    if (job->work != NULL) napi_delete_async_work(env, job->work);
    free_job(job);
    reject_deferred(env, deferred, ERR_ASYNC);
  }
  return promise;
}

static Job *new_job(Operation operation) {
  Job *job = calloc(1U, sizeof(*job));
  if (job == NULL) return NULL;
  job->operation = operation;
  job->result_fd = -1;
  return job;
}

static napi_value async_path_operation(napi_env env, napi_callback_info info,
                                       Operation operation, bool needs_capability) {
  napi_value argv[2], promise;
  size_t argc;
  napi_deferred deferred;
  if (!callback_arguments(env, info, 2U, argv, &argc) || argc != (needs_capability ? 2U : 1U))
    return rejected_promise(env, ERR_ARGUMENTS);
  if (napi_create_promise(env, &deferred, &promise) != napi_ok) return NULL;
  Job *job = new_job(operation);
  if (job == NULL) { reject_deferred(env, deferred, ERR_MEMORY); return promise; }
  napi_value capability = NULL;
  napi_value path_value = argv[0];
  if (needs_capability) { capability = argv[0]; path_value = argv[1]; }
  if (!read_string(env, path_value, MAX_PATH_BYTES, &job->argument)) {
    free_job(job);
    reject_deferred(env, deferred, operation == OP_ROOT ? ERR_PATH : ERR_COMPONENT);
    return promise;
  }
  if (operation != OP_ROOT && !valid_component(job->argument)) {
    free_job(job);
    reject_deferred(env, deferred, ERR_COMPONENT);
    return promise;
  }
  return submit_job(env, promise, deferred, job, capability);
}

static napi_value open_root(napi_env env, napi_callback_info info) {
  return async_path_operation(env, info, OP_ROOT, false);
}
static napi_value open_child_directory_callback(napi_env env, napi_callback_info info) {
  return async_path_operation(env, info, OP_CHILD_DIRECTORY, true);
}
static napi_value open_regular_file_callback(napi_env env, napi_callback_info info) {
  return async_path_operation(env, info, OP_REGULAR_FILE, true);
}

static napi_value open_directory_stream(napi_env env, napi_callback_info info) {
  napi_value argv[1], promise;
  size_t argc;
  napi_deferred deferred;
  if (!callback_arguments(env, info, 1U, argv, &argc) || argc != 1U) return rejected_promise(env, ERR_ARGUMENTS);
  if (napi_create_promise(env, &deferred, &promise) != napi_ok) return NULL;
  Job *job = new_job(OP_DIRECTORY_STREAM);
  if (job == NULL) { reject_deferred(env, deferred, ERR_MEMORY); return promise; }
  return submit_job(env, promise, deferred, job, argv[0]);
}

static napi_value read_directory_batch(napi_env env, napi_callback_info info) {
  napi_value argv[2], promise;
  size_t argc;
  napi_deferred deferred;
  if (!callback_arguments(env, info, 2U, argv, &argc) || argc != 2U) return rejected_promise(env, ERR_ARGUMENTS);
  if (napi_create_promise(env, &deferred, &promise) != napi_ok) return NULL;
  double limit = 0.0;
  if (napi_get_value_double(env, argv[1], &limit) != napi_ok || !isfinite(limit) ||
      floor(limit) != limit || limit < 1.0 || limit > (double)MAX_BATCH_ENTRIES) {
    reject_deferred(env, deferred, ERR_LIMIT);
    return promise;
  }
  Job *job = new_job(OP_DIRECTORY_BATCH);
  if (job == NULL) { reject_deferred(env, deferred, ERR_MEMORY); return promise; }
  job->batch_limit = (uint32_t)limit;
  return submit_job(env, promise, deferred, job, argv[0]);
}

static napi_value close_capability(napi_env env, napi_callback_info info, CapKind expected) {
  napi_value argv[1], promise;
  size_t argc;
  napi_deferred deferred;
  if (!callback_arguments(env, info, 1U, argv, &argc) || argc != 1U) return rejected_promise(env, ERR_ARGUMENTS);
  if (napi_create_promise(env, &deferred, &promise) != napi_ok) return NULL;
  void *data = NULL;
  if (!has_capability_tag(env, argv[0], expected) ||
      napi_unwrap(env, argv[0], &data) != napi_ok || data == NULL) {
    reject_deferred(env, deferred, ERR_HANDLE);
    return promise;
  }
  Capability *capability = data;
  if (capability->magic != CAP_MAGIC || capability->kind != expected) {
    reject_deferred(env, deferred, ERR_HANDLE);
    return promise;
  }
  if (capability->closed) {
    napi_resolve_deferred(env, deferred, undefined_value(env));
    return promise;
  }
  CloseWaiter *waiter = calloc(1U, sizeof(*waiter));
  if (waiter == NULL) { reject_deferred(env, deferred, ERR_MEMORY); return promise; }
  waiter->deferred = deferred;
  capability->closing = true;
  if (capability->waiter_tail == NULL) capability->waiter_head = waiter;
  else capability->waiter_tail->next = waiter;
  capability->waiter_tail = waiter;
  if (capability->active == 0U) finish_close(env, capability);
  return promise;
}

static napi_value close_directory(napi_env env, napi_callback_info info) {
  return close_capability(env, info, CAP_DIRECTORY);
}
static napi_value close_cursor(napi_env env, napi_callback_info info) {
  return close_capability(env, info, CAP_CURSOR);
}

static bool export_function(napi_env env, napi_value exports, const char *name,
                            napi_callback callback) {
  napi_value function;
  return napi_create_function(env, name, NAPI_AUTO_LENGTH, callback, NULL, &function) == napi_ok &&
         napi_set_named_property(env, exports, name, function) == napi_ok;
}

static napi_value initialize(napi_env env, napi_value exports) {
  napi_value version;
  if (napi_create_uint32(env, 1U, &version) != napi_ok ||
      napi_set_named_property(env, exports, "apiVersion", version) != napi_ok ||
      !export_function(env, exports, "openRoot", open_root) ||
      !export_function(env, exports, "openChildDirectory", open_child_directory_callback) ||
      !export_function(env, exports, "openRegularFile", open_regular_file_callback) ||
      !export_function(env, exports, "openDirectoryStream", open_directory_stream) ||
      !export_function(env, exports, "readDirectoryBatch", read_directory_batch) ||
      !export_function(env, exports, "closeDirectory", close_directory) ||
      !export_function(env, exports, "closeCursor", close_cursor)) return NULL;
  return exports;
}

NAPI_MODULE(secure_ingress, initialize)
