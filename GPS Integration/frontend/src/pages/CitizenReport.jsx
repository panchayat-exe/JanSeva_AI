import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  DashboardIcon, 
  ProfileIcon, 
  SettingsIcon, 
  LogoutIcon,
  AshokaStambhaIcon
} from '../components/Icons';

export default function CitizenReport() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [location, setLocation] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('AI is ready to listen...');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Voice recording toggle
  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setRecordingStatus('Processing voice input...');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], 'voice_note.webm', { type: 'audio/webm' });
          // Auto add voice placeholder text to live input
          setDescription(prev => prev ? `${prev} [Voice Note Recorded]` : '[Voice Note Recorded]');
          setRecordingStatus('Voice note recorded!');
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        setRecordingStatus('Listening... Tap to stop.');
      } catch (err) {
        console.warn('Microphone access error', err);
        setRecordingStatus('Microphone access denied.');
      }
    }
  };

  // Image Upload & Location Extraction
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));

      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const res = await fetch('/api/geovision/extract-location', {
          method: 'POST',
          body: formData
        });

        // Check if the response is successful before attempting to parse
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Location extraction failed:', errorText);
          throw new Error(`Server Error ${res.status}: ${errorText}`);
        }

        const contentType = res.headers.get('content-type');
        let data = {};
        if (contentType && contentType.includes('application/json')) {
          data = await res.json();
        }

        if (data.has_gps && data.location) {
          setLocation({ lat: data.location.latitude, lng: data.location.longitude });
        } else if (!location) {
          requestBrowserLocation();
        }
      } catch (error) {
        console.error("Failed to extract location:", error);
        if (!location) requestBrowserLocation(); // Fallback on failure
      }
    }
  };

  const requestBrowserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Geolocation error', err)
      );
    }
  };

  const clearInputs = () => {
    setDescription('');
    setFile(null);
    setPreviewUrl(null);
    setRecordingStatus('AI is ready to listen...');
  };

  const handleSubmit = async () => {
    const finalLat = location?.lat || 22.2952;
    const finalLng = location?.lng || 73.3599;

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    if (file) formData.append('image', file);
    formData.append('description', description);
    formData.append('category', 'pothole');
    formData.append('lat', finalLat);
    formData.append('lng', finalLng);
    formData.append('language', 'en');

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        body: formData
      });

      const contentType = res.headers.get('content-type');
      let data = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        // Log rawText here to see the specific server error in your console
        console.error('Server responded with non-JSON error:', rawText);
        data = { detail: rawText || `Server error status: ${res.status}` };
      }

      if (!res.ok) {
        throw new Error(data.detail || `Server returned error status: ${res.status}`);
      }

      navigate(`/status/${data.complaint_id}`);
    } catch (err) {
      console.error('Submission error details:', err);
      setError(err.message || 'Failed to submit report.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="jv-layout">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="jv-sidebar">
        <div className="jv-sidebar-brand">
          <div className="jv-emblem">
            <AshokaStambhaIcon width={34} height={34} />
          </div>
          <div className="jv-brand-text">
            <span className="jv-brand-name">JANSEVA AI</span>
            <span className="jv-brand-tagline">Your Voice. Our Action.</span>
          </div>
        </div>

        <div className="jv-sidebar-divider" />

        <nav className="jv-nav">
          <Link to="/citizen" className="jv-nav-item jv-nav-item--active">
            <span className="jv-nav-icon"><DashboardIcon /></span>
            <span className="jv-nav-label">Dashboard</span>
          </Link>
          <Link to="#" className="jv-nav-item">
            <span className="jv-nav-icon"><ProfileIcon /></span>
            <span className="jv-nav-label">Profile</span>
          </Link>
          <Link to="#" className="jv-nav-item">
            <span className="jv-nav-icon"><SettingsIcon /></span>
            <span className="jv-nav-label">Settings</span>
          </Link>
        </nav>

        <div className="jv-sidebar-bottom">
          <Link to="/" className="jv-nav-item jv-nav-logout">
            <span className="jv-nav-icon"><LogoutIcon /></span>
            <span className="jv-nav-label">Logout</span>
          </Link>
        </div>
      </aside>

      {/* ── Main Canvas ─────────────────────────────────────────── */}
      <div className="jv-main-area" style={{ background: '#fcfcfd', overflowY: 'auto', flex: 1, paddingBottom: '60px' }}>
        {/* Top Header */}
        <header className="jv-topheader" style={{ borderBottom: '1px solid #f1f5f9', marginBottom: '28px' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.04em' }}>
            भारत सरकार · GOVERNMENT OF INDIA · MINISTRY OF HOUSING & URBAN AFFAIRS
          </div>
          <div className="jv-topheader-right">
            <div className="jv-notif-btn">🔔<span className="jv-notif-badge">3</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
              <ProfileIcon />
              <span>Citizen</span>
              <span>▾</span>
            </div>
          </div>
        </header>

        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 24px' }}>
          {/* Main Title & Subtitle */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.02em' }}>
              Tell us about your problem.
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.1rem', lineHeight: 1.6 }}>
              You can speak, type, or upload an image.<br /> Use any option together for better results.
            </p>
          </div>

          {/* Big Mic Button Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '44px' }}>
            <button
              onClick={toggleRecording}
              style={{
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                border: isRecording ? '3px solid #ef4444' : '1px solid #e2e8f0',
                background: isRecording ? '#fef2f2' : '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: isRecording ? '0 0 32px rgba(239,68,68,0.35)' : '0 6px 24px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
                marginBottom: '18px'
              }}
            >
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={isRecording ? '#ef4444' : '#0f172a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isRecording ? '#ef4444' : '#475569', marginTop: '8px' }}>
                {isRecording ? 'Listening...' : 'Tap to Speak'}
              </span>
            </button>

            <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>
              {recordingStatus}
            </span>
          </div>

          {/* Your Input (Live) Panel */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '28px 32px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f97316', fontWeight: 700, fontSize: '1.05rem' }}>
                <span style={{ fontSize: '1.2rem' }}>✨</span>
                <span>Your Input (Live)</span>
              </div>
              <button 
                onClick={clearInputs} 
                title="Clear input"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem' }}
              >
                🗑
              </button>
            </div>

            {/* Live Text Area */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px 20px',
              minHeight: '120px',
              marginBottom: '20px',
              background: '#fcfcfd'
            }}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Your spoken or typed text will appear here... You can also add images."
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  fontSize: '1.05rem',
                  color: '#0f172a',
                  lineHeight: 1.6
                }}
              />
            </div>

            {/* Image Preview / Placeholder */}
            {previewUrl ? (
              <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <img src={previewUrl} alt="Uploaded problem" style={{ width: '100%', maxHeight: '280px', objectFit: 'cover' }} />
                <button
                  onClick={() => { setFile(null); setPreviewUrl(null); }}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(0,0,0,0.65)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{
                border: '1px dashed #cbd5e1',
                borderRadius: '14px',
                padding: '28px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                background: '#f8fafc'
              }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontSize: '1.4rem'
                }}>
                  🖼
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem' }}>No image uploaded yet</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '3px' }}>Upload an image (optional) to add more details.</div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons Row: Upload Image | Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
            {/* Upload Image Button */}
            <label style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a',
                fontSize: '1.25rem'
              }}>
                ☁️
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>Upload Image</div>
                <div style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '2px' }}>Add photo (optional)</div>
              </div>
            </label>

            {/* Type Button */}
            <div 
              onClick={() => {
                const textarea = document.querySelector('textarea');
                if (textarea) textarea.focus();
              }}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a',
                fontSize: '1.25rem'
              }}>
                ⌨️
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>Type</div>
                <div style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '2px' }}>Write your issue</div>
              </div>
            </div>
          </div>

          {/* Error Banner if any */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '14px 20px', borderRadius: '14px', marginBottom: '24px', fontSize: '0.95rem' }}>
              {error}
            </div>
          )}

          {/* Submit/Continue Pill Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!file && !description)}
            style={{
              width: '100%',
              padding: '18px',
              borderRadius: '99px',
              border: '1px solid #e2e8f0',
              background: isSubmitting ? '#94a3b8' : '#ffffff',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '1.1rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{isSubmitting ? 'Submitting Report...' : 'Continue'}</span>
            <span style={{ fontSize: '1.2rem' }}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
