/* eslint-disable react/prop-types */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable import/no-extraneous-dependencies */
import React from "react";
import { NavLink } from "react-router-dom";

const Header = () => (
  <header className="header">
    <h1>
      <img src="./images/logo.png" alt="React Stack Grid" />
    </h1>
    <nav>
      <ul>
        <li>
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? "is-active" : "")}
            end
          >
            Home
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/horizontal/"
            className={({ isActive }) => (isActive ? "is-active" : "")}
          >
            Horizontal
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/change-size/"
            className={({ isActive }) => (isActive ? "is-active" : "")}
          >
            Change Size
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/real-world/"
            className={({ isActive }) => (isActive ? "is-active" : "")}
          >
            Real World
          </NavLink>
        </li>
        <li>
          <a href="https://github.com/tsuyoshiwada/react-stack-grid">GitHub</a>
        </li>
      </ul>
    </nav>
  </header>
);

export default Header;
