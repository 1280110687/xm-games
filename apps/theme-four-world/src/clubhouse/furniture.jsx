import { Box, Label, Plant, Plaque, useMaterials } from './materials';
import { COPY } from './model';

function Table({ position, width = 4.6, depth = 2.55, height = 1.12 }) {
    return <group position={position}>
        <Box position={[0, height, 0]} size={[width, 0.16, depth]} rounded />
        {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Box key={`${x}:${z}`} position={[x * (width / 2 - 0.14), height / 2, z * (depth / 2 - 0.14)]} size={[0.12, height, 0.12]} />))}
    </group>;
}

function Monitor({ text = '{ }', small = false }) {
    const scale = small ? 0.7 : 1;
    return <group scale={scale}>
        <Box position={[0, 0.32, 0]} size={[0.9, 0.66, 0.26]} material="teal" rounded />
        <Box position={[0, 0.34, 0.14]} size={[0.76, 0.48, 0.03]} material="dark" rounded />
        <Label text={text} position={[0, 0.36, 0.16]} width={0.66} height={0.4} color="#a0deda" size={155} />
        <Box position={[0, -0.03, 0.05]} size={[0.72, 0.06, 0.42]} material="stone" rounded />
    </group>;
}

function Documents() {
    const materials = useMaterials();
    return <group>
        <Box size={[1.08, 0.09, 0.8]} />
        {[-1, 1].map((side) => <Box key={side} position={[side * 0.53, 0.1, 0]} size={[0.05, 0.21, 0.85]} />)}
        {Array.from({ length: 5 }, (_, i) => <Box key={i} position={[i * 0.008, 0.064 + i * 0.016, -i * 0.009]} rotation={[0, i * 0.012, 0]} size={[0.86, 0.012, 0.67]} material="paper" />)}
        <Label text={'XM · NOTES\nIdeas worth keeping.'} position={[0, 0.145, 0]} rotation={[-Math.PI / 2, 0, 0]} width={0.7} height={0.5} size={76} color="#617576" />
        <mesh position={[-0.21, 0.2, 0.13]} material={materials.brass}><sphereGeometry args={[0.085, 16, 8]} /></mesh>
    </group>;
}

function Lockbox() {
    return <group>
        <Box position={[0, 0.22, 0]} size={[0.76, 0.44, 0.57]} material="teal" rounded />
        <Box position={[0, 0.48, 0]} size={[0.78, 0.09, 0.59]} material="tealInset" rounded />
        <Box position={[0, 0.27, 0.305]} size={[0.14, 0.19, 0.055]} material="brass" rounded />
        <Label text="•" position={[0, 0.28, 0.337]} width={0.045} height={0.08} size={130} />
        <Box position={[0, 0.56, 0]} size={[0.28, 0.025, 0.055]} material="brass" />
    </group>;
}

function CodeStand() {
    return <group rotation={[-0.14, 0, 0]}>
        <Box position={[0, 0.32, 0]} size={[0.63, 0.66, 0.07]} rounded />
        <Box position={[0, 0.32, 0.046]} size={[0.54, 0.56, 0.02]} material="paper" />
        <Label text="QR" position={[0, 0.34, 0.059]} width={0.46} height={0.44} size={250} />
    </group>;
}

export function ToolWorkshop({ apiRef, locale, categories, onNavigate }) {
    const tools = categories.find((category) => category.id === 'categoryTools')?.games || [];
    const labels = locale === 'zh' ? ['文本整理', '文本加解密', '文字二维码', 'JSON 工具', 'Base64', '追番助手'] : locale === 'th' ? ['จัดข้อความ', 'เข้ารหัส', 'คิวอาร์โค้ด', 'JSON', 'Base64', 'ติดตามอนิเมะ'] : ['Text tidy', 'Encryption', 'QR code', 'JSON', 'Base64', 'Anime tracker'];
    const stations = [
        { href: '/text-tool', position: [6.3, 1.24, -1.9], kind: 'documents' },
        { href: '/text-crypto', position: [4.95, 1.24, -3], kind: 'lock' },
        { href: '/qr-code', position: [6.3, 1.24, -3.45], kind: 'qr' },
        { href: '/json-tool', position: [7.65, 1.24, -3.2], kind: 'json' },
        { href: '/base64-tool', position: [6.85, 1.78, -5.1], kind: 'base64' },
        { href: '/anime-tracker', position: [5.15, 1.78, -5.1], kind: 'anime' },
    ];
    return <group>
        <Table position={[6.3, 0, -2.5]} depth={3.45} />
        <Table position={[6.3, 0, -5.1]} width={4.8} depth={0.9} height={1.66} />
        {stations.map((station, index) => {
            // Resolve against the host manifest, never navigate to an invented path.
            const game = tools.find((entry) => entry.href === station.href);
            const label = labels[index];
            return <group key={station.href} position={station.position} onClick={(event) => {
                event.stopPropagation();
                if (game && apiRef.current?.state.place === 'contact' && apiRef.current.canActivate()) onNavigate(game.href);
            }}>
                {station.kind === 'documents' && <Documents />}
                {station.kind === 'lock' && <Lockbox />}
                {station.kind === 'qr' && <CodeStand />}
                {station.kind === 'json' && <Monitor text={'{ }\nJSON'} />}
                {station.kind === 'base64' && <Monitor text={'Aa\n0101'} small />}
                {station.kind === 'anime' && <Monitor text={'▶\nMY WATCHLIST'} />}
                <Plaque text={label} position={[0, 0.02, 0.49]} width={1.14} height={0.26} />
                <mesh visible={false} position={[0, 0.25, 0]}><boxGeometry args={[1.17, 0.95, 1.05]} /><meshBasicMaterial /></mesh>
            </group>;
        })}
        <Plant position={[8.45, 1.2, -4.85]} scale={0.65} />
        <Box position={[4.5, 1.75, -5.75]} size={[0.42, 0.035, 0.32]} material="glow" />
        <Box position={[4.5, 1.4, -5.75]} size={[0.03, 0.7, 0.03]} material="brass" />
        <group position={[8.05, 0, -0.2]} rotation={[0, -0.3, 0]}>
            <Box position={[0, 0.72, 0]} size={[0.85, 0.16, 0.85]} material="teal" rounded />
            <Box position={[0, 1.05, 0.41]} size={[0.85, 0.65, 0.1]} material="teal" rounded />
            {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Box key={`${x}:${z}`} position={[x * 0.32, 0.35, z * 0.32]} size={[0.07, 0.7, 0.07]} />))}
        </group>
    </group>;
}

export function GameRoom({ apiRef, locale, onCategory }) {
    const materials = useMaterials();
    const copy = COPY[locale];
    const select = (category) => (event) => { event.stopPropagation(); if (apiRef.current?.state.place === 'gallery' && apiRef.current.canActivate()) onCategory(category); };
    return <group>
        <Table position={[-6.3, 0, -2.5]} width={3.8} depth={2.4} />
        <group position={[-6.3, 1.24, -2.4]} onClick={select('categoryBoard')}>
            <Box size={[1.65, 0.1, 1.65]} />
            {Array.from({ length: 64 }, (_, i) => <Box key={i} position={[(i % 8 - 3.5) * 0.19, 0.058, (Math.floor(i / 8) - 3.5) * 0.19]} size={[0.19, 0.015, 0.19]} material={(i + Math.floor(i / 8)) % 2 ? 'teal' : 'paper'} />)}
            {[-1, 1].flatMap((side) => Array.from({ length: 8 }, (_, i) => <group key={`${side}:${i}`} position={[(i - 3.5) * 0.19, 0.17, side * 0.48]}>
                <mesh material={side === 1 ? materials.paper : materials.teal} castShadow><cylinderGeometry args={[0.035, 0.065, 0.19, 10]} /></mesh>
                <mesh position={[0, 0.13, 0]} material={side === 1 ? materials.paper : materials.teal} castShadow><sphereGeometry args={[0.055, 10, 8]} /></mesh>
            </group>))}
            <Plaque text={copy.board} position={[0, -0.05, 1.17]} />
        </group>
        <group position={[-8.15, 0, -4.5]} onClick={select('categoryArcade')}>
            <Box position={[0, 0.95, 0]} size={[1, 1.9, 0.88]} material="teal" rounded />
            <Box position={[0, 1.61, 0.47]} size={[0.84, 0.64, 0.09]} material="dark" />
            <Label text={'XM\nARCADE'} position={[0, 1.63, 0.52]} width={0.7} height={0.55} color="#b6e5ce" size={135} />
            <Box position={[0, 1.15, 0.62]} size={[1.02, 0.1, 0.62]} material="tealInset" />
            <mesh position={[-0.2, 1.26, 0.62]} material={materials.brass}><sphereGeometry args={[0.065, 12, 8]} /></mesh>
            <Plaque text={copy.arcade} position={[0, 2.05, 0.46]} width={1.04} height={0.3} />
        </group>
        <Table position={[-4.65, 0, -4.7]} width={1.5} depth={1.05} />
        <group position={[-4.65, 1.22, -4.7]} onClick={select('categoryPuzzle')}>
            <Monitor text={'2048\n2 · 4 · 8'} />
            <Plaque text={copy.puzzle} position={[0, 0.02, 0.53]} width={1.35} height={0.3} />
        </group>
        <group position={[-6.4, 1.22, -5.25]} onClick={select('categoryBingo')}>
            <Box size={[1.2, 0.16, 0.7]} />
            {[0, 1, 2].map((i) => <mesh key={i} position={[(i - 1) * 0.28, 0.22, 0]} material={i % 2 ? materials.brass : materials.paper} castShadow><sphereGeometry args={[0.14, 16, 10]} /></mesh>)}
            <Plaque text={copy.bingo} position={[0, -0.07, 0.44]} width={1.2} height={0.26} />
        </group>
        <group position={[-4.1, 1.24, -1.9]} onClick={select('categoryFocus')}>
            <Monitor text={'1 2 3\n4 5 6\n7 8 9'} small />
            <Plaque text={copy.focus} position={[0, -0.02, 0.45]} width={1.1} height={0.27} />
        </group>
    </group>;
}
