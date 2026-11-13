import { useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, SlidersHorizontal } from "lucide-react";
import type { Field, Issue, Rule, RuleSet } from "@peng/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldsDrawer } from "./FieldsDrawer";
import { ResultEditor } from "./ResultEditor";
import { RuleCard } from "./RuleCard";

const newRuleId = () => `r_${Math.random().toString(36).slice(2, 8)}`;

/** Ordered rules (first match wins), then the fixed "Otherwise" card, then the fields/results summary. */
export function RuleList({ ruleSet, issues, onChange, disabled }: { ruleSet: RuleSet; issues: Issue[]; onChange(rs: RuleSet): void; disabled?: boolean }) {
  const [drawer, setDrawer] = useState(false);
  // A small delay + tolerance before a drag starts, so scrolling the rule list on a touchscreen doesn't get mistaken for a reorder.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const addField = (f: Field) => onChange({ ...ruleSet, fields: [...ruleSet.fields, f] });
  const setRule = (i: number, r: Rule) => onChange({ ...ruleSet, rules: ruleSet.rules.map((x, j) => (j === i ? r : x)) });

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ruleSet.rules.findIndex((r) => r.id === e.active.id);
    const to = ruleSet.rules.findIndex((r) => r.id === e.over!.id);
    onChange({ ...ruleSet, rules: arrayMove(ruleSet.rules, from, to) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Rules are checked top to bottom. The first one that matches decides.</p>
        <Button variant="outline" size="sm" onClick={() => setDrawer(true)}>
          <SlidersHorizontal aria-hidden /> Fields ({ruleSet.fields.length}) · Results ({ruleSet.outcomes.length})
        </Button>
      </div>

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
              onCreateField={addField}
              onChange={(r) => setRule(i, r)}
              onRemove={() => onChange({ ...ruleSet, rules: ruleSet.rules.filter((_, j) => j !== i) })}
            />
          ))}
        </SortableContext>
      </DndContext>

      {!disabled && (
        <Button
          variant="outline"
          className="border-dashed"
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
      )}

      <Card className="bg-muted/40" aria-label="Otherwise">
        <CardContent className="flex flex-col gap-3">
          <span className="text-sm font-medium">Otherwise (no rule matched)</span>
          <ResultEditor
            ruleSet={ruleSet}
            result={ruleSet.otherwise}
            disabled={disabled}
            idPrefix="otherwise"
            reasonError={issues.find((i) => i.path.startsWith("otherwise"))?.message}
            onChange={(otherwise) => onChange({ ...ruleSet, otherwise })}
          />
        </CardContent>
      </Card>

      <FieldsDrawer open={drawer} onOpenChange={setDrawer} ruleSet={ruleSet} onChange={onChange} disabled={disabled} />
    </div>
  );
}
