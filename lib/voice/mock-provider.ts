/**
 * MockVoiceProvider — processes text input entirely in-browser.
 * No audio, no text, and no PII is sent to any external service.
 * External providers require explicit user consent and VOICE_PROVIDER env var;
 * this mock is the default and only implementation for the pilot.
 */
import type { VoiceProvider, ExtractedBookingDetails, ExtractionOptions } from "./types";
import {
  extractActivityType,
  extractDate,
  extractTime,
  extractDuration,
  extractSeniorHint,
  extractDestination,
  extractNotes,
  detectMedicalKeywords,
} from "./extraction";

export class MockVoiceProvider implements VoiceProvider {
  /**
   * "Transcribes" audio by returning a placeholder string.
   * Real transcription requires a live provider with user consent.
   */
  async transcribe(_audio: Blob): Promise<string> {
    return "[Voice transcription requires an external provider. Please type your request instead.]";
  }

  async extractBookingDetails(
    text: string,
    options: ExtractionOptions = {}
  ): Promise<ExtractedBookingDetails> {
    const { referenceDate = new Date(), availableActivityTypes = [] } = options;

    const activityTypeName = extractActivityType(text, availableActivityTypes);
    const date = extractDate(text, referenceDate);
    const startTime = extractTime(text);
    const durationHours = extractDuration(text);
    const seniorHint = extractSeniorHint(text);
    const destination = extractDestination(text);
    const notes = extractNotes(text);
    const medicalWarningTriggered = detectMedicalKeywords(text);

    const fieldsFound = [activityTypeName, date, startTime, durationHours].filter(Boolean).length;
    const confidence: ExtractedBookingDetails["confidence"] =
      fieldsFound >= 3 ? "high" : fieldsFound >= 2 ? "medium" : "low";

    return {
      activityTypeName,
      seniorHint,
      date,
      startTime,
      durationHours,
      location: null,
      destination,
      notes,
      medicalWarningTriggered,
      confidence,
    };
  }
}

export const mockVoiceProvider = new MockVoiceProvider();
