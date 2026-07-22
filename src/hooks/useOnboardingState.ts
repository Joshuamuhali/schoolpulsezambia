import { useState, useEffect } from "react";

interface OnboardingState {
  step: number;
  data: {
    email?: string;
    fullName?: string;
    schoolName?: string;
    subdomain?: string;
    selectedModules?: string[];
  };
}

/**
 * Hook for persisting onboarding state to sessionStorage
 * Allows users to resume onboarding after page refresh
 */
export function useOnboardingState() {
  const [state, setState] = useState<OnboardingState>(() => {
    try {
      const saved = sessionStorage.getItem("onboarding_state");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to parse onboarding state:", error);
    }
    return {
      step: 1,
      data: {},
    };
  });

  const saveState = (newState: Partial<OnboardingState>) => {
    const updated = { ...state, ...newState };
    setState(updated);
    sessionStorage.setItem("onboarding_state", JSON.stringify(updated));
  };

  const updateData = (data: Partial<OnboardingState["data"]>) => {
    const updated = {
      ...state,
      data: { ...state.data, ...data },
    };
    setState(updated);
    sessionStorage.setItem("onboarding_state", JSON.stringify(updated));
  };

  const clearState = () => {
    setState({
      step: 1,
      data: {},
    });
    sessionStorage.removeItem("onboarding_state");
  };

  // Auto-save on step changes
  useEffect(() => {
    sessionStorage.setItem("onboarding_state", JSON.stringify(state));
  }, [state.step]);

  return {
    state,
    saveState,
    updateData,
    clearState,
  };
}