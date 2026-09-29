import assert from "node:assert/strict";
import test from "node:test";
import { calculateSubnet } from "../src/utils/subnetCalculator.ts";

const cases = [
  ["192.168.1.10/24", "255.255.255.0", "0.0.0.255", "192.168.1.0", "192.168.1.255", "192.168.1.1", "192.168.1.254", 256, 254],
  ["10.10.10.50/26", "255.255.255.192", "0.0.0.63", "10.10.10.0", "10.10.10.63", "10.10.10.1", "10.10.10.62", 64, 62],
  ["172.16.5.200/27", "255.255.255.224", "0.0.0.31", "172.16.5.192", "172.16.5.223", "172.16.5.193", "172.16.5.222", 32, 30],
  ["10.0.0.0/8", "255.0.0.0", "0.255.255.255", "10.0.0.0", "10.255.255.255", "10.0.0.1", "10.255.255.254", 16777216, 16777214],
  ["192.168.1.0/30", "255.255.255.252", "0.0.0.3", "192.168.1.0", "192.168.1.3", "192.168.1.1", "192.168.1.2", 4, 2],
  ["10.0.0.0/31", "255.255.255.254", "0.0.0.1", "10.0.0.0", null, "10.0.0.0", "10.0.0.1", 2, 2],
  ["127.0.0.1/32", "255.255.255.255", "0.0.0.0", "127.0.0.1", null, "127.0.0.1", "127.0.0.1", 1, 1],
  ["255.255.255.255/0", "0.0.0.0", "255.255.255.255", "0.0.0.0", "255.255.255.255", "0.0.0.1", "255.255.255.254", 4294967296, 4294967294],
  ["255.255.255.255/31", "255.255.255.254", "0.0.0.1", "255.255.255.254", null, "255.255.255.254", "255.255.255.255", 2, 2],
  ["255.255.255.255/32", "255.255.255.255", "0.0.0.0", "255.255.255.255", null, "255.255.255.255", "255.255.255.255", 1, 1],
  ["0.0.0.0/32", "255.255.255.255", "0.0.0.0", "0.0.0.0", null, "0.0.0.0", "0.0.0.0", 1, 1],
];

for (const [input, subnetMask, wildcardMask, networkAddress, broadcastAddress, firstUsableHost, lastUsableHost, totalAddresses, usableHosts] of cases) {
  test(`calculates ${input}`, () => {
    const calculation = calculateSubnet(input);
    assert.equal(calculation.ok, true);
    const { binaryIp, binaryMask, ...actual } = calculation.result;
    assert.deepEqual(actual, {
      ipAddress: input.split("/")[0], prefix: Number(input.split("/")[1]),
      subnetMask, wildcardMask, networkAddress, broadcastAddress,
      firstUsableHost, lastUsableHost, totalAddresses, usableHosts,
    });
    assert.match(binaryIp, /^[01]{8}(\.[01]{8}){3}$/);
    assert.match(binaryMask, /^[01]{8}(\.[01]{8}){3}$/);
  });
}

test("binary view matches the example", () => {
  const { result } = calculateSubnet("192.168.1.10/24");
  assert.equal(result.binaryIp, "11000000.10101000.00000001.00001010");
  assert.equal(result.binaryMask, "11111111.11111111.11111111.00000000");
});

for (const input of ["192.168.1.999/24", "192.168.1.1/33", "192.168.1/24", "hello", "10.0.0.1", "", "1.2.3.4/-1", "1.2.3.4/2.5", "-1.2.3.4/24", "1.2.3.4/24/1", "1.2.3.4.5/24", "1e2.2.3.4/24", "010.0.0.1/24", "1.2.3.4 /24", "::1/32"]) {
  test(`rejects ${JSON.stringify(input)} with a useful error`, () => {
    const calculation = calculateSubnet(input);
    assert.equal(calculation.ok, false);
    assert.ok(calculation.error.length > 20);
    assert.equal(calculation.result, undefined);
  });
}

test("accepts surrounding whitespace", () => {
  assert.deepEqual(calculateSubnet("  192.168.1.10/24\n"), calculateSubnet("192.168.1.10/24"));
});

test("all prefixes agree with an independent BigInt bitwise oracle", () => {
  const ipValues = [0n, 1n, 0x7fffffffn, 0x80000000n, 0xac1005c8n, 0xffffffffn];
  const toIp = (value) => [24n, 16n, 8n, 0n].map((shift) => String((value >> shift) & 255n)).join(".");
  for (let prefix = 0; prefix <= 32; prefix++) {
    const mask = (0xffffffffn << BigInt(32 - prefix)) & 0xffffffffn;
    const wildcard = 0xffffffffn ^ mask;
    for (const ip of ipValues) {
      const { ok, result } = calculateSubnet(`${toIp(ip)}/${prefix}`);
      assert.equal(ok, true);
      const network = ip & mask;
      const end = network | wildcard;
      assert.equal(result.subnetMask, toIp(mask));
      assert.equal(result.wildcardMask, toIp(wildcard));
      assert.equal(result.networkAddress, toIp(network));
      assert.equal(result.broadcastAddress, prefix < 31 ? toIp(end) : null);
      assert.equal(result.firstUsableHost, toIp(prefix < 31 ? network + 1n : network));
      assert.equal(result.lastUsableHost, toIp(prefix < 31 ? end - 1n : end));
      assert.equal(result.totalAddresses, Number(wildcard + 1n));
      assert.equal(result.usableHosts, Number(prefix < 31 ? wildcard - 1n : wildcard + 1n));
      assert.equal(result.binaryMask.replaceAll(".", ""), "1".repeat(prefix) + "0".repeat(32 - prefix));
    }
  }
});
