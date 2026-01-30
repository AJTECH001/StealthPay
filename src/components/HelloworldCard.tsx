import { useState } from "react";

import helloworldProgram from "../../helloworld/build/main.aleo?raw";
import { getAleoWorker } from "../workers/aleoWorkerClient";

export function HelloworldCard() {
  const aleoWorker = getAleoWorker();

  const [executing, setExecuting] = useState(false);
  const [deploying, setDeploying] = useState(false);

  async function execute() {
    setExecuting(true);
    try {
      const result = await aleoWorker.localProgramExecution(
        helloworldProgram,
        "main",
        ["5u32", "5u32"],
      );
      alert(JSON.stringify(result));
    } finally {
      setExecuting(false);
    }
  }

  async function deploy() {
    setDeploying(true);
    try {
      const result = await aleoWorker.deployProgram(helloworldProgram);
      alert("Transaction ID: " + result);
    } catch (e) {
      console.log(e);
      alert("Error with deployment, please check console for details");
    } finally {
      setDeploying(false);
    }
  }

  return (
    <div className="card">
      <h2>HelloWorld demo</h2>
      <p>
        <button disabled={executing} onClick={execute}>
          {executing ? "Executing..." : "Execute helloworld.aleo"}
        </button>
      </p>

      <p>
        <button disabled={deploying} onClick={deploy}>
          {deploying ? "Deploying..." : "Deploy helloworld.aleo"}
        </button>
      </p>
    </div>
  );
}

