import { ProofStatus } from '../types/domain';

export type SessionState = {
  userId: string | null;
  proofStatus: ProofStatus;
};

export const initialSessionState: SessionState = {
  userId: null,
  proofStatus: 'unverified'
};
