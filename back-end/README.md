# The Restoration Back-end

Express and MongoDB API for `therestoration.jacobdanderson.net`.

## Contact Form Mail

The backend now handles public contact form delivery.

- `CONTACT_FROM_EMAIL` is required.
- If `CONTACT_TO_EMAIL` is unset, messages go directly to `contacts@jacobdanderson.net`.
- `CONTACT_BCC_EMAIL` is optional and can be added later if you want alias-based outbound mail with a monitoring copy.
- Use either local sendmail (`CONTACT_USE_SENDMAIL=true`, optional `CONTACT_SENDMAIL_PATH`) or SMTP (`CONTACT_SMTP_HOST`, `CONTACT_SMTP_PORT`, `CONTACT_SMTP_SECURE`, `CONTACT_SMTP_REQUIRE_TLS`, `CONTACT_SMTP_USER`, `CONTACT_SMTP_PASS`).
