export function isAdmin(req) {
  return req.user && req.user.role === "admin";
}
