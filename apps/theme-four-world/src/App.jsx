import { PerformanceProvider } from './context/PerformanceContext';
import { SceneProvider } from './context/SceneContext';
import { TreasureHuntProvider } from './context/TreasureHuntContext';
import Clubhouse from './clubhouse/Clubhouse';

export default function App() {
    return <PerformanceProvider><SceneProvider><TreasureHuntProvider><Clubhouse /></TreasureHuntProvider></SceneProvider></PerformanceProvider>;
}
