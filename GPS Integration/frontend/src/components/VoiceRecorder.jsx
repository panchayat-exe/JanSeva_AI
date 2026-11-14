import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function VoiceRecorder({ onRecordingComplete }) {
  const { t, i18n } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        const file = new File([blob], 'voice_record.webm', { type: 'audio/webm' });
        
        // Use SpeechRecognition for transcription if available
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = i18n.language === 'hi' ? 'hi-IN' : 'en-US';
            recognition.onresult = (e) => {
                const transcript = e.results[0][0].transcript;
                onRecordingComplete(file, transcript);
            };
            recognition.onerror = (e) => {
                console.error("Speech recognition error", e);
                onRecordingComplete(file, ""); // Fallback to just the file
            };
            
            try {
              recognition.start();
            } catch (e) {
               onRecordingComplete(file, "");
            }
        } else {
           onRecordingComplete(file, "");
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  return (
    <div className="voice-recorder animate-fade-in">
      <button 
        className={`record-btn ${isRecording ? 'recording' : ''}`}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="22"></line>
        </svg>
      </button>
      <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>
        {isRecording ? t('citizen.voice_recording') : t('citizen.voice_prompt')}
      </p>
    </div>
  );
}
