import type messages from "@/messages/pt-BR.json";
import type { Locale } from "./locales";

declare module "next-intl" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: module augmentation requires an interface
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
