
export interface SelectionOptions {
  subject: string;
  grade: string;
  bookSet: string;
  examType: string;
  questionCount: number;
  pointsPerQuestion: number;
  referenceMaterial: string;
}

export interface ParsedTopic {
  title: string;
  content: string;
  selected: boolean;
}

export interface Question {
  question_text: string;
  options?: string[];
  column_a?: string[];
  column_b?: string[];
  type: 'Nhiều lựa chọn' | 'Đúng – Sai' | 'Nối cột' | 'Điền khuyết' | 'Tự luận';
  level: 1 | 2 | 3;
  points: number;
}

export interface Answer {
  question_number: number;
  correct_answer: string;
  explanation: string;
  points: number;
}

export interface ExamData {
  title: string;
  subject: string;
  grade: string;
  duration: number;
  multiple_choice_questions: Question[];
  essay_questions: Question[];
  answer_key: Answer[];
  exam_matrix?: string;
  specification_table?: string;
  multiple_choice_total_points: number;
  essay_total_points: number;
}
