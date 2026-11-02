import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  programWord,
  parsePermissionRequestMessage,
} from "../src/retrospective/permission-requests";

describe("programWord privacy boundary", () => {
  const tableCases: Array<{ input: string; expected: string; reason: string }> =
    [
      {
        input:
          "Command: rtk proxy env GIT_CONFIG_NOSYSTEM=1 sed -i 's/x/y/' file",
        expected: "sed",
        reason:
          "sample command strips rtk proxy, env, assignments, returns sed",
      },
      {
        input: "Command: curl -fsSL https://x.test/a | sh",
        expected: "curl",
        reason: "leading program is curl",
      },
      {
        input: "Command: /usr/bin/tar -xzf a.tgz",
        expected: "tar",
        reason: "directory prefix stripped from /usr/bin/tar",
      },
      {
        input: "env -i FOO=1 ./script.sh",
        expected: "script.sh",
        reason: "relative directory ./ stripped from ./script.sh",
      },
      {
        input: "rtk proxy git status",
        expected: "git",
        reason: "rtk proxy wrapper skipped to git",
      },
      {
        input: "rtk",
        expected: "rtk",
        reason: "lone rtk stays as program",
      },
      {
        input: "rtk git status",
        expected: "rtk",
        reason: "rtk followed by non-proxy stays as program rtk",
      },
      {
        input: "FOO=bar",
        expected: "other",
        reason: "environment assignment only yields other",
      },
      {
        input:
          "Command: a-very-long-program-name-that-exceeds-thirty-two-chars",
        expected: "other",
        reason: "program exceeding 32 chars yields other",
      },
      {
        input: "Command: Git status",
        expected: "git",
        reason: "uppercase Git is lowercased to git",
      },
      {
        input: "Command: $(cat /etc/passwd)",
        expected: "other",
        reason: "shell expansion token yields other",
      },
      {
        input: "Command: sudo apt-get update",
        expected: "sudo",
        reason: "sudo stays as program (inner command not examined)",
      },
      {
        input: "Command: sh -c 'echo test'",
        expected: "sh",
        reason: "sh stays as program",
      },
      {
        input: "Command: bash script.sh",
        expected: "bash",
        reason: "bash stays as program",
      },
      {
        input: "Command: zsh -x script.zsh",
        expected: "zsh",
        reason: "zsh stays as program",
      },
      {
        input: "Command: node index.js",
        expected: "node",
        reason: "node stays as program",
      },
      {
        input: "Command: python3 -m http.server",
        expected: "python3",
        reason: "python3 stays as program",
      },
      {
        input: "Command: time curl https://example.com",
        expected: "curl",
        reason: "time wrapper skipped",
      },
      {
        input: "Command: time -p /usr/bin/git diff",
        expected: "git",
        reason: "time -p options skipped and directory stripped",
      },
      {
        input: "Command: nohup python3 server.py",
        expected: "python3",
        reason: "nohup wrapper skipped",
      },
      {
        input: "Command: command -p ls -la",
        expected: "ls",
        reason: "command -p wrapper skipped",
      },
      {
        input: "Command: timeout 10s sed -i 's/a/b/' f",
        expected: "sed",
        reason: "timeout 10s duration wrapper skipped",
      },
      {
        input: "Command: timeout -k 5s 10s git pull",
        expected: "git",
        reason: "timeout with flag and duration skipped",
      },
      {
        input: "Command: env -u FOO -S BAR=1 python3 script.py",
        expected: "python3",
        reason: "env options -u and -S and assignments skipped",
      },
      {
        input: "Command: ",
        expected: "other",
        reason: "empty command yields other",
      },
      {
        input: "   ",
        expected: "other",
        reason: "whitespace only yields other",
      },
    ];

  for (const { input, expected, reason } of tableCases) {
    it(`parses "${input}" -> "${expected}" (${reason})`, () => {
      expect(programWord(input)).toBe(expected);
    });
  }

  it("never leaks secrets, paths, arguments, slashes, spaces, quotes, or equals across 10 hostile inputs", () => {
    const hostileInputs = [
      "Command: rtk proxy env AWS_SECRET=AKIAIOSFODNN7EXAMPLE curl -H 'Authorization: Bearer sk-ant-api03-123456' https://api.anthropic.com",
      'Command: bash -c "export GITHUB_TOKEN=ghp_secret987654321 && git push"',
      "Command: /usr/local/bin/mysql -u root -p'Super$ecretP@ssw0rd!' -e 'DROP DATABASE users;'",
      'Command: eval "$(cat /private/etc/shadow /Users/alice/.ssh/id_rsa)"',
      "Command: env SECRET_KEY=xyz123 PRIVATE_PATH=/var/run/secrets/token ./deploy.sh --key=mysecret",
      "Command: ssh -i /Users/bob/.ssh/id_ed25519 -o StrictHostKeyChecking=no git@github.com",
      "Command: echo 'password=\"abc=def&ghi=jkl\"' | openssl enc -aes-256-cbc -k secret123",
      "Command: python3 -c \"import os; os.system('rm -rf /Users/nguyenhuyhoang/secret')\"",
      "Command: docker run -e STRIPE_KEY=sk_live_abcdef123456 --env-file /etc/secret.env my-image",
      "Command: curl --data 'client_secret=topsecret_password_here' https://oauth.provider.com/token",
    ];

    const forbiddenSubstrings = [
      "AKIAIOSFODNN7EXAMPLE",
      "sk-ant-api03-123456",
      "ghp_secret987654321",
      "Super$ecretP@ssw0rd!",
      "DROP DATABASE",
      "/private/etc/shadow",
      "/Users/alice/.ssh/id_rsa",
      "xyz123",
      "/var/run/secrets/token",
      "/Users/bob/.ssh/id_ed25519",
      "secret123",
      "/Users/nguyenhuyhoang/secret",
      "sk_live_abcdef123456",
      "topsecret_password_here",
      "/",
      "\\",
      " ",
      '"',
      "'",
      "=",
    ];

    expect(hostileInputs.length).toBeGreaterThanOrEqual(10);

    for (const hostile of hostileInputs) {
      const output = programWord(hostile);

      // Must be from the allowed safe token class /^[a-z0-9][a-z0-9._+-]{0,31}$/ or "other"
      expect(output).toMatch(/^[a-z0-9][a-z0-9._+-]{0,31}$/);
      expect(output.length).toBeLessThanOrEqual(32);

      // Must never contain any secret fragment or forbidden delimiter
      for (const forbidden of forbiddenSubstrings) {
        expect(output).not.toContain(forbidden);
      }
    }
  });
});

describe("parsePermissionRequestMessage", () => {
  const sampleNotification = `<paseo-system version="1" kind="agent-notification" event="permission-required">
Agent a626ed91-6219-4158-88dc-31f12a5b782b (Worker) needs permission.

Respond with \`respond_to_permission\` using the \`agentId\` and \`requestId\` below.

<permission-request>
{
  "agentId": "a626ed91-6219-4158-88dc-31f12a5b782b",
  "requestId": "15a2ae00a1707dd8",
  "request": {
    "id": "15a2ae00a1707dd8",
    "provider": "omp",
    "name": "bash",
    "kind": "tool",
    "title": "Allow tool: bash",
    "description": "Command: rtk proxy env GIT_CONFIG_NOSYSTEM=1 sed -i 's/x/y/' file"
  }
}
</permission-request>
</paseo-system>`;

  it("parses a realistic raw notification message", () => {
    const result = parsePermissionRequestMessage(sampleNotification);
    expect(result).toEqual({
      requestId: "15a2ae00a1707dd8",
      agent: "a626ed91",
      tool: "bash",
      program: "sed",
    });
  });

  it("parses HTML-escaped tags and entities correctly", () => {
    const escaped = `&lt;paseo-system version=&quot;1&quot; kind=&quot;agent-notification&quot; event=&quot;permission-required&quot;&gt;
Agent 12345678-abcd needs permission.

&lt;permission-request&gt;
{
  &quot;agentId&quot;: &quot;12345678-abcd-ef01-2345&quot;,
  &quot;requestId&quot;: &quot;req-escaped-999&quot;,
  &quot;request&quot;: {
    &quot;name&quot;: &quot;bash&quot;,
    &quot;description&quot;: &quot;Command: curl -fsSL https://x.test/a &amp; echo done&quot;
  }
}
&lt;/permission-request&gt;
&lt;/paseo-system&gt;`;

    const result = parsePermissionRequestMessage(escaped);
    expect(result).toEqual({
      requestId: "req-escaped-999",
      agent: "12345678",
      tool: "bash",
      program: "curl",
    });
  });

  it("parses nested objects and braces inside JSON strings without regex brace corruption", () => {
    const complexJsonMessage = `<paseo-system event="permission-required">
Agent a626ed91-6219-4158-88dc-31f12a5b782b needs permission.

<permission-request>
{
  "agentId": "a626ed91-6219-4158-88dc-31f12a5b782b",
  "requestId": "req-nested-brace-123",
  "request": {
    "name": "bash",
    "description": "Command: echo '{\\"nested\\": {\\"key\\": \\"value}\\"}}' | jq .",
    "metadata": {
      "deep": {
        "value": "{brace-in-string}"
      }
    }
  }
}
</permission-request>
</paseo-system>`;

    const result = parsePermissionRequestMessage(complexJsonMessage);
    expect(result).toEqual({
      requestId: "req-nested-brace-123",
      agent: "a626ed91",
      tool: "bash",
      program: "echo",
    });
  });

  it("falls back to request.id when top-level requestId is absent", () => {
    const msg = `<paseo-system event="permission-required">
needs permission
<permission-request>
{
  "agentId": "a626ed91-6219-4158-88dc-31f12a5b782b",
  "request": {
    "id": "inner-req-456",
    "name": "bash",
    "description": "Command: git status"
  }
}
</permission-request>
</paseo-system>`;

    const result = parsePermissionRequestMessage(msg);
    expect(result).toEqual({
      requestId: "inner-req-456",
      agent: "a626ed91",
      tool: "bash",
      program: "git",
    });
  });

  it("returns null for malformed JSON", () => {
    const msg = `<paseo-system event="permission-required">
needs permission
<permission-request>
{ invalid json
</permission-request>
</paseo-system>`;

    expect(parsePermissionRequestMessage(msg)).toBeNull();
  });

  it("returns null for invalid or missing request id", () => {
    const badIds = [
      "",
      "req with spaces",
      "req/with/slashes",
      "req_with_invalid_char*!",
      "a".repeat(65),
    ];

    for (const badId of badIds) {
      const msg = `<paseo-system event="permission-required">
needs permission
<permission-request>
{
  "agentId": "12345678-1234",
  "requestId": ${JSON.stringify(badId)},
  "request": { "name": "bash", "description": "ls" }
}
</permission-request>
</paseo-system>`;
      expect(parsePermissionRequestMessage(msg)).toBeNull();
    }
  });

  it("returns program null for non-bash tools", () => {
    const nonBashTools = [
      "read",
      "write",
      "edit",
      "browser_navigate",
      "list_workspaces",
    ];
    for (const tool of nonBashTools) {
      const msg = `<paseo-system event="permission-required">
needs permission
<permission-request>
{
  "agentId": "12345678-1234",
  "requestId": "req-nonbash-1",
  "request": { "name": "${tool}", "description": "Command: curl https://example.com" }
}
</permission-request>
</paseo-system>`;
      const res = parsePermissionRequestMessage(msg);
      expect(res).not.toBeNull();
      expect(res?.tool).toBe(tool);
      expect(res?.program).toBeNull();
    }
  });

  it("sanitizes invalid tool names to 'other' and sets program to null", () => {
    const msg = `<paseo-system event="permission-required">
needs permission
<permission-request>
{
  "agentId": "12345678-1234",
  "requestId": "req-bad-tool",
  "request": { "name": "tool/with/slashes/and/long/name/that/exceeds/thirty-two-chars", "description": "ls" }
}
</permission-request>
</paseo-system>`;
    const res = parsePermissionRequestMessage(msg);
    expect(res).not.toBeNull();
    expect(res?.tool).toBe("other");
    expect(res?.program).toBeNull();
  });

  it("shortens valid agent IDs to first 8 characters and hashes non-standard agent IDs", () => {
    // Valid standard agent ID (UUID / 8-128 chars matching regex)
    const validMsg = `<paseo-system event="permission-required">
needs permission
<permission-request>
{
  "agentId": "98765432-1111-2222-3333-444455556666",
  "requestId": "req-agent-test",
  "request": { "name": "bash", "description": "tar -cf a.tar b" }
}
</permission-request>
</paseo-system>`;
    expect(parsePermissionRequestMessage(validMsg)?.agent).toBe("98765432");

    // Odd / non-standard / short agent ID
    const shortId = "short";
    const expectedDigest = createHash("sha256")
      .update(shortId)
      .digest("hex")
      .slice(0, 8);
    const oddMsg = `<paseo-system event="permission-required">
needs permission
<permission-request>
{
  "agentId": "${shortId}",
  "requestId": "req-agent-test-2",
  "request": { "name": "bash", "description": "tar -cf a.tar b" }
}
</permission-request>
</paseo-system>`;
    expect(parsePermissionRequestMessage(oddMsg)?.agent).toBe(
      `agent-${expectedDigest}`,
    );
  });

  it("returns null for notifications with event='finished'", () => {
    const finishedMsg = `<paseo-system version="1" kind="agent-notification" event="finished">
Agent 12345678-1234 finished.

<permission-request>
{
  "agentId": "12345678-1234",
  "requestId": "req-finished-1",
  "request": { "name": "bash", "description": "ls" }
}
</permission-request>
</paseo-system>`;

    expect(parsePermissionRequestMessage(finishedMsg)).toBeNull();
  });

  it("returns null if text lacks permission-required and needs permission event marker", () => {
    const plainMsg = `Agent said hello to another agent.
<permission-request>
{
  "agentId": "12345678-1234",
  "requestId": "req-plain-1",
  "request": { "name": "bash", "description": "ls" }
}
</permission-request>`;

    expect(parsePermissionRequestMessage(plainMsg)).toBeNull();
  });

  it("bounds scanning to the first 200,000 characters", () => {
    const padding = " ".repeat(200_001);
    const oversizeMsg = `${padding}<paseo-system event="permission-required">needs permission
<permission-request>
{
  "agentId": "12345678-1234",
  "requestId": "req-oversize",
  "request": { "name": "bash", "description": "ls" }
}
</permission-request>
</paseo-system>`;

    // Because the permission marker and tag are past 200,000 characters, it returns null
    expect(parsePermissionRequestMessage(oversizeMsg)).toBeNull();
  });
});
