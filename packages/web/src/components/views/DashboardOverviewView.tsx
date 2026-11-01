import React from "react";
import { HomeView, type HomeViewProps } from "./HomeView";

export type DashboardOverviewViewProps = HomeViewProps;

/**
 * Vista de Inicio (Home / Dashboard Principal) de Mint.
 * Rediseñada con Arquitectura Bento Grid Operativa.
 */
export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = (props) => {
  return <HomeView {...props} />;
};

export default DashboardOverviewView;
