// Global game state shared between the 3D scene and the React HUD.
import { create } from "zustand";
import {
  MISSIONS,
  loadSave,
  persistSave,
  defaultSave,
  getMissionStatus,
  type GameSave,
  type BeaconStatus,
} from "@/lib/missions";

interface GameStore {
  // persistent slice
  playerName: string;
  completedMissions: string[];
  totalXp: number;

  // session slice
  started: boolean;
  activeMissionId: string | null; // mission whose dialogue is open
  nearbyMissionId: string | null; // mission whose beacon is within interaction range
  dialogOpen: boolean;
  challengeOpen: boolean;
  challengeResult: "idle" | "correct" | "wrong";

  // actions
  startGame: (name: string) => void;
  resetProgress: () => void; // wipe everything (used by StartScreen "Wipe" button)
  signOut: () => void; // return to start screen but KEEP progress (used by HUD "Exit")
  setActiveMission: (id: string | null) => void;
  setNearbyMission: (id: string | null) => void;
  openChallenge: () => void;
  closeChallenge: () => void;
  tryOpenNearbyMission: () => void;
  answerChallenge: (selectedIndex: number) => boolean;
  closeDialog: () => void;
  hydrate: () => void;
  statusOf: (missionId: string) => BeaconStatus;
}

export const useGameStore = create<GameStore>((set, get) => ({
  playerName: "",
  completedMissions: [],
  totalXp: 0,

  started: false,
  activeMissionId: null,
  nearbyMissionId: null,
  dialogOpen: false,
  challengeOpen: false,
  challengeResult: "idle",

  hydrate: () => {
    const saved = loadSave();
    if (saved && saved.playerName) {
      set({
        playerName: saved.playerName,
        completedMissions: saved.completedMissions,
        totalXp: saved.totalXp,
      });
    }
  },

  startGame: (name: string) => {
    const trimmed = name.trim() || "Anonymous Cadet";
    set({ playerName: trimmed, started: true });
    persistSave({
      ...defaultSave(),
      playerName: trimmed,
      completedMissions: get().completedMissions,
      totalXp: get().totalXp,
      currentMission: null,
      lastUpdated: Date.now(),
    });
  },

  resetProgress: () => {
    set({
      playerName: "",
      completedMissions: [],
      totalXp: 0,
      started: false,
      activeMissionId: null,
      nearbyMissionId: null,
      dialogOpen: false,
      challengeOpen: false,
      challengeResult: "idle",
    });
    persistSave({
      ...defaultSave(),
      playerName: "",
      lastUpdated: Date.now(),
    });
  },

  signOut: () => {
    // Return to start screen but PRESERVE the player's progress
    // (playerName, completedMissions, totalXp). Only session state
    // (active dialog, nearby beacon, started flag) is cleared.
    // The save in localStorage stays intact so "Resume" works next time.
    set({
      started: false,
      activeMissionId: null,
      nearbyMissionId: null,
      dialogOpen: false,
      challengeOpen: false,
      challengeResult: "idle",
    });
    const s = get();
    persistSave({
      playerName: s.playerName,
      completedMissions: s.completedMissions,
      currentMission: null,
      totalXp: s.totalXp,
      lastUpdated: Date.now(),
    });
  },

  setActiveMission: (id: string | null) => {
    set({ activeMissionId: id, dialogOpen: id !== null, challengeOpen: false, challengeResult: "idle" });
  },

  setNearbyMission: (id: string | null) => {
    if (get().nearbyMissionId !== id) {
      set({ nearbyMissionId: id });
    }
  },

  openChallenge: () => set({ challengeOpen: true, challengeResult: "idle" }),
  closeChallenge: () => set({ challengeOpen: false, challengeResult: "idle" }),

  // Shared by the Space key (desktop) and the Interact button (mobile) so
  // both input paths have identical gating (exists + not locked).
  tryOpenNearbyMission: () => {
    const id = get().nearbyMissionId;
    if (!id) return;
    if (!MISSIONS.some((m) => m.id === id)) return;
    if (get().statusOf(id) === "locked") return;
    get().setActiveMission(id);
  },

  answerChallenge: (selectedIndex: number) => {
    const id = get().activeMissionId;
    if (!id) return false;
    const mission = MISSIONS.find((m) => m.id === id);
    if (!mission) return false;
    const correct = selectedIndex === mission.challenge.correctIndex;
    if (correct) {
      const alreadyDone = get().completedMissions.includes(id);
      if (!alreadyDone) {
        const nextCompleted = [...get().completedMissions, id];
        const nextXp = get().totalXp + mission.rewardXp;
        set({
          completedMissions: nextCompleted,
          totalXp: nextXp,
          challengeResult: "correct",
        });
        persistSave({
          playerName: get().playerName,
          completedMissions: nextCompleted,
          currentMission: null,
          totalXp: nextXp,
          lastUpdated: Date.now(),
        });
      } else {
        set({ challengeResult: "correct" });
      }
    } else {
      set({ challengeResult: "wrong" });
    }
    return correct;
  },

  closeDialog: () =>
    set({
      activeMissionId: null,
      dialogOpen: false,
      challengeOpen: false,
      challengeResult: "idle",
    }),

  statusOf: (missionId: string) =>
    getMissionStatus(missionId, get().completedMissions),
}));

export const totalMissionCount = MISSIONS.length;
