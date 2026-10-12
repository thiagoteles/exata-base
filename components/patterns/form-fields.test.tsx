// @vitest-environment happy-dom
import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { maskCpf } from "@/lib/masks";
import { validationMessage, z } from "@/lib/validation";
import { cpfSchema, dateSchema } from "@/lib/validation-br";
import { renderWithIntl } from "@/tests/render";
import {
  FormMaskedField,
  FormSelectField,
  FormSwitchField,
  FormTextAreaField,
} from "./form-fields";
import { useSchemaForm } from "./use-schema-form";

const schema = z.object({
  cpf: cpfSchema,
  birth: dateSchema,
  kind: z.enum(["a", "b"], { error: validationMessage("required") }),
  note: z.string().min(1, { message: validationMessage("required") }),
  active: z.boolean(),
});
type Values = z.input<typeof schema>;

function Form({ onSubmit }: { onSubmit: (values: Values) => void }) {
  const form = useSchemaForm<Values>(schema, {
    cpf: "",
    birth: "",
    kind: "" as Values["kind"],
    note: "",
    active: false,
  });
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FormMaskedField control={form.control} name="cpf" label="CPF" mask={maskCpf} />
      <FormMaskedField control={form.control} name="birth" label="Nascimento" mask={(v) => v} />
      <FormSelectField
        control={form.control}
        name="kind"
        label="Tipo"
        placeholder="Escolha"
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
      />
      <FormTextAreaField control={form.control} name="note" label="Nota" />
      <FormSwitchField control={form.control} name="active" label="Ativo" />
      <button type="submit">Enviar</button>
    </form>
  );
}

const submit = () => act(() => fireEvent.click(screen.getByRole("button", { name: "Enviar" })));

describe("form fields", () => {
  it("show the catalog's sentence for each field the schema refuses", async () => {
    const onSubmit = vi.fn();
    renderWithIntl(<Form onSubmit={onSubmit} />);
    await submit();
    expect(screen.getAllByText("Preencha este campo.").length).toBeGreaterThanOrEqual(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mask as typed and hand submit the text, not the schema's output", async () => {
    const onSubmit = vi.fn();
    renderWithIntl(<Form onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("CPF"), { target: { value: "52998224725" } });
    expect((screen.getByLabelText("CPF") as HTMLInputElement).value).toBe("529.982.247-25");
    fireEvent.change(screen.getByLabelText("Nascimento"), { target: { value: "15/03/1985" } });
    fireEvent.change(screen.getByLabelText("Nota"), { target: { value: "Olá" } });
    fireEvent.click(screen.getByRole("switch", { name: "Ativo" }));
    await submit();
    // The select stays empty, so the form is refused; the CPF and date already passed.
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByText("Informe uma data válida no formato dd/mm/aaaa.")).toBeNull();
    expect(screen.getAllByText("Preencha este campo.")).toHaveLength(1);
  });
});

const typed = z.object({ cpf: cpfSchema, birth: dateSchema });
type Typed = z.input<typeof typed>;

function TypedForm({ onSubmit }: { onSubmit: (values: Typed) => void }) {
  const form = useSchemaForm<Typed>(typed, { cpf: "", birth: "" });
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FormMaskedField control={form.control} name="cpf" label="CPF" mask={maskCpf} />
      <FormMaskedField control={form.control} name="birth" label="Nascimento" mask={(v) => v} />
      <button type="submit">Enviar</button>
    </form>
  );
}

describe("a schema form", () => {
  it("hands submit the text as typed, which the action can check with the same schema", async () => {
    const onSubmit = vi.fn();
    renderWithIntl(<TypedForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("CPF"), { target: { value: "52998224725" } });
    fireEvent.change(screen.getByLabelText("Nascimento"), { target: { value: "15/03/1985" } });
    await submit();
    const [values] = onSubmit.mock.calls[0] ?? [];
    expect(values).toEqual({ cpf: "529.982.247-25", birth: "15/03/1985" });
    expect(typed.safeParse(values).success).toBe(true);
  });
});
