import { useEffect, useState } from 'react';
import GroundDirectoryView from '../../components/GroundDirectoryView';
import CoachGroundBook from './CoachGroundBook';
import { coachSelect } from '../../components/coach/coachClassNames';
import { coachGroundsSubtitle } from '../../utils/sportDisplay';
import { api } from '../../services/api';

export default function CoachGrounds() {
  const [defaultSport, setDefaultSport] = useState('');

  useEffect(() => {
    api
      .get('/coaches/me/profile')
      .then((r) => {
        const specs = r.data?.data?.specialties;
        if (Array.isArray(specs) && specs.length) setDefaultSport(specs[0]);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <GroundDirectoryView
        key={defaultSport || 'all'}
        accent="coach"
        title="Indoor grounds"
        subtitle={coachGroundsSubtitle(defaultSport)}
        selectClassName={coachSelect}
        defaultSport={defaultSport}
        bookingHint
      />
      <CoachGroundBook defaultSport={defaultSport} />
    </div>
  );
}
