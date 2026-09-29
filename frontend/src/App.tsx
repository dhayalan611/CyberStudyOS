import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Learning = lazy(() => import("./pages/Learning"));
const CourseDetails = lazy(() => import("./pages/CourseDetails"));
const Labs = lazy(() => import("./pages/Labs"));
const LabDetails = lazy(() => import("./pages/LabDetails"));
const Notes = lazy(() => import("./pages/Notes"));
const Projects = lazy(() => import("./pages/Projects"));
const Certifications = lazy(() => import("./pages/Certifications"));
const CyberReference = lazy(() => import("./pages/CyberReference"));
const LinuxCommands = lazy(() => import("./pages/LinuxCommands"));
const Networking = lazy(() => import("./pages/Networking"));
const CTFTracker = lazy(() => import("./pages/CTFTracker"));
const AIStudyAssistant = lazy(() => import("./pages/AIStudyAssistant"));
const Tasks = lazy(() => import("./pages/Tasks"));
const StudyPlanner = lazy(() => import("./pages/StudyPlanner"));
const Settings = lazy(() => import("./pages/Settings"));

const Profile = lazy(() => import("./pages/Profile"));

export default function App() {
  return <BrowserRouter>
    <Suspense fallback={<p role="status" className="p-8 text-slate-400">Loading page...</p>}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/reference" element={<Navigate to="/cyber-reference" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/learning" element={<Learning />} />
          <Route path="/learning/:courseId" element={<CourseDetails />} />
          <Route path="/labs" element={<Labs />} />
          <Route path="/labs/:labId" element={<LabDetails />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/certifications" element={<Certifications />} />
          <Route path="/cyber-reference" element={<CyberReference />} />
          <Route path="/linux" element={<LinuxCommands />} />
          <Route path="/networking" element={<Networking />} />
          <Route path="/ctf" element={<CTFTracker />} />
          <Route path="/ai" element={<AIStudyAssistant />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/planner" element={<StudyPlanner />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<div><h1 className="text-3xl font-bold text-white">Page not found</h1>
            <p className="mt-2 text-slate-400">This address does not match a CyberStudy OS page.</p>
            <Link to="/dashboard" className="mt-4 inline-block text-cyan-400">Return to Dashboard</Link></div>} />
        </Route>
      </Routes>
    </Suspense>
  </BrowserRouter>;
}
