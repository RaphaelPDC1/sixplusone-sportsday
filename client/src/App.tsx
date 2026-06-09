import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PageTransitionProvider } from "./contexts/PageTransitionContext";
import Home from "./pages/Home";
import Enter from "./pages/Enter";
import Holding from "./pages/Holding";
import Reveal from "./pages/Reveal";
import UnlockSuccess from "./pages/UnlockSuccess";
import Admin from "./pages/Admin";
import ReferralRedirect from "./pages/ReferralRedirect";
import TeamHub from "./pages/TeamHub";
import PostFeed from "./pages/PostFeed";
import UnlockReveal from "./pages/UnlockReveal";
import ShirtConfirm from "./pages/ShirtConfirm";
import Terms from "./pages/Terms";
import TeamDashboard from "./pages/TeamDashboard";
import Privacy from "./pages/Privacy";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/enter" component={Enter} />
      <Route path="/holding" component={Holding} />
      <Route path="/reveal" component={Reveal} />
      <Route path="/unlock/success" component={UnlockSuccess} />
      <Route path="/admin" component={Admin} />
      <Route path="/team-hub" component={TeamHub} />
      <Route path="/team-dashboard" component={TeamDashboard} />
      <Route path="/unlock-reveal" component={UnlockReveal} />
      <Route path="/shirt-confirm" component={ShirtConfirm} />
      <Route path="/feed" component={PostFeed} />
      <Route path="/r/:code" component={ReferralRedirect} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <TooltipProvider>
          <Toaster />
          <PageTransitionProvider>
            <Router />
          </PageTransitionProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
