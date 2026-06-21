import GroundDirectoryView from '../../components/GroundDirectoryView';
import { coachSelect } from '../../components/coach/coachClassNames';

export default function CoachGrounds() {
  return (
    <GroundDirectoryView
      accent="coach"
      title="Indoor grounds"
      subtitle="Verified venue listings — review full details and call the owner to reserve a slot."
      selectClassName={coachSelect}
    />
  );
}
