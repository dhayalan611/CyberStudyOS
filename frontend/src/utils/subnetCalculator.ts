export interface SubnetResult {
  ipAddress: string;
  prefix: number;
  subnetMask: string;
  wildcardMask: string;
  networkAddress: string;
  broadcastAddress: string | null;
  firstUsableHost: string;
  lastUsableHost: string;
  totalAddresses: number;
  usableHosts: number;
  binaryIp: string;
  binaryMask: string;
}

export type SubnetCalculation =
  | { ok: true; result: SubnetResult }
  | { ok: false; error: string };

const IPV4_SIZE = 2 ** 32;

// Base-256 arithmetic keeps unsigned 32-bit values exact without JavaScript's
// signed bitwise coercion or shift-by-32 behavior at /0 and /32.
function numberToIpv4(value: number): string {
  return [24, 16, 8, 0]
    .map((shift) => Math.floor(value / 2 ** shift) % 256)
    .join(".");
}

function toBinary(address: string): string {
  return address.split(".").map((octet) => Number(octet).toString(2).padStart(8, "0")).join(".");
}

export function calculateSubnet(input: string): SubnetCalculation {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(input.trim());
  if (!match) {
    return { ok: false, error: "Enter four decimal IPv4 octets and a CIDR prefix, for example 192.168.1.10/24." };
  }
  const octetStrings = match.slice(1, 5);
  const octets = octetStrings.map(Number);
  if (octets.some((octet) => octet > 255)) {
    return { ok: false, error: "Each IPv4 octet must be a whole number from 0 to 255." };
  }
  if (octetStrings.some((octet) => octet.length > 1 && octet.startsWith("0"))) {
    return { ok: false, error: "Remove leading zeros from IPv4 octets (use 10, not 010)." };
  }
  const prefix = Number(match[5]);
  if (prefix > 32) return { ok: false, error: "The CIDR prefix must be a whole number from 0 to 32." };

  const ipNumber = octets.reduce((value, octet) => value * 256 + octet, 0);
  const totalAddresses = 2 ** (32 - prefix);
  const maskNumber = IPV4_SIZE - totalAddresses;
  const networkNumber = Math.floor(ipNumber / totalAddresses) * totalAddresses;
  const lastNumber = networkNumber + totalAddresses - 1;
  const conventionalSubnet = prefix <= 30;
  const ipAddress = octets.join(".");
  const subnetMask = numberToIpv4(maskNumber);

  return { ok: true, result: {
    ipAddress, prefix, subnetMask,
    wildcardMask: numberToIpv4(totalAddresses - 1),
    networkAddress: numberToIpv4(networkNumber),
    broadcastAddress: conventionalSubnet ? numberToIpv4(lastNumber) : null,
    firstUsableHost: numberToIpv4(conventionalSubnet ? networkNumber + 1 : networkNumber),
    lastUsableHost: numberToIpv4(conventionalSubnet ? lastNumber - 1 : lastNumber),
    totalAddresses,
    usableHosts: conventionalSubnet ? totalAddresses - 2 : totalAddresses,
    binaryIp: toBinary(ipAddress), binaryMask: toBinary(subnetMask),
  } };
}
