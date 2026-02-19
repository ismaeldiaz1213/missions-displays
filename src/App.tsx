import React from 'react'
import { Route, Routes } from 'react-router-dom'
import NotFound from './NotFound'
import Home from './Home/Home'
import RegionSelection from './RegionSelection/RegionSelection'
import NorthAmerica from './Continents/NorthAmerica'
import SouthAmerica from './Continents/SouthAmerica'
import CentralAmerica from './Continents/CentralAmerica'
import Europe from './Continents/Europe'
import Africa from './Continents/Africa'
import Asia from './Continents/Asia'
import Oceania from './Continents/Oceania'
import Missionary from './Missionaries/Missionary'
import Admin from './Administrator/admin'
import MisionerosPasados from './MisionerosPasados/MisionerosPasados'
import Timeline from './Timeline/Timeline'


const App:React.FC = () => {
  return (
    <>
      <Routes>
        <Route path="/*" element={<NotFound />} />
        <Route path="/" element={<Home />} />
        <Route path="/region-selection" element={<RegionSelection />} />
        <Route path="/norte-america" element={<NorthAmerica />} />
        <Route path="/sur-america" element={<SouthAmerica />} />
        <Route path="/centro-america" element={<CentralAmerica />} />
        <Route path="/europa" element={<Europe />} />
        <Route path="/asia" element={<Asia />} />
        <Route path="/africa" element={<Africa />} />
        <Route path="/oceania" element={<Oceania />} />
        <Route path="/misionero/:missionary" element={<Missionary/>} /> 
        <Route path="/administrator" element={<Admin/>} /> 
        <Route path="/misioneros-pasados" element={<MisionerosPasados/>} /> 
        <Route path="/timeline" element={<Timeline/>} /> 
      </Routes>
    </>
  )
}

export default App;
