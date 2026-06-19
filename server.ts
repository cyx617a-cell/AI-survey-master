import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

// Initialize express app
const app = express();
app.use(express.json());

const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "db.json");

// Define basic Types and Schemas
interface User {
  id: string; // Login ID
  pin: string; // PIN (password)
  role: "admin" | "editor";
  createdSurveys: string[];
}

interface SurveyItem {
  id: string;
  type: "section" | "short" | "paragraph" | "choice";
  title: string;
  description?: string;
  required: boolean;
  choices?: string[]; // for choice type
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  ownerId: string; // ID of creator
  editors: string[]; // sub-accounts authorized to edit/view results
  items: SurveyItem[];
  createdAt: string;
}

interface Submission {
  id: string;
  surveyId: string;
  answers: Record<string, string>; // questionId -> response value
  submittedAt: string;
}

interface DbData {
  users: User[];
  surveys: Survey[];
  submissions: Submission[];
}

// Default DB Initialization
const DEFAULT_DB: DbData = {
  users: [
    { id: "admin", pin: "**cho20130617", role: "admin", createdSurveys: [] },
    { id: "teacher1", pin: "1234", role: "editor", createdSurveys: ["gym-day"] },
    { id: "teacher2", pin: "1234", role: "editor", createdSurveys: [] },
  ],
  surveys: [
    {
      id: "gym-day",
      title: "우리 반 체육대회 종목 정하기",
      description: "이번 학기 학급 체육대회에서 참여할 메인 종목과 세부 규칙, 아이디어를 자유롭게 제안해주세요!",
      ownerId: "admin",
      editors: ["teacher1"],
      createdAt: new Date("2026-06-18T10:00:00Z").toISOString(),
      items: [
        {
          id: "sec-1",
          type: "section",
          title: "본 종목 신청",
          description: "체육대회 대표 메인 경기 종목을 골라주세요.",
          required: false
        },
        {
          id: "q-name",
          type: "short",
          title: "이름 또는 학번",
          description: "답변 확인을 위해 성함 또는 학번(예: 3학년 1반 15번)을 입력해주세요.",
          required: true
        },
        {
          id: "q-main",
          type: "choice",
          title: "가장 참여하고 싶은 체육대회 메인 종목은 무엇인가요?",
          required: true,
          choices: ["피구 (Dodgeball)", "남자 축구 / 여자 발야구", "혼성 단체 피구 및 계주", "보물찾기 및 미니게임"]
        },
        {
          id: "sec-2",
          type: "section",
          title: "상세 의견 제안",
          description: "대표 규칙 및 서술형 제안 사항입니다.",
          required: false
        },
        {
          id: "q-rules",
          type: "paragraph",
          title: "체육대회 대표 종목이나 세부 규칙에 대해 특별히 추가하고 싶은 조항이 있다면 자유롭게 제안해주세요.",
          description: "예: 피구할 때 아웃된 사람도 부활할 수 있게 구석에 부활 대기존 운영 등",
          required: false
        },
        {
          id: "q-slang-test",
          type: "paragraph",
          title: "반별 응원전이나 미니게임으로 진행하면 재미있을 것 같은 서브 이벤트를 제안해주세요.",
          description: "아이디어를 마음껏 작문해주세요.",
          required: false
        }
      ]
    }
  ],
  submissions: [
    {
      id: "sub-1",
      surveyId: "gym-day",
      answers: {
        "q-name": "김민우",
        "q-main": "남자 축구 / 여자 발야구",
        "q-rules": "축구 경기 시간이 너무 짧으면 재미없으니 전후반 최소 15분씩 했으면 좋겠습니다. 그리고 부심도 확실하게 정해주세요.",
        "q-slang-test": "축구할 때 선생님들이 개빡치게 오심하지 않도록 기구 비디오 판독(VAR) 같은 거 장난식으로 폰카메라로 하면 존나 재밌을 것 같습니다 ㅋㅋㅋ"
      },
      submittedAt: new Date("2026-06-18T12:05:00Z").toISOString()
    },
    {
      id: "sub-2",
      surveyId: "gym-day",
      answers: {
        "q-name": "이서연",
        "q-main": "피구 (Dodgeball)",
        "q-rules": "피구할 때 공을 두 개 쓰고 한 번에 아웃 안 되고 두 번 맞아야 아웃되는 '라이프형 피구' 규칙을 제안합니다. 한 번 맞고 나가면 너무 슬퍼요.",
        "q-slang-test": "피구 대기존에서 아웃된 사람들이 피구장 밖에서 수박 화채나 음료수 마시면서 응원하면 존나 행복할 것 같아요. 먹을 게 최고임!"
      },
      submittedAt: new Date("2026-06-18T13:22:00Z").toISOString()
    },
    {
      id: "sub-3",
      surveyId: "gym-day",
      answers: {
        "q-name": "박준형",
        "q-main": "남자 축구 / 여자 발야구",
        "q-rules": "발야구할 때 홈런 치면 점수 2배 가점 조항을 넣으면 여자애들도 진짜 풀파워로 차고 다이나믹하고 꿀잼일 것 같습니다.",
        "q-slang-test": "체육대회 끝나고 뒷정리 개빡센데, 뒷정리 가장 잘하고 쓰레기 분리수거 잘해낸 반한테 가산점 주는 클린왕 종목도 미니게임으로 넣읍시다."
      },
      submittedAt: new Date("2026-06-18T14:40:00Z").toISOString()
    },
    {
      id: "sub-4",
      surveyId: "gym-day",
      answers: {
        "q-name": "정예은",
        "q-main": "보물찾기 및 미니게임",
        "q-rules": "보물찾기 할 때 쓰레기통 옆이나 위험한 데다가는 보물 쪽지 숨기지 않았으면 좋겠습니다. 다칠 수 있어서 위험해요.",
        "q-slang-test": "솔직히 보물찾기 쪽지 아무도 못 찾는 곳에 숨기면 개노잼 극혐입니다. 애들 골탕 먹이려고 쓰레기장에다 넣어두는 거 진짜 개짜증나요. 잘 찾아지게 해주세요!"
      },
      submittedAt: new Date("2026-06-18T15:15:00Z").toISOString()
    },
    {
      id: "sub-5",
      surveyId: "gym-day",
      answers: {
        "q-name": "최동현",
        "q-main": "혼성 단체 피구 및 계주",
        "q-rules": "계주할 때 레인 이탈하는 반은 확실히 실격 처리해주세요. 저번에 반칙 썼는데 그냥 넘어가서 개짜증났음.",
        "q-slang-test": "반별 코스프레 계주를 해서 웃긴 분장을 하고 뛰는 미니 종목을 추천합니다. 선생님도 같이 분장시키면 존나 핵꿀잼일 것 같아요."
      },
      submittedAt: new Date("2026-06-18T16:02:00Z").toISOString()
    },
    {
      id: "sub-6",
      surveyId: "gym-day",
      answers: {
        "q-name": "한지민",
        "q-main": "피구 (Dodgeball)",
        "q-rules": "피구 공이 너무 딱딱하면 얼굴 맞을 때 다치고 엄청 아픕니다. 몰랑몰랑한 스펀지 피구공으로 해주기를 부탁드립니다.",
        "q-slang-test": "중간에 사생대회나 응원 구호 뽐내기 시간을 미니코너로 두면 운동 싫어하는 애들도 다같이 즐길 수 있어서 좋은 추억이 될 것 같아요."
      },
      submittedAt: new Date("2026-06-18T16:45:00Z").toISOString()
    }
  ]
};

// Database utility functions
function readDb(): DbData {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading database file, using fallback storage:", error);
  }
  // Initialize file
  writeDb(DEFAULT_DB);
  return DEFAULT_DB;
}

function writeDb(data: DbData) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database file:", error);
  }
}

// Lazy Gemini API Client setup to guard against initialization crash
let aiInstance: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Ensure database file is initialized on load
readDb();

// ----------------------------------------------------
// Authentication API
// ----------------------------------------------------
app.post("/api/auth/login", (req, res) => {
  const { loginId, pin } = req.body;
  if (!loginId || !pin) {
    return res.status(400).json({ success: false, message: "ID와 PIN(비밀번호)을 입력해주세요." });
  }

  const db = readDb();
  const user = db.users.find(u => u.id === loginId && u.pin === pin);

  if (!user) {
    return res.status(401).json({ success: false, message: "아이디 또는 PIN이 잘못되었습니다." });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      role: user.role
    }
  });
});

// ----------------------------------------------------
// User Management API (Admin only)
// ----------------------------------------------------
app.get("/api/users", (req, res) => {
  const db = readDb();
  // Return user accounts excluding passphrases/PINs for confidentiality or simply include them since this is an admin UI
  res.json({ users: db.users });
});

app.post("/api/users", (req, res) => {
  const { id, pin, role } = req.body;
  if (!id || !pin || !role) {
    return res.status(400).json({ success: false, message: "아이디, PIN 번호, 역할을 모두 입력해주세요." });
  }

  const db = readDb();
  if (db.users.find(u => u.id === id)) {
    return res.status(400).json({ success: false, message: "이미 존재하는 사용자 아이디입니다." });
  }

  const newUser: User = {
    id,
    pin,
    role: role === "admin" ? "admin" : "editor",
    createdSurveys: []
  };

  db.users.push(newUser);
  writeDb(db);
  res.json({ success: true, user: newUser });
});

// Delete user account
app.delete("/api/users/:userId", (req, res) => {
  const { userId } = req.params;
  if (userId === "admin") {
    return res.status(400).json({ success: false, message: "마스터 관리자 계정('admin')은 삭제할 수 없습니다." });
  }

  const db = readDb();
  const index = db.users.findIndex(u => u.id === userId);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "존재하지 않는 회원 아이디입니다." });
  }

  db.users.splice(index, 1);
  writeDb(db);
  res.json({ success: true, message: "성공적으로 삭제되었습니다." });
});

// ----------------------------------------------------
// Survey API (CRUD)
// ----------------------------------------------------
app.get("/api/surveys", (req, res) => {
  const { userId, role } = req.query;
  const db = readDb();

  // If no credentials shared, only metadata for participating is open or filter by role
  if (!userId) {
    // Unauthenticated general access (only public lists if requested, or return all with public filter)
    return res.json({ surveys: db.surveys.map(s => ({ id: s.id, title: s.title, description: s.description })) });
  }

  if (role === "admin" || userId === "admin") {
    // Master can view ALL surveys
    return res.json({ surveys: db.surveys });
  } else {
    // Editor can view surveys they created, or are shared/authorized editors of
    const userSurveys = db.surveys.filter(s => s.ownerId === userId || s.editors.includes(String(userId)));
    return res.json({ surveys: userSurveys });
  }
});

app.get("/api/surveys/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const survey = db.surveys.find(s => s.id === id);

  if (!survey) {
    return res.status(404).json({ success: false, message: "해당 설문지를 찾을 수 없습니다." });
  }

  res.json({ success: true, survey });
});

app.post("/api/surveys", (req, res) => {
  const { title, description, ownerId, items, editors } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: "설문 제목을 적어주세요." });
  }

  const db = readDb();
  const rawId = "survey-" + Date.now().toString(36);
  const newSurvey: Survey = {
    id: rawId,
    title,
    description: description || "",
    ownerId: ownerId || "admin",
    editors: editors || [],
    items: items || [],
    createdAt: new Date().toISOString()
  };

  db.surveys.push(newSurvey);
  writeDb(db);
  res.json({ success: true, survey: newSurvey });
});

app.put("/api/surveys/:id", (req, res) => {
  const { id } = req.params;
  const { title, description, items, editors } = req.body;

  const db = readDb();
  const index = db.surveys.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: "해당 설문지를 찾을 수 없습니다." });
  }

  db.surveys[index] = {
    ...db.surveys[index],
    title: title !== undefined ? title : db.surveys[index].title,
    description: description !== undefined ? description : db.surveys[index].description,
    items: items !== undefined ? items : db.surveys[index].items,
    editors: editors !== undefined ? editors : db.surveys[index].editors,
  };

  writeDb(db);
  res.json({ success: true, survey: db.surveys[index] });
});

app.delete("/api/surveys/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  
  const surveyIndex = db.surveys.findIndex(s => s.id === id);
  if (surveyIndex === -1) {
    return res.status(404).json({ success: false, message: "설문지를 찾을 수 없습니다." });
  }

  db.surveys.splice(surveyIndex, 1);
  
  // Also clean up submitted answers for this survey
  db.submissions = db.submissions.filter(sub => sub.surveyId !== id);

  writeDb(db);
  res.json({ success: true, message: "설문지 및 제출 데이터가 완전히 삭제되었습니다." });
});

// Public answer submission
app.post("/api/surveys/:id/submit", (req, res) => {
  const { id } = req.params;
  const { answers } = req.body;

  if (!answers) {
    return res.status(400).json({ success: false, message: "제출된 답변 데이터가 없습니다." });
  }

  const db = readDb();
  const survey = db.surveys.find(s => s.id === id);
  if (!survey) {
    return res.status(404).json({ success: false, message: "존재하지 않는 설문지입니다." });
  }

  const newSubmission: Submission = {
    id: "sub-" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
    surveyId: id,
    answers,
    submittedAt: new Date().toISOString()
  };

  db.submissions.push(newSubmission);
  writeDb(db);
  res.json({ success: true, message: "수고하셨습니다." });
});

// View submissions for survey (authorized users only)
app.get("/api/surveys/:id/results", (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.query;

  const db = readDb();
  const survey = db.surveys.find(s => s.id === id);
  if (!survey) {
    return res.status(404).json({ success: false, message: "설문지를 찾을 수 없습니다." });
  }

  // Check authorization
  const isAuthorized = role === "admin" || userId === "admin" || survey.ownerId === userId || survey.editors.includes(String(userId));
  if (!userId || !isAuthorized) {
    return res.status(403).json({ success: false, message: "이 설문 결과에 접근할 권한이 없습니다." });
  }

  const surveySubmissions = db.submissions.filter(sub => sub.surveyId === id);
  res.json({ success: true, submissions: surveySubmissions });
});

// ----------------------------------------------------
// AI Assistant API (Draft survey with Gemini)
// ----------------------------------------------------
app.post("/api/ai/create-survey", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ success: false, message: "AI가 설문지를 생성할 수 있도록 요구사항/아이디어를 작성해주세요." });
  }

  try {
    const ai = getGemini();
    
    const requestPrompt = `
      사용자의 요청: "${prompt}"
      
      이 요청에 따라 학생들이 풍부한 의견을 제시하고 쉽게 답변할 수 있는 최적의 구글 폼 스타일 설문조사 항목들의 한국어 초안을 설계해주세요.
      설무조사 항목들은 단답형('short'), 장문형/서술형('paragraph'), 객관식('choice'), 섹션 나누기('section')가 최소한 골고루 하나 이상 섞여 있어야 합니다.
      반드시 'section', 'short', 'paragraph' 형태의 유형들을 꼭 포함해주세요.
      
      동시에, 설문지의 적합성을 진단하여 "학생들이 답변할 때 어려움이나 부담을 가질 수 있어 다른 포맷(예: 구체적인 객관식 예시 등)으로 변경하는 게 유리하겠다는 실시간 권장사항 가이드(feedback)" 역시 생성해주세요. 이 가이드는 꼭 한국어로 친절한 선생님 말투로 작성해야 합니다.
    `;

    const modelResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: requestPrompt,
      config: {
        systemInstruction: "You are an expert educational and administrative survey architect who creates precise forms inside of classrooms for primary/secondary/high schools.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "설문조사의 한국어 제목" },
            description: { type: Type.STRING, description: "설문조사에 대한 한국어 설명 및 개요" },
            feedback: { type: Type.STRING, description: "실시간 권장사항/피드백 가이드 문구 한국어 예시: '학생들이 답변하기 어려울 수 있으니 이 문항은 객관식으로 바꾸는 게 어떨까요?'" },
            items: {
              type: Type.ARRAY,
              description: "제안할 설문 문항 목록",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "고유 임의의 키 ID 패턴 (예: q-1, q-2)" },
                  type: { type: Type.STRING, description: "문항의 종류. 반드시 section, short, paragraph, choice 중 하나로 설정해야함." },
                  title: { type: Type.STRING, description: "문항의 질문 제목 또는 섹션의 제목" },
                  description: { type: Type.STRING, description: "질문에 대한 세부 가이드라인이나 설명 (선택사항)" },
                  required: { type: Type.BOOLEAN, description: "필수 여부" },
                  choices: {
                    type: Type.ARRAY,
                    description: "객관식(choice) 문항일 경우에만 항목 텍스트 리스트를 채우고, 나머지는 제공하지 마세요.",
                    items: { type: Type.STRING }
                  }
                },
                required: ["id", "type", "title", "required"]
              }
            }
          },
          required: ["title", "description", "feedback", "items"]
        }
      }
    });

    const parsedData = JSON.parse(modelResponse.text || "{}");
    res.json({ success: true, result: parsedData });
  } catch (error: any) {
    console.error("Gemini Survey creator error:", error);
    res.status(500).json({ success: false, message: "AI 설문지 초안 생성 중 오류가 발생했습니다.", error: error.message });
  }
});

// ----------------------------------------------------
// AI Submissions Narrative Engine (Emotion Index, Clustering, Slang Masking)
// ----------------------------------------------------
app.post("/api/ai/analyze-responses", async (req, res) => {
  const { surveyId } = req.body;
  if (!surveyId) {
    return res.status(400).json({ success: false, message: "분석할 설문지의 ID를 전달해주세요." });
  }

  const db = readDb();
  const survey = db.surveys.find(s => s.id === surveyId);
  const submissions = db.submissions.filter(sub => sub.surveyId === surveyId);

  if (!survey) {
    return res.status(404).json({ success: false, message: "설문지를 찾을 수 없습니다." });
  }
  if (submissions.length === 0) {
    return res.json({
      success: true,
      analysis: {
        emotionAnalysis: { positive: 0, negative: 0, complaint: 0, neutral: 100, summary: "지표를 도출할 충분한 답변이 아직 적립되지 않았습니다." },
        clusters: [],
        filteredResponses: []
      }
    });
  }

  // Collect all text responses from Short or Paragraph type questions
  const textQuestions = survey.items.filter(item => item.type === "short" || item.type === "paragraph");
  
  if (textQuestions.length === 0) {
    return res.json({
      success: true,
      analysis: {
        emotionAnalysis: { positive: 50, negative: 0, complaint: 0, neutral: 50, summary: "이 설문지에는 분석할 장문형/단답형 문항이 존재하지 않습니다." },
        clusters: [],
        filteredResponses: []
      }
    });
  }

  // Format responses for prompt
  const responsesPayload = submissions.map(sub => {
    const textAnswers: Record<string, string> = {};
    textQuestions.forEach(q => {
      if (sub.answers[q.id]) {
        textAnswers[q.title] = sub.answers[q.id];
      }
    });
    return {
      submitter: sub.answers["q-name"] || "익명",
      answers: textAnswers
    };
  });

  try {
    const ai = getGemini();

    const requestPrompt = `
      설문조사 제목: "${survey.title}"
      
      학생들이 제출한 서술형/단답형 주관식 의견 리스트:
      ${JSON.stringify(responsesPayload, null, 2)}
      
      이 답변들의 내용을 기반으로 다음의 3가지 분석 결과를 명확한 JSON 구조로 도출해주세요.
      
      1. 익명성 속 숨은 감정 포착 (Emotion Index):
         - 전체 텍스트 답변 내용들의 긍정(positive) 비율, 부정(negative) 비율, 불만/건의사항(complaint) 비율, 단순 중립(neutral) 비율의 정밀 백분율 지표를 산출하세요 (전체 합산 100이 되도록 비율 조정).
         - 감정 상태 통계에 대한 짧고 날카로운 한국어 요약(summary)을 작성해 주세요.
      
      2. 키워드 중심의 클러스터링 (Keyword Clustering):
         - 학생들이 제안하고 기술한 비슷한 문장이나 의견들을 AI가 자동으로 핵심 키워드별 그룹(cluster)으로 나누고 이름을 붙여주세요 (예: "발야구 홈런 가점 찬성 그룹", "피구 다치지 않게 안전 규칙 지지 그룹", "보물찾기 위험지역 숨기기 반대 그룹").
         - 각 그룹이 차지하는 백분율(percentage) 및 특징 상세설명, 그리고 해당 그룹에 소속되는 원본 답변 문장 2-3개를 수집해 보도해주세요.
         
      3. 비속어 가림질 및 예쁜 말 순화 (Slang Filter and Masking System):
         - 학생들이 장난으로 적어낸 급식체 비속어('존나', '개빡', '개짜증', '개노잼', '극혐' 등) 또는 부적절한 공격적 언어를 AI가 자동 감지하여 순화하거나 마스킹(예: "●●" 처리 또는 "매우/정말" 등으로 완전 순화)하여 관리자가 부드럽게 볼 수 있게 구성해주세요.
         - 원본 텍스트(originalText)와 필터링/순화된 텍스트(filteredText), 그리고 감지되었는지의 여부(flagged: true/false) 및 감지된 비속어 리스트(detectedSlangs: string[])를 가진 리스트 형태가 되도록 응답해 주십시오.

      반드시 정의된 JSON 포맷을 성실히 준수해 생성해주십시오.
    `;

    const modelResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: requestPrompt,
      config: {
        systemInstruction: "You are an educational psychologist and advanced NLP sentiment clustering agent specialized in school dynamic analytics.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotionAnalysis: {
              type: Type.OBJECT,
              properties: {
                positive: { type: Type.NUMBER, description: "긍정적인 답변의 합산 백분율 (0-100)" },
                negative: { type: Type.NUMBER, description: "부정적이거나 실망스러운 백분율 (0-100)" },
                complaint: { type: Type.NUMBER, description: "강한 불만 또는 직접적 개선 건의사항 백분율 (0-100)" },
                neutral: { type: Type.NUMBER, description: "평이하고 객관적인 중립 백분율 (0-100)" },
                summary: { type: Type.STRING, description: "감정 지표 결과 분석 한글 요약본" }
              },
              required: ["positive", "negative", "complaint", "neutral", "summary"]
            },
            clusters: {
              type: Type.ARRAY,
              description: "의견별 그룹화 결과 목록",
              items: {
                type: Type.OBJECT,
                properties: {
                  clusterName: { type: Type.STRING, description: "그룹 명칭 (예: '피구공 안전 및 소재 개선 제안 그룹')" },
                  percentage: { type: Type.NUMBER, description: "해당 의견 그룹 비중 백분율 (0-100)" },
                  description: { type: Type.STRING, description: "그룹에 대한 요약 설명" },
                  sampleResponses: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "이 그룹에 해당하는 학생들의 주요 한 문장 표현"
                  }
                },
                required: ["clusterName", "percentage", "description", "sampleResponses"]
              }
            },
            filteredResponses: {
              type: Type.ARRAY,
              description: "모든 학생들의 장문형/단답형 서술형 답변 전체에 대한 비속어 정제/마스킹 검출 결과",
              items: {
                type: Type.OBJECT,
                properties: {
                  submitter: { type: Type.STRING, description: "제출 학생 이름/학번" },
                  questionTitle: { type: Type.STRING, description: "질문 문항의 타이틀" },
                  originalText: { type: Type.STRING, description: "원본 텍스트" },
                  filteredText: { type: Type.STRING, description: "순화되거나 비속어 구간이 ●● 마스킹된 결과 텍스트" },
                  flagged: { type: Type.BOOLEAN, description: "비속어 검출 유무" },
                  detectedSlangs: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "검출돼서 걸러진 부적절/비속어 목록"
                  }
                },
                required: ["originalText", "filteredText", "flagged"]
              }
            }
          },
          required: ["emotionAnalysis", "clusters", "filteredResponses"]
        }
      }
    });

    const parsedResult = JSON.parse(modelResponse.text || "{}");
    res.json({ success: true, result: parsedResult });
  } catch (error: any) {
    console.error("Gemini Survey response analysis engine error:", error);
    res.status(500).json({ success: false, message: "AI 분석 도중 예외가 발생했습니다.", error: error.message });
  }
});

// ----------------------------------------------------
// Setup Vite Development and Production Middleware
// ----------------------------------------------------
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from /dist.");
  }
}

// Launch Express server
setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
