/* eslint-disable import/no-extraneous-dependencies */
import React from "react";
import { Routes, Route } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import ChangeSize from "./pages/ChangeSize";
import RealWorld from "./pages/RealWorld";
import HorizontalFlow from "./pages/HorizontalFlow";
import SimplifiedDemo from "./SimplifiedDemo";

const routes = () => (
  <Routes>
    <Route path="/" element={<App />}>
      <Route index element={<SimplifiedDemo />} />
      <Route path="/horizontal/" element={<HorizontalFlow />} />
      <Route path="/change-size/" element={<ChangeSize />} />
      <Route path="/real-world/" element={<RealWorld />} />
    </Route>
  </Routes>
);

export default routes;
