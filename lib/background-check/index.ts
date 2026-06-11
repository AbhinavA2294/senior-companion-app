export type BackgroundCheckStatus =
  | "not_requested"
  | "requested"
  | "in_progress"
  | "completed"
  | "rejected";

export interface BackgroundCheckRequest {
  companionProfileId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}

export interface BackgroundCheckResult {
  providerReferenceId: string;
  status: BackgroundCheckStatus;
  requestedAt: string;
}

export interface BackgroundCheckProvider {
  initiateCheck(request: BackgroundCheckRequest): Promise<BackgroundCheckResult>;
  getStatus(providerReferenceId: string): Promise<BackgroundCheckStatus>;
}
