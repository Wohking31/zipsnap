import React from 'react';
import './App.css';
import LocationFetcher from './components/LocationFetcher';


function App() {
  return (
    <div className="App">
      <h1>ZipSnap - Location Data Fetcher</h1>
      <p>Let's fetch some location data!</p>
      <LocationFetcher/>
      
      
    </div>
    
  );
}

export default App;