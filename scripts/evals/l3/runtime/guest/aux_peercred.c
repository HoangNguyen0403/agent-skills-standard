/*
 * scripts/evals/l3/runtime/guest/aux_peercred.c
 *
 * Guest-local auxiliary peer authenticator for artifact-v1 (revision 364F).
 *
 * The live connected UNIX-domain socket is inherited as descriptor 3, never
 * passed as a bare descriptor number. This helper is started once per accepted
 * connection and stays alive for the connection lifetime; the controller writes
 * "check\n" before every auxiliary frame and only mints a receipt after an "ok".
 *
 * Authentication is kernel peer credentials (SO_PEERCRED) on that very socket
 * plus an exact `/proc/<peer>/cgroup` match against the recorded container
 * cgroup. There is no optional or empty match: a missing cgroup, an unparsable
 * line, a different pid or a different cgroup is a failure. No application
 * consumption signal (SIOCOUTQ or similar) is used.
 *
 * Build (in the approved offline image):
 *   cc -O2 -std=c11 -Wall -Wextra -D_GNU_SOURCE -o /opt/l3/aux_peercred aux_peercred.c
 */

#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <unistd.h>

#define AUX_SOCKET_FD 3
#define MAX_CGROUP_PATH 1024

static int read_v2_cgroup(pid_t pid, char *out, size_t cap) {
    char path[64];
    snprintf(path, sizeof(path), "/proc/%ld/cgroup", (long)pid);
    FILE *file = fopen(path, "r");
    if (file == NULL) {
        return -1;
    }
    char line[MAX_CGROUP_PATH + 32];
    int found = 0;
    while (fgets(line, sizeof(line), file) != NULL) {
        if (strncmp(line, "0::", 3) != 0) {
            continue;
        }
        char *value = line + 3;
        size_t length = strlen(value);
        while (length > 0 && (value[length - 1] == '\n' || value[length - 1] == '\r')) {
            value[--length] = '\0';
        }
        if (length == 0 || length + 1 > cap) {
            fclose(file);
            return -1;
        }
        memcpy(out, value, length + 1);
        found = 1;
        break;
    }
    fclose(file);
    return found ? 0 : -1;
}

static int verify_peer(pid_t expected_pid, const char *expected_cgroup) {
    struct ucred credentials;
    socklen_t length = sizeof(credentials);
    if (getsockopt(AUX_SOCKET_FD, SOL_SOCKET, SO_PEERCRED, &credentials, &length) != 0) {
        return -1;
    }
    if (length != sizeof(credentials) || credentials.pid != expected_pid) {
        return -2;
    }
    char observed[MAX_CGROUP_PATH];
    if (read_v2_cgroup(credentials.pid, observed, sizeof(observed)) != 0) {
        return -3;
    }
    if (strcmp(observed, expected_cgroup) != 0) {
        return -4;
    }
    return 0;
}

static int fail(const char *line, int code) {
    printf("%s\n", line);
    fflush(stdout);
    return code;
}

int main(int argc, char **argv) {
    if (argc != 3) {
        return fail("fail usage", 2);
    }
    char *end = NULL;
    long parsed = strtol(argv[1], &end, 10);
    if (end == NULL || *end != '\0' || parsed <= 1) {
        return fail("fail pid-argument", 2);
    }
    if (argv[2][0] == '\0' || argv[2][0] != '/') {
        return fail("fail cgroup-argument", 2);
    }
    pid_t expected_pid = (pid_t)parsed;
    const char *expected_cgroup = argv[2];

    int result = verify_peer(expected_pid, expected_cgroup);
    if (result != 0) {
        return fail("fail initial-authentication", 1);
    }
    printf("ready\n");
    fflush(stdout);

    char command[64];
    while (fgets(command, sizeof(command), stdin) != NULL) {
        if (strncmp(command, "check", 5) != 0) {
            return fail("fail unknown-command", 1);
        }
        result = verify_peer(expected_pid, expected_cgroup);
        if (result != 0) {
            return fail("fail reauthentication", 1);
        }
        printf("ok\n");
        fflush(stdout);
    }
    return 0;
}
