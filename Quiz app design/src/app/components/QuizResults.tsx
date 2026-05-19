import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { RotateCcw, Trophy, FileText } from "lucide-react";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number | number[];
  category: string;
}

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  onRestart: () => void;
  questions: Question[];
  selectedAnswers: (number | number[] | null)[];
  userName: string;
  userId: string;
}

export function QuizResults({
  score,
  totalQuestions,
  onRestart,
  questions,
  selectedAnswers,
  userName,
  userId,
}: QuizResultsProps) {
  const percentage = Math.round((score / totalQuestions) * 100);
  const isPassing = percentage >= 75;

  // ✅ FIXED: helper MUST be OUTSIDE functions
  const getOptionText = (question: Question, index: number) => {
    return question.options[index];
  };

  // ✅ FIXED: correct checking logic
  const isAnswerCorrect = (
    question: Question,
    answer: number | number[] | null
  ): boolean => {
    if (answer === null) return false;

    const correctArray = Array.isArray(question.correctAnswer)
      ? [...question.correctAnswer].sort()
      : [question.correctAnswer];

    const selectedArray = Array.isArray(answer)
      ? [...answer].sort()
      : [answer];

    if (selectedArray.length !== correctArray.length) return false;

    return selectedArray.every((val, idx) => val === correctArray[idx]);
  };

  // ❌ WRONG ANSWERS LIST
  const wrongQuestions = questions
    .map((q, index) => {
      const isCorrect = isAnswerCorrect(q, selectedAnswers[index]);
      return {
        question: q,
        selected: selectedAnswers[index],
        isCorrect,
      };
    })
    .filter((r) => !r.isCorrect);

  const generateCertificate = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const currentDate = new Date().toLocaleDateString();

    printWindow.document.write(`
      <html>
      <head><title>Certificate</title></head>
      <body>
        <h1>Certificate of Completion</h1>
        <p>${userName} (${userId})</p>
        <p>Score: ${score}/${totalQuestions} (${percentage}%)</p>
        <p>Date: ${currentDate}</p>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  const getScoreMessage = () => {
    if (percentage === 100) return "Perfect Score! 🎉";
    if (percentage >= 90) return "Excellent Work! 🌟";
    if (percentage >= 75) return "Good Job! You Passed! 👍";
    if (percentage >= 60) return "Close! Keep Studying 📚";
    return "Needs Improvement 💪";
  };

  const getScoreColor = () => {
    if (percentage >= 75) return "text-green-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getCategoryPerformance = () => {
    const categoryStats: Record<string, { correct: number; total: number }> =
      {};

    questions.forEach((question, index) => {
      const cat = question.category;

      if (!categoryStats[cat]) {
        categoryStats[cat] = { correct: 0, total: 0 };
      }

      categoryStats[cat].total += 1;

      if (isAnswerCorrect(question, selectedAnswers[index])) {
        categoryStats[cat].correct += 1;
      }
    });

    return Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        correct: stats.correct,
        total: stats.total,
        percentage: Math.round(
          (stats.correct / stats.total) * 100
        ),
      }))
      .sort((a, b) => a.percentage - b.percentage);
  };

  const categoryPerformance = getCategoryPerformance();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* SCORE CARD */}
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <Trophy className={`size-16 ${getScoreColor()}`} />

            <CardTitle className="text-3xl">
              {getScoreMessage()}
            </CardTitle>

            <CardDescription className="text-lg">
              You scored{" "}
              <span className={getScoreColor()}>{score}</span>{" "}
              out of {totalQuestions}
            </CardDescription>

            <Badge className={isPassing ? "bg-green-500" : "bg-red-500"}>
              {isPassing ? "PASSED ✓" : "FAILED ✗"}
            </Badge>
          </CardHeader>

          <CardContent>
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor()}`}>
                {percentage}%
              </div>
              <p className="text-sm text-gray-500">
                Passing score: 75%
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3 justify-center">
            {isPassing && (
              <Button
                onClick={generateCertificate}
                className="bg-green-600 hover:bg-green-700"
              >
                <FileText className="mr-2" />
                Certificate
              </Button>
            )}

            <Button onClick={onRestart}>
              <RotateCcw className="mr-2" />
              Retake Quiz
            </Button>
          </CardFooter>
        </Card>

        {/* CATEGORY PERFORMANCE */}
        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {categoryPerformance.map((cat) => (
              <div
                key={cat.category}
                className="flex justify-between items-center"
              >
                <Badge variant="outline">{cat.category}</Badge>

                <div className="w-40 h-2 bg-gray-200 rounded">
                  <div
                    className="h-2 bg-green-500 rounded"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>

                <span>{cat.percentage}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ❌ WRONG ANSWERS REVIEW */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">
              Incorrect Answers Review
            </CardTitle>
          </CardHeader>

          <CardContent>
            {wrongQuestions.length === 0 ? (
              <p className="text-green-600 font-medium">
                🎉 No wrong answers!
              </p>
            ) : (
              <div className="space-y-4">
                {wrongQuestions.map((item, idx) => (
                  <div
                    key={item.question.id}
                    className="p-4 border rounded bg-red-50"
                  >
                    <p className="font-semibold">
                      Q{idx + 1}. {item.question.question}
                    </p>

                    <p className="text-sm text-red-600">
                      Your answer:{" "}
                      {item.selected?.length
                        ? item.selected
                            .map((i) =>
                              getOptionText(item.question, i)
                            )
                            .join(", ")
                        : "No answer"}
                    </p>

                    <p className="text-sm text-green-600">
                      Correct:{" "}
                      {Array.isArray(item.question.correctAnswer)
                        ? item.question.correctAnswer
                            .map((i) =>
                              getOptionText(item.question, i)
                            )
                            .join(", ")
                        : getOptionText(
                            item.question,
                            item.question.correctAnswer
                          )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}