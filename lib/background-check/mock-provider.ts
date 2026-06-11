import type {
  BackgroundCheckProvider,
  BackgroundCheckRequest,
  BackgroundCheckResult,
  BackgroundCheckStatus,
} from "./index";

export const mockBackgroundCheckProvider: BackgroundCheckProvider = {
  async initiateCheck(request: BackgroundCheckRequest): Promise<BackgroundCheckResult> {
    const providerReferenceId = `mock-bgc-${request.companionProfileId}-${Date.now()}`;
    return {
      providerReferenceId,
      status: "requested",
      requestedAt: new Date().toISOString(),
    };
  },

  async getStatus(_providerReferenceId: string): Promise<BackgroundCheckStatus> {
    return "in_progress";
  },
};
