export const LINUX_CATEGORIES = [
  "Files & Directories", "Text Processing", "Permissions", "System", "Processes",
  "Networking", "Archives", "Packages", "Shell",
] as const;

export type LinuxCategory = typeof LINUX_CATEGORIES[number];
export type LinuxFilter = "All" | LinuxCategory;
export type LinuxCommandExample = { code: string; explanation: string };
export type LinuxCommand = {
  id: string;
  command: string;
  syntax: string;
  description: string;
  category: LinuxCategory;
  examples: LinuxCommandExample[];
  tags: string[];
  warning?: string;
};

// A compact authoring helper; exported entries remain ordinary typed objects.
function entry(command: string, syntax: string, description: string, category: LinuxCategory,
  tags: string[], examples: [string, string][], warning?: string): LinuxCommand {
  return { id: command.replaceAll(" ", "-"), command, syntax, description, category,
    tags, examples: examples.map(([code, explanation]) => ({ code, explanation })),
    ...(warning ? { warning } : {}) };
}

export const linuxCommandsData: LinuxCommand[] = [
  entry("pwd", "pwd", "Print the path of your current working directory.", "Files & Directories", ["files", "directory", "navigation"], [["pwd", "Show where you are in the filesystem."]]),
  entry("ls", "ls [options] [path...]", "List files and directories.", "Files & Directories", ["files", "list", "hidden"], [["ls -lah", "List all entries with permissions and human-readable sizes."]]),
  entry("cd", "cd [directory]", "Change the current shell directory.", "Files & Directories", ["directory", "navigation", "shell"], [["cd ~", "Go to your home directory."], ["cd ..", "Go up one directory."]]),
  entry("mkdir", "mkdir [options] directory...", "Create directories.", "Files & Directories", ["files", "directory", "create"], [["mkdir -p linux-practice/notes", "Create a practice directory and its notes subdirectory if needed."]]),
  entry("rmdir", "rmdir [options] directory...", "Remove empty directories.", "Files & Directories", ["files", "directory", "remove"], [["rmdir empty-practice", "Remove this practice directory only if it is empty."]], "Removes the named empty directory. Check its path first."),
  entry("touch", "touch [options] file...", "Create empty files or update file timestamps.", "Files & Directories", ["files", "create", "timestamps"], [["touch practice-notes.txt", "Create an empty practice file; if it exists, update its timestamps."]]),
  entry("cp", "cp [options] source destination", "Copy files or directories.", "Files & Directories", ["files", "copy"], [["cp -i practice-notes.txt practice-copy.txt", "Copy a practice file, asking before overwriting an existing destination."]], "Copying can overwrite destination files. Use -i and review the destination."),
  entry("mv", "mv [options] source destination", "Move or rename files and directories.", "Files & Directories", ["files", "move", "rename"], [["mv -i practice-copy.txt renamed-copy.txt", "Rename a practice copy, asking before overwriting."]], "Moving can overwrite destination files or change paths other tools depend on."),
  entry("rm", "rm [options] file...", "Remove files from the filesystem.", "Files & Directories", ["files", "delete", "remove"], [["rm -i practice-copy.txt", "Ask for confirmation before deleting this disposable practice copy."]], "Files deleted from the shell with rm normally do not go to a recycle bin. Check the path and keep backups; deletion may be permanent."),
  entry("find", "find [path...] [expression]", "Search for files by name and other properties.", "Files & Directories", ["files", "search", "directory"], [["find ./notes -type f -name '*.txt'", "Find text files beneath the notes directory; quotes keep the shell from expanding the pattern."]]),
  entry("locate", "locate [options] pattern...", "Find paths using an indexed filename database.", "Files & Directories", ["files", "search", "index"], [["locate notes.txt", "List indexed paths containing notes.txt. Results may be outdated, and locate may need installation."]]),
  entry("tree", "tree [options] [directory]", "Display directories as a tree.", "Files & Directories", ["files", "directory", "listing"], [["tree -L 2 ./notes", "Show at most two directory levels. tree may need installation."]]),

  entry("cat", "cat [options] [file...]", "Print or concatenate text files.", "Text Processing", ["text", "view", "files"], [["cat notes.txt", "Print a small text file to the terminal."]]),
  entry("less", "less [options] file", "Read text one screen at a time.", "Text Processing", ["text", "view", "pager"], [["less server.log", "Browse a log; use / to search and q to quit."]]),
  entry("head", "head [options] [file...]", "Display the beginning of a file.", "Text Processing", ["text", "view", "lines"], [["head -n 10 notes.txt", "Show the first ten lines."]]),
  entry("tail", "tail [options] [file...]", "Display the end of a file or follow new lines.", "Text Processing", ["text", "logs", "lines"], [["tail -n 20 server.log", "Show the last twenty lines."], ["tail -f server.log", "Watch newly appended lines; press Ctrl+C to stop watching."]]),
  entry("wc", "wc [options] [file...]", "Count lines, words, or bytes.", "Text Processing", ["text", "count", "lines"], [["wc -l notes.txt", "Count newline characters in the file."]]),
  entry("sort", "sort [options] [file...]", "Sort lines of text.", "Text Processing", ["text", "order", "sort"], [["sort names.txt", "Print lines in sorted order without changing the file."]]),
  entry("uniq", "uniq [options] [input [output]]", "Filter or count adjacent duplicate lines.", "Text Processing", ["text", "duplicates", "count"], [["sort names.txt | uniq -c", "Sort first so equal lines are adjacent, then count each distinct line."]]),
  entry("grep", "grep [options] pattern [file...]", "Search text for matching patterns.", "Text Processing", ["text", "search", "patterns", "logs"], [["grep \"error\" server.log", "Print log lines containing error."], ["grep -i \"warning\" server.log", "Find warning regardless of letter case."], ["grep -r \"TODO\" ./notes", "Search recursively for TODO in your notes."]]),
  entry("cut", "cut [options] [file...]", "Extract fields or character positions from lines.", "Text Processing", ["text", "fields", "columns"], [["cut -d ',' -f 1 names.csv", "Print the first comma-separated field; this does not parse quoted CSV fields."]]),
  entry("diff", "diff [options] file1 file2", "Compare text files line by line.", "Text Processing", ["text", "compare", "changes"], [["diff -u notes.txt notes-copy.txt", "Show differences with surrounding context; neither file is changed."]]),

  entry("chmod", "chmod [options] mode file...", "Change file or directory permissions.", "Permissions", ["permissions", "access", "mode"], [["chmod u+x practice-script.sh", "Give the owner execute permission on your practice script."]], "Permission changes can expose files or prevent access. Check the target and avoid broad or recursive changes while learning."),
  entry("chown", "chown [options] owner[:group] file...", "Change file ownership, optionally including the group.", "Permissions", ["permissions", "owner", "access"], [["chown --help", "Read ownership options without changing any files."]], "Changing ownership can break access or services and often requires administrator rights. Practice only on disposable files with known owners."),
  entry("chgrp", "chgrp [options] group file...", "Change the group that owns a file.", "Permissions", ["permissions", "group", "access"], [["chgrp --help", "Review group ownership options without modifying files."]], "Changing a file's group can change who has access. You generally need to own the file and belong to the target group."),
  entry("umask", "umask [mask]", "View or set the shell's mask for new file permissions.", "Permissions", ["permissions", "defaults", "shell"], [["umask", "Display the current mask without changing it."], ["umask -S", "Display allowed permissions symbolically."]], "Setting a mask affects permissions of newly created files and directories in this shell; it does not alter existing files."),

  entry("uname", "uname [options]", "Display kernel and system information.", "System", ["system", "kernel", "architecture"], [["uname -a", "Show available kernel and machine information."]]),
  entry("hostname", "hostname [options] [name]", "Display or change the system hostname.", "System", ["system", "host", "name"], [["hostname", "Print the current hostname without changing it."]], "Setting a hostname changes system identity and can affect networking; the example only reads it."),
  entry("whoami", "whoami", "Print the effective user's name.", "System", ["system", "user", "identity"], [["whoami", "Show which user your shell is running as."]]),
  entry("id", "id [options] [user]", "Show user and group identifiers.", "System", ["system", "user", "groups", "permissions"], [["id", "Show your effective user ID and group memberships."]]),
  entry("uptime", "uptime [options]", "Show how long the system has been running and its load.", "System", ["system", "load", "time"], [["uptime", "Print uptime, logged-in user count, and load averages."]]),
  entry("date", "date [options] [+format]", "Display or set the system date and time.", "System", ["system", "time", "clock"], [["date '+%Y-%m-%d %H:%M:%S'", "Print the current local date and time in a readable format."]], "Setting the clock can affect logs and scheduled tasks. This example only displays time."),
  entry("df", "df [options] [path...]", "Show filesystem disk space usage.", "System", ["system", "disk", "storage", "space"], [["df -h", "Show used and available space in human-readable units."]]),
  entry("du", "du [options] [path...]", "Estimate disk space used by files and directories.", "System", ["system", "disk", "storage", "size"], [["du -sh ./notes", "Show a human-readable total for the notes directory."]]),
  entry("free", "free [options]", "Display memory and swap usage.", "System", ["system", "memory", "ram"], [["free -h", "Show memory figures in human-readable units; available estimates memory usable by new applications."]]),
  entry("lsblk", "lsblk [options] [device...]", "List block devices such as disks and partitions.", "System", ["system", "disk", "storage", "devices"], [["lsblk -f", "Inspect filesystem types and mount points without modifying disks."]]),

  entry("ps", "ps [options]", "Display a snapshot of running processes.", "Processes", ["process", "pid", "tasks"], [["ps -u \"$(whoami)\"", "List processes belonging to your current user."]]),
  entry("top", "top [options]", "Monitor process activity and resource usage interactively.", "Processes", ["process", "cpu", "memory", "monitor"], [["top", "View live process usage; press q to quit."]]),
  entry("htop", "htop [options]", "Browse processes in an interactive resource monitor.", "Processes", ["process", "cpu", "memory", "monitor"], [["htop", "Open the monitor; press q to quit. htop may need installation."]]),
  entry("jobs", "jobs [options]", "List jobs managed by the current shell.", "Processes", ["process", "shell", "background", "jobs"], [["jobs -l", "List this shell's jobs with process IDs; no output means there are no jobs."]]),
  entry("bg", "bg [jobspec]", "Resume a stopped shell job in the background.", "Processes", ["process", "shell", "background", "jobs"], [["bg %1", "Resume job 1 after confirming with jobs that it is your harmless practice task."]], "Resumes the selected job's work. Verify its job number and command first."),
  entry("fg", "fg [jobspec]", "Bring a shell job into the foreground.", "Processes", ["process", "shell", "foreground", "jobs"], [["fg %1", "Bring your verified practice job 1 to the foreground."]], "A stopped job resumes when brought to the foreground. Check jobs before choosing a job number."),
  entry("kill", "kill [options] PID...", "Send a signal to a process; the default requests termination.", "Processes", ["process", "signal", "pid", "stop"], [["kill -l", "List supported signals without signaling or stopping any process."]], "Terminating a process may lose unsaved work or interrupt services. Verify the PID and ownership before sending a signal."),
  entry("pkill", "pkill [options] pattern", "Signal processes selected by a name pattern.", "Processes", ["process", "signal", "stop", "pattern"], [["pkill --help", "Read selection and signal options without stopping any processes."]], "A name pattern can match multiple processes. Preview matches with pgrep and verify every target before signaling."),

  entry("ip", "ip [options] object [command]", "Inspect or configure network interfaces, addresses, and routes.", "Networking", ["network", "address", "interface", "route"], [["ip address show", "List interface addresses without changing them."], ["ip route show", "View the current routing table."]], "Configuration subcommands can disconnect networking. These examples are read-only."),
  entry("ping", "ping [options] destination", "Check IP reachability with ICMP echo requests.", "Networking", ["network", "connectivity", "icmp"], [["ping -c 4 127.0.0.1", "Send four requests to your own machine's loopback address."]]),
  entry("traceroute", "traceroute [options] destination", "Show responding hops along a network path.", "Networking", ["network", "route", "hops"], [["traceroute 127.0.0.1", "Trace the local loopback path. The tool may need installation; external hops may not respond."]]),
  entry("ss", "ss [options]", "Inspect network sockets and listening ports.", "Networking", ["network", "ports", "sockets", "connections"], [["ss -tuln", "List listening TCP and UDP sockets using numeric addresses and ports."]]),
  entry("netstat", "netstat [options]", "Display connections and network statistics using a legacy tool.", "Networking", ["network", "ports", "connections", "legacy"], [["netstat -tuln", "List listening TCP and UDP sockets. net-tools may need installation; ss is the modern alternative."]]),
  entry("nslookup", "nslookup [options] [name] [server]", "Query DNS records for a hostname.", "Networking", ["network", "dns", "lookup"], [["nslookup example.com", "Ask your configured DNS resolver for this example domain."]]),
  entry("dig", "dig [@server] name [type] [options]", "Query DNS with detailed or concise output.", "Networking", ["network", "dns", "lookup"], [["dig example.com A +short", "Display IPv4 DNS answers for the example domain."]]),
  entry("curl", "curl [options] URL", "Transfer data to or from a URL.", "Networking", ["network", "http", "request", "download"], [["curl -I https://example.com", "Request HTTP response headers from the example site."]]),
  entry("wget", "wget [options] URL...", "Download files from the web.", "Networking", ["network", "http", "download"], [["wget --spider https://example.com", "Check the example URL without saving the page."]], "Downloads write files locally. Review the destination and only use trusted files; downloading does not mean they are safe to execute."),

  entry("tar", "tar [options] [archive] [path...]", "Create, list, or extract file archives.", "Archives", ["archive", "backup", "compression"], [["tar -tf practice.tar", "List an existing practice archive's contents without extracting anything."]], "Creating archives can overwrite an archive file; extraction can overwrite files. Inspect contents first and extract trusted archives into a separate empty directory."),
  entry("gzip", "gzip [options] file...", "Compress files in gzip format.", "Archives", ["archive", "compression", "gzip"], [["gzip -k practice-notes.txt", "Compress a practice file while keeping the original with -k."]], "By default gzip replaces the input file with a compressed version. Use -k to keep it."),
  entry("gunzip", "gunzip [options] file...", "Decompress gzip files.", "Archives", ["archive", "compression", "extract"], [["gunzip -k practice-copy.txt.gz", "Decompress a practice copy while retaining the compressed file."]], "By default gunzip removes the compressed input after decompression. Check output paths and keep originals with -k."),
  entry("zip", "zip [options] archive file...", "Create or update ZIP archives.", "Archives", ["archive", "compression", "backup"], [["zip practice-notes.zip practice-notes.txt", "Store a practice text file in a ZIP archive while keeping the source file."]], "An existing archive with the same name can be updated. Use a new archive name for practice."),
  entry("unzip", "unzip [options] archive", "List or extract files from a ZIP archive.", "Archives", ["archive", "compression", "extract"], [["unzip -l practice-notes.zip", "List archive contents without extracting files."]], "Extraction may overwrite files. Inspect contents, use trusted archives, and extract into a separate empty directory."),

  entry("apt", "apt [options] command", "Inspect and manage packages on Debian-based systems such as Ubuntu.", "Packages", ["packages", "software", "debian", "ubuntu"], [["apt search tree", "Search configured package metadata for tree."], ["apt show tree", "Display package details without installing anything."]], "Install, remove, and upgrade operations modify system software and generally need administrator rights. The examples only inspect metadata."),
  entry("apt update", "apt update", "Refresh package metadata from configured repositories.", "Packages", ["packages", "software", "repository", "debian", "ubuntu"], [["apt --help", "Review apt usage before updating. The update operation refreshes metadata; it does not upgrade installed packages."]], "Running apt update changes local package metadata, contacts configured repositories, and generally needs administrator rights."),
  entry("apt upgrade", "apt upgrade [options]", "Upgrade installed packages using available repository versions.", "Packages", ["packages", "software", "updates", "debian", "ubuntu"], [["apt -s upgrade", "Simulate an upgrade without installing packages. Results depend on available metadata and permissions."]], "Actual upgrades change installed software, may restart services, and can require a reboot. Review proposed changes and maintain backups. The example is a simulation."),

  entry("clear", "clear", "Clear the terminal display.", "Shell", ["shell", "terminal", "display"], [["clear", "Clear the visible terminal; this does not erase shell history."]]),
  entry("history", "history [options]", "Show or manage command history in shells such as Bash.", "Shell", ["shell", "history", "commands"], [["history 10", "In Bash, display your ten most recent history entries."]], "History may contain sensitive arguments. Review it before sharing; some options can delete history entries."),
  entry("which", "which command...", "Look for executable commands in PATH.", "Shell", ["shell", "path", "executable"], [["which grep", "Find the grep executable. Shell built-ins and aliases are better checked with command -v or type."]]),
  entry("whereis", "whereis [options] command...", "Locate binaries, source files, and manual pages.", "Shell", ["shell", "path", "manual"], [["whereis ls", "Show known locations for the ls executable and documentation."]]),
  entry("man", "man [section] page", "Read command manual pages.", "Shell", ["shell", "help", "manual", "documentation"], [["man grep", "Open grep's manual; press q to exit the usual pager."]]),
  entry("echo", "echo [options] [text...]", "Print text or expanded shell variables.", "Shell", ["shell", "text", "output"], [["echo \"Hello, Linux\"", "Print a short greeting."], ["echo \"$HOME\"", "Print the path stored in your HOME variable."]]),
  entry("env", "env [options] [NAME=VALUE...] [command]", "Display the environment or run a command with changed variables.", "Shell", ["shell", "environment", "variables"], [["env", "List the current environment variables."]], "Environment variables can contain credentials or tokens. Review output before sharing it."),
  entry("export", "export [NAME[=VALUE]...]", "Pass shell variables to subsequently launched child processes.", "Shell", ["shell", "environment", "variables"], [["export STUDY_TOPIC=linux", "Set a practice variable in this shell's environment; it is not saved permanently."]], "Changing existing environment variables can affect programs launched from this shell. Use a new practice variable."),
];

export function filterLinuxCommands(items: LinuxCommand[], search: string, category: LinuxFilter): LinuxCommand[] {
  const query = search.trim().toLowerCase();
  return items.filter((item) => (category === "All" || item.category === category)
    && [item.command, item.syntax, item.description, ...item.tags].some((value) => value.toLowerCase().includes(query)));
}
