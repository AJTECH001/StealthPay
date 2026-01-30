//@ts-nocheck
import {
  Account,
  ProgramManager,
  PrivateKey,
  initThreadPool,
  AleoKeyProvider,
  AleoNetworkClient,
  NetworkRecordProvider,
} from "@provablehq/sdk";
import { expose, proxy } from "comlink";

let threadPoolInitialized = false;
async function ensureThreadPool() {
  if (threadPoolInitialized) return;
  await initThreadPool();
  threadPoolInitialized = true;
}

async function localProgramExecution(program, aleoFunction, inputs) {
  await ensureThreadPool();
  const programManager = new ProgramManager();

  // Create a temporary account for the execution of the program
  const account = new Account();
  programManager.setAccount(account);

  const executionResponse = await programManager.run(
    program,
    aleoFunction,
    inputs,
    false,
  );
  return executionResponse.getOutputs();
}

async function getPrivateKey() {
  await ensureThreadPool();
  const key = new PrivateKey();
  return proxy(key);
}

/**
 * Build + broadcast a private credits transfer using the native `credits.aleo` program.
 */
async function payPrivate({ apiUrl, payerPrivateKey, recipientAddress, amountCredits, priorityFee = 0.0, privateFee = true }) {
  await ensureThreadPool();
  const networkClient = new AleoNetworkClient(apiUrl);
  const account = new Account({ privateKey: payerPrivateKey });

  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);

  const recordProvider = new NetworkRecordProvider(account, networkClient);
  const programManager = new ProgramManager(apiUrl, keyProvider, recordProvider);
  programManager.setAccount(account);

  try {
    return await programManager.transfer(amountCredits, recipientAddress, "transfer_private", priorityFee, privateFee);
  } catch (e) {
    return await programManager.transfer(amountCredits, recipientAddress, "private", priorityFee, privateFee);
  }
}

/**
 * Execute stealthpay.aleo/make_payment - private payment with merchant receipt.
 * Use this for StealthPay flow (Payment record created for merchant).
 */
async function makeStealthPayment({ apiUrl, payerPrivateKey, merchantAddress, amountCredits, priorityFee = 0.0, privateFee = true }) {
  await ensureThreadPool();
  const networkClient = new AleoNetworkClient(apiUrl);
  const account = new Account({ privateKey: payerPrivateKey });

  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);

  const recordProvider = new NetworkRecordProvider(account, networkClient);
  const programManager = new ProgramManager(apiUrl, keyProvider, recordProvider);
  programManager.setAccount(account);

  const amountMicrocredits = amountCredits * 1_000_000;
  const inputs = [`${amountMicrocredits}u64`, merchantAddress];

  return await programManager.execute({
    programName: "stealthpay.aleo",
    functionName: "make_payment",
    priorityFee,
    privateFee,
    inputs,
  });
}

/**
 * Issue an on-chain receipt by executing `stealthpay_receipts.aleo/issue_receipt`.
 *
 * The receipts program is defined in:
 * - buildathon/privacy-payment/leo/stealthpay_receipts/src/main.leo
 *
 * Execution model reference:
 * - documentation/sdk/guides/04_execute_programs.md
 */
async function issueReceipt({ apiUrl, merchantPrivateKey, payerAddress, invoiceIdField, amountMicrocredits, priorityFee = 0.0, privateFee = true }) {
  await ensureThreadPool();
  const networkClient = new AleoNetworkClient(apiUrl);
  const account = new Account({ privateKey: merchantPrivateKey });

  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);

  const recordProvider = new NetworkRecordProvider(account, networkClient);
  const programManager = new ProgramManager(apiUrl, keyProvider, recordProvider);
  programManager.setAccount(account);

  const inputs = [payerAddress, invoiceIdField, `${amountMicrocredits}u64`];

  // The SDK guide uses execute() for building+broadcasting execution transactions.
  return await programManager.execute({
    programName: "stealthpay_receipts.aleo",
    functionName: "issue_receipt",
    priorityFee,
    privateFee,
    inputs,
  });
}

async function deployProgram(program) {
  await ensureThreadPool();
  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);

  // Create a record provider that will be used to find records and transaction data for Aleo programs
  const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

  // Use existing account with funds
  const account = new Account({
    privateKey: "user1PrivateKey",
  });

  const recordProvider = new NetworkRecordProvider(account, networkClient);

  // Initialize a program manager to talk to the Aleo network with the configured key and record providers
  const programManager = new ProgramManager(
    "https://api.explorer.provable.com/v1",
    keyProvider,
    recordProvider,
  );

  programManager.setAccount(account);

  // Define a fee to pay to deploy the program
  const fee = 1.9; // 1.9 Aleo credits

  // Deploy the program to the Aleo network
  const tx_id = await programManager.deploy(program, fee);

  // Optional: Pass in fee record manually to avoid long scan times
  // const feeRecord = "{  owner: aleo1xxx...xxx.private,  microcredits: 2000000u64.private,  _nonce: 123...789group.public}";
  // const tx_id = await programManager.deploy(program, fee, undefined, feeRecord);

  return tx_id;
}

const workerMethods = { localProgramExecution, getPrivateKey, deployProgram, payPrivate, makeStealthPayment, issueReceipt };
expose(workerMethods);
