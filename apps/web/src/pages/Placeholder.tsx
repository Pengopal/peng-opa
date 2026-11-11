import { PageHeader } from "@/components/PageHeader";

/** Temporary page body for sections built by later tasks. */
export function Placeholder({ title }: { title: string }) {
  return <PageHeader title={title} description="Coming next." />;
}
