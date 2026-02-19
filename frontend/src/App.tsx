import { Suspense, lazy } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import "./index.css";

const DesktopApp = lazy(() =>
  import("./desktop/DesktopApp").then((m) => ({ default: m.default }))
);

function App() {
  return (
    <Router>
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-foreground/30 border-t-foreground rounded-full" />
          </div>
        }
      >
        <DesktopApp />
      </Suspense>
    </Router>
  );
}

export default App;
