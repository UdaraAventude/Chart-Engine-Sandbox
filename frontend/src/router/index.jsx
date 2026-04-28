import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from '../layouts/app-layout';
import DrillDownPage from '../libs/drill-down/feature/drill-down-page';
import DashboardPage from '../libs/dashboard/feature/dashboard-page';
import ChartBuilderPage from '../libs/chart-builder/feature/chart-builder-page';

const AppRouter = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path='/' element={<DrillDownPage />} />
        <Route path='/dashboard' element={<DashboardPage />} />
        <Route path='/builder' element={<ChartBuilderPage />} />
      </Route>
    </Routes>
  );
};

export default AppRouter;
