import React, { useState, useEffect } from 'react';
import { PlaneTakeoff, Train, Bus, Car, Loader2, MapPin, ArrowRight, Users, Calendar, ExternalLink, Clock, AlertTriangle } from 'lucide-react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';

// ── Date helpers ─────────────────────────────────────────
// DD/MM/YYYY — used by both MMT and GoIbibo (confirmed)
const toSlashDate = (date) => { const p = date.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; };

// ── Booking deep links ───────────────────────────────────
const buildFlightLinks = (fromCity, toCity, date, travelers, flight) => {
  const from = flight.from_iata || fromCity.slice(0,3).toUpperCase();
  const to   = flight.to_iata   || toCity.slice(0,3).toUpperCase();
  const d    = toSlashDate(date); // DD/MM/YYYY — confirmed for both MMT & GoIbibo
  return {
    // MMT confirmed: itinerary=MAA-DEL-16/06/2026&tripType=O&paxType=A-2_C-0_I-0
    mmtUrl:     `https://www.makemytrip.com/flight/search?itinerary=${from}-${to}-${d}&tripType=O&paxType=A-${travelers}_C-0_I-0&intl=false&cabinClass=E&lang=eng`,
    googleUrl:  `https://www.google.com/travel/flights/search?q=flights+from+${encodeURIComponent(fromCity)}+to+${encodeURIComponent(toCity)}+on+${date}`,
    // GoIbibo confirmed: /flight/search?itinerary=DEL-BLR-16/06/2026&tripType=O&paxType=A-1_C-0_I-0
    goibiboUrl: `https://www.goibibo.com/flight/search?itinerary=${from}-${to}-${d}&tripType=O&paxType=A-${travelers}_C-0_I-0&intl=false&cabinClass=E&lang=eng`,
  };
};

const buildTrainLinks = (fromCode, toCode, fromCity, toCity, date) => {
  // date arrives as YYYY-MM-DD from the API
  const [y, m, d] = date ? date.split('-') : ['','',''];
  const mmtDate        = `${y}${m}${d}`;           // YYYYMMDD ✅ confirmed
  const confirmtktDate = `${d}-${m}-${y}`;         // DD-MM-YYYY ✅ confirmed
  return {
    // IRCTC: no URL params for pre-fill — links to search page
    irctcUrl:      `https://www.irctc.co.in/nget/train-search`,
    // ConfirmTkt: /rbooking/trains/from/{code}/to/{code}/{DD-MM-YYYY} ✅ confirmed
    confirmtktUrl: `https://www.confirmtkt.com/rbooking/trains/from/${fromCode}/to/${toCode}/${confirmtktDate}`,
    // MMT Railways: /listing?date=YYYYMMDD&srcStn=NDLS&srcCity=New Delhi ✅ confirmed
    mmtUrl:        `https://www.makemytrip.com/railways/listing?date=${mmtDate}&srcStn=${fromCode}&srcCity=${encodeURIComponent(fromCity)}&destStn=${toCode}&destCity=${encodeURIComponent(toCity)}&classCode=`,
  };
};

import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

// ── Shared Navbar ────────────────────────────────────────
const Navbar = () => {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
      <Link to="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <PlaneTakeoff className="h-4 w-4 text-black" />
        </div>
        <span className="text-white font-bold text-lg">Voyager</span>
      </Link>
      <div className="hidden md:flex items-center gap-8 text-sm">
        <Link to="/dashboard" className="text-white/60 hover:text-white transition-colors">Explore</Link>
        <Link to="/transportation" className="text-white font-medium">Transportation</Link>
        <Link to="/hotels" className="text-white/60 hover:text-white transition-colors">Hotels</Link>
        <a href="#" className="text-white/60 hover:text-white transition-colors">AI Planner</a>
      </div>
      <button onClick={handleSignOut} className="text-sm text-black bg-white px-5 py-2 rounded-full font-medium hover:bg-white/90 transition-colors">Sign Out</button>
    </nav>
  );
};

// ── Trip Bar ─────────────────────────────────────────────
const TripBar = ({ from, to, start, end, travelers }) => (
  <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl">
    <div className="flex items-center gap-2 text-white font-semibold">
      <MapPin className="h-4 w-4 text-white/40" />
      <span className="capitalize">{from}</span>
      <ArrowRight className="h-4 w-4 text-white/30" />
      <span className="capitalize">{to}</span>
    </div>
    <div className="flex items-center gap-2 text-white/50 text-sm">
      <Calendar className="h-4 w-4" />{start} → {end}
    </div>
    <div className="flex items-center gap-2 text-white/50 text-sm">
      <Users className="h-4 w-4" />{travelers} traveler(s)
    </div>
    <Link to="/dashboard" className="ml-auto text-xs text-white/40 hover:text-white transition-colors underline">← Edit trip</Link>
  </div>
);

// ── Flight Card ──────────────────────────────────────────
const FlightCard = ({ flight, fromCity, toCity, date, travelers }) => {
  const links = buildFlightLinks(fromCity, toCity, date, travelers, flight);
  const dur = flight.total_duration ? `${Math.floor(flight.total_duration/60)}h ${flight.total_duration%60}m` : null;
  return (
    <div className="bg-white/5 border border-white/20 rounded-2xl p-5 hover:border-white/40 hover:bg-white/10 transition-all shadow-lg hover:shadow-xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-white/40 text-xs mb-0.5">{flight.airline}</p>
          <p className="text-white font-bold text-lg">{flight.flight_number}</p>
        </div>
        <div className="text-right">
          <p className="text-green-400 font-bold text-2xl">₹{flight.price?.toLocaleString()}</p>
          <p className="text-white/30 text-xs">per person</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="text-center">
          <p className="text-white font-semibold text-xl">{flight.departure_time?.split(' ')[1] || flight.departure_time}</p>
          <p className="text-white/40 text-xs mt-0.5">{flight.from_iata}</p>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-px bg-white/10" />
            <PlaneTakeoff className="h-4 w-4 text-white/30" />
            <div className="flex-1 h-px bg-white/10" />
          </div>
          {dur && <p className="text-white/30 text-xs">{dur}</p>}
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-xl">{flight.arrival_time?.split(' ')[1] || flight.arrival_time}</p>
          <p className="text-white/40 text-xs mt-0.5">{flight.to_iata}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${flight.layovers === 0 ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
          {flight.layovers === 0 ? '✓ Non-stop' : `${flight.layovers} stop(s)`}
        </span>
        {travelers > 1 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/50">
            ₹{(flight.price * travelers).toLocaleString()} total
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <a href={links.mmtUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 py-2.5 bg-[#1a73e8]/20 hover:bg-[#1a73e8]/30 border border-[#1a73e8]/30 text-blue-400 rounded-xl text-xs font-medium transition-all">
          <ExternalLink className="h-3.5 w-3.5" /> MakeMyTrip
        </a>
        <a href={links.goibiboUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium transition-all">
          <ExternalLink className="h-3.5 w-3.5" /> GoIbibo
        </a>
        <a href={links.googleUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded-xl text-xs font-medium transition-all">
          <ExternalLink className="h-3.5 w-3.5" /> Google
        </a>
      </div>
    </div>
  );
};

// ── Train Card ───────────────────────────────────────────
const TrainCard = ({ train }) => {
  const links = buildTrainLinks(
    train.from_code, train.to_code,
    train.from_station, train.to_station,
    train.date
  );
  return (
    <div className="bg-white/5 border border-white/20 rounded-2xl p-5 hover:border-white/40 hover:bg-white/10 transition-all shadow-lg hover:shadow-xl">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-xs mb-0.5">#{train.train_number} · {train.train_type}</p>
          <p className="text-white font-bold text-sm leading-snug">{train.train_name}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-medium self-start ml-2 shrink-0">
          🚂 Train
        </span>
      </div>

      {/* Route */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-center">
          <p className="text-white font-semibold text-xl">{train.departure}</p>
          <p className="text-white/40 text-xs mt-0.5">{train.from_code}</p>
          <p className="text-white/30 text-xs truncate max-w-[80px]">{train.from_station}</p>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-px bg-white/10" />
            <Train className="h-4 w-4 text-white/30" />
            <div className="flex-1 h-px bg-white/10" />
          </div>
          {train.duration && <p className="text-white/30 text-xs">{train.duration} hrs</p>}
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-xl">{train.arrival}</p>
          <p className="text-white/40 text-xs mt-0.5">{train.to_code}</p>
          <p className="text-white/30 text-xs truncate max-w-[80px]">{train.to_station}</p>
        </div>
      </div>

      {/* Classes available */}
      {train.classes?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {train.classes.map((cls) => (
            <span key={cls} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">{cls}</span>
          ))}
        </div>
      )}

      {/* Runs on */}
      {train.runs_on?.length > 0 && train.runs_on.length < 7 && (
        <p className="text-white/30 text-xs mb-4">Runs on: {train.runs_on.join(', ')}</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <a href={links.irctcUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 py-2.5 bg-blue-700/20 hover:bg-blue-700/30 border border-blue-700/30 text-blue-300 rounded-xl text-xs font-medium transition-all">
          <ExternalLink className="h-3.5 w-3.5" /> IRCTC
        </a>
        <a href={links.confirmtktUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 rounded-xl text-xs font-medium transition-all">
          <ExternalLink className="h-3.5 w-3.5" /> ConfirmTkt
        </a>
        <a href={links.mmtUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 py-2.5 bg-[#1a73e8]/15 hover:bg-[#1a73e8]/25 border border-[#1a73e8]/20 text-blue-400 rounded-xl text-xs font-medium transition-all">
          <ExternalLink className="h-3.5 w-3.5" /> MMT Rail
        </a>
      </div>
    </div>
  );
};

// ── Lazy Tab Content ─────────────────────────────────────
// Each tab fetches its own data only when first activated.
const useTabFetch = (tab, activeTab, apiCall, shouldFetch) => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (activeTab !== tab || fetched || !shouldFetch) return;
    (async () => {
      setLoading(true); setError(null);
      try {
        const result = await apiCall();
        setData(result);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setFetched(true);
      }
    })();
  }, [activeTab]);

  return { data, loading, fetched, error };
};

// ── Main Component ───────────────────────────────────────
const Transportation = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('flights');

  const fromCity  = searchParams.get('from')      || sessionStorage.getItem('fromCity') || '';
  const toCity    = searchParams.get('to')        || sessionStorage.getItem('toCity') || '';
  const startDate = searchParams.get('start')     || sessionStorage.getItem('startDate') || '';
  const endDate   = searchParams.get('end')       || sessionStorage.getItem('endDate') || '';
  const travelers = parseInt(searchParams.get('travelers') || sessionStorage.getItem('travelers')) || 1;
  const hotelType = searchParams.get('hotel')     || sessionStorage.getItem('hotelType') || 'AC';
  const hasParams = !!(fromCity && toCity && startDate);

  const [sortFlight, setSortFlight] = useState('price_asc');
  const [sortTrain, setSortTrain] = useState('departure_asc');

  const getSortedFlights = (flights) => {
    if (!flights) return [];
    return [...flights].sort((a, b) => {
      if (sortFlight === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortFlight === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortFlight === 'duration') return (a.total_duration || 0) - (b.total_duration || 0);
      return 0;
    });
  };

  const getSortedTrains = (trains) => {
    if (!trains) return [];
    return [...trains].sort((a, b) => {
      if (sortTrain === 'departure_asc') return (a.departure || '').localeCompare(b.departure || '');
      if (sortTrain === 'duration_asc') {
         const durA = parseFloat(a.duration || 999);
         const durB = parseFloat(b.duration || 999);
         return durA - durB;
      }
      return 0;
    });
  };

  // ── Lazy fetch for each tab ──────────────────────────────
  const flightsFetch = useTabFetch('flights', activeTab,
    () => fetch('http://localhost:8000/flights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_city: fromCity, to_city: toCity, date: startDate }),
      }).then(r => r.json()).then(d => d.flights || []),
    hasParams
  );

  const trainsFetch = useTabFetch('trains', activeTab,
    () => fetch('http://localhost:8000/trains', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_city: fromCity, to_city: toCity, date: startDate }),
      }).then(r => r.json()).then(d => d.trains || []),
    hasParams
  );

  const TABS = [
    { id: 'flights', label: 'Flights',  icon: PlaneTakeoff },
    { id: 'trains',  label: 'Trains',   icon: Train },
    { id: 'buses',   label: 'Buses',    icon: Bus },
    { id: 'car',     label: 'Car Hire', icon: Car },
  ];

  const renderContent = () => {
    if (!hasParams) return (
      <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-400">
        <p className="font-medium mb-1">No trip details found</p>
        <p className="text-sm text-yellow-400/70">
          <Link to="/dashboard" className="underline">Go back to the Dashboard</Link> and fill in your trip first.
        </p>
      </div>
    );

    // ── Flights ──────────────────────────────────────────
    if (activeTab === 'flights') {
      const { data: flights, loading, fetched } = flightsFetch;
      if (loading) return <LoadingSpinner label="Searching live flights…" />;
      if (fetched && flights.length > 0) return (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
            <ResultsMeta count={flights.length} label="flight(s)" from={fromCity} to={toCity} date={startDate} />
            <div className="flex items-center gap-2 text-sm mt-3 sm:mt-0">
              <span className="text-white/50">Sort by:</span>
              <select value={sortFlight} onChange={(e) => setSortFlight(e.target.value)} className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 outline-none focus:border-white/40">
                <option value="price_asc" className="bg-gray-900">Price (Low to High)</option>
                <option value="price_desc" className="bg-gray-900">Price (High to Low)</option>
                <option value="duration" className="bg-gray-900">Duration (Fastest)</option>
              </select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {getSortedFlights(flights).map((f, i) => <FlightCard key={i} flight={f} fromCity={fromCity} toCity={toCity} date={startDate} travelers={travelers} />)}
          </div>
        </>
      );
      if (fetched && flights.length === 0) return (
        <EmptyState icon={PlaneTakeoff} label="No flights found" fallbackUrl={`https://www.google.com/travel/flights/search?q=flights+from+${encodeURIComponent(fromCity)}+to+${encodeURIComponent(toCity)}`} fallbackLabel="Search Google Flights" />
      );
      return null; // not yet triggered
    }

    // ── Trains ───────────────────────────────────────────
    if (activeTab === 'trains') {
      const { data: trains, loading, fetched, error } = trainsFetch;
      if (loading) return <LoadingSpinner label="Fetching live train data…" />;
      if (error) return <ErrorState message={error} />;
      if (fetched && trains.length > 0) return (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
            <ResultsMeta count={trains.length} label="train(s)" from={fromCity} to={toCity} date={startDate} />
            <div className="flex items-center gap-2 text-sm mt-3 sm:mt-0">
              <span className="text-white/50">Sort by:</span>
              <select value={sortTrain} onChange={(e) => setSortTrain(e.target.value)} className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 outline-none focus:border-white/40">
                <option value="departure_asc" className="bg-gray-900">Departure Time</option>
                <option value="duration_asc" className="bg-gray-900">Duration (Fastest)</option>
              </select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {getSortedTrains(trains).map((t, i) => <TrainCard key={i} train={t} />)}
          </div>
        </>
      );
      if (fetched && trains.length === 0) return (
        <EmptyState icon={Train} label="No trains found between these stations" fallbackUrl="https://www.irctc.co.in/nget/train-search" fallbackLabel="Search on IRCTC" />
      );
      return null;
    }

    // ── Buses ────────────────────────────────────────────
    if (activeTab === 'buses') {
      // Format dates for each provider
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      let redbusDate = '', abhiDate = '';
      if (startDate) {
        const [y, m, d] = startDate.split('-');
        redbusDate = `${d}-${MONTHS[parseInt(m)-1]}-${y}`; // 15-Jun-2026 ✅ confirmed format
        abhiDate   = `${d}-${m}-${y}`;                     // 15-06-2026 ✅ confirmed format
      }

      // RedBus: requires internal city IDs (e.g. 66065, 124) — can't pre-build search URL
      const redbusUrl = `https://www.redbus.in`;

      // AbhiBus: confirmed format /bus_search/{fromCity}/{n}/{toCity}/{n}/{DD-MM-YYYY}/O
      // Numbers are adjacent display params — use sequential values, not the same
      const n1 = Math.max(travelers, 1);
      const n2 = n1 + 1;
      const abhiBusUrl = abhiDate
        ? `https://www.abhibus.com/bus_search/${encodeURIComponent(fromCity)}/${n1}/${encodeURIComponent(toCity)}/${n2}/${abhiDate}/O`
        : `https://www.abhibus.com`;

      // MMT Buses: fromCode/toCode/itineraryId are session-generated — can't pre-build deep link
      const mmtBusUrl = `https://www.makemytrip.com/bus-tickets/`;

      const BUS_PROVIDERS = [
        {
          name: 'RedBus',
          desc: `${fromCity} → ${toCity}${redbusDate ? ' · ' + redbusDate : ''}`,
          note: 'Cities & date pre-filled. ✅ Confirmed URL format.',
          color: 'bg-red-500/15 border-red-500/25 text-red-400',
          url:   redbusUrl,
        },
        {
          name: 'AbhiBus',
          desc: `${fromCity} → ${toCity}${abhiDate ? ' · ' + abhiDate : ''}`,
          note: 'Cities & date pre-filled. ✅ Confirmed URL format.',
          color: 'bg-orange-500/15 border-orange-500/25 text-orange-400',
          url:   abhiBusUrl,
        },
        {
          name: 'MakeMyTrip Buses',
          desc: `${fromCity} → ${toCity}`,
          note: '⚠️ MMT needs session codes — search manually on site.',
          color: 'bg-[#1a73e8]/15 border-[#1a73e8]/25 text-blue-400',
          url:   mmtBusUrl,
        },
      ];


      return (
        <div>
          <p className="text-white/40 text-sm mb-6">
            No public bus API exists. Book directly via these providers — cities and date are pre-filled where possible.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {BUS_PROVIDERS.map((p) => (
              <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                className={`flex flex-col gap-3 p-5 border rounded-2xl hover:opacity-90 transition-all ${p.color}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{p.name}</span>
                  <ExternalLink className="h-4 w-4 opacity-60" />
                </div>
                <p className="text-xs font-medium opacity-90 capitalize">{p.desc}</p>
                <p className="text-xs opacity-55">{p.note}</p>
              </a>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-24 text-white/30">
        <Car className="h-12 w-12 mb-4 opacity-30" />
        <h3 className="text-white/40 text-lg font-medium mb-2">Car Hire</h3>
        <p className="text-sm text-center max-w-xs">Coming soon</p>
      </div>
    );
  };

  return (
    <div className="bg-[#080808] min-h-screen" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-white text-4xl font-bold mb-1">Transportation</h1>
          <p className="text-white/40">Live travel options for your trip</p>
        </div>

        {hasParams && <TripBar from={fromCity} to={toCity} start={startDate} end={endDate} travelers={travelers} />}

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === id ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

// ── Helper sub-components ────────────────────────────────
const LoadingSpinner = ({ label }) => (
  <div className="flex items-center justify-center py-20 text-white/50">
    <Loader2 className="h-8 w-8 animate-spin mr-3 text-white" />{label}
  </div>
);

const ResultsMeta = ({ count, label, from, to, date }) => (
  <p className="text-white/40 text-sm mb-5">
    {count} {label} · <span className="text-white capitalize">{from} → {to}</span> · <span className="text-white">{date}</span>
  </p>
);

const EmptyState = ({ icon: Icon, label, fallbackUrl, fallbackLabel }) => (
  <div className="text-center py-20 text-white/40">
    <Icon className="h-10 w-10 mx-auto mb-3 opacity-40" />
    <p className="mb-4">{label}</p>
    {fallbackUrl && (
      <a href={fallbackUrl} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl text-sm">
        <ExternalLink className="h-4 w-4" /> {fallbackLabel}
      </a>
    )}
  </div>
);

const ErrorState = ({ message }) => (
  <div className="flex items-start gap-3 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
    <div>
      <p className="font-medium mb-1">Could not fetch train data</p>
      <p className="text-sm text-red-400/70">{message}</p>
      <a href="https://www.irctc.co.in/nget/train-search" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-3 text-sm underline text-red-300">
        <ExternalLink className="h-3.5 w-3.5" /> Search directly on IRCTC
      </a>
    </div>
  </div>
);

export default Transportation;
