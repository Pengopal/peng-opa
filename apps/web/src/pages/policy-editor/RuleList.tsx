import { useEffect, useRef, useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, SlidersHorizontal } from "lucide-react";
import type { Field, Issue, Rule, RuleSet } from "@peng/shared";
import { Button } from "@/components/ui/button";
import { FieldsDrawer } from "./FieldsDrawer";
import { ResultEditor } from "./ResultEditor";
import { RuleCard } from "./RuleCard";

const newRuleId = () => `r_${Math.random().toString(36).slice(2, 8)}`;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Ordered rules (first match wins), then the fixed "Otherwise" row, as one divided list. */
export function RuleList({
  ruleSet,
  issues,
  onChange,
  disabled,
  matchedRuleId = null,
  runId = 0,
}: {
  ruleSet: RuleSet;
  issues: Issue[];
  onChange(rs: RuleSet): void;
  disabled?: boolean;
  /** Rule the last draft Try-it run matched. */
  matchedRuleId?: string | null;
  /** Changes on every Try-it run, so the same match animates again. */
  runId?: number;
}) {
  const [drawer, setDrawer] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  // A small delay + tolerance before a drag starts, so scrolling the rule list on a touchscreen doesn't get mistaken for a reorder.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const addField = (f: Field) => onChange({ ...ruleSet, fields: [...ruleSet.fields, f] });
  const setRule = (i: number, r: Rule) => onChange({ ...ruleSet, rules: ruleSet.rules.map((x, j) => (j === i ? r : x)) });

  // Show the path the run took: bring the matched rule into view and briefly dim the rules it passed over.
  useEffect(() => {
    if (!matchedRuleId || !listRef.current) return;
    const rows = Array.from(listRef.current.querySelectorAll<HTMLElement>("[data-rule-id]"));
    const at = rows.findIndex((el) => el.dataset.ruleId === matchedRuleId);
    if (at < 0) return;
    const still = reducedMotion();
    rows[at].scrollIntoView?.({ block: "nearest", behavior: still ? "auto" : "smooth" });
    if (!still) rows.slice(0, at).forEach((el) => el.animate?.([{ opacity: 0.6 }, { opacity: 1 }], { duration: 600, easing: "ease-out" }));
    // Run only when a new result arrives, not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedRuleId, runId]);

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ruleSet.rules.findIndex((r) => r.id === e.active.id);
    const to = ruleSet.rules.findIndex((r) => r.id === e.over!.id);
    onChange({ ...ruleSet, rules: arrayMove(ruleSet.rules, from, to) });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-muted-foreground">Checked top to bottom. The first rule that matches decides.</p>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setDrawer(true)}>
          <SlidersHorizontal aria-hidden /> Fields ({ruleSet.fields.length}) · Results ({ruleSet.outcomes.length})
        </Button>
      </div>

      <div ref={listRef} className="divide-y border-y">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ruleSet.rules.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            {ruleSet.rules.map((rule, i) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                index={i}
                ruleSet={ruleSet}
                issues={issues}
                disabled={disabled}
                matched={rule.id === matchedRuleId}
                onCreateField={addField}
                onChange={(r) => setRule(i, r)}
                onRemove={() => onChange({ ...ruleSet, rules: ruleSet.rules.filter((_, j) => j !== i) })}
              />
            ))}
          </SortableContext>
        </DndContext>

        {!disabled && (
          <div className="py-2 pl-10">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() =>
                onChange({
                  ...ruleSet,
                  rules: [
                    ...ruleSet.rules,
                    {
                      id: newRuleId(),
                      label: `Rule ${ruleSet.rules.length + 1}`,
                      match: "all",
                      conditions: [{ field: ruleSet.fields[0]?.path ?? "", op: "is", value: "" }],
                      result: { allowed: true, reason: "", outcomes: {} },
                    },
                  ],
                })
              }
            >
              <Plus aria-hidden /> Add rule
            </Button>
          </div>
        )}

        <section aria-label="Otherwise" className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-y-3 bg-muted/40 py-4 pr-3">
          <span aria-hidden />
          <div className="flex min-w-0 flex-col gap-3">
            <p className="px-1.5 text-sm font-medium">
              Otherwise <span className="font-normal text-muted-foreground">— no rule matched</span>
            </p>
            <div className="pl-1.5">
              <ResultEditor
                ruleSet={ruleSet}
                result={ruleSet.otherwise}
                disabled={disabled}
                idPrefix="otherwise"
                lead=""
                reasonError={issues.find((i) => i.path.startsWith("otherwise"))?.message}
                onChange={(otherwise) => onChange({ ...ruleSet, otherwise })}
              />
            </div>
          </div>
        </section>
      </div>

      <FieldsDrawer open={drawer} onOpenChange={setDrawer} ruleSet={ruleSet} onChange={onChange} disabled={disabled} />
    </div>
  );
}
