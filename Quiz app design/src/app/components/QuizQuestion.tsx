import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { ChevronRight } from "lucide-react";
import { Badge } from "./ui/badge";
import { useState, useEffect } from "react";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number | number[];
  category: string;
}

interface QuizQuestionProps {
  question: Question;
  selectedAnswer: number[] | null;
  onAnswerSelect: (answerIndices: number[]) => void;
  onNext: () => void;
  isLastQuestion: boolean;
}

// Helper function to shuffle array
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Category to emoji mapping
const getCategoryEmoji = (category: string): string => {
  const emojiMap: Record<string, string> = {
    "Price Negotiation": "💰",
    "Bid Tab & PO Award": "📋",
    "General": "📌",
    "RFQ/RFP": "✉️",
    "Supplier Registration & Selection": "📝",
    "Supplier Management": "🔧",
    "PR Creation": "📄",
    "Global Coding System": "🌐",
    "PO Management": "📦",
  };
  return emojiMap[category] || "🏷️";
};

export function QuizQuestion({
  question,
  selectedAnswer,
  onAnswerSelect,
  onNext,
  isLastQuestion,
}: QuizQuestionProps) {
  const isMultipleChoice = Array.isArray(question.correctAnswer);
  
  // State for randomized options and their mapping
  const [randomizedOptions, setRandomizedOptions] = useState<string[]>([]);
  const [originalToRandomMap, setOriginalToRandomMap] = useState<number[]>([]);
  const [randomToOriginalMap, setRandomToOriginalMap] = useState<number[]>([]);

  // Randomize options when question changes
  useEffect(() => {
    // Create array of option indices
    const indices = question.options.map((_, i) => i);
    const shuffledIndices = shuffleArray(indices);
    
    // Map original index to new position
    const newOriginalToRandom: number[] = new Array(question.options.length);
    const newRandomToOriginal: number[] = new Array(question.options.length);

    console.log("=== RANDOMIZE QUESTION ===");
    console.log("Question ID:", question.id);
    console.log("Original options:", question.options);
    console.log("Shuffled indices:", shuffledIndices);
    
    shuffledIndices.forEach((originalIdx, newIdx) => {
      newOriginalToRandom[originalIdx] = newIdx;
      newRandomToOriginal[newIdx] = originalIdx;
    });

    console.log("Original → Random map:", newOriginalToRandom);
    console.log("Random → Original map:", newRandomToOriginal);
    console.log("Correct answer (original index):", question.correctAnswer);
    console.log("Correct answer will appear at random position:", newOriginalToRandom[question.correctAnswer as number]);
      
    // Create randomized options array
    const newRandomizedOptions = shuffledIndices.map(i => question.options[i]);
    
    setRandomizedOptions(newRandomizedOptions);
    setOriginalToRandomMap(newOriginalToRandom);
    setRandomToOriginalMap(newRandomToOriginal);
    
    // Reset selected answer when question changes
    onAnswerSelect([]);
  }, [question.id]); // Re-randomize when question changes

  // Convert selected indices from original to randomized positions for display
  const getSelectedIndicesInRandomOrder = (): number[] => {
    if (!selectedAnswer) return [];
    return selectedAnswer.map(originalIdx => originalToRandomMap[originalIdx]);
  };

  const handleToggleOption = (randomIndex: number) => {
    // Convert random position back to original index
    const originalIndex = randomToOriginalMap[randomIndex];

    // DEBUG: Add these console logs
    console.log("=== CLICK DEBUG ===");
    console.log("Random index clicked:", randomIndex);
    console.log("Original index (from map):", originalIndex);
    console.log("Question correctAnswer:", question.correctAnswer);
    console.log("Current selectedAnswer:", selectedAnswer);
    
    if (isMultipleChoice) {
      // Multiple choice: toggle on/off
      if (selectedAnswer?.includes(originalIndex)) {
        onAnswerSelect(selectedAnswer.filter(i => i !== originalIndex));
      } else {
        onAnswerSelect([...(selectedAnswer || []), originalIndex]);
      }
    } else {
      // Single choice: replace with new selection
      onAnswerSelect([originalIndex]);
    }
  };

  const isOptionSelected = (randomIndex: number): boolean => {
    const originalIndex = randomToOriginalMap[randomIndex];
    return selectedAnswer?.includes(originalIndex) || false;
  };

  const hasAnswer = (selectedAnswer?.length || 0) > 0;

  // Show original options while loading (prevents flicker)
  const displayOptions = randomizedOptions.length > 0 ? randomizedOptions : question.options;
  
  const categoryEmoji = getCategoryEmoji(question.category);

  return (
    <Card className="shadow-xl">
      <CardHeader>
        {/* Category Badge - Now at the TOP, above question */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
            <span>{categoryEmoji}</span>
            <span>{question.category}</span>
          </div>
        </div>
        
        {/* Question */}
        <CardTitle className="text-lg">{question.question}</CardTitle>
        
        <CardDescription className="mt-2">
          {isMultipleChoice 
            ? "✅ Select all that apply (click any option to select)" 
            : "🔘 Select one answer (click any option to select)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayOptions.map((option, randomIndex) => (
            <label
              key={randomIndex}
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                isOptionSelected(randomIndex)
                  ? "bg-purple-50 border-purple-500 shadow-sm"
                  : "border-input hover:bg-accent/50"
              }`}
            >
              {isMultipleChoice ? (
                <input
                  type="checkbox"
                  checked={isOptionSelected(randomIndex)}
                  onChange={() => handleToggleOption(randomIndex)}
                  className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 pointer-events-none"
                />
              ) : (
                <input
                  type="radio"
                  checked={isOptionSelected(randomIndex)}
                  onChange={() => handleToggleOption(randomIndex)}
                  name={`question-${question.id}`}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500 pointer-events-none"
                />
              )}
              <span className="flex-1 text-gray-700">{option}</span>
            </label>
          ))}
        </div>
        {isMultipleChoice && (
          <p className="text-xs text-muted-foreground mt-3">
            💡 Tip: Click anywhere on an option to select it
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button
          onClick={onNext}
          disabled={!hasAnswer}
          size="lg"
          className="min-w-32 bg-purple-600 hover:bg-purple-700"
        >
          {isLastQuestion ? "Finish" : "Next"}
          {!isLastQuestion && <ChevronRight className="size-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
}