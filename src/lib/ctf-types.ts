export type CTFPublicHint = {
  index: number;
  penalty: number;
  unlocked: boolean;
  text: string | null;
};

export type CTFChallengeState = {
  completed: boolean;
  awardedXp: number | null;
  basePoints: number;
  penaltyXp: number;
  achievableXp: number;
  hints: CTFPublicHint[];
};

export type CTFActionReply =
  | {
      ok: true;
      outcome:
        | "unlocked"
        | "already-unlocked"
        | "correct"
        | "already-complete";
      state: CTFChallengeState;
    }
  | {
      ok: false;
      error: string;
      state?: CTFChallengeState;
    };
