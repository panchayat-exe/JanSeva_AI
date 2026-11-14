import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./i18n/i18n"; // initialize i18n

import LandingPage from "./pages/LandingPage";
import CitizenDashboard from "./pages/CitizenDashboard";
import CitizenReport from "./pages/CitizenReport";
import CitizenStatus from "./pages/CitizenStatus";
import CitizenComplaintDetail from "./pages/CitizenComplaintDetail";
import CitizenVerifyWork from "./pages/CitizenVerifyWork";
import AdminDashboard from "./pages/AdminDashboard";
import AdminIncidentDetail from "./pages/AdminIncidentDetail";
import AdminAssignComplaint from "./pages/AdminAssignComplaint";
import AdminComplaintProgress from "./pages/AdminComplaintProgress";
import AdminCitizenVerification from "./pages/AdminCitizenVerification";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<LandingPage />} />

        {/* ── Citizen ── */}
        <Route path="/citizen" element={<CitizenDashboard />} />
        <Route path="/citizen/report" element={<CitizenReport />} />
        <Route path="/status/:id" element={<CitizenStatus />} />
        {/* Citizen complaint detail & verification */}
        <Route path="/citizen/complaint/:id" element={<CitizenComplaintDetail />} />
        <Route path="/citizen/complaint/:id/verify" element={<CitizenVerifyWork />} />

        {/* ── Admin ── */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/incident/:id" element={<AdminIncidentDetail />} />
        {/* Admin lifecycle workflow */}
        <Route path="/admin/incident/:id/assign" element={<AdminAssignComplaint />} />
        <Route path="/admin/incident/:id/progress" element={<AdminComplaintProgress />} />
        <Route path="/admin/incident/:id/verification" element={<AdminCitizenVerification />} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
