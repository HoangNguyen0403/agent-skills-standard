/**
 * Offline Access Control Fixture
 *
 * Package-local pure ESM functions providing characterized synthetic access control evaluation.
 * Conforms to approved SRS LLD-POLICY and LLD-EXAMPLE contracts.
 */

function cloneResources(resources) {
  const next = {};
  for (const [key, res] of Object.entries(resources)) {
    next[key] = { ...res };
  }
  return next;
}

function makeDeny(resources) {
  return {
    response: {
      verdict: 'deny',
      resource: null,
      error: 'access-denied'
    },
    nextResources: cloneResources(resources)
  };
}

function makeAllowRead(target, resources) {
  return {
    response: {
      verdict: 'allow',
      resource: {
        id: target.id,
        tenantId: target.tenantId,
        value: target.value
      },
      error: null
    },
    nextResources: cloneResources(resources)
  };
}

function makeAllowUpdate(target, value, resources) {
  const next = cloneResources(resources);
  next[target.id] = {
    ...target,
    value
  };
  return {
    response: {
      verdict: 'allow',
      resource: {
        id: target.id,
        tenantId: target.tenantId,
        value
      },
      error: null
    },
    nextResources: next
  };
}

/**
 * Deliberately vulnerable access evaluation:
 * - Omits tenant isolation check entirely.
 * - Trusts untrusted request.claimedRole if present.
 * - Allows read for viewer or editor.
 * - Allows update for editor (or claimed editor).
 */
export function evaluateVulnerableAccess({ principal, request, resources }) {
  if (!Object.hasOwn(resources, request.resourceId)) {
    return makeDeny(resources);
  }
  const target = resources[request.resourceId];

  const effectiveRole = request.claimedRole || principal.role;

  if (request.action === 'read') {
    return makeAllowRead(target, resources);
  }

  if (request.action === 'update') {
    if (effectiveRole === 'editor') {
      return makeAllowUpdate(target, request.value, resources);
    }
    return makeDeny(resources);
  }

  return makeDeny(resources);
}

/**
 * Normative fixed access evaluation:
 * - Rule P1: Enforces tenant isolation (principal.tenantId === target.tenantId). Mismatch denies immediately.
 * - Rule P2: Viewer permitted read, denied update.
 * - Rule P3: Editor permitted read and update.
 * - Untrusted request.claimedRole is ignored for authority.
 */
export function evaluateFixedAccess({ principal, request, resources }) {
  if (!Object.hasOwn(resources, request.resourceId)) {
    return makeDeny(resources);
  }
  const target = resources[request.resourceId];

  // Rule P1: Cross-tenant access is strictly denied
  if (principal.tenantId !== target.tenantId) {
    return makeDeny(resources);
  }

  // Trusted role enforcement (Rule P2 and P3)
  const role = principal.role;

  if (request.action === 'read') {
    if (role === 'viewer' || role === 'editor') {
      return makeAllowRead(target, resources);
    }
    return makeDeny(resources);
  }

  if (request.action === 'update') {
    if (role === 'editor') {
      return makeAllowUpdate(target, request.value, resources);
    }
    return makeDeny(resources);
  }

  return makeDeny(resources);
}
