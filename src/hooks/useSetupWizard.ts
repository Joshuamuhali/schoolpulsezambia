import { useState, useCallback } from "react";

export interface WizardStep {
  id: number;
  title: string;
  description?: string;
}

export interface SetupWizardState {
  currentStep: number;
  steps: WizardStep[];
  data: {
    // Step 1: School Profile
    schoolName?: string;
    logo?: File | null;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    
    // Step 2: Grades & Classes
    grades: Array<{
      id: string;
      name: string;
      level: number;
      classes: Array<{
        id: string;
        name: string;
        teacherId?: string;
        maxPupils: number;
      }>;
    }>;
    
    // Step 3: Fee Structure
    feeTypes: Array<{
      id: string;
      name: string;
      amount: number;
      frequency: "monthly" | "termly" | "annual";
      dueDay?: number;
      isMandatory: boolean;
    }>;
    
    // Step 4: Staff Types
    staffTypes: Array<{
      id: string;
      name: string;
      baseSalary: number;
      payFrequency: "monthly" | "weekly" | "hourly";
    }>;
    
    // Step 5: Staff Members
    staff: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      staffTypeId: string;
      salary?: number;
    }>;
    
    // Step 6: Pupils
    pupils: Array<{
      id: string;
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      gender?: "male" | "female";
      guardianName?: string;
      guardianPhone?: string;
      guardianEmail?: string;
      classId?: string;
    }>;
  };
  isComplete: boolean;
}

const DEFAULT_STEPS: WizardStep[] = [
  { id: 1, title: "School Profile", description: "Basic information about your school" },
  { id: 2, title: "Grades & Classes", description: "Set up your academic structure" },
  { id: 3, title: "Fee Structure", description: "Define your fee types and amounts" },
  { id: 4, title: "Staff Types", description: "Configure job categories and salaries" },
  { id: 5, title: "Staff Members", description: "Add your teaching and non-teaching staff" },
  { id: 6, title: "Pupils", description: "Enroll your students" },
  { id: 7, title: "Review & Complete", description: "Review your setup and finish" },
];

const INITIAL_STATE: SetupWizardState = {
  currentStep: 1,
  steps: DEFAULT_STEPS,
  data: {
    grades: [],
    feeTypes: [],
    staffTypes: [],
    staff: [],
    pupils: [],
  },
  isComplete: false,
};

export function useSetupWizard() {
  const [state, setState] = useState<SetupWizardState>(INITIAL_STATE);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep < prev.steps.length) {
        return { ...prev, currentStep: prev.currentStep + 1 };
      }
      return prev;
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep > 1) {
        return { ...prev, currentStep: prev.currentStep - 1 };
      }
      return prev;
    });
  }, []);

  const goToStep = useCallback((stepId: number) => {
    setState((prev) => {
      if (stepId >= 1 && stepId <= prev.steps.length) {
        return { ...prev, currentStep: stepId };
      }
      return prev;
    });
  }, []);

  const updateData = useCallback(<K extends keyof SetupWizardState["data"]>(
    key: K,
    value: SetupWizardState["data"][K]
  ) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, [key]: value },
    }));
  }, []);

  const completeSetup = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isComplete: true,
      currentStep: prev.steps.length,
    }));
  }, []);

  const resetWizard = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const progress = (state.currentStep / state.steps.length) * 100;

  return {
    currentStep: state.currentStep,
    steps: state.steps,
    data: state.data,
    isComplete: state.isComplete,
    progress,
    nextStep,
    prevStep,
    goToStep,
    updateData,
    completeSetup,
    resetWizard,
  };
}