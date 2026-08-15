import { api } from './axios';

export interface BodyAnalysisResult {
  estimatedBodyFatPct: number;
  estimatedMuscleMassPct: number;
  physiqueType: string;
  primaryFocusAreas: string[];
  estimatedFitnessLevel: string;
  recommendedGoal: string;
  confidenceLevel: string;
  notes: string;
}

export interface BodyAnalysisRecord {
  id: string;
  photoUrl: string;
  photoType: 'ONBOARDING' | 'PROGRESS';
  analysisResult: BodyAnalysisResult;
  disclaimer: string;
  createdAt: string;
}

export async function analyzeBodyPhoto(
  imageUri: string,
  photoType: 'ONBOARDING' | 'PROGRESS',
): Promise<BodyAnalysisRecord> {
  const formData = new FormData();

  const filename = imageUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('image', {
    uri: imageUri,
    name: filename,
    type,
  } as unknown as Blob);
  formData.append('photoType', photoType);

  const { data } = await api.post<BodyAnalysisRecord>(
    '/body-analysis/analyze',
    formData,
    {
      timeout: 60_000,
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return data;
}

export async function getLatestBodyAnalysis(): Promise<BodyAnalysisRecord | null> {
  const { data } = await api.get<BodyAnalysisRecord | null>('/body-analysis/latest');
  return data;
}

export async function getBodyAnalysisHistory(): Promise<BodyAnalysisRecord[]> {
  const { data } = await api.get<BodyAnalysisRecord[]>('/body-analysis/history');
  return data;
}

export async function deleteBodyAnalysis(id: string): Promise<void> {
  await api.delete(`/body-analysis/${id}`);
}
