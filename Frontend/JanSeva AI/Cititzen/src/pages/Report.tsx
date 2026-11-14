import { useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  ArrowRight, Image as ImageIcon, Keyboard, Mic,
  Sparkles, Trash2, UploadCloud, Loader2, AlertCircle,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { api, getErrorMessage } from "../lib/api";
import type { ComplaintCategory } from "../types/api";
import { useT, useI18n } from "../lib/i18n";
import { transliterate, isRomanizedHindi } from "../lib/transliterate";

export function ReportPage() {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ComplaintCategory>("OTHER");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [landmark, setLandmark] = useState("");
  const [nearestRoad, setNearestRoad] = useState("");
  const [pincode, setPincode] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const t = useT();
  const { lang } = useI18n();

  // Speech recognition — uses Hindi or English based on current language
  const handleMic = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert(lang === "hi"
        ? "आपका ब्राउज़र वॉइस रिकग्निशन को सपोर्ट नहीं करता।"
        : "Speech recognition is not supported in your browser.");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    // Set language based on user's selected language — no auto-translate
    recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend   = () => setListening(false);
    recognition.onresult = (e: { results: { transcript: string }[][] }) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      setText((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.start();
  };

  // Transliterate input onBlur when lang is Hindi and text is Romanized
  const handleTransliterateBlur = (
    value: string,
    setter: (v: string) => void,
  ) => {
    if (lang === "hi" && isRomanizedHindi(value)) {
      setter(transliterate(value));
    }
  };

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      let newFiles = Array.from(e.target.files);
      if (imageFiles.length + newFiles.length > 3) {
        alert(lang === "hi" ? "आप अधिकतम 3 चित्र अपलोड कर सकते हैं।" : "You can upload a maximum of 3 photos.");
        newFiles = newFiles.slice(0, 3 - imageFiles.length);
      }
      
      const allFiles = [...imageFiles, ...newFiles];
      setImageFiles(allFiles);
      
      // Generate local preview URLs
      const previews = allFiles.map((f) => URL.createObjectURL(f));
      setImagePreviews(previews);
    }
  };

  const handleSubmit = async () => {
    setError("");
    
    const hasMedia = imageFiles.length > 0;
    const hasText = text.trim().length > 0;
    const hasTitle = title.trim().length > 0;

    if (!hasText && !hasMedia && !hasTitle) {
      setError(lang === "hi" ? "कृपया अपनी शिकायत का विवरण दें या कोई फोटो अपलोड करें।" : "Please provide details or upload an image for your complaint.");
      return;
    }

    const finalTitle = title.trim() || (lang === "hi" ? "बिना शीर्षक की शिकायत" : "Untitled Complaint");
    const finalDesc = text.trim() || (lang === "hi" ? "ऑडियो या इमेज के माध्यम से शिकायत।" : "Complaint submitted via audio/image.");
    const finalAddress = address.trim() || (lang === "hi" ? "पता उपलब्ध नहीं" : "Address not provided");
    const finalCity = city.trim() || (lang === "hi" ? "अज्ञात" : "Unknown");
    const finalState = state.trim() || (lang === "hi" ? "अज्ञात" : "Unknown");
    const finalPincode = pincode.trim() || "000000";

    setLoading(true);

    let lat: number | undefined = undefined;
    let lng: number | undefined = undefined;

    try {
      // 1. Try to geocode the address first
      const query = `${finalAddress}, ${finalCity}, ${finalState}`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
        headers: { "User-Agent": "JanSeva-AI-App" }
      });
      const geocodeData = await res.json();
      
      if (geocodeData && geocodeData.length > 0) {
        lat = parseFloat(geocodeData[0].lat);
        lng = parseFloat(geocodeData[0].lon);
      } else {
        throw new Error("Geocoding failed or no results");
      }
    } catch (geoErr) {
      console.warn("Geocoding failed, trying browser geolocation", geoErr);
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation not supported"));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: false });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } catch (err) {
        console.warn("Geolocation failed or denied, using fallback", err);
        // Fallback: Coordinates near Pune/Delhi/Mumbai based on selected city, or default to Pune
        lat = 18.5204 + (Math.random() * 0.02 - 0.01);
        lng = 73.8567 + (Math.random() * 0.02 - 0.01);
        
        const cityLower = finalCity.toLowerCase();
        if (cityLower.includes("vadodara")) {
          lat = 22.3072 + (Math.random() * 0.02 - 0.01);
          lng = 73.1812 + (Math.random() * 0.02 - 0.01);
        } else if (cityLower.includes("delhi")) {
          lat = 28.6139 + (Math.random() * 0.02 - 0.01);
          lng = 77.2090 + (Math.random() * 0.02 - 0.01);
        } else if (cityLower.includes("mumbai") || cityLower.includes("bombay")) {
          lat = 19.0760 + (Math.random() * 0.02 - 0.01);
          lng = 72.8777 + (Math.random() * 0.02 - 0.01);
        }
      }
    }

    try {
      const { data } = await api.post<{ data: { id: string } }>("/complaints", {
        title: finalTitle,
        description: finalDesc,
        category,
        address: finalAddress,
        landmark: landmark.trim() || undefined,
        nearestRoad: nearestRoad.trim() || undefined,
        city: finalCity,
        state: finalState,
        pincode: finalPincode,
        latitude: lat,
        longitude: lng,
      });
      const complaintId = data.data.id;

      if (imageFiles.length > 0) {
        for (const f of imageFiles) {
          const formData = new FormData();
          formData.append("file", f);
          await api.post(`/complaints/${complaintId}/media`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }

      navigate({ to: "/thank-you" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const categories = Object.entries(t.report.categories) as [ComplaintCategory, string][];

  return (
    <AppShell>
      <PageHeader title={t.report.title} back="/dashboard" />

      <div className="gov-panel mx-auto max-w-4xl px-5 py-10 md:px-10">
        <div className="text-center">
          <h2 className="font-display text-2xl md:text-3xl">{t.report.heading}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t.report.subheading}</p>
          <p className="text-sm text-muted-foreground">{t.report.subheading2}</p>
        </div>

        {/* Voice button */}
        <div className="mt-8 flex flex-col items-center">
          <button
            type="button"
            onClick={handleMic}
            className={`flex h-36 w-36 flex-col items-center justify-center gap-2 rounded-full border transition-colors ${
              listening ? "border-saffron text-saffron" : "border-border hover:bg-secondary"
            }`}
          >
            <Mic className="h-12 w-12" strokeWidth={1.25} />
            <span className="text-xs">{listening ? t.common.listening : t.report.tapToSpeak}</span>
          </button>
          <p className="mt-4 text-sm text-muted-foreground">
            {listening ? t.common.recording : t.common.aiReady}
          </p>
        </div>

        {/* Text input */}
        <section className="mt-8 rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <Sparkles className="h-5 w-5 text-saffron" strokeWidth={1.5} /> {t.report.inputLive}
            </span>
            <button
              type="button"
              aria-label={t.report.clearInput}
              onClick={() => setText("")}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Trash2 className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => handleTransliterateBlur(text, setText)}
            rows={3}
            lang={lang === "hi" ? "hi" : "en"}
            placeholder={t.report.textPlaceholder}
            className="mt-4 w-full resize-none rounded-lg border border-input bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-saffron"
          />

          {/* Image upload */}
          <div className="mt-4 rounded-lg border border-dashed border-border px-5 py-5">
            {imagePreviews.length > 0 ? (
              <>
                <p className="mb-3 text-sm">{imageFiles.length} {t.report.imageCount}</p>
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative">
                      <img
                        src={src}
                        alt={`preview-${i}`}
                        className="w-full rounded-lg border border-border object-cover aspect-square"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newFiles = imageFiles.filter((_, idx) => idx !== i);
                          const newPreviews = imagePreviews.filter((_, idx) => idx !== i);
                          setImageFiles(newFiles);
                          setImagePreviews(newPreviews);
                        }}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {imagePreviews.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:bg-secondary"
                    >
                      <ImageIcon className="h-6 w-6" strokeWidth={1.25} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <ImageIcon className="h-8 w-8 text-muted-foreground" strokeWidth={1.25} />
                <div>
                  <p className="text-sm">{t.report.noImage}</p>
                  <p className="text-xs text-muted-foreground">{t.report.imageHint}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Action buttons */}
        <div className="mt-5 grid rounded-xl border border-border sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              if (imageFiles.length >= 3) {
                alert(lang === "hi" ? "आप अधिकतम 3 चित्र अपलोड कर सकते हैं।" : "You can upload a maximum of 3 photos.");
              } else {
                fileRef.current?.click();
              }
            }}
            className="flex items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-secondary sm:border-r sm:border-border"
          >
            <UploadCloud className="h-8 w-8" strokeWidth={1.25} />
            <span>
              <span className="block text-sm">{t.report.uploadBtn}</span>
              <span className="block text-xs text-muted-foreground">{t.report.uploadHint}</span>
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-4 border-t border-border px-5 py-5 text-left transition-colors hover:bg-secondary sm:border-t-0"
          >
            <Keyboard className="h-8 w-8" strokeWidth={1.25} />
            <span>
              <span className="block text-sm">{t.report.fillDetails}</span>
              <span className="block text-xs text-muted-foreground">
                {showForm ? t.report.fillDetailsClose : t.report.fillDetailsOpen}
              </span>
            </span>
          </button>
        </div>

        {/* Details form */}
        {showForm && (
          <section className="mt-5 rounded-xl border border-border p-5 flex flex-col gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t.report.complaintTitle}</label>
              <input
                type="text"
                lang={lang === "hi" ? "hi" : "en"}
                placeholder={t.report.complaintTitlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => handleTransliterateBlur(title, setTitle)}
                className="w-full rounded-lg border border-input bg-transparent px-4 py-2 text-sm outline-none focus:border-saffron"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t.report.categoryLabel}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                className="w-full rounded-lg border border-input bg-transparent px-4 py-2 text-sm outline-none focus:border-saffron"
              >
                {categories.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t.report.addressLabel}</label>
              <input
                type="text"
                lang={lang === "hi" ? "hi" : "en"}
                placeholder={t.report.addressPlaceholder}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => handleTransliterateBlur(address, setAddress)}
                className="w-full rounded-lg border border-input bg-transparent px-4 py-2 text-sm outline-none focus:border-saffron"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Landmark (Optional)</label>
                <input
                  type="text"
                  lang={lang === "hi" ? "hi" : "en"}
                  placeholder="e.g. Near Temple"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  onBlur={() => handleTransliterateBlur(landmark, setLandmark)}
                  className="w-full rounded-lg border border-input bg-transparent px-4 py-2 text-sm outline-none focus:border-saffron"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Nearest Road (Optional)</label>
                <input
                  type="text"
                  lang={lang === "hi" ? "hi" : "en"}
                  placeholder="e.g. MG Road"
                  value={nearestRoad}
                  onChange={(e) => setNearestRoad(e.target.value)}
                  onBlur={() => handleTransliterateBlur(nearestRoad, setNearestRoad)}
                  className="w-full rounded-lg border border-input bg-transparent px-4 py-2 text-sm outline-none focus:border-saffron"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t.report.cityLabel}</label>
                <input
                  type="text"
                  lang={lang === "hi" ? "hi" : "en"}
                  placeholder={t.report.cityPlaceholder}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={() => handleTransliterateBlur(city, setCity)}
                  className="w-full rounded-lg border border-input bg-transparent px-4 py-2 text-sm outline-none focus:border-saffron"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t.report.stateLabel}</label>
                <input
                  type="text"
                  lang={lang === "hi" ? "hi" : "en"}
                  placeholder={t.report.statePlaceholder}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  onBlur={() => handleTransliterateBlur(state, setState)}
                  className="w-full rounded-lg border border-input bg-transparent px-4 py-2 text-sm outline-none focus:border-saffron"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t.report.pincodeLabel || "Pincode *"}</label>
                <input
                  type="text"
                  lang={lang === "hi" ? "hi" : "en"}
                  placeholder={t.report.pincodePlaceholder || "e.g. 110001"}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full rounded-lg border border-input bg-transparent px-4 py-2 text-sm outline-none focus:border-saffron"
                />
              </div>
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-border py-4 text-sm transition-colors hover:bg-secondary disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              {t.report.submitting}
            </>
          ) : (
            <>
              {t.report.submitBtn} <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </>
          )}
        </button>
      </div>
    </AppShell>
  );
}
