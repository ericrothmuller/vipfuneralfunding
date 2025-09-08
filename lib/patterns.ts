// lib/patterns.ts
// v-flag safe US phone pattern: optional "(###) " or "###-" or "###", then 7 digits with optional hyphen.
export const PHONE_PATTERN_VSAFE = String.raw`[(]?\d{3}[)]?[\s-]?\d{3}-?\d{4}`;
