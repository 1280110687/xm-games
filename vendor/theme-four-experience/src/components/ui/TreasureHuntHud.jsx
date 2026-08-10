import { useEffect, useMemo, useRef, useState } from 'react';
import { useScene } from '../../context/SceneContext';
import { MUSEUM_INTERACTIONS, useTreasureHunt } from '../../context/TreasureHuntContext';
import '../../styles/TreasureHuntHud.scss';

const COPY = {
    zh: {
        title: '夜间博物馆',
        caseFile: 'XM-04 · 失落藏品案',
        clue: '线索',
        time: '用时',
        score: '得分',
        best: '最高纪录',
        battery: '手电',
        hint: '请求提示',
        restart: '重新调查',
        interact: '调查',
        flashlight: '手电',
        objectives: ['寻找会折射蓝光的棱镜', '读取东侧墙上的星图', '检查档案桌下的能量源', '用三条线索开启收藏保险库'],
        controls: 'WASD 移动 · 鼠标拖动观察 · E 调查 · F 手电 · Shift 奔跑',
        clickLook: '按住场景拖动视角',
        completionTitle: '藏品已寻回',
        completionNote: '保险库已经开启，夜间档案恢复完整。',
        focus: {
            prism: '异常折射棱镜',
            constellation: '星图档案',
            'power-cell': '能量核心',
            vault: '收藏保险库',
            'broken-watch': '损坏的怀表',
            'glass-key': '玻璃钥匙复制品',
            'empty-frame': '空画框',
        },
        messages: {
            briefing: '馆内断电。用手电寻找异常反光，并按档案顺序解开保险库。',
            batteryEmpty: '手电电量耗尽，关闭后会自动充电。',
            batteryCharging: '电量过低，请稍候再开启。',
            vaultOpened: '最后一道锁已经解除。',
            vaultLocked: '保险库仍有三道档案锁。',
            alreadyFound: '这条线索已经归档。',
            wrongOrder: '档案顺序不对，先完成当前调查目标。',
            'clue:prism': '线索 01：棱镜把冷光折向了东侧墙面。',
            'clue:constellation': '线索 02：星图标记指向中央档案桌下方。',
            'clue:power-cell': '线索 03：能量核心与保险库锁芯完全匹配。',
            'decoy:broken-watch': '怀表早已停摆，这不是保险库的钥匙。',
            'decoy:glass-key': '复制品没有任何能量反应。',
            'decoy:empty-frame': '这里只留下了被移走藏品的轮廓。',
            'hint:prism': '寻找西侧前厅的玻璃展柜。',
            'hint:constellation': '沿东侧墙面寻找冷蓝色星光。',
            'hint:power-cell': '低头检查中央档案桌背面。',
            'hint:vault': '最后的目标就在展厅最深处。',
        },
    },
    en: {
        title: 'Museum After Dark',
        caseFile: 'XM-04 · THE LOST COLLECTION',
        clue: 'Clues',
        time: 'Time',
        score: 'Score',
        best: 'Best run',
        battery: 'Torch',
        hint: 'Request hint',
        restart: 'Restart case',
        interact: 'Inspect',
        flashlight: 'Torch',
        objectives: ['Find the prism that bends blue light', 'Read the star map on the east wall', 'Inspect the power source beneath the archive desk', 'Use the three records to open the collection vault'],
        controls: 'WASD move · Drag to look · E inspect · F torch · Shift sprint',
        clickLook: 'Hold and drag the scene to look around',
        completionTitle: 'Collection recovered',
        completionNote: 'The vault is open and the night archive is whole again.',
        focus: {
            prism: 'Anomalous prism',
            constellation: 'Star map archive',
            'power-cell': 'Power cell',
            vault: 'Collection vault',
            'broken-watch': 'Broken pocket watch',
            'glass-key': 'Glass key replica',
            'empty-frame': 'Empty frame',
        },
        messages: {
            briefing: 'The power is out. Reveal abnormal reflections and unlock the vault in archive order.',
            batteryEmpty: 'Torch depleted. Keep it off to recharge.',
            batteryCharging: 'The battery is still too low.',
            vaultOpened: 'The final lock has released.',
            vaultLocked: 'Three archive locks still protect the vault.',
            alreadyFound: 'That record is already filed.',
            wrongOrder: 'Wrong archive order. Finish the current objective first.',
            'clue:prism': 'Record 01: the prism throws cold light toward the east wall.',
            'clue:constellation': 'Record 02: the star map points beneath the central archive desk.',
            'clue:power-cell': 'Record 03: the power cell matches the vault mechanism.',
            'decoy:broken-watch': 'The watch stopped years ago. It cannot open the vault.',
            'decoy:glass-key': 'The replica produces no energy response.',
            'decoy:empty-frame': 'Only the outline of a removed exhibit remains.',
            'hint:prism': 'Search the glass case in the west entrance gallery.',
            'hint:constellation': 'Follow the cold blue stars on the east wall.',
            'hint:power-cell': 'Look low behind the central archive desk.',
            'hint:vault': 'Your final objective waits at the back of the museum.',
        },
    },
    th: {
        title: 'พิพิธภัณฑ์ยามค่ำคืน',
        caseFile: 'XM-04 · คดีของสะสมที่สูญหาย',
        clue: 'เบาะแส',
        time: 'เวลา',
        score: 'คะแนน',
        best: 'สถิติสูงสุด',
        battery: 'ไฟฉาย',
        hint: 'ขอคำใบ้',
        restart: 'เริ่มคดีใหม่',
        interact: 'ตรวจสอบ',
        flashlight: 'ไฟฉาย',
        objectives: ['ค้นหาปริซึมที่หักเหแสงสีน้ำเงิน', 'อ่านแผนที่ดาวบนผนังฝั่งตะวันออก', 'ตรวจสอบแหล่งพลังงานใต้โต๊ะเอกสาร', 'ใช้เบาะแสทั้งสามเปิดห้องนิรภัย'],
        controls: 'WASD เคลื่อนที่ · ลากเมาส์มอง · E ตรวจสอบ · F ไฟฉาย · Shift วิ่ง',
        clickLook: 'กดค้างและลากฉากเพื่อมองไปรอบๆ',
        completionTitle: 'กู้ของสะสมสำเร็จ',
        completionNote: 'ห้องนิรภัยเปิดแล้ว และเอกสารยามค่ำคืนกลับมาสมบูรณ์',
        focus: {
            prism: 'ปริซึมผิดปกติ',
            constellation: 'แผนที่ดาว',
            'power-cell': 'แกนพลังงาน',
            vault: 'ห้องนิรภัยของสะสม',
            'broken-watch': 'นาฬิกาพกชำรุด',
            'glass-key': 'กุญแจแก้วจำลอง',
            'empty-frame': 'กรอบภาพว่างเปล่า',
        },
        messages: {
            briefing: 'ไฟดับ ใช้ไฟฉายหาแสงสะท้อนผิดปกติและปลดล็อกตามลำดับเอกสาร',
            batteryEmpty: 'ไฟฉายหมด ปิดไว้เพื่อชาร์จอัตโนมัติ',
            batteryCharging: 'แบตเตอรี่ยังต่ำเกินไป',
            vaultOpened: 'กลอนสุดท้ายถูกปลดแล้ว',
            vaultLocked: 'ห้องนิรภัยยังมีล็อกเอกสารสามชั้น',
            alreadyFound: 'เบาะแสนี้ถูกบันทึกแล้ว',
            wrongOrder: 'ลำดับไม่ถูกต้อง ทำเป้าหมายปัจจุบันก่อน',
            'clue:prism': 'เบาะแส 01: ปริซึมหักเหแสงเย็นไปยังผนังตะวันออก',
            'clue:constellation': 'เบาะแส 02: แผนที่ดาวชี้ไปใต้โต๊ะเอกสารกลาง',
            'clue:power-cell': 'เบาะแส 03: แกนพลังงานเข้ากับกลไกห้องนิรภัย',
            'decoy:broken-watch': 'นาฬิกาหยุดไปนานแล้ว ไม่ใช่กุญแจ',
            'decoy:glass-key': 'ของจำลองไม่มีปฏิกิริยาพลังงาน',
            'decoy:empty-frame': 'เหลือเพียงรอยของชิ้นงานที่ถูกย้าย',
            'hint:prism': 'ค้นหาตู้กระจกฝั่งตะวันตกใกล้ทางเข้า',
            'hint:constellation': 'มองหาแสงดาวสีน้ำเงินบนผนังตะวันออก',
            'hint:power-cell': 'ก้มดูด้านหลังโต๊ะเอกสารกลาง',
            'hint:vault': 'เป้าหมายสุดท้ายอยู่ลึกสุดของพิพิธภัณฑ์',
        },
    },
};

const formatTime = (milliseconds) => {
    const safeMilliseconds = Math.max(0, milliseconds || 0);
    const minutes = Math.floor(safeMilliseconds / 60000);
    const seconds = Math.floor((safeMilliseconds % 60000) / 1000);
    const tenths = Math.floor((safeMilliseconds % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
};

const MovePad = ({ setMoveInput, setSprintInput }) => {
    const padRef = useRef();
    const pointerRef = useRef(null);
    const [knob, setKnob] = useState({ x: 0, y: 0 });

    const update = (clientX, clientY) => {
        const bounds = padRef.current?.getBoundingClientRect();
        if (!bounds) return;
        const radius = bounds.width * 0.34;
        let x = clientX - (bounds.left + bounds.width / 2);
        let y = clientY - (bounds.top + bounds.height / 2);
        const distance = Math.hypot(x, y);
        if (distance > radius) {
            x = (x / distance) * radius;
            y = (y / distance) * radius;
        }
        setKnob({ x, y });
        setMoveInput(x / radius, -y / radius);
        setSprintInput(distance > radius * 0.86);
    };

    const release = (event) => {
        if (pointerRef.current !== event.pointerId) return;
        pointerRef.current = null;
        setKnob({ x: 0, y: 0 });
        setMoveInput(0, 0);
        setSprintInput(false);
    };

    return (
        <div
            ref={padRef}
            className="treasure-controls__move"
            onPointerDown={(event) => {
                pointerRef.current = event.pointerId;
                event.currentTarget.setPointerCapture(event.pointerId);
                update(event.clientX, event.clientY);
            }}
            onPointerMove={(event) => {
                if (pointerRef.current === event.pointerId) update(event.clientX, event.clientY);
            }}
            onPointerUp={release}
            onPointerCancel={release}
            aria-label="Move"
            role="application"
        >
            <span style={{ transform: `translate3d(${knob.x}px, ${knob.y}px, 0)` }} />
        </div>
    );
};

const LookPad = ({ addLookInput }) => {
    const pointerRef = useRef(null);
    const lastRef = useRef({ x: 0, y: 0 });
    const [active, setActive] = useState(false);
    const release = (event) => {
        if (pointerRef.current !== event.pointerId) return;
        pointerRef.current = null;
        setActive(false);
    };
    return (
        <div
            className={`treasure-controls__look${active ? ' is-active' : ''}`}
            onPointerDown={(event) => {
                pointerRef.current = event.pointerId;
                lastRef.current = { x: event.clientX, y: event.clientY };
                event.currentTarget.setPointerCapture(event.pointerId);
                setActive(true);
            }}
            onPointerMove={(event) => {
                if (pointerRef.current !== event.pointerId) return;
                addLookInput(event.clientX - lastRef.current.x, event.clientY - lastRef.current.y);
                lastRef.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerUp={release}
            onPointerCancel={release}
            aria-label="Look"
            role="application"
        >
            <i />
            <i />
            <i />
            <i />
        </div>
    );
};

const TreasureHuntHud = () => {
    const { currentRoom } = useScene();
    const {
        addLookInput,
        battery,
        bestRun,
        clueStep,
        discoveredIds,
        elapsedMs,
        flashlightOn,
        focusId,
        hintsUsed,
        interact,
        interactFocused,
        message,
        mistakes,
        requestHint,
        restartHunt,
        score,
        setMoveInput,
        setSprintInput,
        status,
        toggleFlashlight,
        totalClues,
    } = useTreasureHunt();
    const [locale, setLocale] = useState('zh');

    useEffect(() => {
        const handleMessage = (event) => {
            if (
                event.origin === window.location.origin &&
                event.source === window.parent &&
                event.data?.type === 'xm-games:theme-four-context' &&
                COPY[event.data.payload?.locale]
            ) {
                setLocale(event.data.payload.locale);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => () => {
        setMoveInput(0, 0);
        setSprintInput(false);
    }, [setMoveInput, setSprintInput]);

    const copy = COPY[locale] || COPY.zh;
    const objective = copy.objectives[Math.min(clueStep, copy.objectives.length - 1)];
    const messageText = message?.key ? copy.messages[message.key] : null;
    const focusLabel = focusId ? copy.focus[focusId] : null;
    const foundCount = discoveredIds.size;
    const completionBest = bestRun?.score || score;
    const batteryLevel = Math.round(battery);
    const batteryTone = battery < 18 ? 'critical' : battery < 42 ? 'low' : 'normal';
    const interactionLabels = useMemo(() => copy.focus, [copy.focus]);

    if (currentRoom !== 'treasure') return null;

    return (
        <section className={`treasure-hud treasure-hud--${status}`} aria-labelledby="night-museum-title">
            <header className="treasure-mission">
                <div className="treasure-mission__identity">
                    <span>{copy.caseFile}</span>
                    <h1 id="night-museum-title">{copy.title}</h1>
                </div>
                <div className="treasure-mission__objective" aria-live="polite">
                    <small>{String(Math.min(clueStep + 1, 4)).padStart(2, '0')} / 04</small>
                    <strong>{objective}</strong>
                </div>
                <div className="treasure-mission__stats">
                    <span><small>{copy.clue}</small><strong>{foundCount}/{totalClues}</strong></span>
                    <span><small>{copy.time}</small><strong>{formatTime(elapsedMs)}</strong></span>
                </div>
            </header>

            <aside className={`treasure-battery treasure-battery--${batteryTone}${flashlightOn ? ' is-on' : ''}`}>
                <div>
                    <span>{copy.battery}</span>
                    <strong>{batteryLevel}%</strong>
                </div>
                <i><b style={{ width: `${batteryLevel}%` }} /></i>
            </aside>

            {messageText && status !== 'completed' && (
                <div key={message.nonce} className={`treasure-message treasure-message--${message.tone}`} role="status">
                    <span />
                    <p>{messageText}</p>
                </div>
            )}

            <div className={`treasure-reticle${focusId ? ' has-focus' : ''}`} aria-hidden="true">
                <i />
                {focusLabel && <span>{copy.interact} · {focusLabel}</span>}
            </div>

            <div className="treasure-desktop-help" aria-hidden="true">
                <span>{copy.controls}</span>
                <small>{copy.clickLook}</small>
            </div>

            <button type="button" className="treasure-hint" onClick={requestHint} disabled={status !== 'running'}>
                {copy.hint}<small>{hintsUsed ? ` −${hintsUsed * 700}` : ''}</small>
            </button>

            <div className="treasure-controls" aria-label="Mobile game controls">
                <MovePad setMoveInput={setMoveInput} setSprintInput={setSprintInput} />
                <LookPad addLookInput={addLookInput} />
                <div className="treasure-controls__actions">
                    <button
                        type="button"
                        className={flashlightOn ? 'is-active' : ''}
                        onClick={toggleFlashlight}
                        disabled={status !== 'running'}
                    >
                        <span aria-hidden="true">⌁</span>{copy.flashlight}
                    </button>
                    <button type="button" onClick={interactFocused} disabled={status !== 'running' || !focusId}>
                        <span aria-hidden="true">◎</span>{copy.interact}
                    </button>
                </div>
            </div>

            {status === 'completed' && (
                <div className="treasure-complete" role="dialog" aria-modal="true" aria-labelledby="treasure-complete-title">
                    <div className="treasure-complete__seal" aria-hidden="true"><span>XM</span></div>
                    <span className="treasure-complete__eyebrow">CASE CLOSED · 04</span>
                    <h2 id="treasure-complete-title">{copy.completionTitle}</h2>
                    <p>{copy.completionNote}</p>
                    <div className="treasure-complete__score">
                        <span><small>{copy.score}</small><strong>{score.toLocaleString()}</strong></span>
                        <span><small>{copy.time}</small><strong>{formatTime(elapsedMs)}</strong></span>
                        <span><small>{copy.best}</small><strong>{completionBest.toLocaleString()}</strong></span>
                    </div>
                    <small className="treasure-complete__penalty">Hints {hintsUsed} · False leads {mistakes}</small>
                    <button type="button" onClick={restartHunt}>{copy.restart}</button>
                </div>
            )}

            <div className="sr-only" aria-label={copy.title}>
                {MUSEUM_INTERACTIONS.map((interaction) => (
                    <button type="button" key={interaction.id} onClick={() => interact(interaction.id)}>
                        {copy.interact} {interactionLabels[interaction.id]}
                    </button>
                ))}
            </div>
        </section>
    );
};

export default TreasureHuntHud;
