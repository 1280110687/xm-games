import type { Locale } from "./i18n"

export type OfflineToolCopy = {
  common: {
    back: string
    localOnly: string
    localDescription: string
    input: string
    output: string
    actions: string
    clear: string
    copy: string
    copied: string
    useAsInput: string
    inputRequired: string
    copyFailed: string
  }
  json: {
    eyebrow: string
    title: string
    description: string
    inputPlaceholder: string
    outputPlaceholder: string
    format: string
    minify: string
    validate: string
    valid: string
    formatted: string
    minified: string
    structure: string
    structureDescription: string
    syntaxError: string
  }
  base64: {
    eyebrow: string
    title: string
    description: string
    inputPlaceholder: string
    encodedPlaceholder: string
    decodedPlaceholder: string
    encode: string
    decode: string
    encoded: string
    decoded: string
    utf8: string
    utf8Description: string
    invalid: string
  }
  text: {
    eyebrow: string
    title: string
    description: string
    inputPlaceholder: string
    outputPlaceholder: string
    characters: string
    nonWhitespace: string
    words: string
    lines: string
    trimLines: string
    collapseBlankLines: string
    deduplicateLines: string
    cleanAll: string
    analyzed: string
    cleaned: string
    rules: string
    rulesDescription: string
  }
}

export const OFFLINE_TOOL_COPY: Record<Locale, OfflineToolCopy> = {
  zh: {
    common: {
      back: "返回首页",
      localOnly: "仅在本机处理",
      localDescription: "不上传、不保存输入内容，断网时仍可使用。",
      input: "输入内容",
      output: "处理结果",
      actions: "处理方式",
      clear: "清空",
      copy: "复制结果",
      copied: "已复制",
      useAsInput: "作为下一步输入",
      inputRequired: "请先输入需要处理的内容。",
      copyFailed: "复制失败，请手动选择结果复制。",
    },
    json: {
      eyebrow: "离线开发工具",
      title: "JSON 工具",
      description: "格式化、压缩并校验 JSON 数据，错误会直接显示在页面中。",
      inputPlaceholder: "粘贴 JSON 数据，例如 {\"name\":\"XM-Games\"}…",
      outputPlaceholder: "格式化或压缩后的 JSON 会显示在这里",
      format: "格式化",
      minify: "压缩",
      validate: "仅校验",
      valid: "JSON 语法有效",
      formatted: "已按 2 个空格格式化",
      minified: "已移除多余空白",
      structure: "标准 JSON",
      structureDescription: "严格解析对象、数组、字符串、数字、布尔值和 null。",
      syntaxError: "JSON 语法错误",
    },
    base64: {
      eyebrow: "离线编码工具",
      title: "Base64 编解码",
      description: "在 UTF-8 文本与标准 Base64 之间转换，支持中文、泰文和 Emoji。",
      inputPlaceholder: "输入需要编码的文字…",
      encodedPlaceholder: "粘贴需要解码的 Base64 内容…",
      decodedPlaceholder: "转换结果会显示在这里",
      encode: "编码",
      decode: "解码",
      encoded: "Base64 编码完成",
      decoded: "UTF-8 解码完成",
      utf8: "UTF-8 兼容",
      utf8Description: "多语言与 Emoji 会先按 UTF-8 字节安全转换。",
      invalid: "Base64 内容无效或不是合法的 UTF-8 文本。",
    },
    text: {
      eyebrow: "离线文案工具",
      title: "文本整理与统计",
      description: "统计字符、单词与行数，并清理空白行或重复内容。",
      inputPlaceholder: "输入文案、名单、备注或多行文本…",
      outputPlaceholder: "选择一种整理方式后，结果会显示在这里",
      characters: "字符",
      nonWhitespace: "非空白字符",
      words: "单词",
      lines: "行数",
      trimLines: "修剪每行",
      collapseBlankLines: "压缩空行",
      deduplicateLines: "去重行",
      cleanAll: "全部整理",
      analyzed: "实时统计",
      cleaned: "文本整理完成",
      rules: "保留原意",
      rulesDescription: "不改写文案，只处理行首尾空白、连续空行和重复行。",
    },
  },
  en: {
    common: {
      back: "Back to home",
      localOnly: "Processed on this device",
      localDescription: "Nothing is uploaded or saved, and the tool works offline.",
      input: "Input",
      output: "Result",
      actions: "Actions",
      clear: "Clear",
      copy: "Copy result",
      copied: "Copied",
      useAsInput: "Use as next input",
      inputRequired: "Enter some content first.",
      copyFailed: "Copy failed. Select and copy the result manually.",
    },
    json: {
      eyebrow: "Offline developer tool",
      title: "JSON Tool",
      description: "Format, minify, and validate JSON with readable inline errors.",
      inputPlaceholder: "Paste JSON, for example {\"name\":\"XM-Games\"}…",
      outputPlaceholder: "Formatted or minified JSON will appear here",
      format: "Format",
      minify: "Minify",
      validate: "Validate only",
      valid: "JSON syntax is valid",
      formatted: "Formatted with 2-space indentation",
      minified: "Extra whitespace removed",
      structure: "Strict JSON",
      structureDescription: "Parses objects, arrays, strings, numbers, booleans, and null.",
      syntaxError: "JSON syntax error",
    },
    base64: {
      eyebrow: "Offline encoding tool",
      title: "Base64 Codec",
      description: "Convert between UTF-8 text and standard Base64, including multilingual text and Emoji.",
      inputPlaceholder: "Enter text to encode…",
      encodedPlaceholder: "Paste Base64 content to decode…",
      decodedPlaceholder: "The converted result will appear here",
      encode: "Encode",
      decode: "Decode",
      encoded: "Base64 encoding complete",
      decoded: "UTF-8 decoding complete",
      utf8: "UTF-8 safe",
      utf8Description: "Multilingual text and Emoji are converted through UTF-8 bytes.",
      invalid: "The Base64 input is invalid or does not contain valid UTF-8 text.",
    },
    text: {
      eyebrow: "Offline writing tool",
      title: "Text Cleanup & Stats",
      description: "Count characters, words, and lines, then clean blank or repeated lines.",
      inputPlaceholder: "Enter copy, a list, notes, or multiline text…",
      outputPlaceholder: "Choose a cleanup action to see the result",
      characters: "Characters",
      nonWhitespace: "Non-space",
      words: "Words",
      lines: "Lines",
      trimLines: "Trim lines",
      collapseBlankLines: "Collapse blanks",
      deduplicateLines: "Remove duplicates",
      cleanAll: "Clean all",
      analyzed: "Live statistics",
      cleaned: "Text cleanup complete",
      rules: "Meaning preserved",
      rulesDescription: "Only line edges, repeated blank lines, and duplicate lines are changed.",
    },
  },
  th: {
    common: {
      back: "กลับหน้าหลัก",
      localOnly: "ประมวลผลบนอุปกรณ์นี้",
      localDescription: "ไม่อัปโหลดหรือบันทึกข้อมูล และใช้งานแบบออฟไลน์ได้",
      input: "ข้อมูลต้นฉบับ",
      output: "ผลลัพธ์",
      actions: "คำสั่ง",
      clear: "ล้าง",
      copy: "คัดลอกผลลัพธ์",
      copied: "คัดลอกแล้ว",
      useAsInput: "ใช้เป็นข้อมูลขั้นถัดไป",
      inputRequired: "กรุณาใส่ข้อมูลก่อน",
      copyFailed: "คัดลอกไม่สำเร็จ โปรดเลือกและคัดลอกผลลัพธ์ด้วยตนเอง",
    },
    json: {
      eyebrow: "เครื่องมือนักพัฒนาออฟไลน์",
      title: "เครื่องมือ JSON",
      description: "จัดรูปแบบ ย่อ และตรวจสอบ JSON พร้อมแสดงข้อผิดพลาดในหน้าเดียว",
      inputPlaceholder: "วาง JSON เช่น {\"name\":\"XM-Games\"}…",
      outputPlaceholder: "JSON ที่จัดรูปแบบหรือย่อแล้วจะแสดงที่นี่",
      format: "จัดรูปแบบ",
      minify: "ย่อ",
      validate: "ตรวจสอบเท่านั้น",
      valid: "ไวยากรณ์ JSON ถูกต้อง",
      formatted: "จัดรูปแบบด้วยการเยื้อง 2 ช่องแล้ว",
      minified: "ลบช่องว่างส่วนเกินแล้ว",
      structure: "JSON มาตรฐาน",
      structureDescription: "ตรวจสอบออบเจ็กต์ อาร์เรย์ สตริง ตัวเลข บูลีน และ null อย่างเข้มงวด",
      syntaxError: "ไวยากรณ์ JSON ไม่ถูกต้อง",
    },
    base64: {
      eyebrow: "เครื่องมือเข้ารหัสออฟไลน์",
      title: "แปลง Base64",
      description: "แปลงระหว่างข้อความ UTF-8 และ Base64 รองรับหลายภาษาและ Emoji",
      inputPlaceholder: "ใส่ข้อความที่ต้องการเข้ารหัส…",
      encodedPlaceholder: "วาง Base64 ที่ต้องการถอดรหัส…",
      decodedPlaceholder: "ผลลัพธ์จะแสดงที่นี่",
      encode: "เข้ารหัส",
      decode: "ถอดรหัส",
      encoded: "เข้ารหัส Base64 แล้ว",
      decoded: "ถอดรหัส UTF-8 แล้ว",
      utf8: "รองรับ UTF-8",
      utf8Description: "ข้อความหลายภาษาและ Emoji จะถูกแปลงผ่านไบต์ UTF-8 อย่างปลอดภัย",
      invalid: "Base64 ไม่ถูกต้องหรือไม่ใช่ข้อความ UTF-8 ที่สมบูรณ์",
    },
    text: {
      eyebrow: "เครื่องมือข้อความออฟไลน์",
      title: "จัดระเบียบและนับข้อความ",
      description: "นับตัวอักษร คำ และบรรทัด พร้อมล้างบรรทัดว่างหรือข้อมูลซ้ำ",
      inputPlaceholder: "ใส่ข้อความ รายการ บันทึก หรือข้อความหลายบรรทัด…",
      outputPlaceholder: "เลือกวิธีจัดระเบียบเพื่อดูผลลัพธ์",
      characters: "ตัวอักษร",
      nonWhitespace: "ไม่รวมช่องว่าง",
      words: "คำ",
      lines: "บรรทัด",
      trimLines: "ตัดขอบแต่ละบรรทัด",
      collapseBlankLines: "ลดบรรทัดว่าง",
      deduplicateLines: "ลบบรรทัดซ้ำ",
      cleanAll: "จัดระเบียบทั้งหมด",
      analyzed: "สถิติแบบเรียลไทม์",
      cleaned: "จัดระเบียบข้อความแล้ว",
      rules: "คงความหมายเดิม",
      rulesDescription: "เปลี่ยนเฉพาะช่องว่างขอบบรรทัด บรรทัดว่างต่อเนื่อง และบรรทัดซ้ำ",
    },
  },
}
