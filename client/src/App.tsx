import { BrowserRouter, Route, Routes } from "react-router"

import { ChatPage } from "@/pages/ChatPage"
import { RatesPage } from "@/pages/RatesPage"
import { ReportPage } from "@/pages/ReportPage"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/report/:id" element={<ReportPage />} />
        <Route path="/rates" element={<RatesPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
