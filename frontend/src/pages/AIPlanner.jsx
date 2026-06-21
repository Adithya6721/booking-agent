import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Send, MapPin, PlaneTakeoff, Hotel, Sparkles, Clock,
  CheckCircle, CalendarPlus, Mail, CloudSun, Wind,
  Droplets, ThumbsUp, Copy, ArrowLeft
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  "Plan a 3-day trip from Chennai to Goa",
  "Find flights under ₹5000",
  "Suggest hotels in Jaipur for 2 nights",
  "What's the best time to visit Kerala?"
];

const STAGE_ORDER = ["Explore", "Searching", "Results", "Confirm", "Booked"];

const getStageLabel = (s) => {
  if (!s || s === "IDLE") return "Explore";
  if (s === "SEARCHING") return "Searching";
  if (s === "RESULTS_SHOWN") return "Results";
  if (s === "AWAITING_CONFIRMATION" || s === "CONFIRMED") return "Confirm";
  if (s === "BOOKED") return "Booked";
  return "Explore";
};

/* ── Inline Chat Cards ─────────────────────────────────── */
const InlineFlightCard = ({ text }) => {
  const m = text.match(/- (.+?) dep (.+?) arr (.+?) price Rs\.(\d+)(.*)/);
  if (!m) return <p className="text-white/80 text-sm">{text}</p>;
  const [, flightNum, dep, arr, price, extra] = m;
  return (
    <div style={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', margin: '6px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontWeight: 600, fontSize: 13 }}>
          <PlaneTakeoff size={14} color="#22d3ee" /> {flightNum}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 3 }}>
          {dep} → {arr} {extra}
        </div>
      </div>
      <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 14 }}>₹{parseInt(price).toLocaleString()}</div>
    </div>
  );
};

const InlineHotelCard = ({ text }) => {
  const m = text.match(/- (.+?) Rs\.(\d+) rating ([\d.]+)/);
  if (!m) return <p className="text-white/80 text-sm">{text}</p>;
  const [, name, price, rating] = m;
  return (
    <div style={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', margin: '6px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontWeight: 600, fontSize: 13 }}>
          <Hotel size={14} color="#a78bfa" /> {name}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 3 }}>
          ★ {rating}
        </div>
      </div>
      <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 14 }}>₹{parseInt(price).toLocaleString()}/night</div>
    </div>
  );
};

const FormattedMessage = ({ content }) => (
  <div style={{ fontSize: 14, lineHeight: 1.65 }}>
    {content.split('\n').map((line, i) => {
      if (line.includes(' dep ') && line.includes(' arr ') && line.includes(' price Rs.'))
        return <InlineFlightCard key={i} text={line} />;
      if (line.includes(' Rs.') && line.includes(' rating '))
        return <InlineHotelCard key={i} text={line} />;
      if (line.startsWith('Found '))
        return <p key={i} style={{ color: '#fff', fontWeight: 600, margin: '10px 0 4px' }}>{line}</p>;
      if (!line.trim()) return <br key={i} />;
      return <p key={i} style={{ margin: '2px 0', color: 'rgba(255,255,255,0.88)' }}>{line}</p>;
    })}
  </div>
);

/* ── Weather Panel ─────────────────────────────────────── */
const WeatherPanel = ({ weather, city }) => {
  const forecast = weather?.forecast || [];
  const current = weather?.current;
  if (!forecast.length && !current?.temperature) return null;
  const icon = (c = '') => c.split(' ')[0] || '🌡️';
  return (
    <div style={{ background: '#141720', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        <CloudSun size={14} color="#facc15" /> Weather at {city}
      </div>
      {current?.temperature && (
        <div style={{ display: 'flex', gap: 20, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{current.temperature}°C</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
            <span>💧 {current.humidity}% humidity</span>
            <span>💨 {current.wind_speed} km/h</span>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {forecast.slice(0, 7).map((f, i) => (
          <div key={i} style={{ flexShrink: 0, textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 10px', minWidth: 60 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>{f.date?.slice(5)}</div>
            <div style={{ fontSize: 18 }}>{icon(f.condition)}</div>
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{Math.round(f.temp_max)}°</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{Math.round(f.temp_min)}°</div>
            {f.rain_mm > 0 && <div style={{ fontSize: 10, color: '#60a5fa' }}>💧{f.rain_mm}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Booking Confirmed Card ────────────────────────────── */
const BookingConfirmedCard = ({ booking }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(booking.pnr); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(139,92,246,0.12))', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 18, padding: 20, maxWidth: 380, boxShadow: '0 0 30px rgba(6,182,212,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ThumbsUp size={16} color="#4ade80" />
        </div>
        <div>
          <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 13 }}>Booking Confirmed!</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Mock booking · Demo project</div>
        </div>
      </div>
      {[
        ['Route', `${booking.from_city} → ${booking.to_city}`],
        ['Dates', `${booking.start_date} – ${booking.end_date}`],
        ['Travelers', booking.travelers],
      ].map(([label, val]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
          <span style={{ color: '#fff' }}>{val}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, marginBottom: 14 }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Booking Ref</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: 16, letterSpacing: 2 }}>{booking.pnr}</span>
          <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#4ade80' : 'rgba(255,255,255,0.3)', padding: 0 }}>
            {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
          </button>
        </div>
      </div>
      <a href={booking.calendar_url} target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '10px 0', background: '#1a73e8', color: '#fff', borderRadius: 12, textDecoration: 'none', fontSize: 13, fontWeight: 600, boxSizing: 'border-box' }}>
        <CalendarPlus size={15} /> Add to Google Calendar
      </a>
      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <Mail size={11} /> Confirmation email sent with PDF itinerary
      </div>
    </div>
  );
};

/* ── Stage Card ────────────────────────────────────────── */
const StageCard = ({ stage }) => {
  const desc = {
    Explore: "Tell me where you'd like to go!",
    Searching: "Searching live flights and hotels...",
    Results: "Review the results and pick your preference.",
    Confirm: "Almost there — confirm your selection.",
    Booked: "🎉 Your mock booking is confirmed!"
  };
  return (
    <div style={{ background: '#141720', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Current Stage</div>
      <div style={{ color: '#fff', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{stage}</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{desc[stage] || ''}</div>
    </div>
  );
};

/* ── Field Checklist ──────────────────────────────────── */
const FieldChecklist = ({ tripMeta }) => {
  const fields = [
    { label: 'From', val: tripMeta?.from_city, question: 'Origin city' },
    { label: 'To', val: tripMeta?.to_city, question: 'Destination' },
    { label: 'Date', val: tripMeta?.start_date, question: 'Travel date' },
  ];
  const hasAny = fields.some(f => f.val);
  if (!hasAny) return null;
  return (
    <div style={{ background: '#141720', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Trip Details</div>
      {fields.map(({ label, val }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
          {val
            ? <span style={{ color: '#fff', fontWeight: 500 }}>{val}</span>
            : <span style={{ color: '#f87171', fontSize: 11 }}>⚠ Missing</span>
          }
        </div>
      ))}
    </div>
  );
};

/* ── Main Component ───────────────────────────────────── */
const AIPlanner = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState('Explore');
  const [bookingData, setBookingData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [tripMeta, setTripMeta] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let sid = localStorage.getItem('voyager_session_id');
    if (!sid) { sid = crypto.randomUUID(); localStorage.setItem('voyager_session_id', sid); }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (currentStage === 'Booked' && tripMeta?.to_city && !bookingData) {
      triggerMockBooking();
    }
  }, [currentStage]);

  const triggerMockBooking = async () => {
    try {
      const res = await fetch('http://localhost:8000/confirm-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: 'sadithya032006@gmail.com',
          from_city:  tripMeta.from_city || 'Unknown',
          to_city:    tripMeta.to_city,
          start_date: tripMeta.start_date || new Date().toISOString().slice(0, 10),
          end_date:   tripMeta.end_date   || new Date().toISOString().slice(0, 10),
          travelers:  tripMeta.travelers  || 1,
          itinerary: [],
        })
      });
      const data = await res.json();
      setBookingData({ ...tripMeta, pnr: data.pnr, calendar_url: data.calendar_url });
      setWeatherData(data.weather);
    } catch (e) { console.error(e); }
  };

  const fetchWeather = async (city, start, end) => {
    try {
      const res = await fetch('http://localhost:8000/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, start_date: start, end_date: end })
      });
      const data = await res.json();
      if (!data.error) setWeatherData(data);
    } catch (_) {}
  };

  const handleSend = async (override = null) => {
    const text = override ?? inputMessage;
    if (!text.trim()) return;
    const sid = localStorage.getItem('voyager_session_id');
    setMessages(p => [...p, { role: 'user', content: text }]);
    setInputMessage('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sid })
      });
      const data = await res.json();
      setMessages(p => [...p, { role: 'assistant', content: data.reply }]);
      if (data.stage) setCurrentStage(getStageLabel(data.stage));

      // Parse trip context from message to track missing fields
      const toM = text.match(/\bto\s+([A-Za-z]+)\b/i);
      const fromM = text.match(/\bfrom\s+([A-Za-z]+)\b/i);
      const dateM = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      const travelersM = text.match(/\b(\d)\s+(?:person|people|traveler|passenger)/i);
      setTripMeta(prev => {
        const next = { ...prev };
        if (toM?.[1])   next.to_city   = toM[1];
        if (fromM?.[1]) next.from_city  = fromM[1];
        if (dateM?.[1]) next.start_date = dateM[1];
        if (travelersM?.[1]) next.travelers = parseInt(travelersM[1]);
        return next;
      });

      // Auto-fetch weather when destination is known
      if (toM?.[1] && !weatherData) {
        const today = new Date().toISOString().slice(0, 10);
        const weekOut = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
        fetchWeather(toM[1], today, weekOut);
      }
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const stageIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0D0F14', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden' }}>

      {/* ── Navbar ── */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/dashboard" style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: 13 }}>
            <ArrowLeft size={14} /> Back
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700 }}>
            <Sparkles size={18} color="#22d3ee" /> Voyager AI
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {STAGE_ORDER.map((stage, idx) => {
            const isActive = idx === stageIdx;
            const isPast = idx < stageIdx;
            return (
              <React.Fragment key={stage}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    background: isActive ? '#06b6d4' : isPast ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)',
                    color: isActive ? '#fff' : isPast ? '#22d3ee' : 'rgba(255,255,255,0.25)',
                    boxShadow: isActive ? '0 0 12px rgba(6,182,212,0.5)' : 'none',
                    border: isPast ? '1px solid rgba(6,182,212,0.4)' : '1px solid transparent',
                    transition: 'all 0.3s'
                  }}>
                    {isPast ? <CheckCircle size={13} /> : idx + 1}
                  </div>
                  <span style={{ fontSize: 12, color: isActive ? '#fff' : isPast ? 'rgba(6,182,212,0.8)' : 'rgba(255,255,255,0.25)', fontWeight: isActive ? 600 : 400 }}>
                    {stage}
                  </span>
                </div>
                {idx < STAGE_ORDER.length - 1 && (
                  <div style={{ width: 24, height: 1, background: isPast ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.08)' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Travel AI</div>
      </nav>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT: Chat (60%) */}
        <div style={{ width: '60%', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.05)', minWidth: 0 }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16, opacity: 0.85, paddingBottom: 60 }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={28} color="#22d3ee" />
                </div>
                <div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>How can I help you travel?</h2>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 14, maxWidth: 320 }}>
                    I find flights, hotels, and plan complete itineraries. Ask me anything travel-related!
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? '#0891b2' : '#1C2030',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: msg.role === 'user' ? '0 4px 15px rgba(8,145,178,0.25)' : '0 4px 15px rgba(0,0,0,0.3)',
                }}>
                  {msg.role === 'user'
                    ? <p style={{ margin: 0, fontSize: 14, color: '#fff' }}>{msg.content}</p>
                    : <FormattedMessage content={msg.content} />
                  }
                </div>
              </div>
            ))}

            {currentStage === 'Booked' && bookingData && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <BookingConfirmedCard booking={bookingData} />
              </div>
            )}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#1C2030', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px 18px 18px 4px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, background: '#22d3ee', borderRadius: '50%', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                  ))}
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>Thinking</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 20px 16px', background: '#0D0F14', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => setInputMessage(p)}
                    style={{ fontSize: 12, padding: '7px 14px', borderRadius: 50, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                    onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = '#fff'; }}
                    onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = 'rgba(255,255,255,0.6)'; }}
                  >{p}</button>
                ))}
              </div>
            )}
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', gap: 10 }}>
              <input
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder="Where would you like to go?"
                style={{ flex: 1, background: '#1C2030', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '13px 18px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
              <button type="submit" disabled={!inputMessage.trim() || loading}
                style={{ background: inputMessage.trim() && !loading ? '#06b6d4' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 14, padding: '0 20px', color: inputMessage.trim() && !loading ? '#fff' : 'rgba(255,255,255,0.2)', cursor: inputMessage.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', transition: 'all 0.2s', boxShadow: inputMessage.trim() && !loading ? '0 0 20px rgba(6,182,212,0.3)' : 'none' }}>
                <Send size={18} />
              </button>
            </form>
            <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
              Travel domain only · Verify critical booking info independently
            </p>
          </div>
        </div>

        {/* RIGHT: Overview (40%) */}
        <div style={{ width: '40%', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.15)', padding: '20px 20px 20px', overflowY: 'auto', gap: 12 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 4 }}>
            Trip Overview
          </div>

          <FieldChecklist tripMeta={tripMeta} />
          {weatherData && tripMeta?.to_city && <WeatherPanel weather={weatherData} city={tripMeta.to_city} />}
          <StageCard stage={currentStage} />

          {!weatherData && !Object.keys(tripMeta).length && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12, opacity: 0.4, minHeight: 200 }}>
              <MapPin size={36} color="rgba(255,255,255,0.2)" />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
                Booking details and weather forecast will appear here as you chat.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bounce keyframes */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default AIPlanner;
