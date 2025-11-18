import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { MusicPlayerProvider } from "@/contexts/MusicPlayerContext";
import { FloatingMusicPlayer } from "@/components/FloatingMusicPlayer";
import { AutoplayConsentProvider } from "@/contexts/AutoplayConsentContext";
import { PrivateRoute } from "@/components/PrivateRoute";
import { FallingImagesBackground } from "@/components/FallingImagesBackground";
import { GlobalGradientBackdrop } from "@/components/GlobalGradientBackdrop";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/Login";
import ChapterView from "@/pages/chapter-view";
import SectionReader from "@/pages/section-reader";
import Admin from "@/pages/admin";
import BowTieKnotOutline from "@/pages/bowtie-knot-outline";
import TestGallery from "@/pages/test-gallery";
import LikedSections from "@/pages/liked-sections";

function Router() {
  return (
    <Switch>
      <Route path="/" component={(props) => <PrivateRoute component={Home} {...props} />} />
      <Route path="/login" component={Login} />
      <Route path="/chapter/:id" component={(props) => <PrivateRoute component={ChapterView} {...props} />} />
      <Route path="/read/:sectionId" component={(props) => <PrivateRoute component={SectionReader} {...props} />} />
      <Route path="/liked-sections" component={(props) => <PrivateRoute component={LikedSections} {...props} />} />
      <Route path="/admin" component={(props) => <PrivateRoute component={Admin} adminOnly {...props} />} />
      <Route path="/bowtie-outline" component={BowTieKnotOutline} />
      <Route path="/test-gallery" component={TestGallery} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MusicPlayerProvider>
          <AutoplayConsentProvider>
            <TooltipProvider>
              <GlobalGradientBackdrop />
              <FallingImagesBackground />
              <Toaster />
              <FloatingMusicPlayer />
              <Router />
            </TooltipProvider>
          </AutoplayConsentProvider>
        </MusicPlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
