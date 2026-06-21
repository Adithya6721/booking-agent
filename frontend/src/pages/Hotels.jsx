import React, { useState, useEffect } from 'react';
import { PlaneTakeoff, Hotel, Loader2, Star, MapPin, ArrowRight, Users, Calendar, ExternalLink, Wifi, AirVent, Dumbbell } from 'lucide-react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';

// ── Booking deep links ───────────────────────────────────
const buildHotelLinks = (city, startDate, endDate, travelers) => {
  let mmtStart = '', mmtEnd = '';
  if (startDate && endDate) {
    const [sy, sm, sd] = startDate.split('-');
    const [ey, em, ed] = endDate.split('-');
    mmtStart = `${sm}${sd}${sy}`;
    mmtEnd = `${em}${ed}${ey}`;
  }
  const mmtCityCode = city ? `CT${city.substring(0,3).toUpperCase()}` : '';

  return {
    bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${startDate}&checkout=${endDate}&group_adults=${travelers}&no_rooms=1`,
    // MakeMyTrip: Pre-filled search URL (uses MMDDYYYY). LocusID is usually CT + first 3 letters or airport code.
    mmtUrl: `https://www.makemytrip.com/hotels/hotel-listing/?checkin=${mmtStart}&checkout=${mmtEnd}&city=${mmtCityCode}&locusId=${mmtCityCode}&country=IN&locusType=city&searchText=${encodeURIComponent(city)}&roomStayQualifier=${travelers}e0e`,
    // Agoda: requires internal city IDs (e.g. 14552) — can't pre-build search URL
    agodaUrl: `https://www.agoda.com/`,
  };
};

import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

// ── Shared Navbar ────────────────────────────────────────
const Navbar = ({ active }) => {
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
        <Link to="/dashboard" className={active === 'explore' ? 'text-white font-medium' : 'text-white/60 hover:text-white transition-colors'}>Explore</Link>
        <Link to="/transportation" className={active === 'transport' ? 'text-white font-medium' : 'text-white/60 hover:text-white transition-colors'}>Transportation</Link>
        <Link to="/hotels" className={active === 'hotels' ? 'text-white font-medium' : 'text-white/60 hover:text-white transition-colors'}>Hotels</Link>
        <Link to="/ai-planner" className="text-white/60 hover:text-white transition-colors">AI Planner</Link>
      </div>
      <button onClick={handleSignOut} className="text-sm text-black bg-white px-5 py-2 rounded-full font-medium hover:bg-white/90 transition-colors">Sign Out</button>
    </nav>
  );
};


// ── Trip Summary Bar ─────────────────────────────────────
const TripBar = ({ city, start, end, travelers }) => (
  <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-raised border border-white/10 rounded-2xl">
    <div className="flex items-center gap-2 text-white font-semibold">
      <Hotel className="h-4 w-4 text-white/40" />
      Hotels in <span className="capitalize">{city}</span>
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

// ── Hotel Card ───────────────────────────────────────────
const HotelCard = ({ hotel, city, startDate, endDate, travelers }) => {
  const links = buildHotelLinks(city, startDate, endDate, travelers);
  const nights = startDate && endDate
    ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000))
    : 1;

  const renderStars = (rating) => {
    const n = parseFloat(rating);
    if (!n) return null;
    return (
      <div className="flex items-center gap-1">
        {[...Array(Math.floor(n))].map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
        ))}
        <span className="text-yellow-400 text-sm font-medium ml-1">{rating}</span>
      </div>
    );
  };

  return (
    <div className="bg-raised border border-white/20 rounded-2xl p-5 hover:border-white/40 hover:bg-overlay transition-all flex flex-col gap-4 shadow-lg hover:shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base truncate">{hotel.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="h-3.5 w-3.5 text-white/30 shrink-0" />
            <span className="text-white/40 text-xs capitalize">{city}</span>
          </div>
          {hotel.rating && <div className="mt-2">{renderStars(hotel.rating)}</div>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-green-400 font-bold text-2xl">₹{hotel.price_per_night?.toLocaleString()}</p>
          <p className="text-white/30 text-xs">per night</p>
        </div>
      </div>

      {/* Stay summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs px-3 py-1.5 rounded-full bg-raised border border-white/10 text-white/60">
          {nights} night{nights > 1 ? 's' : ''}
        </span>
        <span className="text-xs px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-medium">
          ₹{(hotel.price_per_night * nights).toLocaleString()} total
        </span>
        {travelers > 1 && (
          <span className="text-xs text-white/30">for {travelers} guests</span>
        )}
      </div>

      {/* Booking buttons */}
      <div className="grid grid-cols-3 gap-2">
        <a href={links.bookingUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 py-2.5 bg-[#003580]/20 hover:bg-[#003580]/30 border border-[#003580]/40 text-blue-300 rounded-xl text-xs font-medium transition-all">
          <ExternalLink className="h-3.5 w-3.5" /> Booking
        </a>
        <a href={links.mmtUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 py-2.5 bg-[#1a73e8]/15 hover:bg-[#1a73e8]/25 border border-[#1a73e8]/25 text-blue-400 rounded-xl text-xs font-medium transition-all">
          <ExternalLink className="h-3.5 w-3.5" /> MMT
        </a>
        <a href={links.agodaUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium transition-all">
          <ExternalLink className="h-3.5 w-3.5" /> Agoda
        </a>
      </div>
    </div>
  );
};

// ── Main Hotels Page ─────────────────────────────────────
const Hotels = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [fetched, setFetched] = useState(false);

  // Read from URL params first, then fall back to sessionStorage
  const toCity    = searchParams.get('to')        || sessionStorage.getItem('toCity') || '';
  const startDate = searchParams.get('start')     || sessionStorage.getItem('startDate') || '';
  const endDate   = searchParams.get('end')       || sessionStorage.getItem('endDate') || '';
  const travelers = parseInt(searchParams.get('travelers') || sessionStorage.getItem('travelers')) || 1;
  const hotelType = searchParams.get('hotel')     || sessionStorage.getItem('hotelType') || 'AC';
  const hasParams = !!(toCity && startDate && endDate);

  const [sortOption, setSortOption] = useState('price_asc');

  const getSortedHotels = (hotelsList) => {
    if (!hotelsList) return [];
    return [...hotelsList].sort((a, b) => {
      if (sortOption === 'price_asc') return (a.price_per_night || 0) - (b.price_per_night || 0);
      if (sortOption === 'price_desc') return (b.price_per_night || 0) - (a.price_per_night || 0);
      if (sortOption === 'rating') {
        const ratingA = parseFloat(a.rating) || 0;
        const ratingB = parseFloat(b.rating) || 0;
        return ratingB - ratingA;
      }
      return 0;
    });
  };

  useEffect(() => {
    if (!hasParams) return;
    (async () => {
      setLoading(true);
      try {
        const amenityMap = { Luxury: '5 star luxury', AC: 'air conditioned', 'Non-AC': '' };
        const res = await fetch('http://localhost:8000/hotels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: toCity,
            check_in_date: startDate,
            check_out_date: endDate,
            adults: travelers,
            amenities: amenityMap[hotelType] || null,
          }),
        });
        const data = await res.json();
        setHotels(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); setFetched(true); }
    })();
  }, []);

  const fallbackLinks = buildHotelLinks(toCity, startDate, endDate, travelers);

  return (
    <div className="bg-base min-h-screen" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <Navbar active="hotels" />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-white text-4xl font-bold mb-1">Hotels</h1>
          <p className="text-white/40">Live accommodation options for your stay</p>
        </div>

        {hasParams
          ? <TripBar city={toCity} start={startDate} end={endDate} travelers={travelers} />
          : (
            <div className="mb-8 p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-400">
              <p className="font-medium mb-1">No trip details found</p>
              <p className="text-sm text-yellow-400/70">
                <Link to="/dashboard" className="underline">Go back to the Dashboard</Link> and fill in your trip first.
              </p>
            </div>
          )
        }

        {loading && (
          <div className="flex items-center justify-center py-20 text-white/50">
            <Loader2 className="h-8 w-8 animate-spin mr-3 text-white" />
            Searching hotels in {toCity}…
          </div>
        )}

        {!loading && fetched && hotels.length > 0 && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5">
              <p className="text-white/40 text-sm">
                {hotels.length} hotel(s) in <span className="text-white capitalize">{toCity}</span> · {startDate} → {endDate}
              </p>
              <div className="flex items-center gap-2 text-sm mt-3 sm:mt-0">
                <span className="text-white/50">Sort by:</span>
                <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="bg-overlay border border-white/20 text-white rounded-lg px-3 py-1.5 outline-none focus:border-white/40">
                  <option value="price_asc" className="bg-gray-900">Price (Low to High)</option>
                  <option value="price_desc" className="bg-gray-900">Price (High to Low)</option>
                  <option value="rating" className="bg-gray-900">Rating (Highest First)</option>
                </select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {getSortedHotels(hotels).map((h, i) => (
                <HotelCard key={i} hotel={h} city={toCity} startDate={startDate} endDate={endDate} travelers={travelers} />
              ))}
            </div>
          </>
        )}

        {!loading && fetched && hotels.length === 0 && hasParams && (
          <div className="text-center py-20 text-white/40">
            <Hotel className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="mb-4">No hotels found from our API. Browse directly:</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a href={fallbackLinks.bookingUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#003580]/20 border border-[#003580]/40 text-blue-300 rounded-xl text-sm">
                <ExternalLink className="h-4 w-4" /> Booking.com
              </a>
              <a href={fallbackLinks.mmtUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1a73e8]/15 border border-[#1a73e8]/25 text-blue-400 rounded-xl text-sm">
                <ExternalLink className="h-4 w-4" /> MakeMyTrip
              </a>
              <a href={fallbackLinks.agodaUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                <ExternalLink className="h-4 w-4" /> Agoda
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Hotels;
