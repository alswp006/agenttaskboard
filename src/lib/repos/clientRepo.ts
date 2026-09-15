import { generateUUID } from '@/lib/time';
import { readEntity, writeEntity } from './shared';

const CLIENT_ID_KEY = 'atb:clientId';
const AI_NOTICE_KEY = 'atb:aiNoticeAck';

interface AiNoticeAck {
  ackedAt: string | null;
}

export const clientRepo = {
  getClientId(): string {
    const existing = readEntity<string | null>(CLIENT_ID_KEY, null);
    if (existing) return existing;

    const id = generateUUID();
    writeEntity(CLIENT_ID_KEY, id);
    return id;
  },

  hasAiNoticeAck(): boolean {
    const ack = readEntity<AiNoticeAck>(AI_NOTICE_KEY, { ackedAt: null });
    return ack.ackedAt !== null;
  },

  acknowledgeAiNotice(): void {
    const ack: AiNoticeAck = { ackedAt: new Date().toISOString() };
    writeEntity(AI_NOTICE_KEY, ack);
  },
};
