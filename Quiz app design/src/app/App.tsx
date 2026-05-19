import { useState, useEffect } from "react";
import { QuizQuestion } from "./components/QuizQuestion";
import { QuizResults } from "./components/QuizResults";
import { Progress } from "./components/ui/progress";
import { Button } from "./components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "./components/ui/card";
import { Input } from "./components/ui/input"; // ADD THIS
import { Label } from "./components/ui/label"; // ADD THIS
import { MY_QUESTIONS } from "./questions";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number | number[];
  category: string;
}

interface QuestionResult {
  question: Question;
  selectedAnswer: number[];
  isCorrect: boolean;
}

interface CategoryStats {
  recentCorrect: number[];  // Timestamps of correct answers
  recentWrong: number[];    // Timestamps of wrong answers
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function App() {
  const [allQuestions, setAllQuestions] = useState<Question[]>(
    () => {
      const saved = localStorage.getItem("quiz-questions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.length > 0 ? parsed : MY_QUESTIONS;
        } catch (e) {
          return MY_QUESTIONS;
        }
      }
      return MY_QUESTIONS;
    },
  );

  // NEW: User info states
  const [userName, setUserName] = useState(() => {
    const saved = localStorage.getItem("quiz-user-name");
    return saved || "";
  });
  const [userId, setUserId] = useState(() => {
    const saved = localStorage.getItem("quiz-user-id");
    return saved || "";
  });
  const [isQuizStarted, setIsQuizStarted] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSelectedAnswer, setCurrentSelectedAnswer] = useState<number[] | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [masteredCategories, setMasteredCategories] = useState<Set<string>>(new Set());
  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<number>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [categoryStats, setCategoryStats] = useState<Map<string, CategoryStats>>(new Map());

  const TOTAL_QUESTIONS = 5;
  const RECENT_WINDOW_SIZE = 3;

  // Save user info to localStorage
  useEffect(() => {
    if (userName) localStorage.setItem("quiz-user-name", userName);
    if (userId) localStorage.setItem("quiz-user-id", userId);
  }, [userName, userId]);

  useEffect(() => {
    if (allQuestions.length > 0 && isQuizStarted) {
      localStorage.setItem("quiz-questions", JSON.stringify(allQuestions));
      startNewQuiz();
    } else if (!isQuizStarted) {
      localStorage.removeItem("quiz-questions");
    }
  }, [allQuestions, isQuizStarted]);

  const startNewQuiz = () => {
    setMasteredCategories(new Set());
    setUsedQuestionIds(new Set());
    setQuestionResults([]);
    setCategoryStats(new Map());
    setCurrentQuestionIndex(0);
    setCurrentSelectedAnswer(null);
    setShowResults(false);
    generateNextQuestion(new Set(), new Set());
  };

  const handleStartQuiz = () => {
    if (!userName.trim() || !userId.trim()) {
      alert("Please enter both Name and ID to start the quiz");
      return;
    }
    setIsQuizStarted(true);
  };

  const getUnmasteredCategories = (mastered: Set<string>): string[] => {
    const allCategories = [...new Set(allQuestions.map((q) => q.category))];
    return allCategories.filter((cat) => !mastered.has(cat));
  };

  const getRecentSuccessRate = (stats: CategoryStats): number => {
    const recentCorrect = stats.recentCorrect.length;
    const recentWrong = stats.recentWrong.length;
    const totalRecent = recentCorrect + recentWrong;
    
    if (totalRecent === 0) return 1;
    return recentCorrect / totalRecent;
  };

  const getTotalAttempts = (stats: CategoryStats): number => {
    return stats.recentCorrect.length + stats.recentWrong.length;
  };

  const getWeakestCategory = (stats: Map<string, CategoryStats>): string | null => {
    let weakestCategory: string | null = null;
    let lowestSuccessRate = 1;
    let highestTotalAttempts = 0;

    for (const [category, stat] of stats.entries()) {
      const successRate = getRecentSuccessRate(stat);
      const totalAttempts = getTotalAttempts(stat);
      
      if (weakestCategory === null) {
        weakestCategory = category;
        lowestSuccessRate = successRate;
        highestTotalAttempts = totalAttempts;
      } else if (successRate < lowestSuccessRate) {
        weakestCategory = category;
        lowestSuccessRate = successRate;
        highestTotalAttempts = totalAttempts;
      } else if (successRate === lowestSuccessRate && totalAttempts > highestTotalAttempts) {
        weakestCategory = category;
        highestTotalAttempts = totalAttempts;
      }
    }
    
    return weakestCategory;
  };

  const getSecondWeakestCategory = (stats: Map<string, CategoryStats>, weakestCategory: string): string | null => {
    let secondWeakest: string | null = null;
    let secondLowestSuccessRate = 1;
    let secondHighestTotalAttempts = 0;

    for (const [category, stat] of stats.entries()) {
      if (category === weakestCategory) continue;
      
      const successRate = getRecentSuccessRate(stat);
      const totalAttempts = getTotalAttempts(stat);
      
      if (secondWeakest === null) {
        secondWeakest = category;
        secondLowestSuccessRate = successRate;
        secondHighestTotalAttempts = totalAttempts;
      } else if (successRate < secondLowestSuccessRate) {
        secondWeakest = category;
        secondLowestSuccessRate = successRate;
        secondHighestTotalAttempts = totalAttempts;
      } else if (successRate === secondLowestSuccessRate && totalAttempts > secondHighestTotalAttempts) {
        secondWeakest = category;
        secondHighestTotalAttempts = totalAttempts;
      }
    }
    
    return secondWeakest;
  };

  const generateNextQuestion = (
    currentMastered: Set<string>,
    currentUsedIds: Set<number>,
  ) => {
    const unmasteredCategories = getUnmasteredCategories(currentMastered);
    let availableQuestions: Question[];
  
    if (unmasteredCategories.length === 0) {
      const weakestCategory = getWeakestCategory(categoryStats);
      const secondWeakest = getSecondWeakestCategory(categoryStats, weakestCategory || "");
      
      if (weakestCategory && secondWeakest) {
        const weakestSuccessRate = getRecentSuccessRate(categoryStats.get(weakestCategory)!);
        const secondSuccessRate = getRecentSuccessRate(categoryStats.get(secondWeakest)!);
        
        if (weakestSuccessRate <= secondSuccessRate) {
          availableQuestions = allQuestions.filter(
            (q) => q.category === weakestCategory && !currentUsedIds.has(q.id)
          );
          
          if (availableQuestions.length > 0) {
            const shuffled = shuffleArray(availableQuestions);
            setCurrentQuestion(shuffled[0]);
            setCurrentSelectedAnswer(null);
            return;
          }
        }
      }
      
      availableQuestions = allQuestions.filter((q) => !currentUsedIds.has(q.id));

      if (availableQuestions.length === 0) {
        console.warn("All questions used - showing results");
        setShowResults(true);
        return;
      }
    } else {
      availableQuestions = allQuestions.filter(
        (q) => unmasteredCategories.includes(q.category) && !currentUsedIds.has(q.id)
      );
      
      if (availableQuestions.length === 0) {
        availableQuestions = allQuestions.filter((q) => !currentUsedIds.has(q.id));

        if (availableQuestions.length === 0) {
          console.warn("All questions exhausted - showing results");
          setShowResults(true);
          return;
        }
      }
    }
  
    if (availableQuestions.length === 0) {
      throw new Error("No questions available!");
    }
  
    const shuffled = shuffleArray(availableQuestions);
    const nextQuestion = shuffled[0];
  
    setCurrentQuestion(nextQuestion);
    setCurrentSelectedAnswer(null);
  };

  const handleAnswerSelect = (answerIndices: number[]) => {
    setCurrentSelectedAnswer(answerIndices);
  };

  const checkIsCorrect = (question: Question, selectedAnswers: number[]): boolean => {
    if (!selectedAnswers.length) return false;
    
    const sortedSelected = [...selectedAnswers].sort();
    
    if (Array.isArray(question.correctAnswer)) {
      const sortedCorrect = [...question.correctAnswer].sort();
      return sortedSelected.length === sortedCorrect.length && 
             sortedSelected.every((val, idx) => val === sortedCorrect[idx]);
    } else {
      return sortedSelected.length === 1 && sortedSelected[0] === question.correctAnswer;
    }
  };

  const handleNext = () => {
    if (!currentQuestion || currentSelectedAnswer === null) return;

    const isCorrect = checkIsCorrect(currentQuestion, currentSelectedAnswer);

    const currentStats = categoryStats.get(currentQuestion.category) || { 
      recentCorrect: [], 
      recentWrong: [] 
    };
    
    const now = Date.now();
    if (isCorrect) {
      currentStats.recentCorrect.push(now);
      if (currentStats.recentCorrect.length > RECENT_WINDOW_SIZE) {
        currentStats.recentCorrect.shift();
      }
    } else {
      currentStats.recentWrong.push(now);
      if (currentStats.recentWrong.length > RECENT_WINDOW_SIZE) {
        currentStats.recentWrong.shift();
      }
    }
    
    setCategoryStats(new Map(categoryStats.set(currentQuestion.category, currentStats)));

    const newResult: QuestionResult = {
      question: currentQuestion,
      selectedAnswer: currentSelectedAnswer,
      isCorrect: isCorrect,
    };
    setQuestionResults((prev) => [...prev, newResult]);

    let newMastered = new Set(masteredCategories);
    if (isCorrect) {
      newMastered.add(currentQuestion.category);
      setMasteredCategories(newMastered);
    }

    const newUsedIds = new Set(usedQuestionIds);
    newUsedIds.add(currentQuestion.id);
    setUsedQuestionIds(newUsedIds);

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex >= TOTAL_QUESTIONS) {
      setShowResults(true);
    } else {
      setCurrentQuestionIndex(nextIndex);
      generateNextQuestion(newMastered, newUsedIds);
    }
  };

  const handleRestart = () => {
    startNewQuiz();
  };

  const handleClearQuestions = () => {
    if (confirm("Are you sure you want to clear all saved questions?")) {
      localStorage.removeItem("quiz-questions");
      setAllQuestions(MY_QUESTIONS);
      setCurrentQuestion(null);
      setShowResults(false);
      startNewQuiz();
    }
  };

  const calculateScore = () => {
    const correctCount = questionResults.filter((r) => r.isCorrect).length;
    return correctCount;
  };

  const getCategoryStatus = () => {
    const allCategories = [...new Set(allQuestions.map((q) => q.category))];
    return allCategories.map((cat) => ({
      category: cat,
      mastered: masteredCategories.has(cat),
    }));
  };

  // SHOW LOGIN SCREEN IF QUIZ NOT STARTED
  if (!isQuizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-800">
              📚 GMM Procurement Policy and SOP E-Learning Quiz
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Please enter your details to begin
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleStartQuiz();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id" className="text-gray-700">
                  Employee ID
                </Label>
                <Input
                  id="id"
                  type="text"
                  placeholder="Enter your ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleStartQuiz();
                  }}
                />
              </div>
              <Button 
                onClick={handleStartQuiz} 
                className="w-full mt-4"
                size="lg"
              >
                Start Quiz 🚀
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResults) {
  return (
    <QuizResults
      score={calculateScore()}
      totalQuestions={TOTAL_QUESTIONS}
      onRestart={handleRestart}
      questions={questionResults.map((r) => r.question)}
      selectedAnswers={questionResults.map((r) => r.selectedAnswer)}
      userName={userName}
      userId={userId}
    />
  );
}

  if (!currentQuestion || allQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Loading questions...</p>
        </div>
      </div>
    );
  }

  const unmasteredCount = getUnmasteredCategories(masteredCategories).length;
  const progress = ((currentQuestionIndex + 1) / TOTAL_QUESTIONS) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">📚 Quiz App</h1>
              <p className="text-sm text-gray-500 mt-1">
                {userName} ({userId})
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearQuestions}
                className="text-red-600 hover:text-red-700"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-2 flex justify-between text-sm text-gray-600">
            <span>Question {currentQuestionIndex + 1} of {TOTAL_QUESTIONS}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 rounded-full" />
        </div>

        <QuizQuestion
          key={currentQuestion.id}
          question={currentQuestion}
          selectedAnswer={currentSelectedAnswer}
          onAnswerSelect={handleAnswerSelect}
          onNext={handleNext}
          isLastQuestion={currentQuestionIndex === TOTAL_QUESTIONS - 1}
        />
      </div>
    </div>
  );
}