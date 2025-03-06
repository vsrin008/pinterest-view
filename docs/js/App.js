/* eslint-disable react/prop-types */
import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./components/Header";

const App = () => (
  <div>
    <Header />
    <div className="content">
      <Outlet />
    </div>
  </div>
);

export default App;
