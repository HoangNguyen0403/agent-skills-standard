import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  programWord,
  parsePermissionRequestMessage,
  redactCommand,
  MAX_COMMAND_CHARS,
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
      kind: "tool",
      command: "rtk proxy env GIT_CONFIG_NOSYSTEM=1 sed -i 's/x/y/' file",
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
      kind: "other",
      command: "curl -fsSL https://x.test/a & echo done",
    });
  });

  it("does not double-unescape: escaped ampersand entities stay literal text in an escaped message", () => {
    const escaped = `&lt;paseo-system event=&quot;permission-required&quot;&gt;
Agent 12345678-abcd needs permission.
&lt;permission-request&gt;
{
  &quot;agentId&quot;: &quot;12345678-abcd-ef01-2345&quot;,
  &quot;requestId&quot;: &quot;req-double-1&quot;,
  &quot;request&quot;: {
    &quot;name&quot;: &quot;bash&quot;,
    &quot;description&quot;: &quot;Command: echo &amp;lt;b&amp;gt; &amp;amp;&amp;amp; echo &amp;quot;x&amp;quot;&quot;
  }
}
&lt;/permission-request&gt;
&lt;/paseo-system&gt;`;

    const result = parsePermissionRequestMessage(escaped);

    expect(result).not.toBeNull();
    expect(result?.command).toBe(
      "echo &lt;b&gt; &amp;&amp; echo &quot;x&quot;",
    );
  });

  it("never decodes entity-like text inside a RAW message", () => {
    const raw = `<paseo-system event="permission-required">
Agent 12345678-abcd needs permission.
<permission-request>
{
  "agentId": "12345678-abcd-ef01-2345",
  "requestId": "req-raw-entities",
  "request": {
    "name": "bash",
    "description": "Command: echo &lt;tag&gt; &amp; &quot;q&quot;"
  }
}
</permission-request>
</paseo-system>`;

    const result = parsePermissionRequestMessage(raw);

    expect(result?.command).toBe("echo &lt;tag&gt; &amp; &quot;q&quot;");
  });

  it("keeps a request whose command contains a literal close tag instead of dropping it", () => {
    const raw = `<paseo-system event="permission-required">
Agent 12345678-abcd needs permission.
<permission-request>
{
  "agentId": "12345678-abcd-ef01-2345",
  "requestId": "req-close-tag",
  "request": {
    "name": "bash",
    "description": "Command: echo </permission-request> && rm -rf build"
  }
}
</permission-request>
</paseo-system>`;

    const result = parsePermissionRequestMessage(raw);

    expect(result).not.toBeNull();
    expect(result?.requestId).toBe("req-close-tag");
    expect(result?.command).toBe("echo </permission-request> && rm -rf build");
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
      kind: "other",
      command: `echo '{"nested": {"key": "value}"}}' | jq .`,
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
      kind: "other",
      command: "git status",
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

describe("parsePermissionRequestMessage Slice D4 parsing", () => {
  it("extracts kind if matching regex and defaults to other", () => {
    const validKinds = ["tool", "question", "my-kind.v1", "action_item"];
    for (let idx = 0; idx < validKinds.length; idx++) {
      const k = validKinds[idx];
      const agentId = `${idx.toString().padStart(8, "1")}-test-agent`;
      const msg = `<paseo-system event="permission-required">needs permission
<permission-request>
{
  "agentId": "${agentId}",
  "requestId": "req-kind-${idx}",
  "request": {
    "name": "read",
    "kind": "${k}",
    "title": "Read file"
  }
}
</permission-request>
</paseo-system>`;
      const parsed = parsePermissionRequestMessage(msg);
      expect(parsed?.kind).toBe(k);
    }

    const invalidKinds = [
      "",
      "invalid/kind/slash",
      "kind with @ symbol",
      "a".repeat(33),
    ];
    for (let idx = 0; idx < invalidKinds.length; idx++) {
      const k = invalidKinds[idx];
      const agentId = `${idx.toString().padStart(8, "2")}-test-agent`;
      const msg = `<paseo-system event="permission-required">needs permission
<permission-request>
{
  "agentId": "${agentId}",
  "requestId": "req-badkind-${idx}",
  "request": {
    "name": "read",
    "kind": ${JSON.stringify(k)},
    "title": "Read file"
  }
}
</permission-request>
</paseo-system>`;
      const parsed = parsePermissionRequestMessage(msg);
      expect(parsed?.kind).toBe("other");
    }
  });

  it("extracts bash command from description without Command: and spaces", () => {
    const msg = `<paseo-system event="permission-required">needs permission
<permission-request>
{
  "agentId": "33333333-test-agent",
  "requestId": "req-bash-cmd",
  "request": {
    "name": "bash",
    "description": "Command:    npm test -- --run"
  }
}
</permission-request>
</paseo-system>`;
    const parsed = parsePermissionRequestMessage(msg);
    expect(parsed?.command).toBe("npm test -- --run");
  });

  it("extracts non-bash tool command from title, falling back to description", () => {
    const withTitle = `<paseo-system event="permission-required">needs permission
<permission-request>
{
  "agentId": "44444444-test-agent",
  "requestId": "req-title-cmd",
  "request": {
    "name": "edit",
    "title": "Edit src/index.ts",
    "description": "Fallback description"
  }
}
</permission-request>
</paseo-system>`;
    expect(parsePermissionRequestMessage(withTitle)?.command).toBe(
      "Edit src/index.ts",
    );

    const withDescOnly = `<paseo-system event="permission-required">needs permission
<permission-request>
{
  "agentId": "55555555-test-agent",
  "requestId": "req-desc-cmd",
  "request": {
    "name": "edit",
    "description": "Edit src/index.ts fallback"
  }
}
</permission-request>
</paseo-system>`;
    expect(parsePermissionRequestMessage(withDescOnly)?.command).toBe(
      "Edit src/index.ts fallback",
    );
  });

  it("returns null command for non-string or empty after trim", () => {
    const emptyDesc = `<paseo-system event="permission-required">needs permission
<permission-request>
{
  "agentId": "66666666-test-agent",
  "requestId": "req-null-cmd-1",
  "request": {
    "name": "bash",
    "description": "Command:    "
  }
}
</permission-request>
</paseo-system>`;
    expect(parsePermissionRequestMessage(emptyDesc)?.command).toBeNull();

    const noTitleOrDesc = `<paseo-system event="permission-required">needs permission
<permission-request>
{
  "agentId": "77777777-test-agent",
  "requestId": "req-null-cmd-2",
  "request": {
    "name": "read"
  }
}
</permission-request>
</paseo-system>`;
    expect(parsePermissionRequestMessage(noTitleOrDesc)?.command).toBeNull();
  });

  it("redacts secrets inside the parsed command before returning", () => {
    const msg = `<paseo-system event="permission-required">needs permission
<permission-request>
{
  "agentId": "88888888-test-agent",
  "requestId": "req-secret-cmd",
  "request": {
    "name": "bash",
    "description": "Command: API_KEY=hunter2 curl https://example.com"
  }
}
</permission-request>
</paseo-system>`;
    const parsed = parsePermissionRequestMessage(msg);
    expect(parsed?.command).toBe("API_KEY=[redacted] curl https://example.com");
    expect(parsed?.command).not.toContain("hunter2");
  });
});

describe("redactCommand privacy boundary and rules", () => {
  it("Rule 4: never throws and returns empty string for non-string input", () => {
    expect(redactCommand(null as unknown as string)).toBe("");
    expect(redactCommand(undefined as unknown as string)).toBe("");
    expect(redactCommand(12345 as unknown as string)).toBe("");
    expect(redactCommand({} as unknown as string)).toBe("");
  });

  it("Rule 1.1: cuts input beyond 4000 characters and runs under 200 ms for 5000 chars", () => {
    const largeInput = "echo " + "a ".repeat(2500);
    const t0 = performance.now();
    const redacted = redactCommand(largeInput);
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(200);
    expect(redacted.length).toBeLessThanOrEqual(MAX_COMMAND_CHARS + 20);
    expect(redacted.endsWith("…[truncated]")).toBe(true);
  });

  it("Rule 1.1: drops text beyond 4000 characters even when redaction shrinks the kept part", () => {
    const unit = `TOKEN=${"a".repeat(60)} `;
    const input = unit.repeat(60) + "MARKER_BEYOND_CUT";
    expect(input.length).toBeGreaterThan(4000);

    const redacted = redactCommand(input);

    expect(redacted.length).toBeLessThan(MAX_COMMAND_CHARS);
    expect(redacted).not.toContain("MARKER_BEYOND_CUT");
    expect(redacted.startsWith("TOKEN=[redacted] ")).toBe(true);
  });

  it("Rule 1.2: replaces control characters except newline and tab with a space", () => {
    const raw = `echo\x00\x07hello\x0bworld\x0c!\r\n\tsecond\x7fline\x80\x9ftest`;
    const redacted = redactCommand(raw);
    expect(redacted).toBe("echo  hello world ! \n\tsecond line  test");
  });

  it("Rule 2.1: redacts environment assignments matching sensitive names", () => {
    const keywords = [
      "KEY",
      "TOKEN",
      "SECRET",
      "PASSWORD",
      "PASSWD",
      "CREDENTIAL",
      "AUTH",
      "COOKIE",
      "SESSION",
    ];

    for (const kw of keywords) {
      const input = `MY_${kw}=super_secret_val123 node script.js`;
      const redacted = redactCommand(input);
      expect(redacted).toBe(`MY_${kw}=[redacted] node script.js`);
      expect(redacted).not.toContain("super_secret_val123");
    }

    // Quoted values and lowercase names
    expect(redactCommand(`api_key="quoted secret with spaces" curl x`)).toBe(
      `api_key=[redacted] curl x`,
    );
    expect(redactCommand(`auth_token='single quoted secret' curl x`)).toBe(
      `auth_token=[redacted] curl x`,
    );

    // Non-sensitive env vars are preserved
    expect(redactCommand("PATH=/usr/bin:/bin GIT_CONFIG_NOSYSTEM=1 make")).toBe(
      "PATH=/usr/bin:/bin GIT_CONFIG_NOSYSTEM=1 make",
    );
  });

  it("Rule 2.2: redacts sensitive flags with '=' or ' ' while preserving -p and --version", () => {
    const flags = [
      "--password",
      "--passwd",
      "--token",
      "--secret",
      "--api-key",
      "--apikey",
      "--auth",
      "--credentials",
    ];

    for (const flag of flags) {
      expect(redactCommand(`tool ${flag}=secretval other`)).toBe(
        `tool ${flag}=[redacted] other`,
      );
      expect(redactCommand(`tool ${flag} secretval other`)).toBe(
        `tool ${flag} [redacted] other`,
      );
      expect(redactCommand(`tool ${flag} "quoted secret" other`)).toBe(
        `tool ${flag} [redacted] other`,
      );
    }

    // -p is NOT touched
    expect(redactCommand("ssh -p 2222 user@host")).toBe(
      "ssh -p 2222 user@host",
    );
    // --version is preserved
    expect(redactCommand("node --version")).toBe("node --version");
  });

  it("Rule 2.3: redacts HTTP headers and Bearer tokens", () => {
    const headers = [
      "Authorization",
      "Proxy-Authorization",
      "X-Api-Key",
      "X-Auth-Token",
      "Cookie",
      "Set-Cookie",
    ];

    for (const h of headers) {
      // Double-quoted header
      expect(
        redactCommand(`curl -H "${h}: secret_val_xyz" https://api.test`),
      ).toBe(`curl -H "${h}: [redacted]" https://api.test`);
      // Single-quoted header
      expect(
        redactCommand(`curl -H '${h}: secret_val_xyz' https://api.test`),
      ).toBe(`curl -H '${h}: [redacted]' https://api.test`);
      // Unquoted header
      expect(redactCommand(`${h}: secret_val_xyz`)).toBe(`${h}: [redacted]`);
    }

    // Specific contract requirement: Authorization: Bearer abc.def redacted
    expect(redactCommand("Authorization: Bearer abc.def")).toBe(
      "Authorization: [redacted]",
    );

    // Standalone Bearer token
    expect(redactCommand("echo 'Bearer standalone_token_12345'")).toBe(
      "echo 'Bearer [redacted]'",
    );
  });

  it("Rule 2.4: redacts URL userinfo (scheme://user:pass@host)", () => {
    expect(redactCommand("https://u:p@h/x")).toBe("https://[redacted]@h/x");
    expect(redactCommand("postgres://admin:s3cr3t@localhost:5432/mydb")).toBe(
      "postgres://[redacted]@localhost:5432/mydb",
    );
    // URL without userinfo is preserved
    expect(redactCommand("https://example.com/foo/bar")).toBe(
      "https://example.com/foo/bar",
    );
  });

  it("Rule 2.5a: redacts sk- tokens with 16+ chars", () => {
    expect(redactCommand("echo sk-1234567890abcdef1234")).toBe(
      "echo [redacted]",
    );
    expect(
      redactCommand("echo sk-ant-api03-SECRET-TOKEN-DO-NOT-LEAK-987654"),
    ).toBe("echo [redacted]");
    // Shorter than 16 chars is preserved
    expect(redactCommand("echo sk-short-123")).toBe("echo sk-short-123");
  });

  it("Rule 2.5b: redacts gh[pousr]_ tokens with 20+ alphanumerics", () => {
    const prefixes = ["ghp_", "gho_", "ghu_", "ghs_", "ghr_"];
    for (const prefix of prefixes) {
      const token = `${prefix}12345678901234567890`;
      expect(redactCommand(`git push https://${token}@github.com`)).toBe(
        `git push https://[redacted]@github.com`,
      );
      expect(redactCommand(`echo ${token}`)).toBe("echo [redacted]");
    }
    // Shorter is preserved
    expect(redactCommand("echo ghp_short123")).toBe("echo ghp_short123");
  });

  it("Rule 2.5c: redacts github_pat_ tokens with 20+ chars", () => {
    const pat = "github_pat_11ABCD12345678901234567890";
    expect(redactCommand(`echo ${pat}`)).toBe("echo [redacted]");
    expect(redactCommand("echo github_pat_short")).toBe(
      "echo github_pat_short",
    );
  });

  it("Rule 2.5d: redacts AKIA tokens with 16 [0-9A-Z] chars", () => {
    expect(redactCommand("aws configure set AKIAIOSFODNN7EXAMPLE")).toBe(
      "aws configure set [redacted]",
    );
    expect(redactCommand("echo AKIASHORT")).toBe("echo AKIASHORT");
  });

  it("Rule 2.5e: redacts xox[abprs]- tokens with 10+ chars", () => {
    const slack = "xoxb-1234567890-abcdefghij";
    expect(redactCommand(`curl -H 'x: ${slack}'`)).toBe(
      "curl -H 'x: [redacted]'",
    );
    expect(redactCommand("echo xoxb-short")).toBe("echo xoxb-short");
  });

  it("Rule 2.5f: redacts JWT-looking tokens", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    expect(redactCommand(`echo ${jwt}`)).toBe("echo [redacted]");
  });

  it("Rule 2.5g: redacts any other run of 40+ characters from [A-Za-z0-9+/_=-]", () => {
    const secret40 = "aW52YWxpZF9zZWNyZXRfdG9rZW5fZm9yX3Rlc3Rpbmc9"; // 44 chars
    expect(redactCommand(`token: ${secret40}`)).toBe("token: [redacted]");

    const run39 = "A".repeat(39);
    expect(redactCommand(`run: ${run39}`)).toBe(`run: ${run39}`);
  });

  it("Rule 2.5g: redacts a 40-character hex run but keeps long paths, routes and lowercase identifiers", () => {
    const sha = "0123456789abcdef0123456789abcdef01234567";
    expect(redactCommand(`git show ${sha}`)).toBe("git show [redacted]");

    const longPath =
      "/Users/nguyenhuyhoang/OtherProjects/agent-skills-standard/mcp/src/retrospective/permission-requests.ts";
    expect(redactCommand(`cat ${longPath}`)).toBe(`cat ${longPath}`);

    const route = "xd://mcp__agent_skills_standard_load_skills_for_files";
    expect(redactCommand(`Path: ${route}`)).toBe(`Path: ${route}`);

    const dated =
      ".agent/sdd/2026-10-11-untrusted-workspace-admission-implementation.md";
    expect(redactCommand(`File: ${dated}`)).toBe(`File: ${dated}`);

    const camel = "ThisIsAVeryLongCamelCaseIdentifierNameWithoutAnyDigitsAtAll";
    expect(redactCommand(`import ${camel}`)).toBe(`import ${camel}`);
  });

  it("Rule 2.5 preservation: preserves paths with / and dots, -p flag, and --version", () => {
    const path = "/Users/x/secret/file.txt";
    expect(redactCommand(`cat ${path}`)).toBe(`cat ${path}`);
    expect(redactCommand("ls -la -p /tmp/secret")).toBe(
      "ls -la -p /tmp/secret",
    );
    expect(redactCommand("python3 --version")).toBe("python3 --version");
  });

  it("preserves newlines in multi-line heredoc text", () => {
    const heredoc = `cat <<EOF\nline 1\nAuthorization: Bearer secret_token\nline 3\nEOF`;
    const expected = `cat <<EOF\nline 1\nAuthorization: [redacted]\nline 3\nEOF`;
    expect(redactCommand(heredoc)).toBe(expected);
  });

  it("Rule 3: truncates to MAX_COMMAND_CHARS without splitting surrogate pairs and appends …[truncated]", () => {
    const text2500 = "a ".repeat(1250);
    const res = redactCommand(text2500);
    expect(res).toBe("a ".repeat(1000) + "…[truncated]");

    // Test surrogate pair boundary at MAX_COMMAND_CHARS - 1
    const emoji = "😀"; // \uD83D\uDE00
    const withSurrogateAtBoundary =
      "b ".repeat(999) + "b" + emoji + "c ".repeat(5);
    const resSurrogate = redactCommand(withSurrogateAtBoundary);
    expect(resSurrogate).toBe("b ".repeat(999) + "b" + "…[truncated]");
  });

  it("is idempotent: redactCommand(redactCommand(x)) === redactCommand(x)", () => {
    const inputs = [
      "API_KEY=abc123 curl x",
      "Authorization: Bearer abc.def",
      "https://u:p@h/x",
      "--password=hunter2 --token secret",
      "cat /Users/x/secret/file.txt -p --version",
      "a ".repeat(1250),
      `cat <<EOF\nAuthorization: Bearer token\nEOF`,
    ];

    for (const inp of inputs) {
      const once = redactCommand(inp);
      const twice = redactCommand(once);
      expect(twice).toBe(once);
    }
  });
});
