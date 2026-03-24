// phone-validators.ts
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { parsePhoneNumberFromString, AsYouType, CountryCode } from 'libphonenumber-js';

/**
 * IntlPhoneValidatorFactory(defaultCountry?)
 * - defaultCountry: optional ISO2 like 'IN', 'US'. If user enters local number without +,
 *   parsing will use defaultCountry for correct interpretation.
 */
export function IntlPhoneValidatorFactory(defaultCountry?: CountryCode) {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (val === null || val === undefined || val === '') return null; // required should handle empty

    const raw = String(val).trim();
    let phone = parsePhoneNumberFromString(raw); // parse with no default if + present

    if (!phone && defaultCountry) {
      phone = parsePhoneNumberFromString(raw, defaultCountry);
    }

    if (!phone) return { invalidPhone: true };
    return phone.isValid() ? null : { invalidPhone: true };
  };
}

/** toE164(value, defaultCountry?) -> returns E.164 string or null */
export function toE164(value: string, defaultCountry?: CountryCode): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  let phone = parsePhoneNumberFromString(raw);
  if (!phone && defaultCountry) phone = parsePhoneNumberFromString(raw, defaultCountry);
  if (!phone) return null;
  return phone.isValid() ? phone.number : null; // E.164
}

/** nice formatting preview for UI: returns formatted number as user types */
export function formatAsYouType(value: string, defaultCountry?: CountryCode): string {
  if (!value) return '';
  try {
    const formatter = new AsYouType(defaultCountry);
    return formatter.input(value);
  } catch {
    return value;
  }
}
