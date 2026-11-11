import { Injectable } from "@nestjs/common";
import type { AuditWriter, DecisionRecord } from "./audit-writer.js";

/** Placeholder writer that keeps the last records in memory (replaced by the database writer). */
@Injectable()
export class MemoryAuditWriter implements AuditWriter {
  readonly records: DecisionRecord[] = [];

  enqueue(record: DecisionRecord): void {
    this.records.push(record);
    if (this.records.length > 1000) this.records.shift();
  }
}
