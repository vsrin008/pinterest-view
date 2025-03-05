/* eslint-disable global-require */
/* eslint-disable import/no-extraneous-dependencies */
import React from "react";
import ReactDOM from "react-dom";
import Root from "./Root";
import routes from "./routes";

ReactDOM.render(<Root routes={routes} />, document.getElementById("root"));
