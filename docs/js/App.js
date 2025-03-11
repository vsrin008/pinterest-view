/* eslint-disable react/prop-types */
import React from "react";
import { Outlet } from "react-router-dom";

const App = () => (
  <div className="app">
    <main className="main">
      <Outlet />
    </main>
  </div>
);

export default App;
