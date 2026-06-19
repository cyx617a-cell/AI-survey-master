import React, { useState } from "react";
import { Sparkles, Loader2, Play, AlertCircle, RefreshCw, X, HelpCircle, Check } from "lucide-react";
import { SurveyItem } from "../types";

interface AIDraftAssistantProps {
  onDraftComplete: (data: { title: string; description: string; items: SurveyItem[]; feedback: string }) => void;
}

export default function AIDraftAssistant({ onDraftComplete }: AIDraftAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [draftedInfo, setDraftedInfo] = useState<{ title: string; count: number } | null>(null);

  const SUGGESTED_PROMPTS = [
    "우리 반 체육대회 종목 정하기 설문 만들어줘",
    "학기말 학급 만족도 조사 및 건의사항 설문",
    "소풍 가고 싶은 장소 추천 및 선호도 구체적 조사",
    "환경 보호 실천을 위한 우리 학교 환경 실천 설문"
  ];

  const handleGenerate = async (selectedPrompt?: string) => {
    const activePrompt = selectedPrompt || prompt;
    if (!activePrompt.trim()) {
      setError("AI에게 제안할 피드백 프롬프트를 작성해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setAiFeedback(null);
    setDraftedInfo(null);

    try {
      const res = await fetch("/api/ai/create-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: activePrompt }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "설문지 초안을 생성하는 중 문제가 발생했습니다.");
      }

      const { title, description, items, feedback } = data.result;
      
      onDraftComplete({ title, description, items, feedback });
      setAiFeedback(feedback);
      setDraftedInfo({ title, count: items.filter((i: any) => i.type !== "section").length });
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "서버 혹은 AI 모델 간 연결이 원활하지 않습니다. 잠시 후 상위 기능을 재검토해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-5 shadow-sm mb-6" id="ai-draft-assistant">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-indigo-600 rounded-lg text-white">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-950 font-sans">AI 설문 제작 파트너</h3>
          <p className="text-xs text-indigo-700">원하는 주제를 한글로 입력하면 AI가 최적의 문항 배치를 원클릭으로 완성합니다.</p>
        </div>
      </div>

      {/* Suggested Prompts Grid */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-600 mb-2">💡 빠른 추천 주제 제안</label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(p);
                handleGenerate(p);
              }}
              disabled={loading}
              className="text-xs bg-white text-indigo-800 hover:text-white hover:bg-indigo-600 border border-indigo-200/50 hover:border-indigo-600 px-3 py-1.5 rounded-full font-medium transition-all shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span>{p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Input Core */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="예시: 우리 반 체육대회 종목 정하기 설문 만들어줘"
            disabled={loading}
            className="w-full bg-white border border-indigo-200/80 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-sans text-slate-900 disabled:bg-slate-50 placeholder:text-slate-400"
          />
          {prompt && !loading && (
            <button 
              onClick={() => setPrompt("")}
              className="absolute right-3 top-[13.5px] text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => handleGenerate()}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>진단 및 생성중...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>초안 번개 생성</span>
            </>
          )}
        </button>
      </div>

      {/* Display Success Info */}
      {draftedInfo && (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-xs flex items-center gap-2 mb-3 animate-fade-in animate-duration-300">
          <div className="bg-emerald-600 text-white rounded-full p-0.5">
            <Check className="w-3.5 h-3.5" />
          </div>
          <p className="font-sans">
            AI가 <strong>{draftedInfo.title}</strong> 설문지(총 {draftedInfo.count}개 유효문항 및 섹션 구분)의 제작 조안을 배치했습니다!
          </p>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-red-800 text-xs flex items-center gap-1.5 mb-3 font-sans">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Real-time AI Assistant Suggestion Popup / Floating Alert (실시간 피드백 팝업 알림 요구사항 충족) */}
      {aiFeedback && (
        <div className="relative mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 shadow-md animate-fade-in block" id="ai-coaching-feedback-popup">
          <button 
            onClick={() => setAiFeedback(null)} 
            className="absolute right-3 top-3 text-amber-600 hover:text-amber-800 cursor-pointer p-0.5 rounded-md hover:bg-amber-100"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex gap-2.5 mr-6">
            <div className="bg-amber-100 p-2 rounded-lg text-amber-700 flex-shrink-0 h-9 w-9 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-xs text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded uppercase">AI 실시간 진단 및 제언</span>
                <span className="text-[10px] text-amber-600">설문조사 설문 설계 가이드</span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed font-sans font-medium">
                "{aiFeedback}"
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => setAiFeedback(null)}
                  className="bg-amber-700 hover:bg-amber-800 text-white font-semibold text-[10px] px-2.5 py-1 rounded transition-all cursor-pointer"
                >
                  제안 확인 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
