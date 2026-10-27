import { PerformanceProvider } from './context/PerformanceContext';
import { SceneProvider } from './context/SceneContext';
import Clubhouse from './clubhouse/Clubhouse';

export default function App() {
    return <PerformanceProvider><SceneProvider><Clubhouse /></SceneProvider></PerformanceProvider>;
}
