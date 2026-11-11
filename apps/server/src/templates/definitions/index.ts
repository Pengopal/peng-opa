import type { Template } from "../template.types.js";
import { adminConsoleAccess, featureAccessByPlan, workingHoursAccess } from "./access.js";
import { checkoutDiscount, freeShipping, refundApproval } from "./commerce.js";
import { expenseAutoApproval, leaveRequestApproval, loanPreApproval } from "./finance-hr.js";

/** The v1 gallery, in display order. */
export const TEMPLATES: Template[] = [
  checkoutDiscount,
  freeShipping,
  refundApproval,
  adminConsoleAccess,
  featureAccessByPlan,
  workingHoursAccess,
  loanPreApproval,
  expenseAutoApproval,
  leaveRequestApproval,
];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);
