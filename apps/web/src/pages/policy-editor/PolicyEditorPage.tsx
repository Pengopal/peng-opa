import { PolicyEditor, type EditorSlots } from "./PolicyEditor";
import { PolicySettingsTab } from "./PolicySettingsTab";
import { PublishDialog } from "./PublishDialog";
import { RegoView } from "./RegoView";
import { TryItPanel } from "./try-it/TryItPanel";
import { VersionsTab } from "./VersionsTab";

/** The editor with its panels plugged in. */
const slots: EditorSlots = {
  side: (ctx, bare) => <TryItPanel {...ctx} bare={bare} />,
  actions: (ctx) => (
    <>
      <RegoView {...ctx} />
      {ctx.canEdit && <PublishDialog {...ctx} />}
    </>
  ),
  versions: (ctx) => <VersionsTab {...ctx} />,
  settings: (ctx) => <PolicySettingsTab {...ctx} />,
};

export function PolicyEditorPage() {
  return <PolicyEditor slots={slots} />;
}
