export const REFERENCE_CATEGORIES = [
  "Ports & Protocols", "Security Fundamentals", "Common Attacks",
  "Cryptography", "Web & HTTP", "Cybersecurity Tools",
] as const;

export type ReferenceCategory = typeof REFERENCE_CATEGORIES[number];
export type ReferenceFilter = ReferenceCategory | "All";
export type ReferenceItem = {
  id: string;
  title: string;
  category: ReferenceCategory;
  shortDescription: string;
  details: string[];
  tags: string[];
  network?: { ports: number[]; transports: ("TCP" | "UDP")[] };
};

export const PORT_CONVENTION_NOTE = "Ports are common/default conventions, not proof of the service running. Services can use different ports; confirm using configuration and authorized traffic analysis.";

// Editorial references; content is bundled locally, never fetched at runtime.
export const REFERENCE_SOURCES = [
  { title: "IANA port registry", url: "https://www.iana.org/assignments/service-names-port-numbers" },
  { title: "HTTP semantics", url: "https://www.rfc-editor.org/rfc/rfc9110.html" },
  { title: "OWASP password storage", url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html" },
  { title: "NIST Zero Trust", url: "https://csrc.nist.gov/glossary/term/zero_trust" },
  { title: "MDN CORS", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS" },
];

function entry(category: ReferenceCategory, id: string, title: string, shortDescription: string, details: string[], tags: string[]): ReferenceItem {
  return { id, title, category, shortDescription, details, tags };
}

function port(id: string, title: string, ports: number[], transports: ("TCP" | "UDP")[], shortDescription: string, detail: string, tags: string[]): ReferenceItem {
  return { ...entry("Ports & Protocols", id, title, shortDescription, [detail], tags), network: { ports, transports } };
}

const ports: ReferenceItem[] = [
  port("ftp", "FTP", [20, 21], ["TCP"], "File Transfer Protocol: separate control and data channels.", "Port 21 handles control. Active-mode data commonly originates from server port 20; passive mode uses a negotiated server data port. Plain FTP does not encrypt credentials or files. SFTP is a different protocol over SSH.", ["file transfer", "plaintext"]),
  port("ssh", "SSH", [22], ["TCP"], "Secure Shell: encrypted remote administration and shell access.", "SSH authenticates a remote host and protects the connection. Verify host keys, restrict administrative access, and manage user keys carefully. SFTP commonly uses the same SSH connection.", ["remote access", "encryption", "SFTP"]),
  port("telnet", "Telnet", [23], ["TCP"], "Legacy remote terminal access without built-in encryption.", "Telnet can expose login credentials and session content to network observers. Use SSH for administrative access; retain Telnet only where a controlled legacy environment requires it.", ["legacy", "plaintext", "terminal"]),
  port("smtp", "SMTP", [25], ["TCP"], "Simple Mail Transfer Protocol for server-to-server email delivery.", "Port 25 commonly carries mail between servers. Client submission usually uses 587 or 465. Encryption depends on TLS configuration; a port number alone does not establish transport security.", ["email", "mail transfer"]),
  port("dns", "DNS", [53], ["UDP", "TCP"], "Domain Name System: resolves names and other DNS records.", "Traditional DNS uses both UDP and TCP. TCP supports zone transfers and responses that cannot fit the negotiated UDP size, among other uses. Ordinary DNS is not encrypted; encrypted DNS uses other transports.", ["name resolution", "records"]),
  port("dhcp", "DHCP", [67, 68], ["UDP"], "Automatically supplies IPv4 network configuration.", "DHCPv4 servers use port 67 and clients use 68. Leases can include an address, gateway and DNS servers. DHCPv6 uses different ports: server 547 and client 546.", ["addressing", "IPv4", "leases"]),
  port("http", "HTTP", [80], ["TCP"], "Hypertext Transfer Protocol for unencrypted web traffic.", "Plain HTTP does not protect messages from network reading or modification. A server may redirect to HTTPS, but the initial HTTP request is still unencrypted.", ["web", "plaintext"]),
  port("pop3", "POP3", [110], ["TCP"], "Post Office Protocol version 3 retrieves email.", "POP3 is commonly used to download messages to a mail client. Port 110 may support a TLS upgrade, but encryption must be negotiated and required by configuration.", ["email", "retrieval"]),
  port("ntp", "NTP", [123], ["UDP"], "Network Time Protocol synchronizes system clocks.", "Accurate time helps correlate logs and validate time-sensitive credentials. Use trusted time sources and restrict unnecessary public access to time services.", ["time", "synchronization"]),
  port("imap", "IMAP", [143], ["TCP"], "Internet Message Access Protocol synchronizes mailboxes.", "IMAP keeps mail and folders on a server for access from multiple clients. Port 143 may negotiate STARTTLS; require encryption before sending sensitive authentication information.", ["email", "mailbox"]),
  port("snmp", "SNMP", [161, 162], ["UDP"], "Simple Network Management Protocol for monitoring devices.", "Queries commonly use 161; notifications such as traps use 162. SNMPv1/v2c community strings do not provide encryption. SNMPv3 supports authentication and privacy when configured appropriately.", ["monitoring", "management"]),
  port("ldap", "LDAP", [389], ["TCP", "UDP"], "Lightweight Directory Access Protocol for directory services.", "LDAP typically uses TCP 389 and may upgrade with StartTLS. UDP 389 is associated with connectionless LDAP uses such as directory discovery. Directory traffic is not encrypted merely because LDAP is used.", ["directory", "identity", "CLDAP"]),
  port("https", "HTTPS", [443], ["TCP", "UDP"], "HTTP protected by TLS for secure web transport.", "HTTP/1.1 and HTTP/2 commonly use TLS over TCP 443. HTTP/3 uses QUIC over UDP 443 with TLS security. Certificate validation authenticates the host; HTTPS does not guarantee that site content is trustworthy.", ["web", "TLS", "HTTP/3"]),
  port("smb", "SMB", [445], ["TCP"], "Server Message Block for network file and printer sharing.", "Modern direct-hosted SMB commonly uses TCP 445. Limit access to trusted networks and keep implementations updated. Signing and encryption depend on protocol version and configuration.", ["file sharing", "Windows"]),
  port("ldaps", "LDAPS", [636], ["TCP"], "LDAP over an immediately established TLS connection.", "LDAPS protects directory communication using TLS from connection establishment. Validate certificates. This differs from upgrading an LDAP connection on port 389 with StartTLS.", ["directory", "TLS"]),
  port("imaps", "IMAPS", [993], ["TCP"], "IMAP with implicit TLS for encrypted mailbox access.", "TLS begins as the connection is established. Clients should validate the mail server certificate and enforce secure authentication.", ["email", "TLS"]),
  port("pop3s", "POP3S", [995], ["TCP"], "POP3 with implicit TLS for encrypted email retrieval.", "The connection starts with TLS before POP3 messages are exchanged. Server identity verification remains essential even when encryption is enabled.", ["email", "TLS"]),
  port("mssql", "Microsoft SQL Server", [1433], ["TCP"], "Common default listener for SQL Server database connections.", "Default instances commonly listen on TCP 1433. Named instances can use dynamic or configured ports. Restrict database access and configure encrypted connections and least-privilege accounts.", ["database", "MSSQL"]),
  port("mysql", "MySQL", [3306], ["TCP"], "Common default port for MySQL database client connections.", "MySQL classic protocol commonly listens on TCP 3306. The X Protocol uses a different default port. Restrict network access and configure TLS rather than assuming database traffic is encrypted.", ["database", "SQL"]),
  port("rdp", "RDP", [3389], ["TCP", "UDP"], "Remote Desktop Protocol for graphical remote access.", "RDP commonly uses TCP and can also use UDP for transport. Limit exposure, use strong authentication, and keep remote desktop hosts patched.", ["remote access", "Windows"]),
  port("postgresql", "PostgreSQL", [5432], ["TCP"], "Common default port for PostgreSQL database connections.", "PostgreSQL listeners are configurable. Control allowed clients and authentication, apply least privilege, and require TLS where network confidentiality is needed.", ["database", "SQL"]),
  port("http-alt", "Alternative HTTP", [8080], ["TCP"], "Common alternative HTTP port for applications and proxies.", "Development servers, application servers and proxies often use 8080. It can host other services and is not automatically encrypted. Check the actual application configuration.", ["web", "proxy", "development"]),
];

const fundamentals: ReferenceItem[] = [
  entry("Security Fundamentals", "cia", "CIA Triad", "Confidentiality, Integrity, Availability.", ["Confidentiality limits disclosure to authorized parties. Integrity protects information from improper changes. Availability keeps systems and data usable when needed.", "Access controls, integrity checks, backups and redundancy support different parts of the triad; security decisions often balance all three."], ["confidentiality", "integrity", "availability"]),
  entry("Security Fundamentals", "authentication", "Authentication", "Verifying the identity of a user, device or service.", ["Authentication asks who is requesting access. Passwords, cryptographic keys and multiple factors provide different forms of evidence. Successful authentication does not by itself grant permission to every resource."], ["identity", "login"]),
  entry("Security Fundamentals", "authorization", "Authorization", "Deciding what an authenticated or anonymous caller may do.", ["Authorization checks permissions for an action on a resource. Enforce it on the trusted server for each request; hiding a button in a user interface is not an access-control boundary."], ["permissions", "access control"]),
  entry("Security Fundamentals", "least-privilege", "Principle of Least Privilege", "Grant only the access needed for a task.", ["Limit permissions, scope and duration for people and services. Review grants and remove unused rights. Smaller permission sets reduce the damage from mistakes and compromised accounts."], ["permissions", "access control"]),
  entry("Security Fundamentals", "defense-depth", "Defense in Depth", "Use complementary protective layers.", ["Combine prevention, detection and recovery so one failed control does not expose everything. For example, patching, restricted network access, monitoring and tested backups address different failure modes."], ["layers", "resilience"]),
  entry("Security Fundamentals", "zero-trust", "Zero Trust", "Evaluate access explicitly instead of trusting network location.", ["Access decisions consider identity, device state, resource sensitivity and context. Apply least privilege and reassess access as conditions change. Being inside a corporate network does not automatically make a request trusted."], ["identity", "verification"]),
  entry("Security Fundamentals", "attack-surface", "Attack Surface", "The exposed points through which a system can be affected.", ["Interfaces, open services, accounts, dependencies and physical access can contribute to exposure. Inventory assets and remove unnecessary services and permissions to reduce opportunities for compromise."], ["exposure", "assets"]),
  entry("Security Fundamentals", "vulnerability", "Vulnerability", "A weakness that can be exploited or triggered.", ["Weaknesses may exist in software, configuration, processes or controls. Prioritize remediation using exposure and impact, not just the existence of a flaw."], ["weakness", "patching"]),
  entry("Security Fundamentals", "threat", "Threat", "A potential cause of harm to a system or organization.", ["Threats include malicious actors, mistakes and environmental events. A threat can act on a vulnerability, but the two concepts are distinct: one is a potential source of harm, the other a weakness."], ["harm", "threat source"]),
  entry("Security Fundamentals", "risk", "Risk", "Potential loss considered in terms of likelihood and impact.", ["Assess what could happen, how likely it is and how serious the consequences would be. Controls can reduce risk; some residual risk may remain and requires an explicit decision."], ["likelihood", "impact"]),
  entry("Security Fundamentals", "exploit", "Exploit", "A technique or program that takes advantage of a weakness.", ["An exploit is a means of using a vulnerability, not the vulnerability itself. Defensive validation in an authorized lab can help determine whether controls and remediation work."], ["vulnerability", "validation"]),
];

const attacks: ReferenceItem[] = [
  entry("Common Attacks", "phishing", "Phishing", "Deceptive messages that seek information or unsafe actions.", ["Messages may impersonate a trusted organization to obtain credentials, payments or software execution. Verify unusual requests through an independent channel, report suspicious messages and use phishing-resistant MFA where available."], ["email", "impersonation"]),
  entry("Common Attacks", "social-engineering", "Social Engineering", "Manipulating people to bypass normal safeguards.", ["Pressure, authority claims and urgency can influence decisions over phone, chat or in person. Clear verification procedures and a culture that supports pausing suspicious requests reduce exposure."], ["human factors", "deception"]),
  entry("Common Attacks", "brute-force", "Brute Force", "Repeatedly guessing secrets or credentials.", ["Online guessing targets a live login; offline guessing targets obtained password hashes. Rate limits and MFA protect online authentication, while strong passwords and costly password hashing help against offline guessing."], ["passwords", "guessing"]),
  entry("Common Attacks", "password-spraying", "Password Spraying", "Trying a small set of common passwords across many accounts.", ["Activity spread across accounts may evade simple per-account thresholds. Monitor patterns across identities and sources, reject common passwords and use MFA."], ["passwords", "authentication"]),
  entry("Common Attacks", "dos", "DoS", "Denial of Service disrupts access to a resource.", ["Resource exhaustion or a triggered failure can prevent legitimate use. Capacity planning, request limits, resilient design and monitoring help reduce impact; no single control covers every cause."], ["availability", "disruption"]),
  entry("Common Attacks", "ddos", "DDoS", "Distributed Denial of Service uses many sources.", ["Distributed traffic can overwhelm network or application capacity. Upstream filtering, traffic absorption services and an incident response plan may be needed when local defenses cannot handle the volume."], ["availability", "distributed"]),
  entry("Common Attacks", "on-path", "Man-in-the-Middle / On-Path Attack", "An intermediary observes or alters communication.", ["Authenticated encryption such as correctly validated TLS helps prevent undetected interception and modification. Ignoring certificate warnings can undermine protection. Secure network access and trusted configuration also matter."], ["MITM", "interception", "TLS"]),
  entry("Common Attacks", "sql-injection", "SQL Injection", "Untrusted input changes the meaning of a database query.", ["Use parameterized queries and safe query-building APIs so data is kept separate from SQL structure. Restrict database privileges and validate inputs; input validation alone is not a substitute for parameterization."], ["database", "injection"]),
  entry("Common Attacks", "xss", "Cross-Site Scripting (XSS)", "Untrusted content executes as script in another user's browser.", ["Use context-appropriate output encoding and safe DOM APIs. Sanitize intentionally supported HTML with a maintained sanitizer. A Content Security Policy adds a layer of protection but does not replace safe rendering."], ["browser", "injection", "output encoding"]),
  entry("Common Attacks", "csrf", "CSRF", "Cross-Site Request Forgery abuses a browser's attached credentials.", ["An unwanted request can act with a signed-in user's cookies. Protect state-changing actions with appropriate anti-CSRF tokens, origin checks and SameSite cookie settings. CORS alone is not a general CSRF defense."], ["browser", "cookies", "request forgery"]),
  entry("Common Attacks", "command-injection", "Command Injection", "Untrusted input alters an operating-system command.", ["Prefer dedicated APIs instead of invoking a shell. Where process execution is required, keep executable and arguments separate, constrain accepted inputs and run with minimal privileges."], ["shell", "injection"]),
  entry("Common Attacks", "directory-traversal", "Directory Traversal", "Path manipulation reaches files outside an intended location.", ["Resolve paths safely and verify they remain within the allowed directory, accounting for symbolic links where relevant. Prefer server-controlled file identifiers and limit filesystem permissions."], ["path traversal", "files"]),
];

const cryptography: ReferenceItem[] = [
  entry("Cryptography", "encryption", "Encryption", "Reversible protection of confidentiality using a key.", ["Encryption converts plaintext to ciphertext; authorized decryption recovers it with the appropriate key. Use authenticated encryption to detect tampering as well. Protecting and managing keys is part of protecting the data."], ["confidentiality", "keys", "ciphertext"]),
  entry("Cryptography", "hashing", "Hashing", "Produces a digest; it is not reversible encryption.", ["A cryptographic hash maps input to a digest and is designed to resist finding matching inputs or collisions. A bare hash does not authenticate a sender. Fast general-purpose hashes are not sufficient for password storage."], ["digest", "integrity", "one-way"]),
  entry("Cryptography", "encoding", "Encoding", "Changes representation without providing secrecy.", ["Encoding makes data suitable for transport or storage. Base64 is reversible without a secret key: anyone who knows the format can decode it. Encoding must not be treated as encryption or password protection."], ["Base64", "representation"]),
  entry("Cryptography", "symmetric", "Symmetric Encryption", "Uses a shared secret key for encryption and decryption.", ["Both sides need access to the secret key, so secure distribution and storage matter. Symmetric algorithms efficiently protect bulk data; AES is a common example."], ["shared key", "AES"]),
  entry("Cryptography", "asymmetric", "Asymmetric Encryption", "Uses a public/private key pair.", ["For encryption-capable schemes, a public key can encrypt data that the matching private key decrypts. Real systems often combine public-key mechanisms with symmetric encryption. Not every public-key algorithm supports encryption."], ["public key", "private key"]),
  entry("Cryptography", "digital-signature", "Digital Signature", "Lets a verifier check integrity and the signing key's origin.", ["A private key creates a signature and the corresponding public key verifies it. Verification also depends on trusting the association between that public key and its owner. A signature does not conceal the signed content."], ["integrity", "authenticity"]),
  entry("Cryptography", "salt", "Salt", "A unique random value used with each stored password hash.", ["Salts prevent identical passwords from producing identical stored results and reduce the value of precomputed guesses. Store the salt with the hash; it is not a secret and does not stop guessing by itself."], ["passwords", "randomness"]),
  entry("Cryptography", "password-hashing", "Password Hashing", "Purpose-built, costly hashing for password verification.", ["Use a maintained password-hashing implementation such as Argon2id with a unique salt and appropriate cost settings. Verify by hashing a candidate with the stored parameters. Do not store plaintext passwords or use reversible encryption as a substitute."], ["Argon2id", "password storage", "salt"]),
  entry("Cryptography", "mfa", "MFA", "Multi-factor authentication combines distinct factor types.", ["Factors include something you know, have or are. Two passwords are still one factor type. MFA reduces reliance on a single secret, but methods differ in resistance to phishing; security keys and passkeys can provide phishing resistance."], ["authentication", "factors", "passkeys"]),
];

const web: ReferenceItem[] = [
  entry("Web & HTTP", "method-get", "GET", "Requests a representation of a resource.", ["Intended for retrieval without requested state changes. It is safe and idempotent by HTTP semantics. Avoid putting secrets in URLs, where logs or browser history may retain them."], ["HTTP method", "safe", "idempotent"]),
  entry("Web & HTTP", "method-post", "POST", "Submits content for resource-specific processing.", ["Often creates records or starts actions. Repeating the same request can have additional effects unless the application implements deduplication."], ["HTTP method", "submit"]),
  entry("Web & HTTP", "method-put", "PUT", "Creates or replaces state at the target URI.", ["Intended to be idempotent: repeating an identical request has the same intended effect as sending it once. Use the API contract to determine the required representation."], ["HTTP method", "replace", "idempotent"]),
  entry("Web & HTTP", "method-patch", "PATCH", "Applies a set of partial modifications to a resource.", ["The patch document format determines how changes are interpreted. PATCH is not inherently idempotent; whether retries are safe depends on the specific operation."], ["HTTP method", "partial update"]),
  entry("Web & HTTP", "method-delete", "DELETE", "Requests removal of the target resource's URI association.", ["Idempotence concerns intended effect, not identical responses. A later request may report that the resource is absent. DELETE does not promise secure erasure of underlying storage."], ["HTTP method", "remove", "idempotent"]),
  entry("Web & HTTP", "method-head", "HEAD", "Retrieves response metadata without a response body.", ["Similar to GET, but the server sends no response content. Useful for checking resource metadata."], ["HTTP method", "headers", "safe"]),
  entry("Web & HTTP", "method-options", "OPTIONS", "Asks about communication options for a target.", ["Browsers use OPTIONS for CORS preflight when required. It is also an HTTP method independently of CORS."], ["HTTP method", "preflight", "safe"]),
  entry("Web & HTTP", "status-200", "200 OK", "The request succeeded.", ["Interpret the response according to the request method."], ["HTTP status", "success"]),
  entry("Web & HTTP", "status-201", "201 Created", "The request created one or more resources.", ["A Location header may identify the new resource."], ["HTTP status", "success"]),
  entry("Web & HTTP", "status-204", "204 No Content", "Success without response content.", ["Do not attempt to parse a JSON response body."], ["HTTP status", "success"]),
  entry("Web & HTTP", "status-301", "301 Moved Permanently", "The resource has a permanent new location.", ["Clients may change POST to GET when following this redirect."], ["HTTP status", "redirect"]),
  entry("Web & HTTP", "status-302", "302 Found", "The resource is temporarily at another location.", ["Clients may change POST to GET; 307 preserves the method."], ["HTTP status", "redirect"]),
  entry("Web & HTTP", "status-400", "400 Bad Request", "The server cannot process the request as sent.", ["Check request syntax, framing and expected input."], ["HTTP status", "client error"]),
  entry("Web & HTTP", "status-401", "401 Unauthorized", "Valid authentication credentials are missing or unacceptable.", ["Despite its name, this concerns authentication. Check the authentication challenge."], ["HTTP status", "authentication"]),
  entry("Web & HTTP", "status-403", "403 Forbidden", "The server refuses the requested action.", ["Authentication alone may not grant the required permission."], ["HTTP status", "authorization"]),
  entry("Web & HTTP", "status-404", "404 Not Found", "No current representation was found, or disclosed.", ["Check the path and identifier; servers may conceal protected resources."], ["HTTP status", "client error"]),
  entry("Web & HTTP", "status-405", "405 Method Not Allowed", "The target does not support this request method.", ["The Allow header identifies supported methods."], ["HTTP status", "method"]),
  entry("Web & HTTP", "status-409", "409 Conflict", "The request conflicts with current resource state.", ["Resolve the conflict before retrying."], ["HTTP status", "conflict"]),
  entry("Web & HTTP", "status-429", "429 Too Many Requests", "A request rate limit was reached.", ["Respect Retry-After when supplied and reduce request frequency."], ["HTTP status", "rate limit"]),
  entry("Web & HTTP", "status-500", "500 Internal Server Error", "An unexpected server condition prevented completion.", ["Investigate server logs without exposing sensitive internals to users."], ["HTTP status", "server error"]),
  entry("Web & HTTP", "status-502", "502 Bad Gateway", "An intermediary received an invalid upstream response.", ["Check the upstream service and gateway configuration."], ["HTTP status", "gateway"]),
  entry("Web & HTTP", "status-503", "503 Service Unavailable", "The server is temporarily unable to handle the request.", ["Overload or maintenance may be responsible; Retry-After may be supplied."], ["HTTP status", "availability"]),
  entry("Web & HTTP", "http-https", "HTTP vs HTTPS", "HTTPS adds authenticated transport encryption to HTTP.", ["HTTP describes request and response semantics. HTTPS protects those exchanges with TLS, including TLS integrated into QUIC for HTTP/3. It protects data in transit, not compromised endpoints or dishonest site behavior."], ["TLS", "transport", "web"]),
  entry("Web & HTTP", "cookies", "Cookies", "Browser-managed data sent with matching requests.", ["Cookies can carry session identifiers and preferences. Secure restricts transmission to secure connections; HttpOnly prevents script access; SameSite controls some cross-site sending. Scope cookies carefully and avoid storing sensitive data unnecessarily."], ["browser", "state", "SameSite"]),
  entry("Web & HTTP", "sessions", "Sessions", "Maintain continuity across otherwise separate requests.", ["A session often maps an unpredictable browser-held identifier to server-side state. Rotate identifiers after authentication, expire sessions and invalidate them on logout. A session cookie is a credential and needs protection."], ["state", "authentication"]),
  entry("Web & HTTP", "headers", "Headers", "Metadata accompanying HTTP requests and responses.", ["Headers describe content, caching, authentication and other behavior. Treat incoming headers as untrusted unless a trusted component validates them. Proxy-provided identity or client-address headers require careful configuration."], ["metadata", "requests", "responses"]),
  entry("Web & HTTP", "same-origin", "Same-Origin Policy", "Restricts how browser scripts access other origins.", ["An origin consists of scheme, host and port. Browser restrictions separate data between origins, but do not prevent every cross-origin request or embedding. The policy is not a substitute for server-side authorization."], ["browser", "origin", "isolation"]),
  entry("Web & HTTP", "cors", "CORS", "Server headers grant browsers selected cross-origin access.", ["Cross-Origin Resource Sharing lets a server opt into sharing responses with specified origins. Some requests require an OPTIONS preflight. CORS is enforced by browsers; it does not authenticate callers or stop non-browser clients."], ["browser", "origin", "preflight"]),
];

const tools: ReferenceItem[] = [
  entry("Cybersecurity Tools", "nmap", "Nmap", "Network discovery and service inventory for authorized networks.", ["Administrators use Nmap to understand exposed hosts and services and compare exposure with policy. Results require interpretation: a detected port is not definitive evidence of application identity."], ["network", "inventory"]),
  entry("Cybersecurity Tools", "wireshark", "Wireshark", "Packet capture and protocol analysis.", ["Inspect traffic to troubleshoot connectivity and understand protocols in a lab or managed network. Captures can contain sensitive data; control access and retention. Encryption limits readable payload content."], ["packets", "troubleshooting"]),
  entry("Cybersecurity Tools", "burp", "Burp Suite", "A toolkit for authorized web application security testing.", ["An intercepting proxy helps testers examine browser requests and responses and assess application behavior. Use defined test scope and protect captured credentials and session data."], ["web", "proxy", "testing"]),
  entry("Cybersecurity Tools", "metasploit", "Metasploit", "A framework for controlled security validation and lab learning.", ["Security teams use its modules to validate known weaknesses and assess defensive controls in explicitly authorized environments. Plan tests to avoid disrupting services and document findings for remediation."], ["validation", "lab", "framework"]),
  entry("Cybersecurity Tools", "gobuster", "Gobuster", "Discovers candidate web paths and DNS names in scoped assessments.", ["Wordlist-based discovery can help compare visible resources with an intended inventory. Responses need manual interpretation. Agree on scope and request limits before testing a service."], ["discovery", "web", "DNS"]),
  entry("Cybersecurity Tools", "nikto", "Nikto", "Checks web servers for known issues and risky configuration.", ["Findings help administrators identify items for review, patching or removal. Automated checks can produce false positives and traffic volume, so validate results and coordinate testing."], ["web server", "configuration"]),
  entry("Cybersecurity Tools", "john", "John the Ripper", "Password auditing and recovery for authorized hash datasets.", ["Offline assessments can reveal weak passwords and help evaluate password policy. Handle hashes as sensitive data and restrict recovery work to approved accounts and datasets."], ["passwords", "offline audit"]),
  entry("Cybersecurity Tools", "hashcat", "Hashcat", "Hardware-accelerated password recovery and auditing.", ["Authorized offline tests estimate how exposed password hashes withstand guessing. Recovery feasibility depends on password strength, hash scheme and cost parameters, not just hardware speed."], ["passwords", "GPU", "offline audit"]),
  entry("Cybersecurity Tools", "hydra", "Hydra", "Evaluates authentication strength against live services in approved tests.", ["Unlike offline hash auditing, live authentication checks affect the target service and may trigger lockouts. Coordinate test accounts, limits and monitoring with the system owner."], ["authentication", "online audit"]),
  entry("Cybersecurity Tools", "netcat", "Netcat", "A general network utility for TCP/UDP connectivity experiments.", ["Administrators and learners use Netcat variants to inspect basic network communication and troubleshoot lab services. Behavior varies by implementation; basic Netcat traffic is not inherently encrypted."], ["network", "TCP", "UDP", "diagnostics"]),
];

export const cyberReferenceData: ReferenceItem[] = [
  ...ports, ...fundamentals, ...attacks, ...cryptography, ...web, ...tools,
];

export function filterReferenceItems(items: readonly ReferenceItem[], search: string, category: ReferenceFilter): ReferenceItem[] {
  const query = search.trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);
  const matches = items.filter((item) => {
    if (category !== "All" && item.category !== category) return false;
    const searchable = [item.title, item.shortDescription, ...item.details, ...item.tags,
      ...(item.network?.ports ?? []), ...(item.network?.transports ?? [])].join(" ").toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
  // Exact numeric port matches lead without hiding other matching content.
  if (/^\d+$/.test(query)) {
    const portNumber = Number(query);
    matches.sort((a, b) => Number(b.network?.ports.includes(portNumber) ?? false) - Number(a.network?.ports.includes(portNumber) ?? false));
  }
  return matches;
}
