import type { Remote } from "comlink";
import { AleoWorker } from "./AleoWorker";

export type PayPrivateParams = {
  apiUrl: string;
  payerPrivateKey: string;
  recipientAddress: string;
  amountCredits: number;
  priorityFee?: number;
  privateFee?: boolean;
};

export type IssueReceiptParams = {
  apiUrl: string;
  merchantPrivateKey: string;
  payerAddress: string;
  invoiceIdField: string;
  amountMicrocredits: number;
  priorityFee?: number;
  privateFee?: boolean;
};

export type MakeStealthPaymentParams = {
  apiUrl: string;
  payerPrivateKey: string;
  merchantAddress: string;
  amountCredits: number;
  priorityFee?: number;
  privateFee?: boolean;
};

export type AleoWorkerApi = {
  getPrivateKey: () => Promise<{ to_string(): Promise<string> }>;
  localProgramExecution: (
    program: string,
    aleoFunction: string,
    inputs: string[],
  ) => Promise<string[]>;
  deployProgram: (program: string) => Promise<string>;
  payPrivate: (params: PayPrivateParams) => Promise<string>;
  makeStealthPayment: (params: MakeStealthPaymentParams) => Promise<string>;
  issueReceipt: (params: IssueReceiptParams) => Promise<string>;
};

let cached: Remote<AleoWorkerApi> | null = null;

export function getAleoWorker(): Remote<AleoWorkerApi> {
  if (!cached) cached = AleoWorker() as unknown as Remote<AleoWorkerApi>;
  return cached;
}

