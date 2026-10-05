import {
  getMessages,
  type LocaleMessages,
  type LocaleOverride,
  resolveLocale,
} from "@sweberdev/witness";
import { createContext, type ReactNode, useContext, useMemo } from "react";

interface WitnessContextValue {
  locale: string;
  messages: LocaleMessages;
}

const WitnessContext = createContext<WitnessContextValue | null>(null);

export interface WitnessProviderProps {
  /** A locale tag such as "de-CH", or a list such as `navigator.languages`. Default "en". */
  locale?: string | readonly string[];
  /** Overrides for the wording, e.g. the informal "du" in German. */
  messages?: LocaleOverride;
  children: ReactNode;
}

/** Sets the language and wording for all Witness components below it. */
export function WitnessProvider({ locale, messages, children }: WitnessProviderProps) {
  const value = useMemo(
    () => ({ locale: resolveLocale(locale), messages: getMessages(locale, messages) }),
    [locale, messages],
  );
  return <WitnessContext.Provider value={value}>{children}</WitnessContext.Provider>;
}

/** The active locale and messages. A `locale` prop on a component wins over the provider. */
export function useWitnessMessages(locale?: string | readonly string[]): WitnessContextValue {
  const context = useContext(WitnessContext);
  return useMemo(() => {
    if (locale) return { locale: resolveLocale(locale), messages: getMessages(locale) };
    return context ?? { locale: "en", messages: getMessages("en") };
  }, [context, locale]);
}
