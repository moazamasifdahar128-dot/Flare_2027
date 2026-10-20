import { PRIVACY, TERMS } from "@/lib/shola/legal-copy";

export function PrivacyPolicy() {
  return (
    <>
      {PRIVACY.map((item) => (
        <section key={item.h} className="mt-6 first:mt-0">
          <h3 className="text-base font-semibold text-white">{item.h}</h3>
          <p className="mt-2">{item.p}</p>
        </section>
      ))}
    </>
  );
}

export function TermsOfService() {
  return (
    <>
      {TERMS.map((item) => (
        <section key={item.h} className="mt-6 first:mt-0">
          <h3 className="text-base font-semibold text-white">{item.h}</h3>
          <p className="mt-2">{item.p}</p>
        </section>
      ))}
    </>
  );
}
