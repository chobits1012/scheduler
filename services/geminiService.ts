import { GoogleGenAI } from "@google/genai";
import { Shift, Job } from "../types";

const API_KEY = process.env.API_KEY || '';

// Safely initialize AI only if key exists, though we assume environment is valid per instructions.
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateAvailabilityMessage = async (
  job: Job,
  shifts: Shift[],
  monthName: string
): Promise<string> => {
  if (!shifts.length) {
    return "目前沒有安排任何班表。";
  }

  // Sort shifts by date
  const sortedShifts = [...shifts].sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  const scheduleText = sortedShifts.map(s =>
    `- ${s.dateStr} (${new Date(s.dateStr).toLocaleDateString('zh-TW', { weekday: 'short' })}): ${s.startTime} - ${s.endTime} ${s.note ? `(${s.note})` : ''}`
  ).join('\n');

  const prompt = `
    你是一位專業的排班助手。使用者需要將他們在 ${monthName} 的可排班時間或已排定班表發送給店長/經理。
    
    職位/工作地點: ${job.name}
    主管稱呼 (若有): ${job.managerName || '店長'}
    
    班表資料如下:
    ${scheduleText}
    
    請撰寫一則禮貌、專業且簡潔的訊息（適合 LINE 或 Email），告知主管這是我的排班時間。
    請保留上述的日期與時間列表，並確保格式清晰易讀。語氣要親切但不失專業。
    
    請直接回傳訊息內容，不要包含其他解釋文字。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    return response.text || "無法產生訊息，請稍後再試。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "發生錯誤，無法連接至 AI 服務。";
  }
};
