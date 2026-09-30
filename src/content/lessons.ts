export type HomeworkTestCase = {
  id: string;
  title: string;
} & (
  | {
      // Compare against the uploaded script's stdout.
      expectedOutput: string;
      evaluationCommand?: never;
    }
  | {
      // Run after the uploaded script.
      // Without expectedOutput, exit code 0 means pass.
      evaluationCommand: string;
      expectedOutput?: string;
    }
);

export type HomeworkContentBlock = {
  id: string;
  type: "homework";
  homeworkId: string;
  title: string;
  objective: string;
  totalPoints: number;
  testCases: [HomeworkTestCase, ...HomeworkTestCase[]];
};

export type ContentBlock =
  | {
      id: string;
      type: "note" | "tip";
      title: string;
      body: string;
    }
  | {
      id: string;
      type: "code";
      title: string;
      code: string;
      caption: string;
    }
  | {
      id: string;
      type: "lab";
      labId: string;
      title: string;
      objective: string;
      hint: string;
    }
  | {
      id: string;
      type: "quiz";
      question: string;
      options: string[];
      answer: number;
      explanation: string;
    }
  | HomeworkContentBlock;

export type Lesson = {
  id: string;
  title: string;
  description: string;
  category: string;
  minutes: number;
  xp: number;
  objectives: string[];
  blocks: ContentBlock[];
};

// At least one lesson is required.
export const lessons: [Lesson, ...Lesson[]] = [
  {
    id: "terminal-basics",
    title: "Meet your terminal.",
    description:
      "A blinking cursor is an invitation. Learn to find your bearings, ask questions, and explore with confidence.",
    category: "Linux foundations",
    minutes: 12,
    xp: 100,
    objectives: [
      "Find your current directory",
      "Identify your Linux user",
      "Discover hidden files",
    ],
    blocks: [
      {
        id: "orientation",
        type: "note",
        title: "First, find your bearings",
        body:
          "Think of the terminal as a conversation with your machine. You give it a command; it gives you an answer. Start with three questions: Where am I? Who am I? What is around me?",
      },
      {
        id: "starter-commands",
        type: "code",
        title: "Your first three questions",
        code: "pwd\nwhoami\nls -la",
        caption:
          "pwd shows your current directory. whoami prints your username. ls -la lists directory entries, including hidden ones, with extra details.",
      },
      {
        id: "first-terminal",
        type: "lab",
        labId: "linux-basics",
        title: "Mission 01 · Get your bearings",
        objective:
          "Run the three commands above. Find your username and current directory, then look for an entry whose name begins with a dot.",
        hint:
          "Run one command at a time. In the ls output, entries beginning with a dot are normally hidden. The -a option reveals them.",
      },
      {
        id: "curiosity",
        type: "tip",
        title: "Keep a tiny investigation journal",
        body:
          "Before running a command, predict what it will show. Afterward, write down one thing you noticed. Small observations turn commands into understanding.",
      },
      {
        id: "directory-quiz",
        type: "quiz",
        question: "Which command tells you where you are?",
        options: ["whoami", "pwd", "ls -la"],
        answer: 1,
        explanation:
          "pwd means print working directory. It shows the directory your shell is currently working in.",
      },
      {
        id: "bash-homework",
        type: "homework",
        homeworkId: "bash-files-v1",
        title: "Homework · Prepare an application log",
        objective:
          "Upload a Bash script that prints Ready, creates logs/events.log " +
          "in the working directory, and writes a line containing " +
          "ERROR access denied into that file. Your working directory is /work.",
        totalPoints: 30,
        testCases: [
          {
            id: "ready-output",
            title: "Prints the readiness message",
            expectedOutput: "Ready",
          },
          {
            id: "log-created",
            title: "Creates the application log",
            evaluationCommand: "test -f /work/logs/events.log",
          },
          {
            id: "error-recorded",
            title: "Records the expected error",
            evaluationCommand: "grep '^ERROR' /work/logs/events.log",
            expectedOutput: "ERROR access denied",
          },
        ],
      },
    ],
  },
  {
    id: "investigate-files",
    title: "Follow the breadcrumbs.",
    description:
      "Files tell stories. Create a small log, read the evidence, and find the line that deserves a closer look.",
    category: "Linux foundations",
    minutes: 15,
    xp: 120,
    objectives: [
      "Create a practice directory",
      "Read a text file",
      "Find matching lines with grep",
    ],
    blocks: [
      {
        id: "files-intro",
        type: "note",
        title: "Every investigation starts with a clue",
        body:
          "Logs record events. A useful first step is to read a small sample, then search for something specific. Here, you will create your own harmless practice log.",
      },
      {
        id: "make-evidence",
        type: "code",
        title: "Create your practice evidence",
        code:
          "mkdir -p ~/practice\n" +
          "printf 'INFO started\\nERROR access denied\\nINFO finished\\n' > ~/practice/events.log\n" +
          "cat ~/practice/events.log",
        caption:
          "This creates a directory and writes three sample lines into events.log. Running it again replaces that practice file.",
      },
      {
        id: "log-terminal",
        type: "lab",
        labId: "linux-basics",
        title: "Mission 02 · Find the unusual event",
        objective:
          "Create the sample log using the commands above. Then use grep to display only the line containing ERROR.",
        hint: "Try: grep 'ERROR' ~/practice/events.log",
      },
      {
        id: "evidence-tip",
        type: "tip",
        title: "An error is a clue, not a conclusion",
        body:
          "One error message does not prove an attack happened. Read the surrounding events and ask what else could explain it.",
      },
      {
        id: "grep-quiz",
        type: "quiz",
        question: "Which command searches for matching lines in a file?",
        options: ["mkdir", "pwd", "grep"],
        answer: 2,
        explanation:
          "grep searches text for a pattern and, by default, prints the lines that match.",
      },
    ],
  },
];