import React, { useState, useEffect } from "react";
import { 
  Sparkles, Layers, Type, AlignLeft, CheckSquare, Plus, Trash2, 
  Settings, Key, LogOut, CheckCircle, Eye, Edit2, Share2, 
  BarChart, ArrowLeft, Clipboard, QrCode, LogIn, ChevronRight,
  User, Check, AlertCircle, GripVertical, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Survey, SurveyItem, SurveyItemType } from "./types";
import QRStickSheet from "./components/QRStickSheet";
import AIDraftAssistant from "./components/AIDraftAssistant";
import AIAnalysisReport from "./components/AIAnalysisReport";
import UserManager from "./components/UserManager";

export default function App() {
  // ----------------------------------------------------
  // Core Application Routing State
  // ----------------------------------------------------
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);
  const [participantMode, setParticipantMode] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentSurvey, setCurrentSurvey] = useState<Survey | null>(null);

  // Auth State
  const [currentUser, setCurrentUser] = useState<{ id: string; role: "admin" | "editor" } | null>(null);
  const [loginId, setLoginId] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Dashboard navigation
  const [activeTab, setActiveTab] = useState<"surveys" | "users" | "analysis">("surveys");
  const [dashboardSurveys, setDashboardSurveys] = useState<Survey[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Editor specific states
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [draggedTool, setDraggedTool] = useState<SurveyItemType | null>(null);
  const [newEditorId, setNewEditorId] = useState("");
  const [editorErrorMessage, setEditorErrorMessage] = useState<string | null>(null);
  const [editorSuccessMessage, setEditorSuccessMessage] = useState<string | null>(null);

  // Participant Form Answers
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [participantError, setParticipantError] = useState<string | null>(null);

  // ----------------------------------------------------
  // Initial URL Detection (Unauthenticated QR View)
  // ----------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sId = params.get("surveyId") || params.get("id");
    if (sId) {
      setActiveSurveyId(sId);
      setParticipantMode(true);
      fetchPublicSurvey(sId);
    } else {
      // Look for persisted session
      const cached = localStorage.getItem("survey_session_user");
      if (cached) {
        try {
          setCurrentUser(JSON.parse(cached));
        } catch (e) {
          localStorage.removeItem("survey_session_user");
        }
      }
    }
  }, []);

  // Fetch target survey for unauthenticated client participation
  const fetchPublicSurvey = async (id: string) => {
    try {
      const res = await fetch(`/api/surveys/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentSurvey(data.survey);
      } else {
        setParticipantError("요청하신 설문지를 찾을 수 없거나 삭제된 조항입니다.");
      }
    } catch (e) {
      setParticipantError("설문 데이터를 실시간 로드하는 중 네트워크 장애가 발생했습니다.");
    }
  };

  // ----------------------------------------------------
  // Login / Logout Functions
  // ----------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginId.trim() || !loginPin.trim()) {
      setLoginError("아이디와 4자리 PIN번호를 기입해주십시오.");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: loginId.trim(), pin: loginPin.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCurrentUser(data.user);
        localStorage.setItem("survey_session_user", JSON.stringify(data.user));
        setLoginId("");
        setLoginPin("");
        fetchSurveys(data.user.id, data.user.role);
      } else {
        setLoginError(data.message || "아이디 또는 승인 PIN이 잘못되었습니다.");
      }
    } catch (e) {
      setLoginError("서버와의 통신이 원활하지 않습니다.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("survey_session_user");
    setEditingSurvey(null);
    setAnswers({});
    setSubmitted(false);
  };

  // ----------------------------------------------------
  // Fetch Surveys list for active editor/admin
  // ----------------------------------------------------
  const fetchSurveys = async (userId: string, role: string) => {
    setIsLoadingList(true);
    try {
      const res = await fetch(`/api/surveys?userId=${userId}&role=${role}`);
      const data = await res.json();
      if (res.ok) {
        setDashboardSurveys(data.surveys || []);
      }
    } catch (err) {
      console.error("Error loading surveys:", err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchSurveys(currentUser.id, currentUser.role);
    }
  }, [currentUser]);

  // ----------------------------------------------------
  // Survey Management Actions (Admin & Shared Editors)
  // ----------------------------------------------------
  const handleCreateNewSurvey = async () => {
    if (!currentUser) return;
    const defaultSurveyPayload = {
      title: "새로운 설문조사",
      description: "여기에 설문조사에 대한 간략한 설명이나 목적을 채워주세요.",
      ownerId: currentUser.id,
      editors: [],
      items: [
        {
          id: "item-init-sec",
          type: "section",
          title: "첫 번째 구역",
          description: "체계적인 분할 섹션입니다.",
          required: false
        },
        {
          id: "item-init-name",
          type: "short",
          title: "이름을 적어주세요",
          description: "단답형 질문 예시입니다.",
          required: true
        }
      ]
    };

    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaultSurveyPayload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDashboardSurveys([data.survey, ...dashboardSurveys]);
        setEditingSurvey(data.survey);
      }
    } catch (e) {
      alert("신규 설문지 생성을 실패했습니다.");
    }
  };

  const handleSaveSurvey = async (surveyToSave: Survey) => {
    try {
      const res = await fetch(`/api/surveys/${surveyToSave.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(surveyToSave),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Update list
        setDashboardSurveys(dashboardSurveys.map(s => s.id === surveyToSave.id ? data.survey : s));
        setEditingSurvey(data.survey);
        // Alert briefly
        const savedBadge = document.getElementById("save-indicator");
        if (savedBadge) {
          savedBadge.classList.remove("opacity-0");
          savedBadge.classList.add("opacity-100");
          setTimeout(() => {
            savedBadge.classList.remove("opacity-100");
            savedBadge.classList.add("opacity-0");
          }, 1500);
        }
      }
    } catch (e) {
      alert("변경사항 저장 도중 네트워크 에러가 발생했습니다.");
    }
  };

  const handleDeleteSurvey = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("정말 이 설문지와 보관된 모든 응답 데이터를 영구 파기하시겠습니까?")) {
      return;
    }

    try {
      const res = await fetch(`/api/surveys/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDashboardSurveys(dashboardSurveys.filter(s => s.id !== id));
        if (editingSurvey?.id === id) {
          setEditingSurvey(null);
        }
      }
    } catch (e) {
      alert("삭제 처리가 정상 진행되지 않았습니다.");
    }
  };

  // ----------------------------------------------------
  // Form Builder Tools (Click & Drag Options)
  // ----------------------------------------------------
  const TOOLBOX_ITEMS = [
    { name: "섹션 나누기", type: "section" as const, icon: Layers, desc: "구역 분할" },
    { name: "단답형 텍스트", type: "short" as const, icon: Type, desc: "한줄 서술형" },
    { name: "장문형(서술형)", type: "paragraph" as const, icon: AlignLeft, desc: "다량의 자유로운 의견" },
    { name: "객관식 문항", type: "choice" as const, icon: CheckSquare, desc: "보기 중 단일 선택" }
  ];

  const handleAddQuestionItem = (type: SurveyItemType) => {
    if (!editingSurvey) return;

    const newItem: SurveyItem = {
      id: "q-" + Math.random().toString(36).substr(2, 5) + Date.now().toString(36).slice(-5),
      type,
      title: type === "section" ? "새로운 구획 섹션" : "새로 추가된 질문 제목",
      description: type === "section" ? "이 도구 섹션에 대한 가이드나 설명을 적으세요." : "상세 보조 안내 문구를 마음껏 적어 보세요.",
      required: type !== "section",
      choices: type === "choice" ? ["옵션 1 (변경 가능)", "옵션 2 (변경 가능)"] : undefined
    };

    const updatedSurvey = {
      ...editingSurvey,
      items: [...editingSurvey.items, newItem]
    };

    setEditingSurvey(updatedSurvey);
    handleSaveSurvey(updatedSurvey);
  };

  // Drag and drop implementation helpers
  const handleDragStart = (e: React.DragEvent, type: SurveyItemType) => {
    setDraggedTool(type);
    e.dataTransfer.setData("text/plain", type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("text/plain") as SurveyItemType;
    if (type) {
      handleAddQuestionItem(type);
    }
    setDraggedTool(null);
  };

  // Modify interactive values on individual items
  const handleUpdateItem = (itemId: string, field: keyof SurveyItem, value: any) => {
    if (!editingSurvey) return;

    const updatedItems = editingSurvey.items.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    });

    const updatedSurvey = { ...editingSurvey, items: updatedItems };
    setEditingSurvey(updatedSurvey);
    handleSaveSurvey(updatedSurvey);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!editingSurvey) return;
    const updatedItems = editingSurvey.items.filter(item => item.id !== itemId);
    const updatedSurvey = { ...editingSurvey, items: updatedItems };
    setEditingSurvey(updatedSurvey);
    handleSaveSurvey(updatedSurvey);
  };

  // Manage multiple choice options
  const handleAddChoice = (itemId: string) => {
    if (!editingSurvey) return;
    const item = editingSurvey.items.find(i => i.id === itemId);
    if (item && item.choices) {
      const updatedChoices = [...item.choices, `옵션 ${item.choices.length + 1}`];
      handleUpdateItem(itemId, "choices", updatedChoices);
    }
  };

  const handleUpdateChoiceText = (itemId: string, choiceIdx: number, text: string) => {
    if (!editingSurvey) return;
    const item = editingSurvey.items.find(i => i.id === itemId);
    if (item && item.choices) {
      const updatedChoices = [...item.choices];
      updatedChoices[choiceIdx] = text;
      handleUpdateItem(itemId, "choices", updatedChoices);
    }
  };

  const handleDeleteChoice = (itemId: string, choiceIdx: number) => {
    if (!editingSurvey) return;
    const item = editingSurvey.items.find(i => i.id === itemId);
    if (item && item.choices) {
      const updatedChoices = item.choices.filter((_, idx) => idx !== choiceIdx);
      handleUpdateItem(itemId, "choices", updatedChoices);
    }
  };

  // ----------------------------------------------------
  // Share / Co-editor ID Permission assignment
  // ----------------------------------------------------
  const handleAddEditor = async () => {
    if (!editingSurvey || !newEditorId.trim()) return;
    setEditorErrorMessage(null);
    setEditorSuccessMessage(null);

    if (newEditorId.trim() === editingSurvey.ownerId) {
      setEditorErrorMessage("설문지 개설 마스터 본인은 추가 등록할 필요가 없습니다.");
      return;
    }

    if (editingSurvey.editors.includes(newEditorId.trim())) {
      setEditorErrorMessage("이미 공동 제어 권한이 허용된 아이디입니다.");
      return;
    }

    const updatedEditors = [...editingSurvey.editors, newEditorId.trim()];
    const updatedSurvey = {
      ...editingSurvey,
      editors: updatedEditors
    };

    setEditingSurvey(updatedSurvey);
    await handleSaveSurvey(updatedSurvey);
    setEditorSuccessMessage(`아이디 '${newEditorId.trim()}'에 이 설문지의 수정 및 결과 열람 권한을 양도했습니다.`);
    setNewEditorId("");
  };

  const handleRemoveEditor = async (editorId: string) => {
    if (!editingSurvey) return;
    const updatedEditors = editingSurvey.editors.filter(e => e !== editorId);
    const updatedSurvey = {
      ...editingSurvey,
      editors: updatedEditors
    };
    setEditingSurvey(updatedSurvey);
    await handleSaveSurvey(updatedSurvey);
  };

  // ----------------------------------------------------
  // Public Participant Submission Flow (격리된 화면 검증)
  // ----------------------------------------------------
  const handleParticipantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParticipantError(null);

    if (!currentSurvey) return;

    // Validate vital required questions
    for (const item of currentSurvey.items) {
      if (item.type !== "section" && item.required) {
        if (!answers[item.id] || !answers[item.id].trim()) {
          setParticipantError(`필수 답변 항목입니다: "${item.title}"`);
          return;
        }
      }
    }

    try {
      const res = await fetch(`/api/surveys/${currentSurvey.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setParticipantError(data.message || "답변 전송에 실패했습니다.");
      }
    } catch (e) {
      setParticipantError("네트워크 결함으로 답변이 제출되지 않았습니다.");
    }
  };

  const handleUpdateAnswer = (questionId: string, val: string) => {
    setAnswers({
      ...answers,
      [questionId]: val
    });
  };

  // ----------------------------------------------------
  // Trigger participant mode in same browser tab helper
  // ----------------------------------------------------
  const startPreviewAsParticipant = (survey: Survey) => {
    setCurrentSurvey(survey);
    setAnswers({});
    setSubmitted(false);
    setParticipantMode(true);
    setParticipantError(null);
  };

  const quitParticipantPreview = () => {
    setParticipantMode(false);
    setCurrentSurvey(null);
    setAnswers({});
    setSubmitted(false);
    if (currentUser) {
      fetchSurveys(currentUser.id, currentUser.role);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="full-application-root">
      
      {/* ----------------------------------------------------
          PARTICIPANT ISOLATED VIEW (설문 참여자 전용화면)
          ---------------------------------------------------- */}
      {participantMode ? (
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-12 flex flex-col justify-center animate-fade-in">
          
          {/* Submission Completion State (제출 후 "수고하셨습니다."만 띄우고 깔끔 종료되는 화면) */}
          {submitted ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xl space-y-6 max-w-md mx-auto"
              id="submission-completed-card"
            >
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600 shadow-inner animate-pulse">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
                수고하셨습니다.
              </h2>
              <p className="text-xs text-slate-400">
                작성하신 답변이 안전하게 서버로 직전송 및 마스킹 저장되었습니다. 창을 닫으셔도 좋습니다.
              </p>

              {/* Only shown if we are in admin preview context to go back easily */}
              {currentUser && (
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={quitParticipantPreview}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50 cursor-pointer"
                  >
                    ← 관리자 편집기로 돌아가기 (통계 관람 차단 테스트 통과)
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            // Active Voting Form Sheet
            <div className="space-y-6">
              
              {/* Dev mode warning/switcher if opened in dashboard */}
              {currentUser && (
                <div className="bg-indigo-900 text-indigo-100 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-md">
                  <span className="font-sans">
                    💡 <strong>참여자 화면 모드 격리 상태입니다.</strong> 일반 학생들은 이 화면 및 설문지 영역만 볼 수 있습니다.
                  </span>
                  <button
                    onClick={quitParticipantPreview}
                    className="bg-indigo-800 hover:bg-indigo-700 px-3 py-1 rounded-md font-bold text-[10px] uppercase tracking-wide cursor-pointer text-white"
                  >
                    편집기로 탈출
                  </button>
                </div>
              )}

              {currentSurvey ? (
                <form onSubmit={handleParticipantSubmit} className="space-y-6">
                  
                  {/* Title Header Card */}
                  <div className="bg-white rounded-2xl border-t-8 border-t-indigo-600 border border-slate-200 p-6 shadow-sm">
                    <h1 className="text-xl font-bold text-slate-950 font-sans tracking-tight mb-2">
                      {currentSurvey.title}
                    </h1>
                    {currentSurvey.description && (
                      <p className="text-xs text-slate-500 leading-relaxed font-sans">
                        {currentSurvey.description}
                      </p>
                    )}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                      <span>개설기관/관리처: {currentSurvey.ownerId}</span>
                      <span className="text-rose-500 font-bold">* 표시는 필수 항목입니다</span>
                    </div>
                  </div>

                  {/* Rendering Questions & Sections */}
                  {currentSurvey.items.map((item, index) => {
                    if (item.type === "section") {
                      return (
                        <div 
                          key={item.id} 
                          className="bg-slate-100 px-5 py-4 border-l-4 border-l-indigo-600 rounded-r-xl border border-slate-200 shadow-3xs"
                          id={`participant-${item.id}`}
                        >
                          <h3 className="text-xs font-black text-indigo-950 font-sans tracking-wide">
                            섹션 {index + 1}: {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-[11px] text-slate-500 mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={item.id} 
                        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3"
                        id={`participant-${item.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <label className="text-xs font-bold text-slate-900 leading-relaxed font-sans">
                            {item.title} {item.required && <span className="text-rose-500 font-extrabold ml-0.5">*</span>}
                          </label>
                        </div>
                        
                        {item.description && (
                          <p className="text-[10px] text-slate-400 italic">
                            {item.description}
                          </p>
                        )}

                        {/* Rendering different item types */}
                        {item.type === "short" && (
                          <input
                            type="text"
                            required={item.required}
                            value={answers[item.id] || ""}
                            onChange={(e) => handleUpdateAnswer(item.id, e.target.value)}
                            placeholder="단답의 내용을 주관식으로 한 줄 적어주세요."
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                          />
                        )}

                        {item.type === "paragraph" && (
                          <textarea
                            rows={4}
                            required={item.required}
                            value={answers[item.id] || ""}
                            onChange={(e) => handleUpdateAnswer(item.id, e.target.value)}
                            placeholder="의견을 상세하게 기입해 주세요 (비속어 필터가 내장되어 관리자에게는 순화된 내용으로 표시됩니다)."
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 resize-none leading-relaxed"
                          />
                        )}

                        {item.type === "choice" && item.choices && (
                          <div className="space-y-2">
                            {item.choices.map((choice, cIdx) => (
                              <label 
                                key={cIdx} 
                                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                                  answers[item.id] === choice 
                                  ? "bg-indigo-50/50 border-indigo-400 text-indigo-950 font-bold" 
                                  : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/50 text-slate-700"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question-${item.id}`}
                                  value={choice}
                                  checked={answers[item.id] === choice}
                                  onChange={() => handleUpdateAnswer(item.id, choice)}
                                  className="w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-indigo-550"
                                />
                                <span className="text-xs font-sans">{choice}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Submission Error Banner */}
                  {participantError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-xl flex items-center gap-2 font-sans">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span>{participantError}</span>
                    </div>
                  )}

                  {/* Core Submission button */}
                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center cursor-pointer"
                  >
                    설문조사 및 투표 완료 제출하기
                  </button>

                </form>
              ) : (
                <div className="text-center py-10 bg-white border rounded-2xl">
                  <span className="text-xs text-slate-400">설문조사를 준비하는 중입니다...</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ----------------------------------------------------
            ADMINISTRATOR / EDITOR DASHBOARD SECTION
            ---------------------------------------------------- */
        <>
          {/* Header Bar */}
          <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 transition-all font-sans shadow-xs">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shadow-xs">
                  <div className="w-3.5 h-3.5 bg-white rounded-sm"></div>
                </div>
                <div>
                  <h1 className="text-sm lg:text-base font-extrabold tracking-tight text-slate-800 flex items-center gap-1">
                    AI Survey Master <span className="font-normal text-slate-400 text-xs hidden sm:inline">| Master Portal</span>
                  </h1>
                </div>
              </div>

              {currentUser ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 text-[11px] font-semibold">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></div>
                    <span>{currentUser.role === "admin" ? "Master Editor" : "Staff Editor"}</span>
                  </div>

                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end font-sans">
                      <User className="w-3 h-3 text-indigo-600" />
                      {currentUser.id}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold shadow-xs"
                    title="로그아웃"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>로그아웃</span>
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-medium flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="flex items-center gap-1"><LogIn className="w-3.5 h-3.5 text-slate-400" /> 제작 및 권한 인증 포털</span>
                </div>
              )}

            </div>
          </header>

          {/* Core Content Drawer */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
            {!currentUser ? (
              
              /* ----------------------------------------------------
                  PORTAL PORT LOGIN SCREEN (ID/PIN)
                  ---------------------------------------------------- */
              <div className="max-w-md mx-auto py-14 animate-fade-in">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  
                  {/* Decorative Banner */}
                  <div className="bg-white border-b border-slate-100 p-8 text-center relative">
                    <div className="absolute top-4 right-4 bg-indigo-50 border border-indigo-100 text-[9px] uppercase font-bold px-2 py-0.5 rounded tracking-wide text-indigo-700">
                      Core Secure
                    </div>
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-650 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-xs">
                      <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                    </div>
                    <h2 className="text-base font-extrabold font-sans tracking-tight text-slate-800">관리자 및 출제자 로그인 포털</h2>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      아이디 <strong>admin</strong>, PIN <strong>**cho20130617</strong>를 입력하여 모든 설문과 감정 분석 분류에 실시간 원클릭 진입하십시오.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleLogin} className="p-6 space-y-4">
                    
                    {loginError && (
                      <div className="p-3 bg-red-50 border border-red-150 text-red-800 text-xs rounded-xl flex items-center gap-2 font-sans">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">발급된 로그인 아이디 (ID)</label>
                      <input
                        type="text"
                        placeholder="예: admin, teacher1"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-slate-900 font-sans transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">인증 핀번호 (PIN / PW)</label>
                      <input
                        type="password"
                        placeholder="PIN 번호를 입력해주세요"
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value)}
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-slate-950 font-mono tracking-widest transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer text-center"
                    >
                      승인 보안 진입하기
                    </button>

                  </form>
                </div>
              </div>

            ) : (
              
              /* ----------------------------------------------------
                  DASHBOARD HOME (LOGGED-IN STATES)
                  ---------------------------------------------------- */
              <div className="space-y-6">
                
                {/* Switcher Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3" id="dashboard-navbar">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setActiveTab("surveys"); setEditingSurvey(null); }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === "surveys" && !editingSurvey
                          ? "bg-slate-900 text-white shadow-sm" 
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Clipboard className="w-4 h-4" />
                      설문지 리스트 관리
                    </button>

                    {/* Users view restricted only to master admin */}
                    {currentUser.role === "admin" && (
                      <button
                        onClick={() => { setActiveTab("users"); setEditingSurvey(null); }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeTab === "users"
                            ? "bg-slate-900 text-white shadow-sm" 
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <User className="w-4 h-4" />
                        로그인 ID 발급 및 자격 제어
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-mono">
                    로컬 호스트: {window.location.host}
                  </div>
                </div>

                {/* Tab: Users Management Control */}
                {activeTab === "users" && <UserManager />}

                {/* Tab: Survey List & Builder View Drawer */}
                {activeTab === "surveys" && (
                  <>
                    {!editingSurvey ? (
                      
                      /* ----------------------------------------------------
                          SURVEY DIRECTORY SCREEN
                          ---------------------------------------------------- */
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between bg-white rounded-2xl p-5 border border-slate-200 shadow-3xs">
                          <div>
                            <h2 className="text-base font-extrabold text-slate-900 font-sans tracking-tight">학교 설문 대시보드</h2>
                            <p className="text-xs text-slate-500">원하시는 설문지를 추가하거나, 기존 설문지의 [수정/결과 보기] 버튼을 통해 AI 분석 및 QR 연동을 이용하세요.</p>
                          </div>
                          
                          <button
                            onClick={handleCreateNewSurvey}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            신규 설문지 만들기
                          </button>
                        </div>

                        {/* List rendering */}
                        {isLoadingList ? (
                          <div className="text-center py-10 bg-white border rounded-2xl">
                            <span className="text-xs text-slate-400">설문 목록을 조회하고 있습니다...</span>
                          </div>
                        ) : dashboardSurveys.length === 0 ? (
                          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                            <Clipboard className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            <p className="text-xs font-semibold">생성되거나 허용 배정된 스마트폰 설문조사가 아직 없습니다.</p>
                            <span className="text-[10px] block mt-1">상단의 복사기에서 새로운 설문지를 생성하세요!</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {dashboardSurveys.map((survey) => {
                              const isOwner = survey.ownerId === currentUser.id;
                              return (
                                <div 
                                  key={survey.id} 
                                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer"
                                  onClick={() => setEditingSurvey(survey)}
                                  id={`survey-card-${survey.id}`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wider font-mono bg-indigo-50 text-indigo-700">
                                        ID: {survey.id}
                                      </span>
                                      
                                      <div className="flex items-center gap-1.5">
                                        {isOwner ? (
                                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold font-sans">내 개설 설문</span>
                                        ) : (
                                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold font-sans">권한 양도받음</span>
                                        )}
                                      </div>
                                    </div>

                                    <h3 className="text-sm font-bold text-slate-900 font-sans mt-1 line-clamp-1">
                                      {survey.title}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                      {survey.description || "설명 보충이 등록되지 않았습니다."}
                                    </p>
                                  </div>

                                  <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-[9px] text-slate-400 font-mono">가습일: {new Date(survey.createdAt).toLocaleDateString()}</span>
                                    
                                    <div className="flex items-center gap-1.5 ml-auto">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); startPreviewAsParticipant(survey); }}
                                        className="p-1 px-2.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 bg-white cursor-pointer transition-all flex items-center gap-1"
                                        title="투표참여 격리화면 미리보기"
                                      >
                                        <Eye className="w-3 h-3 text-slate-500" />
                                        참여 화면
                                      </button>

                                      <button
                                        onClick={(e) => { e.stopPropagation(); setEditingSurvey(survey); }}
                                        className="p-1 px-2.5 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded cursor-pointer transition-all flex items-center gap-1"
                                      >
                                        <Edit2 className="w-3 h-3 text-indigo-200" />
                                        수정 / AI 분석
                                      </button>

                                      <button
                                        onClick={(e) => handleDeleteSurvey(survey.id, e)}
                                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded cursor-pointer transition-all"
                                        title="설문지 완전히 삭제"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    ) : (

                      /* ----------------------------------------------------
                          ACTIVE SURVEY CUSTOMIZER & COMPILER (핵심 편집 화면)
                          ---------------------------------------------------- */
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative animate-fade-in" id="survey-builder-editor-grid">
                        
                        {/* Sticky QR Code Generator Hook (우측 상단 고정, 스크롤 레이아웃 반영) */}
                        <QRStickSheet surveyId={editingSurvey.id} />

                        {/* Back Arrow Header Panel */}
                        <div className="lg:col-span-3 space-y-6">
                          
                          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3" id="editor-header">
                            <button
                              onClick={() => { setEditingSurvey(null); fetchSurveys(currentUser.id, currentUser.role); }}
                              className="text-xs text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 font-bold px-3 py-1.5 rounded-xl bg-white cursor-pointer transition-all flex items-center gap-1"
                            >
                              <ArrowLeft className="w-4 h-4 cursor-pointer" />
                              <span>← 전면 설문 대시보드로 복귀</span>
                            </button>

                            <div className="flex items-center gap-3">
                              {/* Inline Saved Indicator Badge */}
                              <span 
                                id="save-indicator" 
                                className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-2 py-0.8 rounded opacity-0 transition-opacity duration-300"
                              >
                                ✓ 서버 동기화 완료
                              </span>

                              <button
                                onClick={() => startPreviewAsParticipant(editingSurvey)}
                                className="text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Eye className="w-4 h-4 text-slate-500" />
                                <span>참여자 시점(QR화면) 미리보기</span>
                              </button>
                            </div>
                          </div>

                          {/* ----------------- AI 설문 가이드 파트너 (Stage 3) ----------------- */}
                          <AIDraftAssistant 
                            onDraftComplete={(aiData) => {
                              const updated = {
                                ...editingSurvey,
                                title: aiData.title,
                                description: aiData.description,
                                items: aiData.items
                              };
                              setEditingSurvey(updated);
                              handleSaveSurvey(updated);
                            }}
                          />

                          {/* Editable Main Survey Title & Description Card */}
                          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 relative">
                            <div className="absolute top-4 right-4 bg-slate-100 text-[10px] text-slate-500 font-mono font-bold px-2 py-0.5 rounded uppercase">
                              설문 기재 사항
                            </div>

                            <input
                              type="text"
                              value={editingSurvey.title}
                              onChange={(e) => handleUpdateItem("", "title", e.target.value)} // Special trigger or inline wrapper
                              onBlur={(e) => {
                                const updated = { ...editingSurvey, title: e.target.value };
                                setEditingSurvey(updated);
                                handleSaveSurvey(updated);
                              }}
                              placeholder="설문지 제목을 입력해주세요"
                              className="w-full text-lg font-black text-slate-900 border-b border-dashed border-slate-200 hover:border-slate-350 focus:border-indigo-500 focus:ring-0 pb-1.5 outline-none font-sans"
                            />

                            <textarea
                              rows={2}
                              value={editingSurvey.description || ""}
                              onChange={(e) => {
                                const updated = { ...editingSurvey, description: e.target.value };
                                setEditingSurvey(updated);
                              }}
                              onBlur={(e) => {
                                const updated = { ...editingSurvey, description: e.target.value };
                                handleSaveSurvey(updated);
                              }}
                              placeholder="설문 참여자들에게 보일 설명과 가이드라인을 자유롭게 배치하세요."
                              className="w-full text-xs text-slate-500 border border-slate-200/60 rounded-xl p-3 outline-none hover:border-slate-300 focus:border-indigo-500 focus:ring-0 leading-relaxed font-sans resize-none"
                            />
                          </div>

                          {/* ----------------------------------------------------
                              VOTING CANVAS / LIST QUESTIONS AREA (문항 구성 영역)
                              ---------------------------------------------------- */}
                          <div 
                            className="space-y-4"
                            onDragOver={handleDragOver}
                            onDrop={handleDropOnCanvas}
                            id="survey-items-builder-canvas"
                          >
                            <div className="flex items-center justify-between text-xs text-slate-400 font-sans px-1">
                              <span>총 {editingSurvey.items.length}개의 구성항목 편집 필드</span>
                              <span>아래 항목을 자유롭게 추가하거나 기재내용을 수정하세요</span>
                            </div>

                            {editingSurvey.items.length === 0 ? (
                              <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 font-sans">
                                <Plus className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <span>문항이 비어 있습니다. 우측의 구글폼 도구 상자를 클릭 또는 드래그하여 항목들을 채우세요!</span>
                              </div>
                            ) : (
                              editingSurvey.items.map((item, idx) => (
                                <div 
                                  key={item.id} 
                                  className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs hover:shadow-xs transition-shadow relative space-y-4 ${
                                    item.type === "section" ? "border-l-4 border-l-slate-700 bg-slate-50/50" : ""
                                  }`}
                                  id={`editor-item-${item.id}`}
                                >
                                  {/* Item Toolbar Control */}
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                      <GripVertical className="w-4 h-4 cursor-grab" />
                                      <span className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded-md">
                                        [{idx + 1}] {item.type === "section" ? "섹션 구분" : item.type === "short" ? "단답형" : item.type === "paragraph" ? "장문형(서술형)" : "객관식 선택"}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      {item.type !== "section" && (
                                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={item.required}
                                            onChange={(e) => handleUpdateItem(item.id, "required", e.target.checked)}
                                            className="w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer rounded"
                                          />
                                          <span className="text-[11px] font-sans font-semibold text-slate-500">필수 응답</span>
                                        </label>
                                      )}

                                      <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 cursor-pointer"
                                        title="문항 삭제"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Input Area */}
                                  <div className="space-y-3">
                                    <input
                                      type="text"
                                      value={item.title}
                                      onChange={(e) => handleUpdateItem(item.id, "title", e.target.value)}
                                      placeholder={item.type === "section" ? "구역 제목 적기 (예: 개인 정보 양식)" : "질문 내용을 작성해주세요."}
                                      className="w-full text-xs font-bold text-slate-800 border-b border-slate-200 focus:border-indigo-500 pb-1 outline-none font-sans"
                                    />

                                    <input
                                      type="text"
                                      value={item.description || ""}
                                      onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                                      placeholder="보조 설명을 적어주세요 (선택사항)"
                                      className="w-full text-[10px] text-slate-400 border-b border-transparent hover:border-slate-100 focus:border-slate-300 outline-none italic font-sans"
                                    />
                                  </div>

                                  {/* Choice Option Block rendering (for Choices only) */}
                                  {item.type === "choice" && (
                                    <div className="space-y-2 pl-3 border-l-2 border-indigo-100">
                                      <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">객관식 설정 리스트:</span>
                                      
                                      {item.choices?.map((choiceText, cIdx) => (
                                        <div key={cIdx} className="flex items-center gap-1.5">
                                          <input type="radio" disabled className="w-3 h-3 text-slate-300" />
                                          <input
                                            type="text"
                                            value={choiceText}
                                            onChange={(e) => handleUpdateChoiceText(item.id, cIdx, e.target.value)}
                                            className="bg-transparent border-b border-slate-200 focus:border-indigo-500 py-0.5 px-1 text-xs text-slate-700 outline-none flex-1 font-sans"
                                          />
                                          <button
                                            onClick={() => handleDeleteChoice(item.id, cIdx)}
                                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                                            title="선택지 삭제"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}

                                      <button
                                        type="button"
                                        onClick={() => handleAddChoice(item.id)}
                                        className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 mt-2.5 cursor-pointer bg-indigo-50/60 px-2 py-1 rounded"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        객관식 선택 옵션 추가
                                      </button>
                                    </div>
                                  )}
                                  
                                </div>
                              ))
                            )}
                          </div>

                          {/* ----------------- AI Deep Response Statistics (Stage 3) ----------------- */}
                          <AIAnalysisReport surveyId={editingSurvey.id} />

                        </div>

                        {/* Right Sidebar Area: Toolbox Section (구글폼 도구 상자) */}
                        <div className="lg:col-span-1 space-y-5" id="toolbox-sidebar">
                          
                          {/* Tool Box Header card */}
                          <div className="bg-slate-900 border border-slate-950 rounded-2xl p-4 shadow-sm text-white">
                            <h3 className="text-xs font-black tracking-wider uppercase text-indigo-400 flex items-center gap-1.5 mb-1">
                              <Plus className="w-4 h-4 stroke-[2.5]" />
                              설문 도구 상자
                            </h3>
                            <p className="text-[10px] text-slate-400">
                              섹션 나누기, 단답형, 장문형 툴이 탑재되어 있습니다. 클릭하거나 드래그하여 설문지에 문항을 추가하세요!
                            </p>

                            {/* Item types grid */}
                            <div className="grid grid-cols-1 gap-2.5 mt-3.5">
                              {TOOLBOX_ITEMS.map((tool) => {
                                const ToolIcon = tool.icon;
                                return (
                                  <div
                                    key={tool.type}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, tool.type)}
                                    onClick={() => handleAddQuestionItem(tool.type)}
                                    className="flex items-center gap-3 bg-slate-800 hover:bg-slate-750 p-2.5 rounded-xl border border-slate-700 hover:border-slate-600 transition-all cursor-pointer group active:scale-95"
                                    title="클릭하여 즉시 가산하거나, 캔버스로 드래그해 놓으세요"
                                  >
                                    <div className="p-1.5 bg-slate-700 rounded-lg text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                      <ToolIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <span className="text-[11px] font-bold block">{tool.name}</span>
                                      <span className="text-[9px] text-slate-400 block">{tool.desc}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Google Forms permission model: Share / Authorization ID Panel */}
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-4">
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                                <Share2 className="w-4 h-4 text-emerald-600" />
                                설문 공동 편집 관리자 지정
                              </h4>
                              <p className="text-[10px] text-slate-400">
                                각 설문지 별로 수정이나 결과 관람 권한 부여를 특정 사용자 ID에 제어할 수 있습니다.
                              </p>
                            </div>

                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                placeholder="사용자 ID 입력"
                                value={newEditorId}
                                onChange={(e) => setNewEditorId(e.target.value)}
                                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 flex-1 font-sans"
                              />
                              <button
                                onClick={handleAddEditor}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                추가
                              </button>
                            </div>

                            {editorErrorMessage && (
                              <p className="text-[9px] font-sans text-rose-600 font-bold leading-normal">{editorErrorMessage}</p>
                            )}
                            {editorSuccessMessage && (
                              <p className="text-[9px] font-sans text-emerald-700 font-bold leading-normal">{editorSuccessMessage}</p>
                            )}

                            {/* Active shared User Permission ID list */}
                            {editingSurvey.editors && editingSurvey.editors.length > 0 && (
                              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase">이 무대 공동 편집 권한자 목록:</span>
                                <div className="space-y-1">
                                  {editingSurvey.editors.map((editorId) => (
                                    <div key={editorId} className="flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded border border-slate-100 text-[10px]">
                                      <span className="font-mono text-slate-800 font-semibold">{editorId}</span>
                                      <button
                                        onClick={() => handleRemoveEditor(editorId)}
                                        className="text-rose-500 hover:text-rose-700 font-bold"
                                      >
                                        회수
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                        </div>

                      </div>
                    )}
                  </>
                )}

              </div>
            )}
          </main>
        </>
      )}

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5 text-center text-slate-400 font-sans text-[10px]">
        Copyright © 2026 Smart AI Survey Platform. All rights reserved. (Cloud Native Sandbox Workspace)
      </footer>

    </div>
  );
}
