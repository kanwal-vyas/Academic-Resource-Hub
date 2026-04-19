import { useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../context/ToastContext";
import { API_BASE_URL } from "../utils/api";

function NotificationListener() {
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Use a URL constructor to ensure we only have the origin
    const socketUrl = API_BASE_URL.replace('/api', ''); 
    const socket = io(socketUrl, {
      withCredentials: true
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected for notifications");
    });

    socket.on("resource:verified", (data) => {
      console.log("[Socket] Notification received:", data);
      
      const userCourseId = user.user_metadata?.course_id;
      
      // Notify if the course matches or if it's a general notification
      // (We can expand logic here later)
      if (userCourseId && data.courseId === userCourseId) {
        showToast(
          `New Resource: "${data.title}" has been verified for your course!`,
          "success",
          6000
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, showToast]);

  return null; // This component doesn't render anything
}

export default NotificationListener;
