export interface User {
  id: string;
  pin: string;
  role: "admin" | "editor";
  createdSurveys?: string[];
}

export type SurveyItemType = "section" | "short" | "paragraph" | "choice";

export interface SurveyItem {
  id: string;
  type: SurveyItemType;
  title: string;
  description?: string;
  required: boolean;
  choices?: string[];
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  editors: string[]; // User IDs allowed to edit/view
  items: SurveyItem[];
  createdAt: string;
}

export interface Submission {
  id: string;
  surveyId: string;
  answers: Record<string, string>;
  submittedAt: string;
}

// AI Analysis Response Interfaces
export interface EmotionAnalysis {
  positive: number;
  negative: number;
  complaint: number;
  neutral: number;
  summary: string;
}

export interface SurveyCluster {
  clusterName: string;
  percentage: number;
  description: string;
  sampleResponses: string[];
}

export interface FilteredResponse {
  submitter?: string;
  questionTitle?: string;
  originalText: string;
  filteredText: string;
  flagged: boolean;
  detectedSlangs?: string[];
}

export interface AIAnalysisResult {
  emotionAnalysis: EmotionAnalysis;
  clusters: SurveyCluster[];
  filteredResponses: FilteredResponse[];
}
