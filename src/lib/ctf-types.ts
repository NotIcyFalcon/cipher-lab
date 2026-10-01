export type CTFDifficulty = "Easy" | "Medium" | "Hard";

export type PublicCTFChallenge = {
  id: string;
  title: string;
  category: string;
  difficulty: CTFDifficulty;
  points: number;
  description: string;
  hint?: string;
  labId?: string;
};

export type CTFSubmissionState = {
  status: "idle" | "error" | "success" | "already-solved";
  message: string;
  awardedXp: number;
};
