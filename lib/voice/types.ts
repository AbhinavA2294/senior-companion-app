export interface ExtractedBookingDetails {
  activityTypeName: string | null;
  seniorHint: string | null;
  date: string | null;       // YYYY-MM-DD
  startTime: string | null;  // HH:MM (24h)
  durationHours: number | null;
  location: string | null;
  destination: string | null;
  notes: string | null;
  medicalWarningTriggered: boolean;
  confidence: "high" | "medium" | "low";
}

export interface VoiceProvider {
  /**
   * Transcribe audio to text. Implementations MUST NOT send
   * personally-identifying information to external services without
   * an explicit consent workflow. The mock implementation operates
   * entirely locally.
   */
  transcribe(audio: Blob): Promise<string>;

  /**
   * Extract structured booking fields from natural-language text.
   * No PII from senior profiles is passed to this method.
   */
  extractBookingDetails(
    text: string,
    options?: ExtractionOptions
  ): Promise<ExtractedBookingDetails>;
}

export interface ExtractionOptions {
  /** Reference date used for relative-date calculation. Defaults to today. */
  referenceDate?: Date;
  /** Available activity type names from the DB for better matching. */
  availableActivityTypes?: string[];
}
