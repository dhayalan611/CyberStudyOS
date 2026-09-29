# Networking V1 verification

From `frontend`, using Node 24 (the version used during implementation):

```powershell
node --test --test-isolation=none tests/subnetCalculator.test.mjs
npm run build
npm run lint
npm run dev
```

Open the local URL printed by Vite with `/networking` appended. The Networking
page has no dependency on backend data; the existing app shell may still request
courses as it does for other routes.

## Calculator

Submit each row with Calculate and repeat one using Enter:

| Input | Network | Broadcast | First host | Last host | Total | Usable |
| --- | --- | --- | --- | --- | --- | --- |
| 192.168.1.10/24 | 192.168.1.0 | 192.168.1.255 | 192.168.1.1 | 192.168.1.254 | 256 | 254 |
| 10.10.10.50/26 | 10.10.10.0 | 10.10.10.63 | 10.10.10.1 | 10.10.10.62 | 64 | 62 |
| 172.16.5.200/27 | 172.16.5.192 | 172.16.5.223 | 172.16.5.193 | 172.16.5.222 | 32 | 30 |
| 10.0.0.0/8 | 10.0.0.0 | 10.255.255.255 | 10.0.0.1 | 10.255.255.254 | 16,777,216 | 16,777,214 |
| 192.168.1.0/30 | 192.168.1.0 | 192.168.1.3 | 192.168.1.1 | 192.168.1.2 | 4 | 2 |
| 10.0.0.0/31 | 10.0.0.0 | Not applicable | 10.0.0.0 | 10.0.0.1 | 2 | 2 |
| 127.0.0.1/32 | 127.0.0.1 | Not applicable | 127.0.0.1 | 127.0.0.1 | 1 | 1 |
| 255.255.255.255/0 | 0.0.0.0 | 255.255.255.255 | 0.0.0.1 | 255.255.255.254 | 4,294,967,296 | 4,294,967,294 |

- Confirm the default /24 mask is `255.255.255.0` and wildcard is `0.0.0.255`.
- Expand Binary View: default IP is `11000000.10101000.00000001.00001010`
  and mask is `11111111.11111111.11111111.00000000`.
- Submit `192.168.1.999/24`, `192.168.1.1/33`, `192.168.1/24`, `hello`,
  `10.0.0.1`, and an empty input. Each should show a useful error and hide the old result.
- Correct an invalid input and resubmit: results should recover normally.
- Edit a successful input without submitting: the page should say results need updating.
- Check the explanatory notes for /31 and /32 and the absence of a directed broadcast.

## Reference sections and accessibility

- Subnet Calculator is selected initially. Switch among all four sections;
  the URL stays `/networking`, and returning preserves the calculator input/results.
- In OSI Model, expand all seven layers with mouse and keyboard (Tab, Enter/Space).
  Check purpose, examples, PDU, addressing, devices, and the TCP/IP mapping.
- In IPv4 Reference, check all eight ranges and eleven CIDR rows. /31 and /32
  host counts must match the calculator.
- In Quick Reference, check the five comparisons and nine glossary entries.
- At narrow and wide viewport widths, check navigation wrapping, readable binary
  text, visible focus rings, and horizontally scrollable CIDR data within its region.

Automated tests cover the calculator, including all prefixes against an independent
BigInt bitwise oracle. This checklist covers browser interactions and visual layout;
those are not automated by the calculator suite.
