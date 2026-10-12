import { basics, checkField, type Integration, integrations, type Values } from "./integrations";

/*
 * The conversation about outside services. The reader is passed in, so the same code runs against
 * a terminal and against scripted answers in a test. It changes `services` in place.
 */

export type Reader = { question: (text: string) => Promise<string> };

const SECRET_NAME = /KEY|SECRET|TOKEN|CREDENTIALS/;

/** Runs the steps one after the other; each one waits for the person's answer. */
const inOrder = <T>(items: readonly T[], step: (item: T) => Promise<void>) =>
  items.reduce((chain, item) => chain.then(() => step(item)), Promise.resolve());

async function askYesNo(reader: Reader, question: string, fallback: boolean): Promise<boolean> {
  const answer = (await reader.question(`${question} (y/n) [${fallback ? "y" : "n"}]: `))
    .trim()
    .toLowerCase();
  return answer === "" ? fallback : answer.startsWith("y");
}

function shownDefault(name: string, kept: string | undefined): string {
  if (kept === undefined) {
    return "";
  }
  return SECRET_NAME.test(name) ? " [kept, Enter keeps it]" : ` [${kept}]`;
}

/** Asks for one value until it passes its check. A stored secret is never printed back. */
async function askValue(
  reader: Reader,
  write: (text: string) => void,
  services: Values,
  field: { name: string; label: string; optional?: boolean },
): Promise<void> {
  const kept = services[field.name];
  const tail = field.optional === true ? " (optional)" : "";
  const answer = (
    await reader.question(`  ${field.label}${tail}${shownDefault(field.name, kept)}: `)
  ).trim();
  const value = answer === "" ? (kept ?? "") : answer;
  const complaint = value === "" ? null : checkField(field.name, value);
  if (complaint !== null) {
    write(`  ${field.name} ${complaint}\n`);
    return askValue(reader, write, services, field);
  }
  if (value === "" && field.optional !== true) {
    write("  This one is needed.\n");
    return askValue(reader, write, services, field);
  }
  if (value === "") {
    delete services[field.name];
  } else {
    services[field.name] = value;
  }
  return undefined;
}

async function askIntegration(
  reader: Reader,
  write: (text: string) => void,
  services: Values,
  integration: Integration,
): Promise<void> {
  const already = integration.fields.some((field) => services[field.name] !== undefined);
  if (!(await askYesNo(reader, integration.question, already))) {
    for (const field of integration.fields) {
      delete services[field.name];
    }
    return;
  }
  if (integration.note !== undefined) {
    write(`  ${integration.note}\n`);
  }
  await inOrder(integration.fields, (field) => askValue(reader, write, services, field));
}

const clerk = integrations.find((item) => item.id === "clerk");

/** The optional services: Google sign-in only makes sense when the app signs people in itself. */
const optionalServices = (usesClerk: boolean) =>
  integrations.filter((item) => item.id !== "clerk" && (item.id !== "google" || !usesClerk));

export async function askServices(
  reader: Reader,
  write: (text: string) => void,
  services: Values,
): Promise<void> {
  const proceed = await askYesNo(
    reader,
    "\nSet up the outside services now?",
    Object.keys(services).length > 0,
  );
  if (!proceed) {
    return;
  }
  write(
    "\nThe answers go to a file git ignores, to be copied into the hosting panel. Answer n to skip a service.\n\n",
  );
  const [address, ...others] = basics;
  if (address !== undefined) {
    await askValue(reader, write, services, address);
  }
  const usesClerk = await askYesNo(
    reader,
    "Sign-in through Clerk? (n: the app signs people in itself)",
    services["AUTH_PROVIDER"] !== "local",
  );
  services["AUTH_PROVIDER"] = usesClerk ? "clerk" : "local";
  // Clerk is the sign-in itself, so its keys are asked straight away instead of as an option.
  if (usesClerk && clerk !== undefined) {
    await inOrder(clerk.fields, (field) => askValue(reader, write, services, field));
  }
  await inOrder(optionalServices(usesClerk), (integration) =>
    askIntegration(reader, write, services, integration),
  );
  await inOrder(others, (field) => askValue(reader, write, services, field));
}
