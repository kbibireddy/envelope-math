import { describe, expect, it } from "vitest";
import {
  INVESTIGATION_FOCUSES,
  assessCapacityInput,
  getCapacityProfile,
  getInvestigationFocus,
  profilesForInvestigation
} from "./capacityProfiles.js";

describe("investigation focuses", () => {
  it("lists focused investigations instead of dumping every system", () => {
    const ids = INVESTIGATION_FOCUSES.map((focus) => focus.id);
    expect(ids).toEqual(["app", "database", "cache", "queue"]);
  });

  it("returns only systems relevant to the selected investigation", () => {
    expect(profilesForInvestigation("app").map((p) => p.id)).toEqual([
      "ecs",
      "lambda",
      "websocket"
    ]);
    expect(profilesForInvestigation("database").map((p) => p.id)).toEqual([
      "postgres",
      "dynamodb",
      "cassandra"
    ]);
    expect(profilesForInvestigation("cache").map((p) => p.id)).toEqual([
      "redis"
    ]);
    expect(profilesForInvestigation("queue").map((p) => p.id)).toEqual([
      "kafka",
      "kinesis",
      "sqs"
    ]);
    expect(profilesForInvestigation(null)).toEqual([]);
  });

  it("looks up focus and profile metadata", () => {
    expect(getInvestigationFocus("database")?.hint).toMatch(/store|RPS|query/i);
    expect(getCapacityProfile("postgres")?.conservativeTps).toBe(5_000);
    expect(getCapacityProfile("missing")).toBeNull();
  });

  it("flags inputs outside the modern envelope", () => {
    const postgres = getCapacityProfile("postgres");
    expect(postgres).not.toBeNull();
    expect(assessCapacityInput(postgres, 5_000).level).toBe("ok");
    expect(assessCapacityInput(postgres, 50).level).toBe("low");
    expect(assessCapacityInput(postgres, 500_000).level).toBe("high");
    expect(assessCapacityInput(postgres, 0).level).toBe("empty");
  });
});
