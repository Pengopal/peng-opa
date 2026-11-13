import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataList } from "./DataList";

type Row = { id: string; name: string };
const rows: Row[] = [
  { id: "a", name: "Checkout discount" },
  { id: "b", name: "Admin console access" },
];

function renderList(onOpen = vi.fn()) {
  render(
    <DataList
      label="Decisions"
      rows={rows}
      rowKey={(r) => r.id}
      columns={[{ header: "Policy", cell: (r) => r.name }]}
      card={{ title: (r) => r.name }}
      onOpen={onOpen}
    />,
  );
  return onOpen;
}

afterEach(() => {
  // @ts-expect-error test cleanup of the stub
  delete window.matchMedia;
});

test("shows a table on desktop", () => {
  renderList();
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Policy" })).toBeInTheDocument();
});

test("shows cards on phones and opens a row", async () => {
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  const onOpen = renderList();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  const list = screen.getByRole("list", { name: "Decisions" });
  await userEvent.click(list.querySelector("button")!);
  expect(onOpen).toHaveBeenCalledWith(rows[0]);
});
