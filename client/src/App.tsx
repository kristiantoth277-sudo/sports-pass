import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Components & Pages
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import FacilityDetails from "@/pages/FacilityDetails";
import MyBookings from "@/pages/MyBookings";
import BookingDetails from "@/pages/BookingDetails";
import Admin from "@/pages/Admin";
import Menu from "@/pages/Menu";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/facilities/:id" component={FacilityDetails} />
      <Route path="/bookings" component={MyBookings} />
      <Route path="/bookings/:id" component={BookingDetails} />
      <Route path="/admin" component={Admin} />
      <Route path="/menu" component={Menu} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
