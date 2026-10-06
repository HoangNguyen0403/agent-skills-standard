#!/usr/bin/env node
/**
 * Trusted Verifier for Cross-Tenant Authorization Task.
 *
 * This verifier runs OUTSIDE the mutable workspace and exercises
 * adversarial tenant boundaries, role-based controls, state immutability,
 * and positive same-tenant operations.
 *
 * Usage:
 *   node verify-authorization.js <workspacePath>
 */

const path = require("node:path");
const assert = require("node:assert/strict");

const workspacePath = process.argv[2];
if (!workspacePath) {
  console.error("Usage: node verify-authorization.js <workspacePath>");
  process.exit(1);
}

const modulePath = path.resolve(workspacePath, "src", "service.js");

let DocumentService;
let AuthorizationError;
try {
  const mod = require(modulePath);
  DocumentService = mod.DocumentService;
  AuthorizationError = mod.AuthorizationError;
  assert.equal(
    typeof DocumentService,
    "function",
    "Module must export a 'DocumentService' class.",
  );
  assert.equal(
    typeof AuthorizationError,
    "function",
    "Module must export an 'AuthorizationError' class.",
  );
} catch (err) {
  console.error(`FAILED: Failed to load authorization service: ${err.message}`);
  process.exit(1);
}

function isAuthError(err) {
  return err instanceof AuthorizationError;
}

function createSeededService() {
  const svc = new DocumentService();
  svc.seed([
    {
      id: "doc-t1-public",
      tenantId: "tenant-1",
      title: "T1 Public",
      content: "Alpha",
      restricted: false,
    },
    {
      id: "doc-t1-secret",
      tenantId: "tenant-1",
      title: "T1 Secret",
      content: "Beta",
      restricted: true,
    },
    {
      id: "doc-t2-public",
      tenantId: "tenant-2",
      title: "T2 Public",
      content: "Gamma",
      restricted: false,
    },
    {
      id: "doc-t2-secret",
      tenantId: "tenant-2",
      title: "T2 Secret",
      content: "Delta",
      restricted: true,
    },
  ]);
  return svc;
}

const testCases = [
  {
    name: "Adversarial: Cross-tenant read access MUST throw AuthorizationError (never null or leak)",
    run: () => {
      const svc = createSeededService();
      const userT1 = { id: "u1", tenantId: "tenant-1", roles: ["viewer"] };

      for (const docId of ["doc-t2-public", "doc-t2-secret"]) {
        assert.throws(
          () => svc.getDocument(userT1, docId),
          (err) => err instanceof AuthorizationError,
          `Cross-tenant read of ${docId} must throw AuthorizationError`,
        );
      }

      assert.equal(
        svc.getDocument(userT1, "doc-does-not-exist"),
        null,
        "Non-existent document should return null",
      );
    },
  },
  {
    name: "Adversarial: Cross-tenant update is denied and leaves target state unchanged",
    run: () => {
      const svc = createSeededService();
      const userT1 = { id: "u2", tenantId: "tenant-1", roles: ["editor"] };

      assert.throws(
        () => {
          svc.updateDocument(userT1, "doc-t2-public", { title: "Hacked Title" });
        },
        (err) => isAuthError(err),
        "Cross-tenant update must throw AuthorizationError",
      );

      // Verify tenant-2 doc remains untouched
      const adminT2 = { id: "admin-2", tenantId: "tenant-2", roles: ["admin"] };
      const doc = svc.getDocument(adminT2, "doc-t2-public");
      assert.equal(doc.title, "T2 Public", "Tenant-2 document must not be mutated");
    },
  },
  {
    name: "Adversarial: Cross-tenant delete is denied even for admin, target remains intact",
    run: () => {
      const svc = createSeededService();
      const adminT1 = { id: "u3", tenantId: "tenant-1", roles: ["admin"] };

      assert.throws(
        () => {
          svc.deleteDocument(adminT1, "doc-t2-public");
        },
        (err) => isAuthError(err),
        "Cross-tenant delete must throw AuthorizationError",
      );

      const adminT2 = { id: "admin-2", tenantId: "tenant-2", roles: ["admin"] };
      const doc = svc.getDocument(adminT2, "doc-t2-public");
      assert.ok(doc, "Tenant-2 document must not be deleted");
    },
  },
  {
    name: "Adversarial: Tenant spoofing on creation is prevented in return and stored state",
    run: () => {
      const svc = createSeededService();
      const userT1 = { id: "u4", tenantId: "tenant-1", roles: ["editor"] };

      // User tries to spoof tenant-2 on create
      const created = svc.createDocument(userT1, {
        id: "doc-spoofed",
        tenantId: "tenant-2",
        title: "Spoofed Document",
        content: "Payload",
      });

      assert.equal(
        created.tenantId,
        "tenant-1",
        "Created document return value must have tenantId forced to 'tenant-1'",
      );

      // Verify stored state in service: must be stored under tenant-1, not tenant-2
      const adminT1 = { id: "admin-1", tenantId: "tenant-1", roles: ["admin"] };
      const storedT1 = svc.getDocument(adminT1, "doc-spoofed");
      assert.ok(storedT1, "Document must be stored in tenant-1");
      assert.equal(storedT1.tenantId, "tenant-1", "Stored document tenantId must be 'tenant-1'");

      // Verify tenant-2 user cannot access the spoofed document
      const adminT2 = { id: "admin-2", tenantId: "tenant-2", roles: ["admin"] };
      assert.throws(
        () => svc.getDocument(adminT2, "doc-spoofed"),
        (err) => isAuthError(err),
        "Tenant-2 user must not be able to access document created by tenant-1",
      );
    },
  },
  {
    name: "Adversarial: Tenant ID is immutable on update",
    run: () => {
      const svc = createSeededService();
      const editorT1 = { id: "u5", tenantId: "tenant-1", roles: ["editor"] };

      // Attempt to change tenantId via update
      try {
        svc.updateDocument(editorT1, "doc-t1-public", {
          tenantId: "tenant-2",
          title: "Moved Doc",
        });
      } catch (err) {
        // Throwing AuthorizationError on attempted tenant change is acceptable
        assert.ok(isAuthError(err));
      }

      // In all cases, stored document MUST remain under tenant-1
      const adminT1 = { id: "admin-1", tenantId: "tenant-1", roles: ["admin"] };
      const doc = svc.getDocument(adminT1, "doc-t1-public");
      assert.equal(doc.tenantId, "tenant-1", "Document tenantId must remain 'tenant-1'");
    },
  },
  {
    name: "Adversarial: Cross-tenant listing isolation (admin cannot see other tenants)",
    run: () => {
      const svc = createSeededService();
      const adminT1 = { id: "admin-1", tenantId: "tenant-1", roles: ["admin"] };

      const list = svc.listDocuments(adminT1);
      assert.ok(list.length > 0, "Admin should see own tenant documents");
      for (const doc of list) {
        assert.equal(
          doc.tenantId,
          "tenant-1",
          `Cross-tenant document leak in list: found document belonging to ${doc.tenantId}`,
        );
      }
    },
  },
  {
    name: "Role boundary: Viewer role cannot create, update, or delete; state untouched",
    run: () => {
      const svc = createSeededService();
      const viewerT1 = { id: "v1", tenantId: "tenant-1", roles: ["viewer"] };

      assert.throws(
        () => svc.createDocument(viewerT1, { id: "v-new", title: "New" }),
        (err) => isAuthError(err),
        "Viewer cannot create document",
      );
      assert.equal(svc.getDocument(viewerT1, "v-new"), null, "Failed create must not store document");

      assert.throws(
        () => svc.updateDocument(viewerT1, "doc-t1-public", { title: "Viewer Updated" }),
        (err) => isAuthError(err),
        "Viewer cannot update document",
      );

      assert.throws(
        () => svc.deleteDocument(viewerT1, "doc-t1-public"),
        (err) => isAuthError(err),
        "Viewer cannot delete document",
      );

      const adminT1 = { id: "admin-1", tenantId: "tenant-1", roles: ["admin"] };
      const adminT2 = { id: "admin-2", tenantId: "tenant-2", roles: ["admin"] };
      assert.equal(svc.getDocument(adminT1, "v-new"), null, "Denied create must not persist for tenant 1");
      assert.equal(svc.getDocument(adminT2, "v-new"), null, "Denied create must not persist for tenant 2");
      assert.equal(
        svc.listDocuments(adminT1).some((doc) => doc.id === "v-new"),
        false,
        "Denied create must not expose a document in tenant 1's listing",
      );
      assert.equal(
        svc.listDocuments(adminT2).some((doc) => doc.id === "v-new"),
        false,
        "Denied create must not expose a document in tenant 2's listing",
      );

      const doc = svc.getDocument(adminT1, "doc-t1-public");
      assert.equal(doc.title, "T1 Public", "Document title must remain untouched after denied viewer update");
    },
  },
  {
    name: "Role boundary: Restricted document requires editor or admin",
    run: () => {
      const svc = createSeededService();
      const viewerT1 = { id: "v1", tenantId: "tenant-1", roles: ["viewer"] };
      const editorT1 = { id: "e1", tenantId: "tenant-1", roles: ["editor"] };

      assert.throws(
        () => svc.getDocument(viewerT1, "doc-t1-secret"),
        (err) => isAuthError(err),
        "Viewer cannot access restricted document",
      );

      const doc = svc.getDocument(editorT1, "doc-t1-secret");
      assert.ok(doc, "Editor should access restricted document");
      assert.equal(doc.id, "doc-t1-secret");
    },
  },
  {
    name: "Role boundary: Editor cannot delete (admin only)",
    run: () => {
      const svc = createSeededService();
      const editorT1 = { id: "e1", tenantId: "tenant-1", roles: ["editor"] };
      const adminT1 = { id: "a1", tenantId: "tenant-1", roles: ["admin"] };

      assert.throws(
        () => svc.deleteDocument(editorT1, "doc-t1-public"),
        (err) => isAuthError(err),
        "Editor cannot delete document",
      );

      const docBefore = svc.getDocument(adminT1, "doc-t1-public");
      assert.ok(docBefore, "Document must remain before admin delete");

      const deleted = svc.deleteDocument(adminT1, "doc-t1-public");
      assert.equal(deleted, true, "Admin can delete document");

      const docAfter = svc.getDocument(adminT1, "doc-t1-public");
      assert.equal(docAfter, null, "Document must be gone after admin delete");
    },
  },
  {
    name: "Positive: Authorized same-tenant operations succeed",
    run: () => {
      const svc = createSeededService();
      const viewerT1 = { id: "v1", tenantId: "tenant-1", roles: ["viewer"] };
      const editorT1 = { id: "e1", tenantId: "tenant-1", roles: ["editor"] };

      // Viewer can read public document
      const pubDoc = svc.getDocument(viewerT1, "doc-t1-public");
      assert.ok(pubDoc, "Viewer should read public document");
      assert.equal(pubDoc.title, "T1 Public");

      // Editor can create new document
      const created = svc.createDocument(editorT1, {
        id: "doc-pos-1",
        title: "Positive Doc",
        content: "Valid content",
        restricted: false,
      });
      assert.equal(created.id, "doc-pos-1");
      assert.equal(created.tenantId, "tenant-1");

      // Editor can update document
      const updated = svc.updateDocument(editorT1, "doc-pos-1", {
        title: "Updated Positive Doc",
      });
      assert.equal(updated.title, "Updated Positive Doc");

      const readBack = svc.getDocument(viewerT1, "doc-pos-1");
      assert.equal(readBack.title, "Updated Positive Doc");
    },
  },
];

let failed = 0;
for (const tc of testCases) {
  try {
    tc.run();
    console.log(`[PASS] ${tc.name}`);
  } catch (err) {
    failed++;
    console.error(`[FAIL] ${tc.name}: ${err.message}`);
  }
}

if (failed > 0) {
  console.error(`\nVerifier failed with ${failed} failed check(s).`);
  process.exit(1);
} else {
  console.log(`\nVerifier succeeded: All ${testCases.length} checks passed.`);
  process.exit(0);
}
