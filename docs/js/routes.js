/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import App from './App';
import SimplifiedDemo from './SimplifiedDemo';
import BalancedGridDemo from './BalancedGridDemo';

export default (
  <Routes>
    <Route path="/" element={<App />}>
      <Route index element={<SimplifiedDemo />} />
      <Route path="balanced" element={<BalancedGridDemo />} />
    </Route>
  </Routes>
);
