---
name: new-action
description: Add a server action. Use when the browser must change something on the server, such as saving, sending, deleting or changing a state.
---

# New action

The reference is `features/contact/actions.ts`. An action is built with `actionFor(role)` from
`lib/actions/client.ts`, never by hand, and never repeats a guard or a validation.

```
export const setContactStatus = actionFor("staff")
  .inputSchema(z.object({ id: z.uuid(), status: z.enum(contactStatuses) }))
  .action(async ({ parsedInput, ctx }) => { ... });
```

Rules:

1. **The role is the argument.** `actionFor("member")` for a signed-in person, `"staff"`, `"admin"`.
   For a screen a visitor may use, `publicAction`, and read who is there with `readCurrentUser()`
   (see `sendContact`). The signed-in user arrives as `ctx.user`.
2. **The schema is declared once** in `features/<area>/schema.ts`, with `z` from
   `@/lib/validation`, and the form in the browser uses the same one. Messages are catalog keys.
3. **The action stays thin.** The rule lives in `lib/<area>/service.ts`, which is tested against a
   real database. The action reads the session, calls the service, returns plain data.
4. **Refuse by throwing `DomainError`** (400, 401, 403, 404, 409) with a catalog key. Anything else
   is a 500 the person sees as a code, never as the message. The client turns the result into text
   with `useErrorText()` from `lib/use-error-text.ts`.
5. **Staff writes are audited**: call `recordStaffWrite` inside the same transaction as the write
   (see `changeContactStatus`).
6. **Money is integer cents, dates are ISO strings, instants are `timestamptz`.**
7. Test the service with an integration test, and the refusal paths (wrong role, not found,
   conflict) as well as the happy one.
