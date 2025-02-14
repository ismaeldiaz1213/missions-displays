import React from 'react'
import { Route, Routes } from 'react-router-dom'
import NotFound from './NotFound'
import Home from './Home/Home'
import RegionSelection from './RegionSelection/RegionSelection'
import Africa from './Continents/Africa'
import Asia from './Continents/Asia'
import NorthAmerica from './Continents/NorthAmerica'


const App:React.FC = () => {
  return (
    <>
      <Routes>
        <Route path="/*" element={<NotFound />} />
        <Route path="/" element={<Home />} />
        <Route path="/region-selection" element={<RegionSelection />} />
        <Route path="/norte-america" element={<NorthAmerica />} />
        <Route path="/sur-america" element={<Home />} />
        <Route path="/centro-america" element={<Home />} />
        <Route path="/europa" element={<Home />} />
        <Route path="/asia" element={<Asia />} />
        <Route path="/africa" element={<Africa />} />
        <Route path="/oceania" element={<Home />} />
        <Route path="/conferencia-misionera" element={<Home />} />
        <Route path="/recordando" element={<Home />} />
        <Route path="/misionero/:missionary" element={<Home/>} /> 
      </Routes>
    </>
  )
}

export default App;
