import type { BenchmarkAgent, ProjectionInput } from "../shared/runner.ts";
import {
  computeWallVolume,
  computeWallVolumeExecutor,
  craigAgent,
  wallVolumeM3,
} from "../../examples/p01-craig/agent.ts";

export {
  computeWallVolume as computeVolume,
  computeWallVolumeExecutor as computeVolumeExecutor,
  wallVolumeM3 as volumeM3,
} from "../../examples/p01-craig/agent.ts";

/**
 * Thin benchmark projection over the standalone Agent_SDK P01 build.
 * Product behavior lives in examples/p01-craig; this file contains only evaluation adaptation.
 */

/**
 * Projection into the CANONICAL benchmark field names.
 *
 * The stored P01 artifacts assert on `wall_area_sq_ft` / `wall_thickness_in`. This SDK happens to
 * use the same names, but the mapping is still explicit and lives here, so a future SDK rename
 * cannot silently change what the benchmark is measuring.
 */
export function projectCraigFields(state: ProjectionInput): Record<string, string | number | boolean | undefined> {
  const value = (key: string) => state.memory[key]?.value;
  const asNumber = (key: string) => {
    const raw = value(key);
    return typeof raw === "number" ? raw : undefined;
  };
  const asString = (key: string) => {
    const raw = value(key);
    return raw === undefined ? undefined : Array.isArray(raw) ? raw.join(", ") : String(raw);
  };
  return {
    wall_area_sq_ft: asNumber("wall_area_sq_ft"),
    wall_thickness_in: asNumber("wall_thickness_in"),
    project_type: asString("project_type"),
    install_method: asString("install_method"),
    user_priority: asString("user_priority"),
    jurisdiction: asString("jurisdiction"),
  };
}

export const craigBenchmarkAgent: BenchmarkAgent = {
  definition: craigAgent,
  executors: () => ({ [computeWallVolume.name]: computeWallVolumeExecutor }),
  project: projectCraigFields,
  // Craig configures no consequential action. The stored artifacts assert that none ever fires, so
  // nothing here maps to a canonical action name.
  canonicalAction: () => null,
};
