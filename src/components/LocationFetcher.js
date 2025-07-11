import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});


function LocationFetcher() {
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zipCode, setZipCode] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('us');
  const [searchHistory, setSearchHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');
  const [compareMode, setCompareMode] = useState(false);
  const [comparisonData, setComparisonData] = useState([]);

  const countries = [
    { code: 'us', name: 'United States', placeholder: '90210' },
    { code: 'ca', name: 'Canada', placeholder: 'K1A' },
    { code: 'de', name: 'Germany', placeholder: '10115' },
    { code: 'fr', name: 'France', placeholder: '75001' },
    { code: 'br', name: 'Brazil', placeholder: '01000-000' },
    { code: 'in', name: 'India', placeholder: '110001' },
    { code: 'jp', name: 'Japan', placeholder: '100-0001' },
    { code: 'cm', name: 'Cameroon', placeholder: '60005' }

  ];

  useEffect(() => {
    const savedHistory = localStorage.getItem('zipSearchHistory');
    const savedFavorites = localStorage.getItem('zipFavorites');
    if (savedHistory) setSearchHistory(JSON.parse(savedHistory));
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
  }, []);

  useEffect(() => {
    localStorage.setItem('zipSearchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    localStorage.setItem('zipFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const fetchLocationData = async () => {
    setError(null);
    setLoading(true);

    if (!zipCode.trim()) {
      setError('Please enter a postal code');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://api.zippopotam.us/${selectedCountry}/${zipCode.trim()}`);

      if (response.status === 404) {
        throw new Error('Postal code not found. Please check and try again.');
      }

      if (!response.ok) {
        throw new Error(`Network error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.places || data.places.length === 0) {
        throw new Error('No location data found for this postal code');
      }

      const resultWithTimestamp = {
        ...data,
        timestamp: new Date().toISOString(),
        searchQuery: `${selectedCountry}/${zipCode.trim()}`
      };

      setLocationData(resultWithTimestamp);
      
      // Add to search history if not already there
      setSearchHistory(prev => {
        const existingIndex = prev.findIndex(item => 
          item['post code'] === data['post code'] && item.country === data.country
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = resultWithTimestamp;
          return updated;
        }
        return [resultWithTimestamp, ...prev].slice(0, 10); // Keep last 10 searches
      });

    } catch (error) {
      if (error.name === 'TypeError') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (location) => {
    setFavorites(prev => {
      const existingIndex = prev.findIndex(fav => 
        fav['post code'] === location['post code'] && fav.country === location.country
      );
      if (existingIndex >= 0) {
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        return [...prev, { ...location, isFavorite: true }];
      }
    });
  };

  const isFavorite = (location) => {
    return favorites.some(fav => 
      fav['post code'] === location['post code'] && fav.country === location.country
    );
  };

  const exportData = () => {
    if (!locationData) return;
    
    let content, mimeType, extension;
    
    if (exportFormat === 'json') {
      content = JSON.stringify(locationData, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else if (exportFormat === 'csv') {
      const place = locationData.places[0];
      const headers = ['Post Code', 'Country', 'Place Name', 'State', 'Latitude', 'Longitude'];
      const values = [
        locationData['post code'],
        locationData.country,
        place['place name'],
        place.state,
        place.latitude || '',
        place.longitude || ''
      ];
      content = headers.join(',') + '\n' + values.join(',');
      mimeType = 'text/csv';
      extension = 'csv';
    } else { // text
      const place = locationData.places[0];
      content = `
Location Information:
Postal Code: ${locationData['post code']}
Country: ${locationData.country} (${locationData['country abbreviation']})
Place Name: ${place['place name']}
State: ${place.state} (${place['state abbreviation']})
${place.latitude ? `Coordinates: ${place.latitude}, ${place.longitude}` : ''}
      `.trim();
      mimeType = 'text/plain';
      extension = 'txt';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `location-${locationData['post code']}-${new Date().toISOString().slice(0, 10)}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addToComparison = () => {
    if (locationData) {
      setComparisonData(prev => [...prev, locationData]);
    }
  };

  const removeFromComparison = (index) => {
    setComparisonData(prev => prev.filter((_, i) => i !== index));
  };

  const currentCountry = countries.find(c => c.code === selectedCountry);

  // Theme variables
  const theme = {
    light: {
      bg: '#f8f9fa',
      cardBg: '#ffffff',
      text: '#212529',
      primary: '#3498db',
      secondary: '#6c757d',
      accent: '#2c3e50',
      error: '#dc3545',
      success: '#28a745',
      border: '#dee2e6'
    },
    dark: {
      bg: '#121212',
      cardBg: '#1e1e1e',
      text: '#e0e0e0',
      primary: '#bb86fc',
      secondary: '#9e9e9e',
      accent: '#03dac6',
      error: '#cf6679',
      success: '#03dac6',
      border: '#333333'
    }
  };

  const colors = darkMode ? theme.dark : theme.light;

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: colors.bg,
      color: colors.text,
      minHeight: '100vh'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <h1 style={{ 
          color: colors.primary,
          margin: 0,
          fontSize: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>🌍</span>
          <span>ZipSnap Dashboard</span>
        </h1>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '8px 12px',
              backgroundColor: colors.cardBg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          
          {locationData && (
            <button 
              onClick={() => toggleFavorite(locationData)}
              style={{
                padding: '8px 12px',
                backgroundColor: isFavorite(locationData) ? colors.success : colors.cardBg,
                color: isFavorite(locationData) ? 'white' : colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {isFavorite(locationData) ? '★ Saved' : '☆ Save'}
            </button>
          )}
        </div>
      </div>

      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '20px',
        marginBottom: '20px',
        '@media (maxwidth: 768px)': {
          gridTemplateColumns: '1fr'
        }
      }}>
        {/* Search Panel */}
        <div style={{ 
          backgroundColor: colors.cardBg, 
          padding: '20px', 
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          border: `1px solid ${colors.border}`
        }}>
          <h2 style={{ 
            color: colors.primary, 
            marginTop: 0,
            marginBottom: '20px',
            fontSize: '20px'
          }}>
            Search Location
          </h2>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              color: colors.text
            }}>
              Select Country:
            </label>
            <select 
              value={selectedCountry} 
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setLocationData(null);
              }}
              style={{ 
                padding: '10px', 
                width: '100%',
                borderRadius: '5px',
                border: `1px solid ${colors.border}`,
                fontSize: '16px',
                backgroundColor: colors.cardBg,
                color: colors.text
              }}
            >
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              color: colors.text
            }}>
              Enter {currentCountry.name} Postal Code:
            </label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder={`Example: ${currentCountry.placeholder}`}
              style={{ 
                padding: '10px', 
                width: '100%',
                borderRadius: '5px',
                border: `1px solid ${colors.border}`,
                fontSize: '16px',
                backgroundColor: colors.cardBg,
                color: colors.text
              }}
            />
          </div>
          
          <button 
            onClick={fetchLocationData} 
            disabled={loading || !zipCode.trim()}
            style={{
              padding: '12px',
              backgroundColor: loading ? colors.secondary : colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s',
              marginBottom: '15px'
            }}
          >
            {loading ? '🔍 Searching...' : '🌎 Find Location'}
          </button>
          
          {locationData && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ 
                color: colors.primary,
                marginTop: 0,
                marginBottom: '15px',
                fontSize: '18px'
              }}>
                Export Data
              </h3>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  style={{ 
                    padding: '8px',
                    borderRadius: '5px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.cardBg,
                    color: colors.text,
                    flex: 1
                  }}
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="text">Text</option>
                </select>
                
                <button 
                  onClick={exportData}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Export
                </button>
              </div>
              
              <button 
                onClick={addToComparison}
                disabled={comparisonData.some(d => 
                  d['post code'] === locationData['post code'] && d.country === locationData.country
                )}
                style={{
                  padding: '8px 12px',
                  backgroundColor: colors.secondary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                {comparisonData.some(d => 
                  d['post code'] === locationData['post code'] && d.country === locationData.country
                ) ? 'Added to Comparison' : 'Add to Comparison'}
              </button>
            </div>
          )}
          
          {/* Search History */}
          {searchHistory.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ 
                color: colors.primary,
                marginTop: 0,
                marginBottom: '15px',
                fontSize: '18px'
              }}>
                Recent Searches
              </h3>
              
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto',
                border: `1px solid ${colors.border}`,
                borderRadius: '5px'
              }}>
                {searchHistory.map((search, index) => (
                  <div 
                    key={index}
                    style={{
                      padding: '10px',
                      borderBottom: `1px solid ${colors.border}`,
                      cursor: 'pointer',
                      backgroundColor: locationData && 
                        locationData['post code'] === search['post code'] && 
                        locationData.country === search.country ? 
                        colors.primary + '20' : 'transparent',
                      ':hover': {
                        backgroundColor: colors.primary + '10'
                      }
                    }}
                    onClick={() => {
                      setSelectedCountry(search.country.toLowerCase());
                      setZipCode(search['post code']);
                      setLocationData(search);
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>
                      {search['post code']}, {search.country}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.secondary }}>
                      {search.places[0]['place name']}, {search.places[0].state}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.secondary }}>
                      {new Date(search.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Main Content */}
        <div>
          {/* Error Display */}
          {error && (
            <div style={{ 
              backgroundColor: darkMode ? '#370000' : '#f8d7da', 
              color: darkMode ? '#ff6e6e' : '#721c24', 
              padding: '15px', 
              borderRadius: '5px',
              marginBottom: '20px',
              borderLeft: `4px solid ${colors.error}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>❌</span>
                <span>{error}</span>
              </div>
            </div>
          )}
          
          {/* Comparison Mode */}
          {compareMode && comparisonData.length > 0 && (
            <div style={{ 
              backgroundColor: colors.cardBg, 
              padding: '20px', 
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              border: `1px solid ${colors.border}`,
              marginBottom: '20px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <h3 style={{ 
                  color: colors.primary,
                  margin: 0,
                  fontSize: '20px'
                }}>
                  Location Comparison
                </h3>
                
                <button 
                  onClick={() => setCompareMode(false)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: colors.error,
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Exit Compare
                </button>
              </div>
              
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(comparisonData.length, 3)}, 1fr)`,
                gap: '15px',
                '@media (maxwidth: 768px)': {
                  gridTemplateColumns: '1fr'
                }
              }}>
                {comparisonData.map((data, index) => (
                  <div 
                    key={index}
                    style={{
                      backgroundColor: colors.cardBg,
                      padding: '15px',
                      borderRadius: '5px',
                      border: `1px solid ${colors.border}`,
                      position: 'relative'
                    }}
                  >
                    <button 
                      onClick={() => removeFromComparison(index)}
                      style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        backgroundColor: colors.error,
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '25px',
                        height: '25px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      ×
                    </button>
                    
                    <h4 style={{ 
                      marginTop: 0,
                      marginBottom: '10px',
                      color: colors.primary
                    }}>
                      {data['post code']}, {data.country}
                    </h4>
                    
                    <p><strong style={{ color: colors.accent }}>Place:</strong> {data.places[0]['place name']}</p>
                    <p><strong style={{ color: colors.accent }}>State:</strong> {data.places[0].state}</p>
                    {data.places[0].latitude && (
                      <p><strong style={{ color: colors.accent }}>Coordinates:</strong> {data.places[0].latitude}, {data.places[0].longitude}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Location Data Display */}
          {locationData && !compareMode && (
            <div style={{ 
              backgroundColor: colors.cardBg, 
              padding: '20px', 
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              border: `1px solid ${colors.border}`,
              marginBottom: '20px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <h2 style={{ 
                  color: colors.primary,
                  margin: 0,
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span>📍</span>
                  <span>
                    {locationData.places[0]['place name']}, {locationData.places[0].state}
                  </span>
                </h2>
                
                {comparisonData.length > 0 && (
                  <button 
                    onClick={() => setCompareMode(true)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    Compare ({comparisonData.length})
                  </button>
                )}
              </div>
              
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '20px',
                '@media (maxwidth: 600px)': {
                  gridTemplateColumns: '1fr'
                }
              }}>
                <div>
                  <h3 style={{ 
                    color: colors.primary,
                    marginTop: 0,
                    marginBottom: '15px',
                    fontSize: '18px'
                  }}>
                    Location Details
                  </h3>
                  
                  <p><strong style={{ color: colors.accent }}>Postal Code:</strong> {locationData['post code']}</p>
                  <p><strong style={{ color: colors.accent }}>Country:</strong> {locationData.country} ({locationData['country abbreviation']})</p>
                  <p><strong style={{ color: colors.accent }}>Place Name:</strong> {locationData.places[0]['place name']}</p>
                  <p><strong style={{ color: colors.accent }}>State:</strong> {locationData.places[0].state} ({locationData.places[0]['state abbreviation']})</p>
                </div>
                
                <div>
                  <h3 style={{ 
                    color: colors.primary,
                    marginTop: 0,
                    marginBottom: '15px',
                    fontSize: '18px'
                  }}>
                    Geographical Data
                  </h3>
                  
                  {locationData.places[0].latitude && locationData.places[0].longitude ? (
                    <>
                      <p><strong style={{ color: colors.accent }}>Latitude:</strong> {locationData.places[0].latitude}</p>
                      <p><strong style={{ color: colors.accent }}>Longitude:</strong> {locationData.places[0].longitude}</p>
                      
                      <div style={{ marginTop: '15px' }}>
                        <a 
                          href={`https://www.google.com/maps?q=${locationData.places[0].latitude},${locationData.places[0].longitude}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            color: colors.primary,
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            ':hover': {
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          <span>Open in Google Maps</span>
                          <span>↗</span>
                        </a>
                      </div>
                    </>
                  ) : (
                    <p style={{ color: colors.secondary }}>Coordinates not available</p>
                  )}
                </div>
              </div>
              
              {/* Map Display */}
              {locationData.places[0].latitude && locationData.places[0].longitude && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ 
                    color: colors.primary,
                    marginTop: 0,
                    marginBottom: '15px',
                    fontSize: '18px'
                  }}>
                    Location Map
                  </h3>
                  
                  <div style={{ 
                    height: '300px', 
                    width: '100%', 
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: `1px solid ${colors.border}`
                  }}>
                    <MapContainer 
                      center={[
                        parseFloat(locationData.places[0].latitude), 
                        parseFloat(locationData.places[0].longitude)
                      ]} 
                      zoom={12} 
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url={darkMode ? 
                          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 
                          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                        }
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <Marker 
                        position={[
                          parseFloat(locationData.places[0].latitude), 
                          parseFloat(locationData.places[0].longitude)
                        ]}
                      >
                        <Popup>
                          {locationData.places[0]['place name']}, {locationData.places[0].state}
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Favorites Section */}
          {favorites.length > 0 && (
            <div style={{ 
              backgroundColor: colors.cardBg, 
              padding: '20px', 
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ 
                color: colors.primary,
                marginTop: 0,
                marginBottom: '15px',
                fontSize: '20px'
              }}>
                Saved Locations
              </h3>
              
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '15px'
              }}>
                {favorites.map((fav, index) => (
                  <div 
                    key={index}
                    style={{
                      backgroundColor: colors.cardBg,
                      padding: '15px',
                      borderRadius: '5px',
                      border: `1px solid ${colors.border}`,
                      position: 'relative',
                      ':hover': {
                        boxShadow: `0 0 0 2px ${colors.primary}`
                      }
                    }}
                  >
                    <button 
                      onClick={() => toggleFavorite(fav)}
                      style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        backgroundColor: colors.error,
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '25px',
                        height: '25px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      ×
                    </button>
                    
                    <h4 style={{ 
                      marginTop: 0,
                      marginBottom: '10px',
                      color: colors.primary
                    }}>
                      {fav['post code']}, {fav.country}
                    </h4>
                    
                    <p><strong style={{ color: colors.accent }}>Place:</strong> {fav.places[0]['place name']}</p>
                    <p><strong style={{ color: colors.accent }}>State:</strong> {fav.places[0].state}</p>
                    
                    <button 
                      onClick={() => {
                        setSelectedCountry(fav.country.toLowerCase());
                        setZipCode(fav['post code']);
                        setLocationData(fav);
                      }}
                      style={{
                        marginTop: '10px',
                        padding: '5px 10px',
                        backgroundColor: colors.primary,
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LocationFetcher;