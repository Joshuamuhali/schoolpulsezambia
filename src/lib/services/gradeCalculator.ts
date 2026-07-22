/**
 * Grade Calculator Service
 * Translates numeric scores to grade letters and standard remarks.
 */

export interface GradeBoundary {
  min: number;
  max: number;
  letter: string;
  remark: string;
}

export const DEFAULT_GRADING_SCALE: GradeBoundary[] = [
  { min: 80, max: 100, letter: "A", remark: "Excellent" },
  { min: 65, max: 79.99, letter: "B", remark: "Very Good" },
  { min: 50, max: 64.99, letter: "C", remark: "Good" },
  { min: 35, max: 49.99, letter: "D", remark: "Satisfactory" },
  { min: 0, max: 34.99, letter: "F", remark: "Fail" },
];

/**
 * Calculates grade letter based on a raw numeric score
 */
export function calculateGrade(score: number, scale = DEFAULT_GRADING_SCALE): { letter: string; remark: string } {
  const matched = scale.find((boundary) => score >= boundary.min && score <= boundary.max);
  if (matched) {
    return { letter: matched.letter, remark: matched.remark };
  }
  
  if (score >= 100) return { letter: "A", remark: "Excellent" };
  return { letter: "F", remark: "Fail" };
}

/**
 * Calculates class summary statistics
 */
export function calculateClassStats(scores: number[]) {
  if (scores.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      passRate: 0,
    };
  }

  const sum = scores.reduce((a, b) => a + b, 0);
  const average = sum / scores.length;
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  const passing = scores.filter((score) => score >= 50).length;
  const passRate = (passing / scores.length) * 100;

  return {
    average: Math.round(average * 100) / 100,
    min,
    max,
    passRate: Math.round(passRate * 10) / 10,
  };
}
