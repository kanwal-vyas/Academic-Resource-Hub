export function resolveContributor(req, bodyContributorId) {
  // If no auth, fallback to body (temporary compatibility)
  if (!req.user) {
    return bodyContributorId;
  }

  // Admin override
  if (req.user.role === "admin") {
    return bodyContributorId;
  }

  // Everyone else: server decides
  return req.user.id;
}
