export type HomeworkTestResult = {
  id: string;
  title: string;
  passed: boolean;
  points: number;
  maxPoints: number;
  actualOutput: string;
  stderr: string;
  exitCode: number;
};

export type HomeworkGrade = {
  ok: true;
  homeworkId: string;
  passedTests: number;
  totalTests: number;
  totalPoints: number;
  awardedXp: number;
  scriptExitCode: number;
  scriptStderr: string;
  results: HomeworkTestResult[];
};

export type HomeworkGradeResponse =
  | HomeworkGrade
  | {
      ok: false;
      error: string;
    };
