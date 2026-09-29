import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  GraduationCap,
  FlaskConical,
  NotebookText,
  FolderKanban,
  Award,
  BookOpen,
  Terminal,
  Network,
  Flag,
  Bot,
  CheckSquare,
  CalendarDays,
  Settings,
  User,
  Shield,
} from "lucide-react";

const mainMenu = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { name: "My Learning", icon: GraduationCap, path: "/learning" },
  { name: "Labs", icon: FlaskConical, path: "/labs" },
  { name: "Notes", icon: NotebookText, path: "/notes" },
  { name: "Projects", icon: FolderKanban, path: "/projects" },
  { name: "Certifications", icon: Award, path: "/certifications" },
];

const toolsMenu = [
  { name: "Cyber Reference", icon: BookOpen, path: "/cyber-reference" },
  { name: "Linux Commands", icon: Terminal, path: "/linux" },
  { name: "Networking", icon: Network, path: "/networking" },
  { name: "CTF Tracker", icon: Flag, path: "/ctf" },
  { name: "AI Study Assistant", icon: Bot, path: "/ai" },
];

const productivityMenu = [
  { name: "Tasks", icon: CheckSquare, path: "/tasks" },
  { name: "Study Planner", icon: CalendarDays, path: "/planner" },
];

function Sidebar() {
  return (
    <aside className="flex min-h-0 w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-300">

      {/* Logo */}
      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
          <Shield className="h-6 w-6 text-cyan-400" />
        </div>

        <div>
          <h1 className="font-bold text-white">
            CyberStudy
          </h1>
          <p className="text-xs text-slate-500">
            Learning Workstation
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="flex flex-wrap gap-1 md:hidden [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-cyan-400">
          <SidebarItem name="Settings" icon={Settings} path="/settings" />
          <SidebarItem name="Profile" icon={User} path="/profile" />
        </div>

        <MenuSection title="MAIN" items={mainMenu} />

        <MenuSection title="TOOLS" items={toolsMenu} />

        <MenuSection
          title="PRODUCTIVITY"
          items={productivityMenu}
        />

      </nav>

      {/* System */}
      <div className="border-t border-slate-800 p-3">

        <SidebarItem
            name="Settings"
            icon={Settings}
            path="/settings"
        />

        <SidebarItem
            name="Profile"
            icon={User}
            path="/profile"
        />

        {/* User */}
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-900 p-3">

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500 font-bold text-slate-950">
            D
          </div>

          <div>
            <p className="text-sm font-medium text-white">
              Dhaya
            </p>

            <p className="text-xs text-slate-500">
              ICT Undergraduate
            </p>
          </div>

        </div>

      </div>

    </aside>
  );
}

function MenuSection({
  title,
  items,
}: {
  title: string;
  items: {
    name: string;
    icon: React.ElementType;
    path: string;
  }[];
}) {
  return (
    <div className="mb-6">

      <p className="mb-2 px-3 text-xs font-semibold tracking-wider text-slate-600">
        {title}
      </p>

      <div className="space-y-1">

        {items.map((item) => (
          <SidebarItem
            key={item.name}
            name={item.name}
            icon={item.icon}
            path={item.path}
          />
        ))}

      </div>

    </div>
  );
}

function SidebarItem({
  name,
  icon: Icon,
  path,
}: {
  name: string;
  icon: React.ElementType;
  path: string;
}) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-cyan-500/10 text-cyan-400"
            : "text-slate-300 hover:bg-slate-900 hover:text-white"
        }`
      }
    >
      <Icon className="h-4 w-4" />
      <span>{name}</span>
    </NavLink>
  );
}

export default Sidebar;
