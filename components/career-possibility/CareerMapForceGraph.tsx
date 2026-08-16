"use client";

import { forwardRef, type MutableRefObject } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type {
  ForceGraphMethods,
  ForceGraphProps,
  LinkObject,
  NodeObject,
} from "react-force-graph-2d";
import type {
  CareerGraphVisualLink,
  CareerGraphVisualNode,
} from "@/lib/career-possibility/career-graph-visual-adapter";

export type CareerMapForceGraphHandle = ForceGraphMethods<
  NodeObject<CareerGraphVisualNode>,
  LinkObject<CareerGraphVisualNode, CareerGraphVisualLink>
>;

export type CareerMapForceGraphProps = ForceGraphProps<
  CareerGraphVisualNode,
  CareerGraphVisualLink
>;

export const CareerMapForceGraph = forwardRef<
  CareerMapForceGraphHandle,
  CareerMapForceGraphProps
>(function CareerMapForceGraph(props, forwardedRef) {
  return (
    <ForceGraph2D<CareerGraphVisualNode, CareerGraphVisualLink>
      {...props}
      ref={forwardedRef as MutableRefObject<CareerMapForceGraphHandle | undefined>}
    />
  );
});
