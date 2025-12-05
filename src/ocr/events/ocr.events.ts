export class OcrCompletedEvent {
  constructor(
    public readonly documentId: string,
    public readonly userId: string,
    public readonly extractedText: string,
    public readonly confidence: number,
  ) {}
}

export class OcrFailedEvent {
  constructor(
    public readonly documentId: string,
    public readonly userId: string,
    public readonly error: string,
  ) {}
}