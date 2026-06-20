const PREFIX = 'x-env-'

// Clients convey SMTP envelope and authentication metadata as X-Env-* request
// headers (e.g. X-Env-IP, X-Env-Helo, X-Env-From, X-Env-Rcpt, X-Env-SPF,
// X-Env-TLS-Version). We read them from rawHeaders to preserve the client's
// casing, order, and duplicates so engines like rspamd can forward them
// through verbatim. The envelope is an array of [name, value] pairs with the
// X-Env- prefix stripped.
export function fromRequest(req) {
  const pairs = []
  const raw = req.rawHeaders || []

  for (let i = 0; i < raw.length; i += 2) {
    const name = raw[i]
    if (name.toLowerCase().startsWith(PREFIX)) {
      pairs.push([name.slice(PREFIX.length), raw[i + 1]])
    }
  }

  return pairs
}

// First value for a field, matched case-insensitively.
export function get(envelope, field) {
  const want = field.toLowerCase()
  const hit = envelope.find(([name]) => name.toLowerCase() === want)
  return hit ? hit[1] : undefined
}

// Every value for a field (e.g. repeated Rcpt headers).
export function getAll(envelope, field) {
  const want = field.toLowerCase()
  return envelope
    .filter(([name]) => name.toLowerCase() === want)
    .map(([, v]) => v)
}
