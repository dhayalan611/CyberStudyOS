import { useState } from "react";
import { Calculator, ChevronDown, Layers, Network, BookOpen, Binary } from "lucide-react";
import { calculateSubnet, type SubnetResult } from "../utils/subnetCalculator";
import { cidrReference, comparisons, ipv4Ranges, osiLayers, quickTerms, tcpIpMapping } from "../data/networkingData";

const sections = [
  { name: "Subnet Calculator", icon: Calculator },
  { name: "OSI Model", icon: Layers },
  { name: "IPv4 Reference", icon: Network },
  { name: "Quick Reference", icon: BookOpen },
] as const;
type Section = typeof sections[number]["name"];
const focusStyle = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";
const formatCount = (value: number) => value.toLocaleString("en-US");

function SubnetResults({ result }: { result: SubnetResult }) {
  const rows = [
    ["IP Address", result.ipAddress], ["CIDR Prefix", `/${result.prefix}`],
    ["Subnet Mask", result.subnetMask], ["Wildcard Mask", result.wildcardMask],
    ["Network Address", result.networkAddress], ["Broadcast Address", result.broadcastAddress ?? "Not applicable"],
    ["First Usable Host", result.firstUsableHost], ["Last Usable Host", result.lastUsableHost],
    ["Total Addresses", formatCount(result.totalAddresses)], ["Usable Hosts", formatCount(result.usableHosts)],
  ];
  return <div>
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Subnet results</h3>
    <dl className="grid gap-x-8 sm:grid-cols-2">
      {rows.map(([label, value]) => <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-800 py-3">
        <dt className="text-sm text-slate-400">{label}</dt>
        <dd className="font-mono text-sm text-slate-100">{value}</dd>
      </div>)}
    </dl>
    {result.prefix === 31 && <p className="mt-4 border-l-2 border-cyan-500 pl-3 text-sm leading-relaxed text-cyan-200">/31 point-to-point link: both addresses are usable. Unlike traditional subnets, neither is reserved as a network or directed broadcast address (RFC 3021). Network Address above identifies the prefix boundary.</p>}
    {result.prefix === 32 && <p className="mt-4 border-l-2 border-cyan-500 pl-3 text-sm leading-relaxed text-cyan-200">/32 represents a single host/address. First and last host are the same address; there is no directed broadcast address.</p>}
    <p className="mt-4 text-xs leading-relaxed text-slate-400">Host counts describe subnet arithmetic. Special-purpose ranges and routing policy may restrict actual use; /0 covers the entire IPv4 space.</p>
    <details className="mt-5 rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-3">
      <summary className={`cursor-pointer text-sm text-cyan-300 ${focusStyle}`}><Binary aria-hidden="true" className="mr-2 inline h-4 w-4" />Binary View</summary>
      <p className="mb-3 mt-3 text-xs text-slate-400">Four 8-bit octets. Mask bits set to 1 identify the network prefix; 0 bits identify the host portion.</p>
      <dl className="space-y-2 text-sm">
        {[["IP", result.binaryIp], ["Mask", result.binaryMask]].map(([label, value]) => <div key={label} className="flex flex-wrap gap-x-4 gap-y-1">
          <dt className="w-10 text-slate-400">{label}</dt><dd className="min-w-0 break-all font-mono text-cyan-200">{value}</dd>
        </div>)}
      </dl>
    </details>
  </div>;
}

function OsiExplorer() {
  return <div className="space-y-6">
    <div><h2 className="text-xl font-semibold text-white">OSI Model Explorer</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">OSI is a conceptual model, not a strict protocol map. Real protocols and devices can span multiple layers. Expand a layer to explore its role.</p></div>
    <div className="divide-y divide-slate-800 border-y border-slate-800">
      {osiLayers.map((layer) => <details key={layer.number} className="group py-1">
        <summary className={`flex cursor-pointer list-none items-center gap-3 rounded py-3 [&::-webkit-details-marker]:hidden ${focusStyle}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 font-mono text-cyan-300">{layer.number}</span>
          <span className="min-w-0 flex-1"><span className="block font-medium text-slate-100">{layer.name}</span><span className="text-sm text-slate-400">{layer.summary}</span></span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <dl className="mb-4 grid gap-4 rounded-lg bg-slate-950/50 p-4 text-sm sm:grid-cols-2">
          {[["Purpose", layer.purpose], ["Protocols / technologies", layer.examples], ["PDU", layer.pdu], ["Addressing", layer.addressing], ["Devices / implementations", layer.devices]].map(([label, value]) => <div key={label}><dt className="mb-1 text-cyan-300">{label}</dt><dd className="leading-relaxed text-slate-300">{value}</dd></div>)}
        </dl>
      </details>)}
    </div>
    <div><h3 className="mb-3 font-semibold text-white">OSI → TCP/IP</h3>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">Comparison with the four-layer TCP/IP model</caption>
        <thead className="border-b border-slate-700 text-slate-400"><tr><th scope="col" className="p-3">OSI layers</th><th scope="col" className="p-3">TCP/IP layer</th></tr></thead>
        <tbody>{tcpIpMapping.map((row) => <tr key={row.tcpIp} className="border-b border-slate-800"><td className="p-3 text-slate-300">{row.osi}</td><td className="p-3 text-cyan-300">{row.tcpIp}</td></tr>)}</tbody>
      </table></div>
    </div>
  </div>;
}

function Ipv4Reference() {
  return <div className="space-y-7">
    <div><h2 className="text-xl font-semibold text-white">IPv4 Address Reference</h2><p className="mt-2 text-sm text-slate-400">Common private and special-purpose ranges.</p></div>
    <dl className="grid gap-x-8 sm:grid-cols-2">{ipv4Ranges.map((item) => <div key={item.range} className="border-b border-slate-800 py-4">
      <dt className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="font-mono text-cyan-300">{item.range}</span><span className="text-xs text-slate-400">{item.name}</span></dt>
      <dd className="mt-2 text-sm leading-relaxed text-slate-300">{item.description}</dd>
    </div>)}</dl>
    <div><h3 className="mb-3 font-semibold text-white">CIDR reference</h3>
      <div role="region" aria-label="CIDR reference table" tabIndex={0} className={`overflow-x-auto ${focusStyle}`}><table className="w-full whitespace-nowrap text-left text-sm">
        <caption className="sr-only">IPv4 subnet masks and address counts by prefix</caption>
        <thead className="border-b border-slate-700 text-slate-400"><tr>{["CIDR", "Subnet Mask", "Total Addresses", "Usable Hosts"].map((label) => <th scope="col" key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
        <tbody>{cidrReference.map((row) => <tr key={row.prefix} className="border-b border-slate-800 font-mono"><th scope="row" className="px-3 py-2 font-normal text-cyan-300">/{row.prefix}</th><td className="px-3 py-2 text-slate-300">{row.subnetMask}</td><td className="px-3 py-2 text-slate-300">{formatCount(row.totalAddresses)}</td><td className="px-3 py-2 text-slate-300">{formatCount(row.usableHosts)}</td></tr>)}</tbody>
      </table></div>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">/31: two usable point-to-point addresses, no directed broadcast. /32: one host/address. Other rows reserve the network and broadcast addresses; counts do not account for special-purpose address restrictions.</p>
    </div>
    <p className="text-xs text-slate-400">Further reading: <a className={`text-cyan-400 underline ${focusStyle}`} href="https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml">IANA special-purpose IPv4 registry</a> · <a className={`text-cyan-400 underline ${focusStyle}`} href="https://www.rfc-editor.org/rfc/rfc3021.html">RFC 3021 (/31 links)</a></p>
  </div>;
}

function QuickReference() {
  return <div className="space-y-6">
    <h2 className="text-xl font-semibold text-white">Networking Quick Reference</h2>
    <div className="grid gap-4 lg:grid-cols-2">{comparisons.map((item) => <article key={item.title} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <h3 className="mb-3 font-semibold text-white">{item.title}</h3>
      <dl className="grid gap-4 sm:grid-cols-2">{[[item.left, item.leftText], [item.right, item.rightText]].map(([label, value]) => <div key={label}><dt className="text-sm font-medium text-cyan-300">{label}</dt><dd className="mt-1 text-sm leading-relaxed text-slate-400">{value}</dd></div>)}</dl>
    </article>)}</div>
    <dl className="grid gap-x-8 md:grid-cols-2">{quickTerms.map((term) => <div key={term.name} className="border-b border-slate-800 py-4"><dt className="font-medium text-cyan-300">{term.name}</dt><dd className="mt-1 text-sm leading-relaxed text-slate-300">{term.description}</dd></div>)}</dl>
  </div>;
}

export default function Networking() {
  const [section, setSection] = useState<Section>("Subnet Calculator");
  const [input, setInput] = useState("192.168.1.10/24");
  const [calculation, setCalculation] = useState(() => calculateSubnet("192.168.1.10/24"));
  const [submittedInput, setSubmittedInput] = useState(input);
  const [submissionCount, setSubmissionCount] = useState(0);
  const isCurrent = input === submittedInput;

  return <div className="mx-auto max-w-7xl">
    <header className="mb-8 flex items-start gap-4">
      <div className="hidden rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 sm:block"><Network aria-hidden="true" className="h-6 w-6 text-cyan-400" /></div>
      <div><h1 className="text-3xl font-bold text-white">Networking</h1><p className="mt-2 text-slate-400">Interactive networking tools and quick-reference knowledge.</p></div>
    </header>
    <div role="group" aria-label="Networking sections" className="mb-6 flex flex-wrap gap-2">
      {sections.map(({ name, icon: Icon }) => <button key={name} type="button" aria-pressed={section === name} aria-controls="networking-section" onClick={() => setSection(name)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${focusStyle} ${section === name ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}><Icon aria-hidden="true" className="h-4 w-4" />{name}</button>)}
    </div>
    <section id="networking-section" aria-label={section}>
      <div hidden={section !== "Subnet Calculator"}>
        <h2 className="text-xl font-semibold text-white">IPv4 Subnet Calculator</h2>
        <p className="mt-2 text-sm text-slate-400">Explore network boundaries and host ranges from an IPv4 CIDR address.</p>
        <form noValidate onSubmit={(event) => { event.preventDefault(); setCalculation(calculateSubnet(input)); setSubmittedInput(input); setSubmissionCount((count) => count + 1); }} className="my-5 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <label htmlFor="ipv4-cidr" className="mb-2 block text-sm font-medium text-slate-300">IPv4 address / CIDR</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="ipv4-cidr" type="text" value={input} onChange={(event) => setInput(event.target.value)} placeholder="192.168.1.10/24" autoComplete="off" spellCheck={false}
              aria-invalid={isCurrent && !calculation.ok} aria-describedby={`cidr-help${isCurrent && !calculation.ok ? " cidr-error" : ""}`}
              className={`w-full min-w-0 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 font-mono text-white placeholder:text-slate-500 ${focusStyle}`} />
            <button type="submit" className={`rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 ${focusStyle}`}>Calculate</button>
          </div>
          <p id="cidr-help" className="mt-2 text-xs text-slate-400">CIDR notation required. Four octets (0–255) and a prefix from /0 to /32.</p>
          {isCurrent && !calculation.ok && <p key={submissionCount} id="cidr-error" role="alert" className="mt-3 text-sm text-rose-400">{calculation.error}</p>}
        </form>
        <p role="status" aria-live="polite" className="sr-only">{submissionCount > 0 && isCurrent && calculation.ok ? `Calculation ${submissionCount} complete for ${calculation.result.ipAddress}/${calculation.result.prefix}.` : ""}</p>
        {!isCurrent && <p className="mb-4 text-sm text-amber-300">Input changed. Select Calculate or press Enter to update the results.</p>}
        {calculation.ok && <SubnetResults result={calculation.result} />}
      </div>
      {section === "OSI Model" && <OsiExplorer />}
      {section === "IPv4 Reference" && <Ipv4Reference />}
      {section === "Quick Reference" && <QuickReference />}
    </section>
  </div>;
}
