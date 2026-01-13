import recipeData from "../../../../data/recipes/sample.json";
import RecipeStepClient from "./RecipeStepClient";

// Generate static params for static export
export function generateStaticParams() {
  const recipe = recipeData;
  const params = [];
  
  // Generate params for each step
  for (let step = 1; step <= recipe.steps.length; step++) {
    params.push({
      id: recipe.id,
      step: step.toString()
    });
  }
  
  return params;
}

export default function RecipeStepPage({ params }: { params: { id: string; step: string } }) {
  return <RecipeStepClient params={params} />;
}
