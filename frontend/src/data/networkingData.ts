import { calculateSubnet } from "../utils/subnetCalculator";

export interface OsiLayer {
  number: number;
  name: string;
  summary: string;
  purpose: string;
  examples: string;
  pdu: string;
  addressing: string;
  devices: string;
}

export const osiLayers: OsiLayer[] = [
  { number: 7, name: "Application", summary: "Network services used by applications.", purpose: "Defines how applications request and exchange network information.", examples: "HTTP, DNS, SMTP, DHCP", pdu: "Data / application messages", addressing: "Application identifiers, such as domain names and URLs", devices: "Application proxies and gateways" },
  { number: 6, name: "Presentation", summary: "Data representation and transformation.", purpose: "Makes data understandable between systems through encoding, serialization, compression, and encryption.", examples: "UTF-8, JPEG, serialization; TLS illustrates encryption functions but spans model boundaries", pdu: "Data", addressing: "No distinct layer-specific address", devices: "Typically software; TLS termination gateways perform related functions" },
  { number: 5, name: "Session", summary: "Establishes and coordinates conversations.", purpose: "Manages dialogue, synchronization, and session state between communicating applications.", examples: "RPC dialogue and session management functions; practical implementations span layers", pdu: "Data", addressing: "Session identifiers where used", devices: "Typically endpoint software and session gateways" },
  { number: 4, name: "Transport", summary: "End-to-end delivery between processes.", purpose: "Multiplexes application traffic. TCP adds ordered delivery, retransmission, and flow control; UDP provides datagrams without those guarantees.", examples: "TCP, UDP", pdu: "TCP segments / UDP datagrams", addressing: "Ports", devices: "Stateful firewalls and transport-layer load balancers" },
  { number: 3, name: "Network", summary: "Logical addressing and routing across networks.", purpose: "Moves packets between networks using logical addresses and route selection.", examples: "IPv4, IPv6, ICMP", pdu: "Packets", addressing: "IP addresses", devices: "Routers and Layer 3 switches" },
  { number: 2, name: "Data Link", summary: "Frame delivery across a local link.", purpose: "Organizes frames, controls access to a link, and detects transmission errors.", examples: "Ethernet and Wi-Fi link functions; both also define physical-layer behavior", pdu: "Frames", addressing: "MAC addresses on Ethernet / Wi-Fi", devices: "Switches, bridges, and wireless access points" },
  { number: 1, name: "Physical", summary: "Bits carried as physical signals.", purpose: "Transmits bits using electrical, optical, or radio signals over a medium.", examples: "Copper cables, fiber, radio, Ethernet / Wi-Fi signaling", pdu: "Bits", addressing: "No logical addressing", devices: "Cables, transceivers, hubs, and repeaters" },
];

export const tcpIpMapping = [
  { osi: "7 Application · 6 Presentation · 5 Session", tcpIp: "Application" },
  { osi: "4 Transport", tcpIp: "Transport" },
  { osi: "3 Network", tcpIp: "Internet" },
  { osi: "2 Data Link · 1 Physical", tcpIp: "Network Access" },
];

export const ipv4Ranges = [
  { range: "10.0.0.0/8", name: "Private", description: "10.0.0.0–10.255.255.255. For private networks; not globally reachable." },
  { range: "172.16.0.0/12", name: "Private", description: "172.16.0.0–172.31.255.255. Only this portion of 172/8 is private." },
  { range: "192.168.0.0/16", name: "Private", description: "192.168.0.0–192.168.255.255. Common in home and office networks." },
  { range: "127.0.0.0/8", name: "Loopback", description: "Traffic returns to the local host; 127.0.0.1 is a common example." },
  { range: "169.254.0.0/16", name: "Link-local", description: "Local-link communication, often used when DHCP is unavailable. Routers do not forward it." },
  { range: "224.0.0.0/4", name: "Multicast", description: "224.0.0.0–239.255.255.255. Addresses groups of receivers, rather than individual hosts." },
  { range: "255.255.255.255", name: "Limited broadcast", description: "Addresses hosts on the local network. Routers do not forward it." },
  { range: "0.0.0.0/0", name: "Default route", description: "Matches all IPv4 destinations; used when no more specific route matches. It is not a host address." },
];

export const cidrReference = [8, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32].map((prefix) => {
  const calculation = calculateSubnet(`0.0.0.0/${prefix}`);
  if (!calculation.ok) throw new Error("Invalid built-in CIDR prefix");
  return calculation.result;
});

export const comparisons = [
  { title: "TCP vs UDP", left: "TCP", leftText: "Connection-oriented byte stream with ordered, reliable delivery and congestion control.", right: "UDP", rightText: "Connectionless datagrams with low protocol overhead; no built-in delivery or ordering guarantees. Applications can add these." },
  { title: "MAC Address vs IP Address", left: "MAC address", leftText: "Link-layer identifier used for local frame delivery. Often 48 bits; can be changed or randomized.", right: "IP address", rightText: "Logical network-layer address used for routing. IPv4 is 32 bits; IPv6 is 128 bits." },
  { title: "Switch vs Router", left: "Switch", leftText: "Typically forwards frames within a LAN using MAC addresses.", right: "Router", rightText: "Forwards packets between IP networks using a routing table. Layer 3 switches can also route." },
  { title: "LAN vs WAN", left: "LAN", leftText: "A local network covering a limited area, such as a home, office, or campus.", right: "WAN", rightText: "Connects networks across larger distances, often using service-provider infrastructure." },
  { title: "Public IP vs Private IP", left: "Public IP", leftText: "Globally unique and eligible for Internet routing. Reachability still depends on routing and firewall policy.", right: "Private IP", rightText: "Reusable inside private networks; not globally routed. IPv4 Internet access commonly uses NAT." },
];

export const quickTerms = [
  { name: "DNS", description: "Resolves names into records, including IP addresses. Commonly uses UDP or TCP port 53; encrypted variants also exist." },
  { name: "DHCP", description: "Leases IP configuration such as address, mask, gateway, and DNS servers. DHCPv4 uses UDP ports 67 and 68." },
  { name: "ARP", description: "Resolves an IPv4 next-hop address to a link-layer address on the local link. IPv6 uses Neighbor Discovery instead." },
  { name: "NAT", description: "Translates IP addresses between networks. Port translation lets multiple hosts share one public IPv4 address; NAT alone is not a firewall." },
  { name: "ICMP", description: "Carries IP error and control messages. Echo requests/replies support ping; time-exceeded messages help traceroute. ICMP has no TCP/UDP ports." },
  { name: "Default Gateway", description: "The next-hop router used for destinations without a more specific route. On a typical LAN, it is reachable on the local subnet." },
  { name: "Bandwidth", description: "The capacity of a link, usually expressed in bits per second (bps). It is not a measure of delay." },
  { name: "Latency", description: "The time data takes to travel, usually in milliseconds. One-way delay and round-trip time measure different journeys." },
  { name: "Throughput", description: "The actual achieved transfer rate. Congestion, protocol overhead, loss, and endpoint limits can reduce it below link capacity." },
];
