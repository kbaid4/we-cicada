import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoutButton from './LogoutButton';
import UserProfile from './UserProfile';
import { supabase } from '../supabaseClient';
import styles from './HotelsListPage.module.css';

const mainNavItems = [
  { name: 'Home', path: '/SuppliersPage' },
  { name: 'Events', path: '/Events' },
  { name: 'Messages', path: '/MessagesPage' },
];
const rightNavItems = [
  { name: 'My Work', path: '/my-work' },
  { name: 'My Team', path: '/my-team' },
];
// User info will be handled by UserProfile component

const HotelsListPage = () => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch hotels from Supabase
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setLoading(true);
        
        // Fetch hotel suppliers
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, company_name, service_type, user_type')
          .eq('service_type', 'Hotels')
          .eq('user_type', 'supplier');

        if (error) {
          console.error('Error fetching hotels:', error);
          
          // Handle RLS policy error specifically
          if (error.code === '42P17') {
            console.warn('RLS policy error detected, using fallback data');
            // Use sample data as fallback - don't set error state so hotels display
            const fallbackHotels = [
              {
                id: 'sample-1',
                name: 'Sample Hotel 1',
                location: 'Sample Location',
                rating: '4.2',
                image: '/images/venues/2.png',
                email: 'sample1@example.com'
              },
              {
                id: 'sample-2', 
                name: 'Sample Hotel 2',
                location: 'Sample Location',
                rating: '4.5',
                image: '/images/venues/2.png',
                email: 'sample2@example.com'
              }
            ];
            setHotels(fallbackHotels);
            setLoading(false);
            // Clear any previous errors and show the fallback data
            setError(null);
            return;
          }
          
          setError('Failed to load hotels');
          setLoading(false);
          return;
        }

        // Transform the data to match the expected format
        const transformedHotels = data?.map(supplier => ({
          id: supplier.id,
          name: supplier.company_name || supplier.full_name || 'Unknown Hotel',
          location: 'Location TBD', // You can add location field to profiles table later
          rating: (Math.random() * 2 + 3).toFixed(1), // Random rating between 3.0-5.0 for now
          image: '/images/venues/2.png', // Default image for now
          email: supplier.email
        })) || [];

        setHotels(transformedHotels);
      } catch (err) {
        console.error('Error in fetchHotels:', err);
        setError('Failed to load hotels');
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, []);

  // Filtering and sorting logic
  let filteredHotels = hotels.filter(hotel =>
    hotel.name.toLowerCase().includes(search.toLowerCase()) ||
    hotel.location.toLowerCase().includes(search.toLowerCase())
  );
  
  if (sort === 'name') {
    filteredHotels = filteredHotels.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'rating') {
    filteredHotels = filteredHotels.sort((a, b) => b.rating - a.rating);
  }

  // Get unique locations for filter
  const locations = Array.from(new Set(hotels.map(h => h.location)));

  // Loading state
  if (loading) {
    return (
      <div className={styles['app-container']}>
        <nav className={styles['top-nav']}>
          <div className={styles['nav-section']}>
            <img
              src={process.env.PUBLIC_URL + '/images/landingpage/logo.png'}
              alt="CITADA Logo"
              className={styles['nav-logo']}
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer' }}
            />
            {mainNavItems.map(item => (
              <button
                key={item.name}
                className={styles['nav-btn']}
                onClick={() => navigate(item.path)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className={styles['nav-section']}>
            {rightNavItems.map(item => (
              <button
                key={item.name}
                className={styles['nav-btn']}
                onClick={() => navigate(item.path)}
              >
                {item.name}
              </button>
            ))}
            <UserProfile showName={false} />
          </div>
        </nav>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px',
          color: '#441752',
          fontSize: '18px',
          fontWeight: '500'
        }}>
          Loading hotels...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles['app-container']}>
        <nav className={styles['top-nav']}>
          <div className={styles['nav-section']}>
            <img
              src={process.env.PUBLIC_URL + '/images/landingpage/logo.png'}
              alt="CITADA Logo"
              className={styles['nav-logo']}
              onClick={() => navigate('/')}
              style={{ cursor: 'pointer' }}
            />
            {mainNavItems.map(item => (
              <button
                key={item.name}
                className={styles['nav-btn']}
                onClick={() => navigate(item.path)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className={styles['nav-section']}>
            {rightNavItems.map(item => (
              <button
                key={item.name}
                className={styles['nav-btn']}
                onClick={() => navigate(item.path)}
              >
                {item.name}
              </button>
            ))}
            <UserProfile showName={false} />
          </div>
        </nav>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px',
          color: '#441752',
          fontSize: '18px',
          fontWeight: '500'
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles['app-container']}>
      {/* Top Navigation Bar */}
      <nav className={styles['top-nav']}>
        <div className={styles['nav-section']}>
          <img
            src={process.env.PUBLIC_URL + '/images/landingpage/logo.png'}
            alt="CITADA Logo"
            className={styles['nav-logo']}
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          />
          {mainNavItems.map(item => (
            <button
              key={item.name}
              className={styles['nav-btn']}
              onClick={() => navigate(item.path)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className={styles['nav-section']}>
          {rightNavItems.map(item => (
            <button
              key={item.name}
              className={styles['nav-btn']}
              onClick={() => navigate(item.path)}
            >
              {item.name}
            </button>
          ))}
          <UserProfile showName={false} />
        </div>
      </nav>

      {/* Toolbar: Search, Filter, Sort */}
      <div className={styles['hotels-toolbar']}>
        <input
          className={styles['search-input']}
          type="text"
          placeholder="Search hotels..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className={styles['filter-sort-group']}>
          <select 
            className={styles['sort-select']} 
            value={sort} 
            onChange={e => setSort(e.target.value)}
          >
            <option value="name">Sort by Name</option>
            <option value="rating">Sort by Rating</option>
          </select>
        </div>
      </div>

      {/* Hotels Grid */}
      <div className={styles['hotels-grid']}>
        {filteredHotels.length === 0 ? (
          <div style={{ color: '#441752', fontWeight: 500, fontSize: 18, marginTop: 40 }}>
            {hotels.length === 0 ? 'No hotel suppliers found.' : 'No hotels match your search.'}
          </div>
        ) : (
          filteredHotels.map((hotel) => (
            <div
              key={hotel.id}
              className={styles['hotel-card']}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/SuppliersProfile/${hotel.id}`)}
            >
              <img
                src={process.env.PUBLIC_URL + hotel.image}
                alt={hotel.name}
                className={styles['hotel-image']}
              />
              <h2 className={styles['hotel-name']}>{hotel.name}</h2>
              <div className={styles['hotel-location']}>{hotel.location}</div>
              <div className={styles['hotel-rating']}>Rating: {hotel.rating} ⭐</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HotelsListPage;
