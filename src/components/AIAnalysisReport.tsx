import React, { useState } from "react";
import { Sparkles, BarChart2, Heart, ShieldAlert, Group, Smile, Frown, MessageSquareCode, Loader2, ThumbsUp, RefreshCw, AlertCircle } from "lucide-react";
import { AIAnalysisResult } from "../types";

interface AIAnalysisReportProps {
  surveyId: string;
}

export default function AIAnalysisReport({ surveyId }: AIAnalysisReportProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Trigger Gemini analytics pipeline
  const runAiAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "답변을 분석하는 도중 오류가 발생했습니다.");
      }

      setAnalysis(data.result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "AI 분석 서버 연결 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6" id="ai-analysis-report-container">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-violet-600 rounded-xl text-white">
            <MessageSquareCode className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans">주관식 답변 AI 분석 엔진</h3>
            <p className="text-xs text-slate-500">학생들의 익명 의견 속 숨은 감정 포착, 키워드 군집 분석 및 비속어 필터링 결과를 도출합니다.</p>
          </div>
        </div>

        <button
          onClick={runAiAnalysis}
          disabled={loading}
          className="bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 ml-auto sm:ml-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>AI 엔진 분석중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-violet-200 fill-current" />
              <span>AI 심층 답변 분석 가동</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-xl mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!analysis && !loading && (
        <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700">진단된 분석 결과가 없습니다.</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            체육대회 등 학생들이 제출한 장문형 주관식 피드백 답변이 쌓여 있을 때, 위 <strong>‘AI 심층 답변 분석 가동’</strong> 버튼을 클릭하면 감정, 군집, 필터링 데이터가 실시간으로 자동 산출됩니다.
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-14 bg-slate-50 rounded-xl border border-slate-100">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin mx-auto mb-3" />
          <h4 className="text-xs font-semibold text-slate-700">AI가 답변들의 뉘앙스를 학습 및 마스킹 처리하고 있습니다.</h4>
          <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            비속어 패턴 정밀 대조군 마스킹, 의견 덩어리들을 유사성 백분율로 클러스터링하는 수학적 자연어 모델(NLP)이 연계 가동 중입니다. 잠시만 기다려 주십시오.
          </p>
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-8 animate-fade-in animate-duration-500">
          
          {/* Section 1: 학생들의 익명성 속 숨은 감정 포착 */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-1.5 mb-3 text-slate-900">
              <Smile className="w-5 h-5 text-indigo-600" />
              <h4 className="text-sm font-bold font-sans">
                🔍 [첫째] 학생들의 익명성 속 숨은 감정 포착 (Sentiment Tone Index)
              </h4>
            </div>

            <p className="text-xs text-slate-500 mb-4 font-sans leading-relaxed">
              장문형 응답의 주된 행간에서 표출된 문장들을 통계학적으로 분석하여 학생들의 현재 분위기(긍정, 중립, 실망/우려, 요구/불만)를 도출한 지표입니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
              {/* Positive */}
              <div className="bg-white p-3.5 rounded-xl border border-emerald-100 text-center shadow-xs">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block tracking-wider mb-1">긍정/설렘</span>
                <span className="text-2xl font-black text-emerald-700 font-sans">{analysis.emotionAnalysis.positive}%</span>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${analysis.emotionAnalysis.positive}%` }} />
                </div>
              </div>

              {/* Neutral */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider mb-1">단순 중립</span>
                <span className="text-2xl font-black text-slate-700 font-sans">{analysis.emotionAnalysis.neutral}%</span>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: `${analysis.emotionAnalysis.neutral}%` }} />
                </div>
              </div>

              {/* Negative (失望/우려) */}
              <div className="bg-white p-3.5 rounded-xl border border-rose-100 text-center shadow-xs">
                <span className="text-[10px] font-bold text-rose-600 uppercase block tracking-wider mb-1">불안/우려</span>
                <span className="text-2xl font-black text-rose-700 font-sans">{analysis.emotionAnalysis.negative}%</span>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${analysis.emotionAnalysis.negative}%` }} />
                </div>
              </div>

              {/* Complaint */}
              <div className="bg-white p-3.5 rounded-xl border border-amber-100 text-center shadow-xs">
                <span className="text-[10px] font-bold text-amber-600 uppercase block tracking-wider mb-1">불만/강한 개선요구</span>
                <span className="text-2xl font-black text-amber-700 font-sans">{analysis.emotionAnalysis.complaint}%</span>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${analysis.emotionAnalysis.complaint}%` }} />
                </div>
              </div>
            </div>

            {/* Narrative Summary Text */}
            <div className="p-3.5 bg-indigo-50 border border-indigo-100/80 rounded-xl">
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded mr-2 uppercase">AI 종합 감정 평가</span>
              <p className="text-xs font-sans text-indigo-950 font-medium leading-relaxed mt-1">{analysis.emotionAnalysis.summary}</p>
            </div>
          </div>

          {/* Section 2: 키워드 중심의 클러스터링 */}
          <div className="p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-1.5 mb-3 text-slate-900">
              <Group className="w-5 h-5 text-violet-600" />
              <h4 className="text-sm font-bold font-sans">
                🧩 [둘째] 키워드 중심의 클러스터링 (Keyword Clustering Analysis)
              </h4>
            </div>

            <p className="text-xs text-slate-500 mb-4 font-sans leading-relaxed">
              인공지능이 학생들이 자율 서술한 다양한 의견들의 핵심 소재 지지 맥락을 발견하여 의미 있는 피드백 그룹으로 분류하였습니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.clusters.map((c, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 truncate pr-2 font-sans">{c.clusterName}</span>
                      <span className="text-xs font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        {c.percentage}%
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mb-3 leading-relaxed font-sans">{c.description}</p>
                  </div>

                  <div className="border-t border-slate-200/50 pt-2.5 mt-2">
                    <span className="text-[9px] font-bold text-slate-400 block mb-1">대표 학생 응답샘플</span>
                    <ul className="space-y-1">
                      {c.sampleResponses.map((r, sIdx) => (
                        <li key={sIdx} className="text-[10px] text-indigo-950 font-mono italic leading-relaxed bg-white/75 px-2 py-1 rounded shadow-3xs">
                          " {r} "
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: 비속어 자동 감지 및 필터링 시스템 */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-1.5 mb-3 text-slate-900">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h4 className="text-sm font-bold font-sans">
                🛡️ [셋째] 비속어 및 부적절한 언어 자동 감지 및 순화 필터링 시스템 (Slang Filter)
              </h4>
            </div>

            <p className="text-xs text-slate-500 mb-4 font-sans leading-relaxed">
              아이들이 장난조로 남긴 부적절한 언어, 인터넷 유행어(존나, 개빡 등)를 감지하여 고운 말로 완전 순화하거나 마스킹(●●)한 뒤 안전하게 출력해 주는 학교 전용 클린 필터링 통제 판넬입니다.
            </p>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {analysis.filteredResponses.map((item, idx) => (
                <div key={idx} className="p-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-sans text-slate-800">
                        {item.submitter || `학생 ${idx + 1}`}
                      </span>
                      {item.questionTitle && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          {item.questionTitle.length > 25 ? `${item.questionTitle.slice(0, 25)}...` : item.questionTitle}
                        </span>
                      )}
                    </div>

                    {item.flagged ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                        <ShieldAlert className="w-3 h-3 text-rose-500" />
                        자동 마스킹 완료
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        피드백 건전성 통과
                      </span>
                    )}
                  </div>

                  {/* Filtered Text (Censored/Softened Output) */}
                  <div className="text-xs font-sans text-slate-900 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">정제 및 위로 격양순화문</span>
                    {item.filteredText}
                  </div>

                  {/* Original text comparison if flagged */}
                  {item.flagged && (
                    <div className="mt-2 text-[11px] bg-red-50/50 p-2.5 rounded-lg border border-dashed border-red-100 text-rose-950 font-mono">
                      <div className="flex items-center gap-1 text-[9px] font-bold text-rose-700 mb-1">
                        <span>⚠️ 검출 전 원본 입력:</span>
                        <span className="font-mono">{item.detectedSlangs?.map(s => `[${s}]`).join(", ")} 감지</span>
                      </div>
                      <span className="line-through text-slate-400">{item.originalText}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
