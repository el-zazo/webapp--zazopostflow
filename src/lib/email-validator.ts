import { EmailVerifier } from "@el-zazo/email-verifier";

const verifier = new EmailVerifier();

const USER_MESSAGES: Record<string, string> = {
  invalid_syntax: "Invalid email format",
  disposable_static_list: "Disposable email addresses are not allowed. Please use a real email address.",
  domain_not_found: "Email domain does not exist",
  no_mx_records: "This email domain cannot receive emails",
  dns_timeout: "Unable to verify email domain. Please try again.",
  dns_error: "Unable to verify email domain. Please try again.",
  disposable_disify: "Disposable email addresses are not allowed. Please use a real email address.",
  disposable_kickbox: "Disposable email addresses are not allowed. Please use a real email address.",
  disposable_debounce: "Disposable email addresses are not allowed. Please use a real email address.",
  disposable_validator_pizza: "Disposable email addresses are not allowed. Please use a real email address.",
};

export async function validateEmailAdvanced(email: string): Promise<{
  valid: boolean;
  reason: string;
  userMessage?: string;
}> {
  const result = await verifier.verify(email);

  if (result.valid) {
    return { valid: true, reason: result.reason };
  }

  const reasonKey = result.reason.split(":")[0];
  const userMessage = USER_MESSAGES[reasonKey] || "Invalid email address";

  return {
    valid: false,
    reason: result.reason,
    userMessage,
  };
}
