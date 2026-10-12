import { planExpiringMessage } from "./plan-emails";

// Preview only: `pnpm email:preview` renders the default export of each file in this folder.
export default function PlanExpiringPreview() {
  return planExpiringMessage({
    name: "Ana",
    endsOn: "09/10/2027",
    plansUrl: "http://localhost:47300/planos",
  }).element;
}
