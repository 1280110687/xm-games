import type { Locale } from "../../../lib/i18n"
import type { TransferErrorCode } from "./model"

interface TransferCopy {
  title: string
  description: string
  send: string
  receive: string
  privacy: string
  generate: string
  empty: string
  offline: string
  code: string
  copy: string
  copied: string
  copyFailed: string
  expires: string
  expired: string
  scan: string
  preview: string
  incoming: string
  local: string
  added: string
  duplicate: string
  conflict: string
  keep: string
  replace: string
  both: string
  ambiguous: string
  confirm: string
  refresh: string
  pending: string
  retry: string
  success: string
  backup: string
  noBackup: string
  close: string
  busy: string
  records: string
  protected: string
  progress: string
  rating: string
  notes: string
  sourceUnchanged: string
  previewHint: string
  sameDevice: string
  restart: string
  errors: Record<TransferErrorCode, string>
}

export const TRANSFER_COPY: Record<Locale, TransferCopy> = {
  zh: {
    title: "跨设备拷贝",
    description: "用临时短码复制追剧清单，不是自动同步。",
    send: "发送到其他设备",
    receive: "从其他设备接收",
    privacy:
      "点击生成后，清单、进度、评分、备注和封面链接会临时上传到本应用的 Upstash Redis，最多保留 10 分钟。不会上传封面图片缓存。持有码的人可以领取，请勿公开分享。",
    generate: "生成传输码",
    empty: "还没有可以发送的追剧记录。",
    offline: "传输需要联网；本机追剧记录仍可离线使用。",
    code: "10 位字母传输码",
    copy: "复制传输码",
    copied: "已复制",
    copyFailed: "无法自动复制，请长按选中传输码复制。",
    expires: "有效至",
    expired: "传输码已到期，请重新生成。",
    scan: "用另一台设备的相机扫码，或输入传输码。要导入已安装的 PWA，请直接在该 PWA 内输入短码，避免导入到浏览器的独立存储。",
    preview: "领取并预览",
    incoming: "收到的记录",
    local: "本机记录",
    added: "新增",
    duplicate: "已存在",
    conflict: "待处理",
    keep: "保留本机记录",
    replace: "使用收到的记录",
    both: "两条都保留",
    ambiguous: "记录匹配存在歧义，不会自动替换。可保留本机记录或两条都保留。",
    confirm: "备份并导入",
    refresh: "重新检查本机数据",
    pending:
      "记录已保存到本机，但云端完成确认尚未成功。请重试确认；不会重复导入。",
    retry: "重试完成确认",
    success: "导入完成，传输码已失效。",
    backup: "下载导入前备份",
    noBackup: "没有可下载的导入备份。",
    close: "关闭",
    busy: "处理中…",
    records: "条记录",
    protected: "本机存储受保护或不可用，暂不能导入。请先处理存储提示。",
    progress: "进度",
    rating: "评分",
    notes: "备注",
    sourceUnchanged: "原设备数据保留不变。",
    previewHint:
      "默认保留本机冲突记录，可逐条修改。此码已锁定到当前接收标签页；到期前可在此重试。",
    sameDevice: "请在另一台设备领取，这里是发送端。",
    restart: "接收另一份清单",
    errors: {
      INVALID_DATA: "数据格式不受支持或记录不完整，没有导入任何内容。",
      TOO_LARGE: "单次最多 500 条记录、512 KB，请减少记录或过长备注。",
      INVALID_CODE: "请输入完整的 10 位字母传输码。",
      NOT_FOUND: "传输码不存在、已到期或已完成领取。",
      CLAIMED: "此码已被另一接收设备锁定，请在该设备继续，或从原设备重新生成。",
      RATE_LIMITED: "请求过于频繁或传输空间暂满，请 10 分钟后再试。",
      UNAVAILABLE: "传输服务暂不可用，本机数据不受影响。",
      NETWORK: "网络请求未完成，请重试；本机和原设备数据不会被删除。",
      LOCAL_CHANGED: "预览后本机记录发生变化，请重新检查后再导入。",
      STORAGE_FAILED: "本机保存失败，尚未确认领取；请释放存储空间后重试。",
      BACKUP_FAILED: "无法保存导入前备份，已停止导入。",
      FORBIDDEN: "请从本应用的正式页面发起传输。",
    },
  },
  en: {
    title: "Copy across devices",
    description:
      "Move a watchlist with a temporary code. This is not automatic sync.",
    send: "Send to another device",
    receive: "Receive from a device",
    privacy:
      "Generating a code temporarily uploads your list, progress, ratings, notes and cover links to this app's Upstash Redis for up to 10 minutes. Cached cover images are not uploaded. Anyone with the code may claim it; keep it private.",
    generate: "Generate transfer code",
    empty: "There are no records to send.",
    offline:
      "Transfers need a connection. Your local watchlist still works offline.",
    code: "10-letter transfer code",
    copy: "Copy code",
    copied: "Copied",
    copyFailed: "Automatic copying failed. Select and copy the code manually.",
    expires: "Expires at",
    expired: "This code expired. Generate a new one.",
    scan: "Scan with the other device's camera, or enter the code. To import into an installed PWA, enter the code inside that PWA to avoid importing into separate browser storage.",
    preview: "Claim and preview",
    incoming: "Incoming record",
    local: "Local record",
    added: "New",
    duplicate: "Existing",
    conflict: "Conflicts",
    keep: "Keep local",
    replace: "Use incoming",
    both: "Keep both",
    ambiguous:
      "The match is ambiguous. Keep local records or keep both; nothing will be replaced automatically.",
    confirm: "Back up and import",
    refresh: "Recheck local records",
    pending:
      "Saved locally, but the server has not confirmed completion. Retry confirmation; records will not be imported twice.",
    retry: "Retry confirmation",
    success: "Import complete. The transfer code is no longer valid.",
    backup: "Download pre-import backup",
    noBackup: "There is no import backup to download.",
    close: "Close",
    busy: "Working…",
    records: "records",
    protected:
      "Local storage is protected or unavailable. Resolve the storage warning before importing.",
    progress: "Progress",
    rating: "Rating",
    notes: "Notes",
    sourceUnchanged: "Records on the sending device stay unchanged.",
    previewHint:
      "Conflicts keep the local record unless you choose otherwise. This code is locked to this receiving tab; you can retry here until it expires.",
    sameDevice: "Receive on another device. This is the sending device.",
    restart: "Receive another watchlist",
    errors: {
      INVALID_DATA: "Unsupported or incomplete data. Nothing was imported.",
      TOO_LARGE:
        "Transfers support up to 500 records and 512 KB. Reduce records or long notes.",
      INVALID_CODE: "Enter the complete 10-letter code.",
      NOT_FOUND:
        "The code does not exist, expired, or has already been received.",
      CLAIMED:
        "Another receiver has locked this code. Continue there or generate a new code on the sending device.",
      RATE_LIMITED: "Too many requests or transfers. Try again in 10 minutes.",
      UNAVAILABLE:
        "Transfer service is unavailable. Local records are unaffected.",
      NETWORK:
        "The request did not complete. Retry; local and source records are not deleted.",
      LOCAL_CHANGED:
        "Local records changed after preview. Recheck before importing.",
      STORAGE_FAILED:
        "Local saving failed; receipt was not confirmed. Free storage and retry.",
      BACKUP_FAILED: "The backup could not be saved. Import was stopped.",
      FORBIDDEN: "Start the transfer from this app's official page.",
    },
  },
  th: {
    title: "คัดลอกข้ามอุปกรณ์",
    description: "คัดลอกรายการด้วยรหัสชั่วคราว ไม่ใช่การซิงค์อัตโนมัติ",
    send: "ส่งไปอีกอุปกรณ์",
    receive: "รับจากอีกอุปกรณ์",
    privacy:
      "เมื่อสร้างรหัส รายการ ความคืบหน้า คะแนน บันทึกและลิงก์ภาพปกจะถูกส่งไปยัง Upstash Redis ของแอปชั่วคราวไม่เกิน 10 นาที ไม่ส่งไฟล์ภาพที่แคชไว้ ผู้ที่มีรหัสสามารถรับข้อมูลได้ โปรดเก็บรหัสเป็นส่วนตัว",
    generate: "สร้างรหัสส่งข้อมูล",
    empty: "ยังไม่มีรายการที่จะส่ง",
    offline: "การส่งข้อมูลต้องใช้อินเทอร์เน็ต รายการในเครื่องยังใช้ออฟไลน์ได้",
    code: "รหัสตัวอักษร 10 ตัว",
    copy: "คัดลอกรหัส",
    copied: "คัดลอกแล้ว",
    copyFailed: "คัดลอกอัตโนมัติไม่ได้ โปรดเลือกรหัสและคัดลอกเอง",
    expires: "หมดอายุเวลา",
    expired: "รหัสหมดอายุแล้ว โปรดสร้างใหม่",
    scan: "สแกนด้วยกล้องของอีกอุปกรณ์ หรือกรอกรหัส หากต้องการนำเข้าใน PWA ที่ติดตั้งไว้ ให้กรอกรหัสใน PWA นั้นโดยตรง เพื่อไม่ให้ข้อมูลไปอยู่ในพื้นที่เก็บข้อมูลแยกของเบราว์เซอร์",
    preview: "รับและตรวจสอบ",
    incoming: "รายการที่ได้รับ",
    local: "รายการในเครื่อง",
    added: "รายการใหม่",
    duplicate: "มีแล้ว",
    conflict: "ข้อมูลขัดแย้ง",
    keep: "เก็บข้อมูลในเครื่อง",
    replace: "ใช้ข้อมูลที่ได้รับ",
    both: "เก็บทั้งสองรายการ",
    ambiguous:
      "การจับคู่ไม่ชัดเจน เลือกเก็บข้อมูลในเครื่องหรือเก็บทั้งสองรายการ จะไม่แทนที่โดยอัตโนมัติ",
    confirm: "สำรองและนำเข้า",
    refresh: "ตรวจสอบข้อมูลในเครื่องใหม่",
    pending:
      "บันทึกในเครื่องแล้ว แต่ยังยืนยันกับเซิร์ฟเวอร์ไม่สำเร็จ ลองยืนยันใหม่โดยไม่นำเข้าซ้ำ",
    retry: "ลองยืนยันอีกครั้ง",
    success: "นำเข้าสำเร็จ รหัสใช้งานไม่ได้แล้ว",
    backup: "ดาวน์โหลดข้อมูลสำรองก่อนนำเข้า",
    noBackup: "ไม่มีข้อมูลสำรองให้ดาวน์โหลด",
    close: "ปิด",
    busy: "กำลังดำเนินการ…",
    records: "รายการ",
    protected:
      "พื้นที่เก็บข้อมูลถูกป้องกันหรือใช้งานไม่ได้ โปรดแก้ปัญหาก่อนนำเข้า",
    progress: "ความคืบหน้า",
    rating: "คะแนน",
    notes: "บันทึก",
    sourceUnchanged: "ข้อมูลบนอุปกรณ์ต้นทางไม่เปลี่ยนแปลง",
    previewHint:
      "ข้อมูลขัดแย้งจะเก็บข้อมูลในเครื่องไว้ก่อน คุณเลือกเปลี่ยนทีละรายการได้ รหัสถูกล็อกกับแท็บรับนี้ สามารถลองใหม่ก่อนหมดอายุ",
    sameDevice: "โปรดรับบนอีกอุปกรณ์ อุปกรณ์นี้เป็นผู้ส่ง",
    restart: "รับรายการอื่น",
    errors: {
      INVALID_DATA: "รูปแบบข้อมูลไม่รองรับหรือไม่ครบถ้วน ยังไม่ได้นำเข้า",
      TOO_LARGE:
        "ส่งได้สูงสุด 500 รายการ และ 512 KB โปรดลดรายการหรือบันทึกที่ยาว",
      INVALID_CODE: "กรอกรหัสตัวอักษรให้ครบ 10 ตัว",
      NOT_FOUND: "ไม่พบรหัส รหัสหมดอายุ หรือรับข้อมูลแล้ว",
      CLAIMED:
        "รหัสถูกล็อกโดยอุปกรณ์รับอื่น โปรดใช้เครื่องนั้นหรือสร้างรหัสใหม่ที่ต้นทาง",
      RATE_LIMITED: "คำขอมากเกินไปหรือพื้นที่ส่งข้อมูลเต็ม ลองใหม่ใน 10 นาที",
      UNAVAILABLE: "บริการส่งข้อมูลไม่พร้อม ข้อมูลในเครื่องไม่เสียหาย",
      NETWORK: "คำขอยังไม่เสร็จ โปรดลองใหม่ ข้อมูลในเครื่องและต้นทางไม่ถูกลบ",
      LOCAL_CHANGED:
        "ข้อมูลในเครื่องเปลี่ยนหลังตรวจสอบ โปรดตรวจสอบใหม่ก่อนนำเข้า",
      STORAGE_FAILED:
        "บันทึกในเครื่องไม่สำเร็จ ยังไม่ยืนยันการรับ โปรดเพิ่มพื้นที่แล้วลองใหม่",
      BACKUP_FAILED: "บันทึกข้อมูลสำรองไม่ได้ หยุดการนำเข้าแล้ว",
      FORBIDDEN: "โปรดเริ่มส่งข้อมูลจากหน้าแอปโดยตรง",
    },
  },
}
