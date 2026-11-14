import React from 'react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ReportGenerator({ incident }) {
  const { t } = useTranslation();

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('JANSEVA GeoVision - Incident Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Incident ID: ${incident.id}`, 14, 36);

    // Main Details Table
    doc.autoTable({
      startY: 45,
      head: [['Field', 'Value']],
      body: [
        ['Category', incident.category],
        ['Status', incident.status],
        ['Severity', incident.severity],
        ['Priority Score', incident.priority_score.toString()],
        ['Complaints Count', incident.complaint_count.toString()],
        ['Department', incident.department],
        ['Ward', incident.ward],
        ['Location', `${incident.representative_lat}, ${incident.representative_lng}`],
        ['Description', incident.description || 'N/A'],
        ['Created At', new Date(incident.created_at).toLocaleString()],
        ['SLA Deadline', incident.sla_deadline ? new Date(incident.sla_deadline).toLocaleString() : 'N/A'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }, // Accent primary
    });

    // Timeline Events
    if (incident.events && incident.events.length > 0) {
      doc.text('Timeline Events', 14, doc.lastAutoTable.finalY + 15);
      
      const eventBody = incident.events.map(ev => [
        new Date(ev.timestamp).toLocaleString(),
        ev.event_type,
        ev.actor,
        ev.metadata ? JSON.stringify(ev.metadata) : ''
      ]);

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Timestamp', 'Event', 'Actor', 'Metadata']],
        body: eventBody,
        theme: 'grid',
        styles: { fontSize: 9 }
      });
    }

    doc.save(`janseva-report-${incident.id.substring(0, 8)}.pdf`);
  };

  return (
    <button className="btn btn-secondary w-full mt-4" onClick={generatePDF}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      {t('admin.detail.export_pdf')}
    </button>
  );
}
