import { CLUBHOUSE_SESSION_KEY, isClubhouseSnapshot } from '@xm-games/experience-bridge';

export const ENTRANCE_POSE = { x: 0, y: 1.9, z: 10.5, yaw: 0, pitch: 0.03 };
export const CORRIDOR_POSE = { x: 0, y: 1.7, z: 2.4, yaw: 0, pitch: 0 };
export const ROOM_POSES = {
    gallery: { x: -6.2, y: 2.15, z: 1.05, yaw: 0, pitch: -0.2 },
    contact: { x: 5.9, y: 2.3, z: 1.05, yaw: -0.08, pitch: -0.28 },
    elemental: { x: -1.5, y: 1.7, z: -12, yaw: 0, pitch: 0 },
    treasure: { x: 1.5, y: 1.7, z: -12, yaw: 0, pitch: 0 },
};
export const ROOM_DOORS = {
    gallery: { position: [-3, 0, -2], rotation: Math.PI / 2, approach: { ...CORRIDOR_POSE, z: -2, yaw: Math.PI / 2 }, inside: { x: -4.2, y: 1.7, z: -2, yaw: Math.PI / 2, pitch: 0 } },
    contact: { position: [3, 0, -2], rotation: -Math.PI / 2, approach: { ...CORRIDOR_POSE, z: -2, yaw: -Math.PI / 2 }, inside: { x: 4.2, y: 1.7, z: -2, yaw: -Math.PI / 2, pitch: 0 } },
    elemental: { position: [-1.5, 0, -11], rotation: 0, approach: { ...CORRIDOR_POSE, x: -1.5, z: -9 }, inside: ROOM_POSES.elemental },
    treasure: { position: [1.5, 0, -11], rotation: 0, approach: { ...CORRIDOR_POSE, x: 1.5, z: -9 }, inside: ROOM_POSES.treasure },
};

export const COPY = {
    zh: { clubhouse: '游戏会馆', push: '轻推门，走进来', explore: '上下滑动前行 · 左右滑动环顾 · 触碰房门进入', objects: '滑动环顾 · 触碰桌面物件打开', back: '返回走廊', loading: '正在打开房间…', exit: '出口', board: '棋类对弈', arcade: '休闲街机', puzzle: '益智解谜', focus: '专注训练', bingo: 'Bingo 游戏', close: '收起', select: '选择游戏', enter: '推开会馆大门', roomEntry: '进入', workshop: '工具工坊', note: '简单 · 实用 · 随手打开', ready: '会馆已就绪' },
    en: { clubhouse: 'Game clubhouse', push: 'Push the door. Step inside.', explore: 'Swipe up to walk · Swipe sideways to look · Touch a door', objects: 'Look around · Touch an object to open it', back: 'Back to corridor', loading: 'Opening the room…', exit: 'EXIT', board: 'Board games', arcade: 'Arcade', puzzle: 'Puzzles', focus: 'Focus training', bingo: 'Bingo', close: 'Close', select: 'Choose a game', enter: 'Push the clubhouse doors', roomEntry: 'Enter', workshop: 'Tool workshop', note: 'Simple tools. Thoughtfully made.', ready: 'Clubhouse ready' },
    th: { clubhouse: 'คลับเกม', push: 'ผลักประตู แล้วก้าวเข้ามา', explore: 'ปัดขึ้นเพื่อเดิน · ปัดด้านข้างเพื่อมอง · แตะประตู', objects: 'ปัดเพื่อมองรอบห้อง · แตะสิ่งของเพื่อเปิด', back: 'กลับไปทางเดิน', loading: 'กำลังเปิดห้อง…', exit: 'ทางออก', board: 'เกมกระดาน', arcade: 'อาร์เคด', puzzle: 'ปริศนา', focus: 'ฝึกสมาธิ', bingo: 'บิงโก', close: 'ปิด', select: 'เลือกเกม', enter: 'ผลักประตูคลับเกม', roomEntry: 'เข้า', workshop: 'ห้องเครื่องมือ', note: 'เรียบง่าย ใช้งานสะดวก', ready: 'คลับเกมพร้อมแล้ว' },
};

export function readSnapshot() {
    try {
        const value = JSON.parse(sessionStorage.getItem(CLUBHOUSE_SESSION_KEY));
        if (isClubhouseSnapshot(value)) return { ...value, pose: clampPose(value.pose, value.place), returnPose: clampPose(value.returnPose, 'corridor') };
    } catch { /* Storage may be unavailable in private browsing. */ }
    return { version: 1, place: 'entrance', pose: { ...ENTRANCE_POSE }, returnPose: { ...CORRIDOR_POSE } };
}

export function saveSnapshot(snapshot) {
    try { sessionStorage.setItem(CLUBHOUSE_SESSION_KEY, JSON.stringify(snapshot)); } catch { /* Nonessential persistence. */ }
}

export function clampPose(pose, place) {
    const result = { ...pose, pitch: Math.max(-0.65, Math.min(0.65, pose.pitch)) };
    result.yaw = ((pose.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    if (place === 'corridor') {
        result.x = Math.max(-1.9, Math.min(1.9, pose.x));
        result.z = Math.max(-9.2, Math.min(2.4, pose.z));
    }
    // Room exploration pivots from a clear aisle, never through furniture.
    if (place === 'gallery' || place === 'contact') {
        result.x = ROOM_POSES[place].x;
        result.z = ROOM_POSES[place].z;
    }
    return result;
}

export function pushProgress(startY, y, height) {
    return Math.max(0, Math.min(1, (startY - y) / Math.max(80, height * 0.17)));
}

export function initialDoors(place) {
    return place === 'entrance' ? { entrance: 0 } : { entrance: 1, [place]: 1 };
}
