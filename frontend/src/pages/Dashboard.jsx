import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, PlaneTakeoff, ChevronDown, ArrowRight, Users, IndianRupee, Calendar, Loader2, Clock, Train, Bus, Car, Hotel, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
// ── Constants ────────────────────────────────────────────
const HERO_IMAGES = [
  { url: "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=1920&q=90&auto=format&fit=crop", location: "Maldives", tagline: "You deserve it." },
  { url: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1920&q=90&auto=format&fit=crop", location: "Santorini, Greece", tagline: "What are you waiting for?" },
  { url: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=1920&q=90&auto=format&fit=crop", location: "Bali, Indonesia", tagline: "The world is yours." },
  { url: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1920&q=90&auto=format&fit=crop", location: "Taj Mahal, India", tagline: "Every story begins here." }
];

const CITY_SUGGESTIONS = [
  "Mumbai","Delhi","Bangalore","Chennai","Hyderabad","Kolkata","Goa","Jaipur",
  "Udaipur","Kochi","Manali","Shimla","Maldives","Bali","Santorini","Paris",
  "Dubai","Singapore","Bangkok","Tokyo","London","New York","Rome","Barcelona","Agra","Varanasi","Mysore"
];

const INTEREST_TAGS = ["🏖 Beaches","🏔 Adventure","🏛 Culture","🍜 Food","🛍 Shopping","🌿 Nature","🎭 Nightlife","🕌 Heritage"];

const TRANSPORT_OPTIONS = [
  { id: "flight", label: "Flight", icon: PlaneTakeoff },
  { id: "train", label: "Train", icon: Train },
  { id: "bus", label: "Bus", icon: Bus },
  { id: "car", label: "Car", icon: Car },
];

const HOTEL_OPTIONS = [
  { id: "AC", label: "Hotel: ❄ AC" },
  { id: "Non-AC", label: "Hotel: 🌿 Non-AC" },
  { id: "Luxury", label: "Hotel: ⭐ Luxury" },
];

// Color palettes for each day card
const DAY_PALETTES = [
  { bg: "from-violet-900/60 to-purple-900/40", badge: "bg-violet-500", border: "border-violet-500/30", dot: "#8B5CF6" },
  { bg: "from-orange-900/60 to-red-900/40", badge: "bg-orange-500", border: "border-orange-500/30", dot: "#F97316" },
  { bg: "from-cyan-900/60 to-blue-900/40", badge: "bg-cyan-500", border: "border-cyan-500/30", dot: "#06B6D4" },
  { bg: "from-green-900/60 to-emerald-900/40", badge: "bg-green-500", border: "border-green-500/30", dot: "#22C55E" },
  { bg: "from-pink-900/60 to-rose-900/40", badge: "bg-pink-500", border: "border-pink-500/30", dot: "#EC4899" },
  { bg: "from-amber-900/60 to-yellow-900/40", badge: "bg-amber-500", border: "border-amber-500/30", dot: "#F59E0B" },
];

const PIE_COLORS = ["#8B5CF6", "#F97316", "#06B6D4", "#22C55E", "#EC4899", "#F59E0B"];

// ── DayImage: Wikipedia first, then Unsplash fallback ───
const UNSPLASH_ACCESS_KEY = 'LuVGCJIYHzrMZRoRfsPKnS3CVz63FKqFNvkbR2xqTqs'; // free public demo key
const DayImage = ({ query, className }) => {
  const [src, setSrc] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!query) {
      // Fallback: generic travel photo from Unsplash
      setSrc(`https://source.unsplash.com/800x400/?travel,tourism,landmark`);
      return;
    }
    // 1. Try Wikipedia
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=800&origin=*`;
    fetch(wikiUrl)
      .then(r => r.json())
      .then(data => {
        const pages = Object.values(data?.query?.pages || {});
        const thumb = pages[0]?.thumbnail?.source;
        if (thumb) {
          setSrc(thumb);
        } else {
          // 2. Fallback: Unsplash source (no API key needed)
          setSrc(`https://source.unsplash.com/800x400/?${encodeURIComponent(query)},landmark,tourism`);
        }
      })
      .catch(() => {
        setSrc(`https://source.unsplash.com/800x400/?${encodeURIComponent(query)},travel`);
      });
  }, [query]);

  return (
    <div className={`${className} bg-white/5 rounded-xl overflow-hidden relative`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}
      {src && (
        <img
          src={src}
          alt={query}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            // Final fallback if image fails to load
            setSrc(`https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800&q=80&auto=format&fit=crop`);
          }}
        />
      )}
    </div>
  );
};

// ── AutocompleteInput ────────────────────────────────────
const AutocompleteInput = ({ icon: Icon, placeholder, value, onChange }) => {
  const [suggestions, setSuggestions] = useState([]);
  const ref = useRef(null);
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setSuggestions([]); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  const handleChange = (e) => {
    const v = e.target.value; onChange(v);
    setSuggestions(v.length > 0 ? CITY_SUGGESTIONS.filter(c => c.toLowerCase().startsWith(v.toLowerCase())).slice(0, 5) : []);
  };
  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <div className="flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl hover:bg-white/15 transition-all">
        <Icon className="text-white/60 h-4 w-4 shrink-0" />
        <input type="text" placeholder={placeholder} className="bg-transparent outline-none text-white w-full placeholder-white/40 text-sm" value={value} onChange={handleChange} required />
      </div>
      {suggestions.length > 0 && (
        <ul className="absolute top-full mt-1 w-full bg-gray-950/98 border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl">
          {suggestions.map(s => (
            <li key={s} className="px-4 py-2.5 text-white/80 hover:bg-white/10 cursor-pointer text-sm flex items-center gap-2" onMouseDown={() => { onChange(s); setSuggestions([]); }}>
              <MapPin className="h-3.5 w-3.5 text-white/30" />{s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── DayCard ──────────────────────────────────────────────
const DayCard = ({ day, palette, isOpen, onToggle }) => (
  <div className={`border ${palette.border} rounded-2xl overflow-hidden bg-gradient-to-br ${palette.bg} backdrop-blur-sm transition-all duration-300 hover:shadow-lg`}>
    {/* Header */}
    <button onClick={onToggle} className="w-full flex items-center gap-4 p-5 text-left">
      <div className={`w-10 h-10 rounded-full ${palette.badge} text-white font-bold text-sm flex items-center justify-center shrink-0`}>
        D{day.day}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/50 text-xs">{day.date}</p>
        <h3 className="text-white font-semibold truncate">{day.title}</h3>
      </div>
      {day.estimated_cost && (
        <span className={`text-xs ${palette.badge} bg-opacity-20 border ${palette.border} text-white rounded-full px-3 py-1 shrink-0`}>
          {day.estimated_cost}
        </span>
      )}
      <ChevronDown className={`h-4 w-4 text-white/40 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
    </button>

    {/* Expandable body */}
    {isOpen && (
      <div className="px-5 pb-5">
        <DayImage query={day.place_image_query || day.title} className="w-full h-56 rounded-xl mb-4" />
        {day.description && <p className="text-white/60 text-sm mb-4 italic">{day.description}</p>}
        {/* Time-sequenced schedule */}
        {day.schedule && day.schedule.length > 0 ? (
          <div className="space-y-3">
            {day.schedule.map((slot, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${palette.badge} flex items-center justify-center shrink-0`}>
                    <Clock className="h-3.5 w-3.5 text-white" />
                  </div>
                  {i < day.schedule.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1" />}
                </div>
                <div className="pb-4">
                  <p className={`text-xs font-semibold mb-1 ${palette.badge.replace('bg-', 'text-').replace('-500', '-400')}`}>{slot.time}</p>
                  <p className="text-white/80 text-sm">{slot.activity}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Fallback to activities array if schedule not present
          <ul className="space-y-2.5">
            {(day.activities || []).map((a, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                <span className={`w-5 h-5 rounded-full ${palette.badge} text-white text-xs flex items-center justify-center shrink-0 mt-0.5`}>{i + 1}</span>
                {a}
              </li>
            ))}
          </ul>
        )}
      </div>
    )}
  </div>
);

// ── FlightCard ───────────────────────────────────────────
const FlightCard = ({ flight }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 hover:bg-white/8 transition-all">
    <div className="flex items-center justify-between mb-2">
      <span className="font-bold text-white text-sm">{flight.flight_number || "Flight"}</span>
      <span className="text-green-400 font-semibold">₹{flight.price?.toLocaleString()}</span>
    </div>
    <div className="flex items-center gap-2 text-xs text-white/50">
      <Clock className="h-3.5 w-3.5" />
      <span>{flight.departure_time} → {flight.arrival_time}</span>
    </div>
    {flight.airline && <p className="text-white/30 text-xs mt-1">{flight.airline}</p>}
    {flight.layovers > 0 && <p className="text-yellow-500/70 text-xs mt-1">{flight.layovers} stop(s)</p>}
  </div>
);

// ── Budget Pie Chart ─────────────────────────────────────
const BudgetChart = ({ budgetSplit, totalBudget }) => {
  const data = Object.entries(budgetSplit).map(([name, pct]) => ({
    name,
    value: pct,
    amount: totalBudget ? Math.round((pct / 100) * totalBudget) : null
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-sm shadow-xl">
          <p className="text-white font-semibold">{d.name}</p>
          <p className="text-white/60">{d.value}%</p>
          {d.amount && <p className="text-green-400">₹{d.amount.toLocaleString()}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
        <IndianRupee className="h-4 w-4" /> Budget Breakdown
      </h3>
      {totalBudget && <p className="text-white/40 text-xs mb-4">Total: ₹{parseInt(totalBudget).toLocaleString()}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" stroke="none">
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
      {/* Amount breakdown table */}
      {totalBudget && (
        <div className="mt-2 space-y-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-white/60">{d.name}</span>
              </div>
              <div className="text-right">
                <span className="text-white/80">₹{d.amount?.toLocaleString()}</span>
                <span className="text-white/30 ml-2 text-xs">({d.value}%)</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Dashboard ───────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const [currentSlide, setCurrentSlide] = useState(0);
  const [fading, setFading] = useState(false);
  const [fromCity, setFromCity] = useState(() => sessionStorage.getItem('fromCity') || '');
  const [toCity, setToCity] = useState(() => sessionStorage.getItem('toCity') || '');
  const [startDate, setStartDate] = useState(() => sessionStorage.getItem('startDate') || '');
  const [endDate, setEndDate] = useState(() => sessionStorage.getItem('endDate') || '');
  const [travelers, setTravelers] = useState(() => sessionStorage.getItem('travelers') || '');
  const [budget, setBudget] = useState(() => sessionStorage.getItem('budget') || '');
  const [interests, setInterests] = useState(() => JSON.parse(sessionStorage.getItem('interests') || '[]'));
  const [transportMode, setTransportMode] = useState(() => sessionStorage.getItem('transportMode') || 'flight');
  const [hotelType, setHotelType] = useState(() => sessionStorage.getItem('hotelType') || 'AC');
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState(() => JSON.parse(sessionStorage.getItem('itinerary') || '[]'));
  const [flights, setFlights] = useState([]);
  const [budgetSplit, setBudgetSplit] = useState(() => JSON.parse(sessionStorage.getItem('budgetSplit') || '{}'));
  const [meta, setMeta] = useState(() => JSON.parse(sessionStorage.getItem('meta') || 'null'));
  const [openDay, setOpenDay] = useState(0); // which day card is open
  const resultsRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem('fromCity', fromCity);
    sessionStorage.setItem('toCity', toCity);
    sessionStorage.setItem('startDate', startDate);
    sessionStorage.setItem('endDate', endDate);
    sessionStorage.setItem('travelers', travelers);
    sessionStorage.setItem('budget', budget);
    sessionStorage.setItem('interests', JSON.stringify(interests));
    sessionStorage.setItem('transportMode', transportMode);
    sessionStorage.setItem('hotelType', hotelType);
    sessionStorage.setItem('itinerary', JSON.stringify(itinerary));
    sessionStorage.setItem('budgetSplit', JSON.stringify(budgetSplit));
    sessionStorage.setItem('meta', JSON.stringify(meta));
  }, [fromCity, toCity, startDate, endDate, travelers, budget, interests, transportMode, hotelType, itinerary, budgetSplit, meta]);

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => { setCurrentSlide(p => (p + 1) % HERO_IMAGES.length); setFading(false); }, 700);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const toggleInterest = (tag) => setInterests(p => p.includes(tag) ? p.filter(i => i !== tag) : [...p, tag]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true); setItinerary([]); setFlights([]); setBudgetSplit({});
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    try {
      const res = await fetch("http://localhost:8000/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_city: fromCity, to_city: toCity, start_date: startDate, end_date: endDate,
          travelers: parseInt(travelers) || 1, budget: budget ? parseInt(budget) : null,
          interests: interests.map(i => i.split(' ').slice(1).join(' ')),
          transport_mode: transportMode, hotel_type: hotelType
        })
      });
      const data = await res.json();
      setItinerary(data.itinerary || []);
      setFlights(data.flights || []);
      setBudgetSplit(data.budget_split || {});
      setMeta(data.meta);
      setOpenDay(0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const slide = HERO_IMAGES[currentSlide];

  return (
    <div className="bg-[#080808] min-h-screen" style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <PlaneTakeoff className="h-4 w-4 text-black" />
          </div>
          <span className="text-white font-bold text-lg">Voyager</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-white/60 text-sm">
          <a href="/dashboard" className="text-white font-medium">Explore</a>
          <a href="/transportation" className="hover:text-white transition-colors">Transportation</a>
          <a href="#" className="hover:text-white transition-colors">Hotels</a>
          <a href="#" className="hover:text-white transition-colors">AI Planner</a>
        </div>
        <button onClick={handleSignOut} className="text-sm text-black bg-white px-5 py-2 rounded-full font-medium hover:bg-white/90 transition-colors">Sign Out</button>
      </nav>

      {/* HERO */}
      <section className="relative h-screen w-full overflow-hidden">
        <div key={currentSlide} className={`absolute inset-0 transition-opacity duration-700 ${fading ? 'opacity-0' : 'opacity-100'}`}
          style={{ backgroundImage: `url('${slide.url}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-[#080808]" />

        {/* Location badge */}
        <div className="absolute top-20 right-8 flex items-center gap-1.5 text-white/70 text-xs bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1.5">
          <MapPin className="h-3.5 w-3.5" />{slide.location}
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {HERO_IMAGES.map((_, i) => (
            <button key={i} onClick={() => setCurrentSlide(i)}
              className={`transition-all duration-300 rounded-full ${i === currentSlide ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/30'}`} />
          ))}
        </div>

        {/* HERO CONTENT */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center pb-4">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-white/80 text-xs font-medium tracking-widest uppercase">AI-Powered Travel Planner</span>
          </div>
          <h1 key={slide.tagline} className="text-5xl md:text-7xl font-bold text-white mb-3 leading-none tracking-tight" style={{ fontFamily: "'Georgia', serif", textShadow: '0 4px 40px rgba(0,0,0,0.6)' }}>
            {slide.tagline}
          </h1>
          <p className="text-white/60 text-base max-w-lg mb-6 font-light">Discover breathtaking destinations. Let AI plan every detail of your perfect trip.</p>

          {/* SEARCH CARD */}
          <form onSubmit={handleSearch} className="w-full max-w-5xl">
            <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-4 space-y-3">

              {/* Row 1: From / To / Dates */}
              <div className="flex flex-col md:flex-row gap-2">
                <AutocompleteInput icon={MapPin} placeholder="Where from?" value={fromCity} onChange={setFromCity} />
                <div className="hidden md:flex items-center shrink-0"><ArrowRight className="text-white/20 h-4 w-4" /></div>
                <AutocompleteInput icon={PlaneTakeoff} placeholder="Where to?" value={toCity} onChange={setToCity} />
                <div className="flex flex-col gap-0.5 min-w-0 md:w-44">
                  <label className="text-white/30 text-xs px-1">Departure</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/15 rounded-xl">
                    <Calendar className="text-white/60 h-4 w-4 shrink-0" />
                    <input type="date" className="bg-transparent outline-none text-white text-sm w-full" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 min-w-0 md:w-44">
                  <label className="text-white/30 text-xs px-1">Return</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/15 rounded-xl">
                    <Calendar className="text-white/60 h-4 w-4 shrink-0" />
                    <input type="date" className="bg-transparent outline-none text-white text-sm w-full" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                  </div>
                </div>
              </div>

              {/* Row 2: Travelers / Budget / Transport / Hotel */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/15 rounded-xl w-36">
                  <Users className="text-white/60 h-4 w-4 shrink-0" />
                  <input type="number" min="1" placeholder="Travelers" className="bg-transparent outline-none text-white text-sm w-full placeholder-white/40" value={travelers} onChange={e => setTravelers(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/15 rounded-xl w-40">
                  <IndianRupee className="text-white/60 h-4 w-4 shrink-0" />
                  <input type="number" min="0" placeholder="Total budget" className="bg-transparent outline-none text-white text-sm w-full placeholder-white/40" value={budget} onChange={e => setBudget(e.target.value)} />
                </div>

                {/* Transport chips */}
                <div className="flex gap-1.5">
                  {TRANSPORT_OPTIONS.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" onClick={() => setTransportMode(id)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all ${transportMode === id ? 'bg-white text-black border-white font-medium' : 'bg-white/5 text-white/60 border-white/15 hover:border-white/30'}`}>
                      <Icon className="h-3.5 w-3.5" />{label}
                    </button>
                  ))}
                </div>

                {/* Hotel chips */}
                <div className="flex gap-1.5">
                  {HOTEL_OPTIONS.map(({ id, label }) => (
                    <button key={id} type="button" onClick={() => setHotelType(id)}
                      className={`text-xs px-3 py-2 rounded-xl border transition-all ${hotelType === id ? 'bg-white text-black border-white font-medium' : 'bg-white/5 text-white/60 border-white/15 hover:border-white/30'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Interest Tags + Button */}
              <div className="flex flex-wrap gap-2 items-center">
                {INTEREST_TAGS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleInterest(tag)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${interests.includes(tag) ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/15 hover:border-white/30'}`}>
                    {tag}
                  </button>
                ))}
                <button type="submit" disabled={loading}
                  className="ml-auto flex items-center gap-2 px-7 py-2.5 bg-white text-black font-semibold rounded-2xl hover:bg-gray-100 disabled:opacity-60 active:scale-95 transition-all">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="h-4 w-4" /> Discover</>}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* POPULAR DESTINATIONS */}
      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <p className="text-white/30 text-xs font-semibold tracking-widest uppercase mb-2">Trending Now</p>
          <h2 className="text-white text-3xl font-bold mb-8">Popular Destinations</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HERO_IMAGES.map((img, i) => (
              <div key={i} onClick={() => setToCity(img.location.split(',')[0])} className="relative rounded-2xl overflow-hidden cursor-pointer group aspect-[4/5]">
                <img src={img.url} alt={img.location} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <p className="text-white font-semibold text-sm">{img.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESULTS SECTION */}
      <section ref={resultsRef} className="px-6 py-16 min-h-[60vh]">
        <div className="max-w-7xl mx-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 text-white/50">
              <Loader2 className="h-12 w-12 animate-spin mb-4 text-violet-400" />
              <p className="text-lg font-medium text-white">Crafting your perfect trip...</p>
              <p className="text-sm mt-1 text-white/40">Our AI is generating a personalised itinerary</p>
            </div>
          )}

          {!loading && itinerary.length > 0 && (
            <>
              {/* Trip header */}
              <div className="mb-10 flex flex-col md:flex-row md:items-end gap-4">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Your AI-Generated Trip</p>
                  <h2 className="text-white text-4xl font-bold capitalize">{meta?.from} <span className="text-white/30">→</span> {meta?.to}</h2>
                  <p className="text-white/50 mt-1">{meta?.days} days · {meta?.travelers} traveler(s) · <span className="capitalize">{transportMode}</span> · {hotelType} rooms</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">

                {/* LEFT: Itinerary Timeline */}
                <div className="space-y-3">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-400" /> Day-by-Day Itinerary
                  </h3>
                  {itinerary.map((day, i) => (
                    <DayCard
                      key={day.day}
                      day={day}
                      palette={DAY_PALETTES[i % DAY_PALETTES.length]}
                      isOpen={openDay === i}
                      onToggle={() => setOpenDay(openDay === i ? -1 : i)}
                    />
                  ))}
                </div>

                {/* RIGHT: Budget Chart + Transport Link */}
                <div className="lg:sticky lg:top-24 space-y-5">

                  {/* Budget Pie Chart */}
                  {Object.keys(budgetSplit).length > 0 && (
                    <BudgetChart budgetSplit={budgetSplit} totalBudget={budget} />
                  )}

                  {/* Booking CTAs */}
                  <div className="grid grid-cols-1 gap-3">
                    <a
                      href={`/transportation?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}&start=${startDate}&end=${endDate}&travelers=${travelers || 1}&hotel=${hotelType}`}
                      className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/8 transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors">
                        <PlaneTakeoff className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Book Transportation</p>
                        <p className="text-white/40 text-xs">View live flights & more</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/30 ml-auto group-hover:translate-x-1 transition-transform" />
                    </a>

                    <a
                      href={`/hotels?to=${encodeURIComponent(toCity)}&start=${startDate}&end=${endDate}&travelers=${travelers || 1}&hotel=${hotelType}`}
                      className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/8 transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors">
                        <Hotel className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Book Hotels</p>
                        <p className="text-white/40 text-xs">Search places to stay</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/30 ml-auto group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}

          {!loading && itinerary.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-white/30">
              <PlaneTakeoff className="h-8 w-8 mb-3" />
              <p className="text-white/40">Fill in the details above and hit Discover</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
