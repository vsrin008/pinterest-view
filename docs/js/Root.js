/* eslint-disable react/prop-types */
/* eslint-disable import/no-extraneous-dependencies */
import React from "react";
import { BrowserRouter } from "react-router-dom";
import routes from "./routes";

const Root = () => <BrowserRouter>{routes}</BrowserRouter>;

export default Root;
