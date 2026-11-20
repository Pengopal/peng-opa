import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { AuthCard } from "@/pages/auth/AuthCard";

/** Any address no route answers: says so, and offers the way back home. */
export function NotFound() {
  return (
    <AuthCard title="Page not found" description="There is no page at this address. It may have moved, or the link may be wrong.">
      <Link to="/" className={buttonVariants({ className: "w-full" })}>
        Go to the home page
      </Link>
    </AuthCard>
  );
}
