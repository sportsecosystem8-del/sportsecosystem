import { useEffect, useState } from 'react';
import PlayerGroundBook from './PlayerGroundBook';
import { api } from '../../services/api';

export default function PlayerGrounds() {
  const [sport, setSport] = useState('');

  useEffect(() => {
    api
      .get('/players/me/profile')
      .then((r) => setSport(r.data?.data?.sportPreference || ''))
      .catch(() => {});
  }, []);

  return <PlayerGroundBook key={sport || 'all'} defaultSport={sport} />;
}
