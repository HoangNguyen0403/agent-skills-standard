/**
 * Multi-tenant document service.
 *
 * NOTE: This is an incomplete/insecure fixture implementation intended for
 * task-evaluation benchmarks.
 */

class AuthorizationError extends Error {
  constructor(message) {
    super(message || "Unauthorized access");
    this.name = "AuthorizationError";
  }
}

class DocumentService {
  constructor() {
    this.documents = new Map();
  }

  seed(docs) {
    for (const doc of docs) {
      this.documents.set(doc.id, { ...doc });
    }
  }

  getDocument(user, docId) {
    const doc = this.documents.get(docId);
    if (!doc) return null;
    // VULNERABILITY: Does not enforce tenant isolation (doc.tenantId === user.tenantId).
    // VULNERABILITY: Does not check restricted flag against viewer role.
    return { ...doc };
  }

  createDocument(user, docData) {
    // VULNERABILITY: Allows viewer role to create documents (should require editor or admin).
    // VULNERABILITY: Allows caller-supplied tenantId to override user.tenantId (spoofing).
    const doc = {
      id: docData.id || String(Date.now()),
      tenantId: docData.tenantId || user.tenantId,
      title: docData.title || "",
      content: docData.content || "",
      restricted: Boolean(docData.restricted),
    };
    this.documents.set(doc.id, doc);
    return { ...doc };
  }

  updateDocument(user, docId, updates) {
    const doc = this.documents.get(docId);
    if (!doc) throw new Error("Document not found");
    // VULNERABILITY: Does not verify tenant isolation.
    // VULNERABILITY: Allows changing tenantId.
    // VULNERABILITY: Allows viewer role to perform updates.
    Object.assign(doc, updates);
    return { ...doc };
  }

  deleteDocument(user, docId) {
    const doc = this.documents.get(docId);
    if (!doc) return false;
    // VULNERABILITY: Does not verify tenant isolation.
    // VULNERABILITY: Allows non-admin role to delete documents.
    return this.documents.delete(docId);
  }

  listDocuments(user) {
    const results = [];
    for (const doc of this.documents.values()) {
      // VULNERABILITY: Leaks all tenants' documents if user has 'admin' role!
      if (user.roles && user.roles.includes("admin")) {
        results.push({ ...doc });
      } else if (doc.tenantId === user.tenantId) {
        results.push({ ...doc });
      }
    }
    return results;
  }
}

module.exports = { DocumentService, AuthorizationError };
