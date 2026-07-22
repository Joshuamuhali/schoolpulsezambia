import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ModuleKey = "finance" | "exams" | "attendance" | "parent" | "communication";

export type ModuleStatus = "not_started" | "in_progress" | "complete";

export type ModuleSetupState = {
  status: ModuleStatus;
  currentStep: number;
  data: Record<string, unknown>;
};

type SetupStore = {
  modules: Record<ModuleKey, ModuleSetupState>;
  setStep: (m: ModuleKey, step: number) => void;
  patchData: (m: ModuleKey, patch: Record<string, unknown>) => void;
  markComplete: (m: ModuleKey) => void;
  reset: (m: ModuleKey) => void;
};

const initial = (): ModuleSetupState => ({ status: "not_started", currentStep: 0, data: {} });

export const useSetupStore = create<SetupStore>()(
  persist(
    (set) => ({
      modules: {
        finance: initial(),
        exams: initial(),
        attendance: initial(),
        parent: initial(),
        communication: initial(),
      },
      setStep: (m, step) =>
        set((s) => ({
          modules: {
            ...s.modules,
            [m]: { ...s.modules[m], currentStep: step, status: "in_progress" },
          },
        })),
      patchData: (m, patch) =>
        set((s) => ({
          modules: {
            ...s.modules,
            [m]: {
              ...s.modules[m],
              data: { ...s.modules[m].data, ...patch },
              status: s.modules[m].status === "complete" ? "complete" : "in_progress",
            },
          },
        })),
      markComplete: (m) =>
        set((s) => ({
          modules: { ...s.modules, [m]: { ...s.modules[m], status: "complete" } },
        })),
      reset: (m) => set((s) => ({ modules: { ...s.modules, [m]: initial() } })),
    }),
    { name: "schoolpulse-setup" }
  )
);
