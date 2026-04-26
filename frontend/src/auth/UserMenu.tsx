import { UserButton } from "@clerk/clerk-react";

const ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function UserMenu() {
  if (!ENABLED) return null;
  return <UserButton afterSignOutUrl="/" />;
}
