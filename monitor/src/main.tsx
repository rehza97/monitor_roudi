import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import "@fontsource-variable/geist/index.css"
import "@fontsource/material-symbols-outlined/400.css"
import "./index.css"
import App from "./App.tsx"
import FirebaseConfigBanner from "@/components/FirebaseConfigBanner.tsx"
import DevAutofillButton from "@/components/DevAutofillButton.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AuthProvider } from "@/contexts/AuthContext.tsx"
import { Toaster } from "sonner"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <FirebaseConfigBanner />
          <DevAutofillButton />
          <App />
          <Toaster richColors position="top-right" closeButton />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
