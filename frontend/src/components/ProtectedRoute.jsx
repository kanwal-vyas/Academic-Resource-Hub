import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function ProtectedRoute({ children }) {
  const { user } = useAuth();

  const canUpload = user && user.role === "authenticated";

  if (!canUpload) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;