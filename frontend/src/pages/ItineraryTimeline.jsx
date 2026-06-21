import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Clock, Edit2, Check, X, Plus, Trash2, Download,
  Printer, ChevronRight, MapPin, Lightbulb, Star,
  AlertCircle, Sparkles,
} from 'lucide-react';

// ── DayImage: Pexels API with Shimmer Skeleton ───
const PEXELS_API_KEY = 'S5GJV1aBXPqCGlm8QN0255YO4XlxUsAE5quIpJ5ZKTTUUmmMKGJFyn96';
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800';

const DayImage = ({ query, className, style }) => {
  const [src, setSrc] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!query) {
      setSrc(FALLBACK_IMAGE);
      return;
    }
    
    fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: { Authorization: PEXELS_API_KEY }
    })
      .then(r => r.json())
      .then(data => {
        if (data.photos && data.photos.length > 0) {
          setSrc(data.photos[0].src.landscape || data.photos[0].src.large);
        } else {
          setSrc(FALLBACK_IMAGE);
        }
      })
      .catch(() => {
        setSrc(FALLBACK_IMAGE);
      });
  }, [query]);

  return (
    <div className={`${className} bg-raised overflow-hidden relative`} style={style}>
      {/* Shimmer skeleton */}
      {!loaded && (
        <div className="absolute inset-0 bg-overlay animate-pulse" />
      )}
      {src && (
        <img
          src={src}
          alt={query}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (src !== FALLBACK_IMAGE) setSrc(FALLBACK_IMAGE);
          }}
        />
      )}
    </div>
  );
};

// ─── palette ────────────────────────────────────────────────────────────────
const PALETTES = [
  {
    bg:             'rgba(109,40,217,0.10)',
    border:         'rgba(139,92,246,0.30)',
    dot:            '#8B5CF6',
    dotActive:      '#A78BFA',
    badge:          'bg-violet-500',
    timeLabelColor: '#C4B5FD',
    activityColor:  'rgba(255,255,255,0.85)',
    highlightBg:    'rgba(139,92,246,0.15)',
    tipBg:          'rgba(109,40,217,0.12)',
    pdfAccent:      '#7C3AED',
  },
  {
    bg:             'rgba(194,65,12,0.10)',
    border:         'rgba(249,115,22,0.30)',
    dot:            '#F97316',
    dotActive:      '#FB923C',
    badge:          'bg-orange-500',
    timeLabelColor: '#FED7AA',
    activityColor:  'rgba(255,255,255,0.85)',
    highlightBg:    'rgba(249,115,22,0.15)',
    tipBg:          'rgba(194,65,12,0.12)',
    pdfAccent:      '#EA580C',
  },
  {
    bg:             'rgba(8,145,178,0.10)',
    border:         'rgba(6,182,212,0.30)',
    dot:            '#06B6D4',
    dotActive:      '#22D3EE',
    badge:          'bg-cyan-500',
    timeLabelColor: '#A5F3FC',
    activityColor:  'rgba(255,255,255,0.85)',
    highlightBg:    'rgba(6,182,212,0.15)',
    tipBg:          'rgba(8,145,178,0.12)',
    pdfAccent:      '#0891B2',
  },
  {
    bg:             'rgba(21,128,61,0.10)',
    border:         'rgba(34,197,94,0.30)',
    dot:            '#22C55E',
    dotActive:      '#4ADE80',
    badge:          'bg-green-500',
    timeLabelColor: '#BBF7D0',
    activityColor:  'rgba(255,255,255,0.85)',
    highlightBg:    'rgba(34,197,94,0.15)',
    tipBg:          'rgba(21,128,61,0.12)',
    pdfAccent:      '#16A34A',
  },
  {
    bg:             'rgba(157,23,77,0.10)',
    border:         'rgba(236,72,153,0.30)',
    dot:            '#EC4899',
    dotActive:      '#F472B6',
    badge:          'bg-pink-500',
    timeLabelColor: '#FBCFE8',
    activityColor:  'rgba(255,255,255,0.85)',
    highlightBg:    'rgba(236,72,153,0.15)',
    tipBg:          'rgba(157,23,77,0.12)',
    pdfAccent:      '#DB2777',
  },
  {
    bg:             'rgba(146,64,14,0.10)',
    border:         'rgba(245,158,11,0.30)',
    dot:            '#F59E0B',
    dotActive:      '#FCD34D',
    badge:          'bg-amber-500',
    timeLabelColor: '#FDE68A',
    activityColor:  'rgba(255,255,255,0.85)',
    highlightBg:    'rgba(245,158,11,0.15)',
    tipBg:          'rgba(146,64,14,0.12)',
    pdfAccent:      '#D97706',
  },
];

// ─── editable inline text ────────────────────────────────────────────────────
const EditableText = ({ value, onChange, multiline = false, className = '', style = {} }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const ref = useRef(null);

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => { setEditing(false); if (draft?.trim()) onChange(draft.trim()); else setDraft(value); };
  const cancel = () => { setEditing(false); setDraft(value); };

  if (editing) {
    const shared = {
      ref,
      value: draft,
      onChange: e => setDraft(e.target.value),
      onKeyDown: e => {
        if (!multiline && e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') cancel();
      },
      style: {
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 6,
        color: '#fff',
        padding: '4px 8px',
        width: '100%',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        lineHeight: 'inherit',
        outline: 'none',
        resize: multiline ? 'vertical' : 'none',
        ...style,
      },
    };
    return (
      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 4, width: '100%' }}>
        {multiline
          ? <textarea {...shared} rows={2} />
          : <input type="text" {...shared} />
        }
        <button onClick={commit}  title="Save"   style={{ color:'#4ADE80', background:'none', border:'none', cursor:'pointer', padding:2, marginTop:2 }}><Check size={13}/></button>
        <button onClick={cancel}  title="Cancel" style={{ color:'#F87171', background:'none', border:'none', cursor:'pointer', padding:2, marginTop:2 }}><X     size={13}/></button>
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{ cursor: 'text', display: 'inline-flex', alignItems: 'center', gap: 4, ...style }}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {value}
      <Edit2 size={11} style={{ opacity: 0, transition: 'opacity 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        className="edit-icon"
      />
    </span>
  );
};

// ─── single day card ─────────────────────────────────────────────────────────
const DayCard = ({ day, palette, dayRef, onUpdate, dayIndex }) => {
  const updateField = (field, val) =>
    onUpdate(dayIndex, { ...day, [field]: val });

  const updateSlot = (slotIdx, field, val) => {
    const newSchedule = day.schedule.map((s, i) =>
      i === slotIdx ? { ...s, [field]: val } : s
    );
    onUpdate(dayIndex, { ...day, schedule: newSchedule });
  };

  const addSlot = () => {
    const newSchedule = [...(day.schedule || []), { time: 'New time', activity: 'New activity', tip: '' }];
    onUpdate(dayIndex, { ...day, schedule: newSchedule });
  };

  const removeSlot = (slotIdx) => {
    const newSchedule = day.schedule.filter((_, i) => i !== slotIdx);
    onUpdate(dayIndex, { ...day, schedule: newSchedule });
  };

  return (
    <div
      ref={dayRef}
      className="day-card-print"
      style={{
        background:   palette.bg,
        border:       `1px solid ${palette.border}`,
        borderRadius: 20,
        overflow:     'hidden',
        marginBottom: 24,
        transition:   'box-shadow 0.2s',
      }}
    >
      {/* ── header ── */}
      <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${palette.border}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: palette.timeLabelColor, opacity: 0.8,
              }}>Day {day.day} · {day.date}</span>
            </div>

            {/* editable title */}
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: '0 0 6px' }}>
              <EditableText
                value={day.title || 'Untitled Day'}
                onChange={val => updateField('title', val)}
                style={{ fontSize: 18, fontWeight: 600 }}
              />
            </h3>

            {/* editable description */}
            {day.description && (
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: 0, fontStyle: 'italic' }}>
                <EditableText
                  value={day.description}
                  onChange={val => updateField('description', val)}
                  multiline
                  style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.55)' }}
                />
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, shrink: 0 }}>
            {day.estimated_cost && (
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '4px 12px',
                background: palette.highlightBg, border: `1px solid ${palette.border}`,
                borderRadius: 20, color: palette.timeLabelColor, whiteSpace: 'nowrap',
              }}>
                <EditableText
                  value={day.estimated_cost}
                  onChange={val => updateField('estimated_cost', val)}
                  style={{ fontSize: 12, color: palette.timeLabelColor }}
                />
              </span>
            )}
          </div>
        </div>

        {/* highlight + local tip row */}
        {(day.highlight || day.local_tip) && (
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            {day.highlight && (
              <span style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 8,
                background: palette.highlightBg, color: palette.timeLabelColor,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <Star size={11} />
                <EditableText
                  value={day.highlight}
                  onChange={val => updateField('highlight', val)}
                  style={{ fontSize: 12 }}
                />
              </span>
            )}
            {day.local_tip && (
              <span style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 8,
                background: palette.tipBg, color: 'rgba(255,255,255,0.60)',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <Lightbulb size={11} />
                <EditableText
                  value={day.local_tip}
                  onChange={val => updateField('local_tip', val)}
                  style={{ fontSize: 12 }}
                />
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── image ── */}
      <div style={{ padding: '20px 24px 0' }} className="no-print">
        <DayImage query={day.place_image_query || day.title} className="w-full rounded-xl" style={{ height: 220 }} />
      </div>

      {/* ── schedule ── */}
      <div style={{ padding: '0 24px 20px' }}>
        {(day.schedule || []).map((slot, i) => (
          <div
            key={i}
            style={{
              display: 'flex', gap: 16, paddingTop: 18,
              borderBottom: i < day.schedule.length - 1
                ? `1px solid ${palette.border.replace('0.30', '0.12')}`
                : 'none',
              paddingBottom: 16,
              position: 'relative',
            }}
          >
            {/* time column */}
            <div style={{ width: 130, flexShrink: 0 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: palette.highlightBg,
                borderRadius: 8, padding: '4px 8px',
              }}>
                <Clock size={11} style={{ color: palette.timeLabelColor }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: palette.timeLabelColor }}>
                  <EditableText
                    value={slot.time}
                    onChange={val => updateSlot(i, 'time', val)}
                    style={{ fontSize: 11, color: palette.timeLabelColor }}
                  />
                </span>
              </div>
            </div>

            {/* activity + tip column */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 6px', fontSize: 14, color: palette.activityColor, lineHeight: 1.5 }}>
                <EditableText
                  value={slot.activity}
                  onChange={val => updateSlot(i, 'activity', val)}
                  multiline
                  style={{ fontSize: 14, color: palette.activityColor }}
                />
              </p>
              {slot.tip && (
                <p style={{
                  margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)',
                  background: palette.tipBg, borderRadius: 6,
                  padding: '4px 8px', display: 'inline-block',
                }}>
                  <EditableText
                    value={slot.tip}
                    onChange={val => updateSlot(i, 'tip', val)}
                    style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}
                  />
                </p>
              )}
            </div>

            {/* remove slot button */}
            {day.schedule.length > 1 && (
              <button
                onClick={() => removeSlot(i)}
                title="Remove this slot"
                className="no-print"
                style={{
                  position: 'absolute', top: 18, right: 0,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.20)', padding: 4,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.20)'}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}

        {/* add slot */}
        <button
          onClick={addSlot}
          className="no-print"
          style={{
            marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: `1px dashed ${palette.border}`,
            borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
            color: 'rgba(255,255,255,0.40)', fontSize: 12, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = palette.dot; e.currentTarget.style.color = palette.timeLabelColor; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = palette.border; e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
        >
          <Plus size={13} /> Add activity slot
        </button>
      </div>
    </div>
  );
};

// ─── print stylesheet injected once ─────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #itinerary-print-root, #itinerary-print-root * { visibility: visible !important; }
  #itinerary-print-root { position: absolute; inset: 0; background: #fff !important; }

  .no-print { display: none !important; }
  .day-card-print {
    background: #fff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 12px !important;
    page-break-inside: avoid;
    margin-bottom: 20px !important;
    color: #111 !important;
  }
  .day-card-print * { color: #111 !important; background: transparent !important; }

  .print-header {
    font-family: Georgia, serif;
    padding: 24px 0 16px;
    border-bottom: 2px solid #111;
    margin-bottom: 24px;
  }
  .print-header h1 { font-size: 28px; margin: 0 0 4px; }
  .print-header p  { font-size: 13px; color: #555 !important; margin: 0; }

  @page { margin: 18mm 20mm; size: A4; }
}
`;

function injectPrintStyle() {
  if (document.getElementById('voyager-print-style')) return;
  const el = document.createElement('style');
  el.id = 'voyager-print-style';
  el.textContent = PRINT_STYLE;
  document.head.appendChild(el);
}

// ─── main component ──────────────────────────────────────────────────────────
const ItineraryTimeline = ({
  itinerary: initialItinerary = [],
  budgetSplit = {},
  budget,
  meta,
  transportMode,
  hotelType,
}) => {
  const [days, setDays]         = useState(initialItinerary);
  const [activeDay, setActiveDay] = useState(0);
  const [dirty, setDirty]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const dayRefs                 = useRef([]);
  const printRootRef            = useRef(null);

  // keep local state in sync when parent re-generates itinerary
  useEffect(() => {
    setDays(initialItinerary);
    setDirty(false);
    setActiveDay(0);
  }, [initialItinerary]);

  useEffect(() => { injectPrintStyle(); }, []);

  // intersection observer — updates active dot as user scrolls
  useEffect(() => {
    if (!dayRefs.current.length) return;
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = parseInt(e.target.dataset.dayindex || '0', 10);
            setActiveDay(idx);
          }
        });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    dayRefs.current.forEach(r => { if (r) obs.observe(r); });
    return () => obs.disconnect();
  }, [days.length]);

  const scrollToDay = useCallback((idx) => {
    setActiveDay(idx);
    dayRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleUpdate = useCallback((dayIndex, updatedDay) => {
    setDays(prev => prev.map((d, i) => i === dayIndex ? updatedDay : d));
    setDirty(true);
  }, []);

  const handleSave = () => {
    setSaving(true);
    // persist to sessionStorage so it survives navigation
    sessionStorage.setItem('itinerary', JSON.stringify(days));
    setTimeout(() => { setSaving(false); setDirty(false); }, 800);
  };

  const handlePrint = () => {
    // Give the print window the root id so the CSS @media print rule fires
    if (printRootRef.current) {
      printRootRef.current.id = 'itinerary-print-root';
      window.print();
      // restore
      setTimeout(() => {
        if (printRootRef.current) printRootRef.current.id = '';
      }, 1000);
    }
  };

  if (!days.length) return null;

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', position: 'relative' }}>

      {/* ── sticky left rail ── */}
      <div
        className="no-print"
        style={{
          position: 'sticky',
          top: 88,
          width: 52,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
          zIndex: 10,
        }}
      >
        {/* heading label */}
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)', marginBottom: 12, writingMode: 'horizontal-tb',
        }}>Days</p>

        {days.map((d, i) => {
          const pal = PALETTES[i % PALETTES.length];
          const isActive = activeDay === i;
          return (
            <React.Fragment key={i}>
              {/* connector line above dot (except first) */}
              {i > 0 && (
                <div style={{
                  width: 2, height: 24, flexShrink: 0,
                  background: i <= activeDay
                    ? `linear-gradient(to bottom, ${PALETTES[(i-1) % PALETTES.length].dot}, ${pal.dot})`
                    : 'rgba(255,255,255,0.08)',
                  borderRadius: 2,
                  transition: 'background 0.4s',
                }} />
              )}

              {/* day dot */}
              <button
                onClick={() => scrollToDay(i)}
                title={`Day ${d.day}: ${d.title}`}
                style={{
                  width:  isActive ? 40 : 32,
                  height: isActive ? 40 : 32,
                  borderRadius: '50%',
                  background:   isActive ? pal.dot : 'rgba(255,255,255,0.06)',
                  border:       `2px solid ${isActive ? pal.dot : pal.border}`,
                  color:        isActive ? '#fff' : pal.dot,
                  fontSize:     isActive ? 13 : 11,
                  fontWeight:   700,
                  cursor:       'pointer',
                  transition:   'all 0.25s',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  flexShrink:   0,
                  boxShadow:    isActive ? `0 0 0 4px ${pal.dot}22` : 'none',
                }}
              >
                {d.day}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* ── main content area ── */}
      <div style={{ flex: 1, minWidth: 0 }} ref={printRootRef}>

        {/* ── action bar ── */}
        <div
          className="no-print"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginBottom:   20,
            padding:        '10px 14px',
            background:     'rgba(255,255,255,0.04)',
            border:         '1px solid rgba(255,255,255,0.08)',
            borderRadius:   14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={14} style={{ color: '#FCD34D' }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', fontWeight: 500 }}>
              {dirty ? 'Unsaved changes' : 'Your itinerary'}
            </span>
            {dirty && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20,
                background: 'rgba(251,191,36,0.15)', color: '#FCD34D',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <AlertCircle size={10} /> unsaved
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {dirty && (
              <button
                onClick={handleSave}
                style={{
                  display:    'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.30)',
                  color:      '#4ADE80', borderRadius: 10, padding: '6px 14px',
                  fontSize:   12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(74,222,128,0.15)'}
              >
                <Check size={13} />
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
            <button
              onClick={handlePrint}
              style={{
                display:    'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
                color:      'rgba(255,255,255,0.70)', borderRadius: 10, padding: '6px 14px',
                fontSize:   12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.70)'; }}
            >
              <Download size={13} /> Save as PDF
            </button>
          </div>
        </div>

        {/* ── print-only header ── */}
        <div className="print-header" style={{ display: 'none' }}>
          <h1>{meta?.from} → {meta?.to}</h1>
          <p>
            {meta?.days}-day trip &nbsp;·&nbsp; {meta?.start_date} to {meta?.end_date}
            &nbsp;·&nbsp; {meta?.travelers} traveler(s)
            &nbsp;·&nbsp; {transportMode} &nbsp;·&nbsp; {hotelType} rooms
            {budget ? ` · Budget: ₹${parseInt(budget).toLocaleString()}` : ''}
          </p>
          {Object.keys(budgetSplit).length > 0 && (
            <p style={{ marginTop: 4 }}>
              Budget split — {Object.entries(budgetSplit).map(([k, v]) => `${k}: ${v}%`).join(' · ')}
            </p>
          )}
        </div>

        {/* ── day cards ── */}
        {days.map((day, i) => (
          <div
            key={i}
            data-dayindex={i}
            ref={el => { dayRefs.current[i] = el; }}
            style={{ scrollMarginTop: 100 }}
          >
            <DayCard
              day={day}
              palette={PALETTES[i % PALETTES.length]}
              dayRef={null}
              onUpdate={handleUpdate}
              dayIndex={i}
            />
          </div>
        ))}

        {/* ── reset to original ── */}
        {dirty && (
          <div className="no-print" style={{ textAlign: 'center', marginTop: 8, marginBottom: 32 }}>
            <button
              onClick={() => { setDays(initialItinerary); setDirty(false); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.30)', fontSize: 12,
                textDecoration: 'underline',
              }}
            >
              Reset to AI-generated itinerary
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItineraryTimeline;
