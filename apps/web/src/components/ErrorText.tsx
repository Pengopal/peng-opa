import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiError } from "@/lib/api";

/** The one way a failed request is shown inside a page or dialog. */
export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof ApiError || error instanceof Error ? error.message : "Something went wrong";
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
