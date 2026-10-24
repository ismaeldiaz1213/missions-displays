import React from 'react';
import { usePageTitle } from '../usePageTitle';

const MisionerosPasados: React.FC = () => {
    usePageTitle('Misioneros pasados');
    return (
        <>
            <p>Missions who passed away will have a video to be shown here</p>
        </>
    );
};

export default MisionerosPasados;