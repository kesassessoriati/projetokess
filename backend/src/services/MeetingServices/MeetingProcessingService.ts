import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { exec } from "child_process";
import { promisify } from "util";
import Meeting from "../../models/Meeting";
import Setting from "../../models/Setting";
import logger from "../../utils/logger";

const execAsync = promisify(exec);

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

async function extractAudio(companyId: number, videoFilename: string): Promise<string> {
  const videoPath = path.join(publicFolder, `company${companyId}`, "meetings", videoFilename);
  const audioFilename = videoFilename.replace(/\.[^.]+$/, ".wav");
  const audioPath = path.join(publicFolder, `company${companyId}`, "meetings", audioFilename);

  await execAsync(
    `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`
  );

  return audioFilename;
}

async function transcribeAudio(companyId: number, audioFilename: string): Promise<string> {
  const whisperUrl = process.env.WHISPER_API_URL || "http://whisper-api:8000";
  const audioPath = path.join(publicFolder, `company${companyId}`, "meetings", audioFilename);

  // fedirz/faster-whisper-server uses OpenAI-compatible API
  const form = new FormData();
  form.append("file", fs.createReadStream(audioPath), {
    filename: audioFilename,
    contentType: "audio/wav"
  });
  form.append("model", process.env.WHISPER_MODEL || "small");
  form.append("language", "pt");

  const response = await axios.post(`${whisperUrl}/v1/audio/transcriptions`, form, {
    headers: form.getHeaders(),
    timeout: 600000
  });

  return response.data.text as string;
}

async function generateInsights(companyId: number, transcription: string): Promise<Record<string, any>> {
  const apiKeySetting = await Setting.findOne({
    where: { companyId, key: "openaiApiKey" }
  });

  const apiKey = apiKeySetting?.value || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    logger.warn(`[MeetingProcessing] No OpenAI key for company ${companyId}, skipping insights`);
    return {};
  }

  const prompt = `Você é um assistente de CRM especializado em análise de reuniões de vendas.
Analise a transcrição abaixo e retorne um JSON com exatamente esta estrutura:
{
  "resumo": "resumo executivo em 2-3 frases",
  "objecoes": ["lista de objeções levantadas pelo cliente"],
  "sugestoes": ["lista de sugestões de próximos passos ou respostas"],
  "nivel_interesse": número de 0 a 10 indicando interesse do lead,
  "palavras_chave": ["termos relevantes mencionados"]
}

Transcrição:
${transcription.slice(0, 6000)}`;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1000
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    }
  );

  try {
    return JSON.parse(response.data.choices[0].message.content);
  } catch {
    return { resumo: response.data.choices[0].message.content };
  }
}

export async function processMeeting(meetingId: number, companyId: number): Promise<void> {
  const meeting = await Meeting.findOne({ where: { id: meetingId, companyId } });

  if (!meeting) {
    logger.error(`[MeetingProcessing] Meeting ${meetingId} not found`);
    return;
  }

  if (!meeting.videoFilename) {
    await meeting.update({ status: "failed", errorMessage: "Arquivo de vídeo não encontrado" });
    return;
  }

  await meeting.update({ status: "processing" });

  try {
    // 1. Extract audio
    logger.info(`[MeetingProcessing] Extracting audio for meeting ${meetingId}`);
    const audioFilename = await extractAudio(companyId, meeting.videoFilename);
    await meeting.update({ audioFilename });

    // 2. Transcribe
    logger.info(`[MeetingProcessing] Transcribing meeting ${meetingId}`);
    const transcription = await transcribeAudio(companyId, audioFilename);

    // 3. Generate insights
    logger.info(`[MeetingProcessing] Generating insights for meeting ${meetingId}`);
    const insights = await generateInsights(companyId, transcription);

    // 4. Cleanup temp audio file
    const audioPath = path.join(publicFolder, `company${companyId}`, "meetings", audioFilename);
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }

    await meeting.update({
      status: "completed",
      transcription,
      insights,
      audioFilename: null
    });

    logger.info(`[MeetingProcessing] Meeting ${meetingId} processed successfully`);
  } catch (err: any) {
    logger.error(`[MeetingProcessing] Error processing meeting ${meetingId}: ${err.message}`);
    await meeting.update({
      status: "failed",
      errorMessage: err.message?.slice(0, 500)
    });
  }
}
