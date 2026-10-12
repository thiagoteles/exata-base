import { cleanup, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { afterEach } from "vitest";
import messages from "@/messages/pt-BR.json";

afterEach(cleanup);

function Provider({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

/** Renders a component with the pt-BR catalog, the way the app provides it. Rerenders keep it. */
export function renderWithIntl(element: ReactElement) {
  return render(element, { wrapper: Provider });
}
