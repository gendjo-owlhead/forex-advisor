
export interface GroundingSource {
  uri: string;
  title: string;
}

export interface ForexAnalysis {
  analysis: string;
  sources: GroundingSource[];
}
