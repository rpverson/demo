export interface CallRequirementEvidence {
  requirementKey: string;
  quote: string;
  sourceChunkId: string;
}

export interface CallRequirementsV1 {
  meta: {
    schemaVersion: 'call-requirements-v1';
    model: string;
    generatedAt: string;
  };
  requirements: {
    minimumActivities: number;
    requiredFormTemplates: number;
    requiredEvidenceCount: number;
    requiredDeliverables: string[];
    requiresBudget: boolean;
    requiresTimeline: boolean;
    deadline?: string;
    budget?: string;
  };
  scoringCriteria: string[];
  constraints: string[];
  evidence: CallRequirementEvidence[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ImpactRecommendationV1 {
  rankedTasks: Array<{
    taskId: string;
    score: number;
    rationale: string;
    prerequisites: string[];
  }>;
  coverage: {
    riskMitigation: number;
    feasibility: number;
    expectedImpact: number;
  };
}

export interface DraftOutputV1 {
  sections: Array<{
    id: string;
    title: string;
    markdown: string;
    evidenceRefs: string[];
  }>;
  qualityChecks: {
    missingData: string[];
    assumptions: string[];
  };
}
