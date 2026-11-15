// Completed operational evidence for tests exercising state/UI rather than the engine.
export const completedFlight = {
  launchResult: {success: true},
  operationsSummary: {
    missionId: 'm1', finished: true, windowCompleted: true, passed: true,
    objectives: [
      {id: 'coverage', value: 60, target: 45, passed: true},
      {id: 'health', value: 100, target: 90, passed: true}
    ]
  }
};
