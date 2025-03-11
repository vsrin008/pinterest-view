/* eslint-disable global-require */
/* eslint-disable import/no-extraneous-dependencies */
import React from "react";
import { createRoot } from "react-dom/client";
import Root from "./Root";

// Import CSS files
import "../css/normalize.css";
import "../css/style.css";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<Root />);
