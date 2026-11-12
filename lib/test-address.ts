// Reserved example/test addresses (RFC 2606: example.com, example.org, .test, .invalid, .localhost) never belong to a real person.
// Accounts made with one must not trigger the welcome email or the WhatsApp message, so automated tests can't message anyone.
export const isTestEmail = (email?: string | null) => !!email && /@([\w-]+\.)*(example\.(com|org|net|edu)|[\w-]+\.(test|invalid|localhost|example))$/i.test(email.trim());
