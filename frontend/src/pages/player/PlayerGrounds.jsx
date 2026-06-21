import PlayerPageHeader from '../../components/player/PlayerPageHeader';
import GroundDirectoryView from '../../components/GroundDirectoryView';
import { playerSelect } from '../../components/player/playerClassNames';

export default function PlayerGrounds() {
  return (
    <GroundDirectoryView
      accent="player"
      title="Indoor grounds"
      subtitle="Verified cricket and badminton venues — full details and direct owner contact."
      PageHeader={PlayerPageHeader}
      selectClassName={playerSelect}
    />
  );
}
