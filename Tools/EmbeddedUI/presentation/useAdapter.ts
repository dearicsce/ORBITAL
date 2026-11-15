import { useSyncExternalStore } from 'react';

export function useAdapter() {
  const adapter = window.OrbitalAdapter;
  const missionState = useSyncExternalStore(adapter.subscribe, adapter.getMissionState);
  return { adapter, missionState };
}

declare global {
  interface Window {
    OrbitalAdapter: {
      subscribe: (update: () => void) => () => void;
      getMissionState: () => {
        activeScreen: 'title' | 'brief';
        hasSave: boolean;
        continuationKind?: string;
        savedDraftLabel: string;
        selectedTrackId: string | null;
        selectedDateId: string | null;
        showingSharedExample: boolean;
        showingTimeSystemNote: boolean;
        sharedEventPlot: { hourOffset: number; label: string; flux: number; isSharedDipWindow: boolean }[];
        predictionTracks: { id: string; teamName: string; modelCode: string; hypothesisSummary: string }[];
        candidateDates: { id: string; archiveDate: string; relativeHours: string; ephemerisNote: string; visibilityWindow: string }[];
        policy: string;
        caseId: string;
        notice: string;
      };
      mountScene?: (scene: 'title', host: HTMLElement) => () => void;
      continueCampaign: () => void;
      startCatchTheNextDip: () => void;
      resumeSavedAttempt: () => void;
      openLegacyCampaign: () => void;
      openHangar: () => void;
      openAcademy: () => void;
      openReference: () => void;
      openSettings: () => void;
      returnToTitle: () => void;
      toggleSharedEventExample: () => void;
      toggleTimeSystemNote: () => void;
      selectPredictionTrack: (id: string) => void;
      selectCandidateDate: (id: string) => void;
      choosePolicy: (id: string) => void;
      chooseCase: (id: string) => void;
      useStarterSpacecraft: () => void;
      lockPredictionAndProceed: () => void;
    };
  }
}
