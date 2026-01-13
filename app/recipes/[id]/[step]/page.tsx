"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import recipeData from "../../../../data/recipes/sample.json";
import { analyzeImageAgainstExpected } from "../../../../lib/color";
import { ComparisonResult, ExpectedColorStats } from "../../../../lib/types";

type StepState = {
  result?: ComparisonResult;
};

type StoredSession = {
  currentStep: number;
  steps: Record<number, StepState>;
};

const storageKey = (recipeId: string) => `color-cooking:${recipeId}`;

// Ingredient color palette - maps common ingredients to their typical colors
const ingredientColors: Record<string, { r: number; g: number; b: number }> = {
  "coconut milk": { r: 255, g: 250, b: 240 },
  "coconut cream": { r: 255, g: 250, b: 240 },
  "curry paste": { r: 200, g: 50, b: 30 },
  "red curry": { r: 200, g: 50, b: 30 },
  "chicken": { r: 255, g: 240, b: 220 },
  "chicken stock": { r: 255, g: 235, b: 200 },
  "fish sauce": { r: 180, g: 150, b: 120 },
  "palm sugar": { r: 220, g: 180, b: 120 },
  "squash": { r: 255, g: 200, b: 100 },
  "thai basil": { r: 50, g: 150, b: 50 },
  "basil": { r: 50, g: 150, b: 50 },
  "red pepper": { r: 255, g: 50, b: 50 },
  "peppers": { r: 255, g: 50, b: 50 },
  "onion": { r: 255, g: 250, b: 220 },
  "garlic": { r: 255, g: 250, b: 240 },
  "oil": { r: 255, g: 250, b: 230 },
  "tomato": { r: 255, g: 100, b: 80 },
  "tomatoes": { r: 255, g: 100, b: 80 },
};

type IngredientInfo = {
  name: string;
  amount: string;
  normalizedAmount: number; // For proportional sizing
};

// Convert fractions and amounts to a normalized number for proportional sizing
function normalizeAmount(amountText: string): number {
  const text = amountText.toLowerCase().trim();
  
  // Handle fractions (½, ⅓, ¼, etc.)
  const fractionMap: Record<string, number> = {
    "½": 0.5, "1/2": 0.5,
    "⅓": 0.33, "1/3": 0.33,
    "¼": 0.25, "1/4": 0.25,
    "¾": 0.75, "3/4": 0.75,
  };

  // Extract number (handle ranges like "3½-5" by taking average)
  let number = 0;
  const numberMatch = text.match(/(\d+[½⅓¼¾]?|\d+\/\d+)/);
  if (numberMatch) {
    const numStr = numberMatch[1];
    // Handle fractions in numbers
    if (numStr.includes("½")) {
      number = parseFloat(numStr.replace("½", "")) + 0.5;
    } else if (numStr.includes("⅓")) {
      number = parseFloat(numStr.replace("⅓", "")) + 0.33;
    } else if (numStr.includes("¼")) {
      number = parseFloat(numStr.replace("¼", "")) + 0.25;
    } else if (numStr.includes("¾")) {
      number = parseFloat(numStr.replace("¾", "")) + 0.75;
    } else if (numStr.includes("/")) {
      const [n, d] = numStr.split("/").map(Number);
      number = n / d;
    } else {
      number = parseFloat(numStr);
    }
    
    // Handle ranges (e.g., "3½-5" -> average)
    const rangeMatch = text.match(/(\d+[½⅓¼¾]?|\d+\/\d+)-(\d+)/);
    if (rangeMatch) {
      const max = parseFloat(rangeMatch[2]);
      number = (number + max) / 2;
    }
  } else {
    // Try to find any number
    const simpleMatch = text.match(/\d+/);
    if (simpleMatch) {
      number = parseFloat(simpleMatch[0]);
    } else {
      number = 1; // Default if no number found
    }
  }

  // Normalize units to a common base (cups as base unit)
  let multiplier = 1;
  if (text.includes("tablespoon") || text.includes("tbsp")) {
    multiplier = 1 / 16; // 1 tbsp = 1/16 cup
  } else if (text.includes("teaspoon") || text.includes("tsp")) {
    multiplier = 1 / 48; // 1 tsp = 1/48 cup
  } else if (text.includes("lb") || text.includes("pound")) {
    multiplier = 2; // 1 lb ≈ 2 cups (rough approximation)
  } else if (text.includes("cup")) {
    multiplier = 1;
  } else if (text.includes("oz") || text.includes("ounce")) {
    multiplier = 1 / 8; // 1 oz = 1/8 cup
  }

  return number * multiplier;
}

// Convert ingredients from recipe data to IngredientInfo format
function processIngredients(ingredients?: Array<{ name: string; amount: string }>): IngredientInfo[] {
  if (!ingredients || ingredients.length === 0) {
    return [];
  }

  return ingredients.map(ing => ({
    name: ing.name.toLowerCase(),
    amount: ing.amount,
    normalizedAmount: normalizeAmount(ing.amount)
  }));
}

export default function RecipeStepPage({ params }: { params: { id: string; step: string } }) {
  const router = useRouter();
  const stepIndex = Math.max(0, Number(params.step) - 1);
  const recipe = recipeData;
  const step = recipe.steps[stepIndex];
  const expectedStats = step.expectedColorStats as ExpectedColorStats;
  const totalSteps = recipe.steps.length;

  const [session, setSession] = useState<StoredSession>({
    currentStep: stepIndex,
    steps: {}
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey(recipe.id));
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredSession;
        setSession(parsed);
      } catch {
        // ignore parse errors
      }
    }
  }, [recipe.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextSession: StoredSession = {
      ...session,
      currentStep: stepIndex
    };
    window.localStorage.setItem(storageKey(recipe.id), JSON.stringify(nextSession));
  }, [session, recipe.id, stepIndex]);

  const stepState = session.steps[stepIndex] ?? {};
  const targetColor = step.expectedColorStats.avgRgb;
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const ingredients = processIngredients((step as any).ingredients);

  const handleNavigate = (nextIndex: number) => {
    const bounded = clamp(nextIndex, 0, totalSteps - 1);
    router.push(`/recipes/${recipe.id}/${bounded + 1}`);
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Minimum swipe distance (50px) and ensure it's more horizontal than vertical
    const minSwipeDistance = 50;
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        // Swipe right = go back
        if (stepIndex > 0) {
          handleNavigate(stepIndex - 1);
        }
      } else {
        // Swipe left = go next
        if (stepIndex < totalSteps - 1) {
          handleNavigate(stepIndex + 1);
        }
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleFileChange = async (file?: File | null) => {
    if (!file) return;
    try {
      const result = await analyzeImageAgainstExpected(file, expectedStats as any);
      setSession((prev) => ({
        ...prev,
        steps: { ...prev.steps, [stepIndex]: { result } }
      }));
    } catch (err) {
      console.error(err);
      alert("Could not analyze the image. Please try a different photo.");
    }
  };


  if (!step) {
    return (
      <main className="container">
        <p>Step not found.</p>
      </main>
    );
  }

  return (
    <main
      className="container"
      style={{ paddingTop: "20px", paddingBottom: "40px" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Recipe title */}
      <div style={{ marginBottom: "30px" }}>
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "28px",
            fontWeight: 300,
            letterSpacing: "-0.5px",
            color: "#1a1a1a"
          }}
        >
          {recipe.title}
        </h1>
      </div>

      {/* Ingredient color bar */}
      {ingredients.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
          <div
            style={{
              display: "flex",
              gap: "2px",
              height: "40px",
              borderRadius: "0",
              overflow: "visible",
              position: "relative"
            }}
          >
            {(() => {
              // Calculate total normalized amount for proportional sizing
              const totalAmount = ingredients.reduce((sum, ing) => sum + ing.normalizedAmount, 0);
              
              return ingredients.map((ingredient, idx) => {
                const color = ingredientColors[ingredient.name as keyof typeof ingredientColors];
                const widthPercent = totalAmount > 0 
                  ? (ingredient.normalizedAmount / totalAmount) * 100 
                  : 100 / ingredients.length;
                const displayName = ingredient.name.charAt(0).toUpperCase() + ingredient.name.slice(1);
                
                return (
                  <IngredientBar
                    key={idx}
                    color={color}
                    widthPercent={widthPercent}
                    displayName={displayName}
                    amount={ingredient.amount}
                  />
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Color comparison - side by side at top */}
      <div style={{ marginBottom: "50px", textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            gap: "30px",
            justifyContent: "center",
            alignItems: "flex-start",
            marginBottom: "20px"
          }}
        >
          <div style={{ textAlign: "center", flex: 1, maxWidth: "200px" }}>
            <div
              style={{
                width: "100%",
                maxWidth: "200px",
                height: "200px",
                margin: "0 auto 12px",
                borderRadius: "50%",
                background: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`,
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                border: "1px solid rgba(0,0,0,0.05)"
              }}
            />
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#666",
                fontWeight: 300,
                letterSpacing: "0.5px"
              }}
            >
              Recipe
            </p>
          </div>
          {stepState.result && (
            <div style={{ textAlign: "center", flex: 1, maxWidth: "200px" }}>
              <div
                style={{
                  width: "100%",
                  maxWidth: "200px",
                  height: "200px",
                  margin: "0 auto 12px",
                  borderRadius: "50%",
                  background: `rgb(${stepState.result.average.r}, ${stepState.result.average.g}, ${stepState.result.average.b})`,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  border: "1px solid rgba(0,0,0,0.05)"
                }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "#666",
                  fontWeight: 300,
                  letterSpacing: "0.5px"
                }}
              >
                Your cooking
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{ marginBottom: "50px" }}>
        <div
          style={{
            marginBottom: "12px",
            fontSize: "13px",
            color: "#999",
            fontWeight: 300,
            letterSpacing: "1px",
            textTransform: "uppercase"
          }}
        >
          Step {stepIndex + 1} of {totalSteps}
        </div>
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: "24px",
            fontWeight: 300,
            letterSpacing: "-0.3px",
            color: "#1a1a1a"
          }}
        >
          {step.title}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "16px",
            lineHeight: "1.6",
            color: "#333",
            fontWeight: 300
          }}
        >
          {step.instructions}
        </p>
      </div>

      {/* Photo upload - Main CTA */}
      <div style={{ marginBottom: "30px" }}>
        <label
          htmlFor="photo-upload"
          style={{
            display: "block",
            width: "100%",
            padding: "20px",
            background: "#1a1a1a",
            color: "#ffffff",
            fontSize: "18px",
            fontWeight: 300,
            letterSpacing: "0.5px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            borderRadius: "0"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          {stepState.result ? "Upload another photo" : "Upload photo"}
        </label>
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
          style={{ display: "none" }}
        />
      </div>

      {/* Navigation buttons - Back and Next together */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "40px",
          paddingTop: "20px",
          borderTop: "1px solid #e0e0e0"
        }}
      >
        <button
          onClick={() => handleNavigate(stepIndex - 1)}
          disabled={stepIndex === 0}
          style={{
            background: "transparent",
            color: stepIndex === 0 ? "#ccc" : "#1a1a1a",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: 300,
            letterSpacing: "0.5px",
            border: "none",
            cursor: stepIndex === 0 ? "not-allowed" : "pointer",
            opacity: stepIndex === 0 ? 0.3 : 1,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            if (stepIndex > 0) {
              e.currentTarget.style.color = "#666";
            }
          }}
          onMouseLeave={(e) => {
            if (stepIndex > 0) {
              e.currentTarget.style.color = "#1a1a1a";
            }
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => handleNavigate(stepIndex + 1)}
          disabled={stepIndex === totalSteps - 1}
          style={{
            background: "transparent",
            color: stepIndex === totalSteps - 1 ? "#ccc" : "#1a1a1a",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: 300,
            letterSpacing: "0.5px",
            border: "none",
            cursor: stepIndex === totalSteps - 1 ? "not-allowed" : "pointer",
            opacity: stepIndex === totalSteps - 1 ? 0.3 : 1,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            if (stepIndex < totalSteps - 1) {
              e.currentTarget.style.color = "#666";
            }
          }}
          onMouseLeave={(e) => {
            if (stepIndex < totalSteps - 1) {
              e.currentTarget.style.color = "#1a1a1a";
            }
          }}
        >
          Next →
        </button>
      </div>
    </main>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// Custom tooltip component for ingredient bars
function IngredientBar({
  color,
  widthPercent,
  displayName,
  amount
}: {
  color: { r: number; g: number; b: number };
  widthPercent: number;
  displayName: string;
  amount: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      style={{
        width: `${widthPercent}%`,
        background: `rgb(${color.r}, ${color.g}, ${color.b})`,
        minWidth: "20px",
        position: "relative",
        cursor: "pointer",
        transition: "opacity 0.2s ease"
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onMouseMove={(e) => {
        e.currentTarget.style.opacity = "0.8";
      }}
    >
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: "8px",
            padding: "8px 12px",
            background: "#1a1a1a",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 300,
            whiteSpace: "nowrap",
            zIndex: 1000,
            pointerEvents: "none",
            borderRadius: "0"
          }}
        >
          {displayName}: {amount}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid #1a1a1a"
            }}
          />
        </div>
      )}
    </div>
  );
}
