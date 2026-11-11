import { PolicyEditor, type EditorSlots } from "./PolicyEditor";
import { TryItPanel } from "./try-it/TryItPanel";

/** The editor with its panels plugged in. */
const slots: EditorSlots = {
  side: (ctx) => <TryItPanel {...ctx} />,
};

export function PolicyEditorPage() {
  return <PolicyEditor slots={slots} />;
}
