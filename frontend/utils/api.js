import { supabase } from "../supabaseClient";

export async function apiFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Request failed");
  }

  return result;
}
